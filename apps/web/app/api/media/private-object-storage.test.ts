import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createEvidenceObjectKey,
  createR2PrivateObjectStorage,
} from "./private-object-storage";

const testSha256 =
  "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("private object storage", () => {
  it("scopes original evidence objects by organization and evidence item", () => {
    expect(
      createEvidenceObjectKey({
        organizationId: "11111111-1111-4111-8111-111111111111",
        evidenceItemId: "22222222-2222-4222-8222-222222222222",
        mediaAssetId: "33333333-3333-4333-8333-333333333333",
        sha256: testSha256,
        fileExtension: "jpg",
      }),
    ).toBe(
      "organizations/11111111-1111-4111-8111-111111111111/evidence/22222222-2222-4222-8222-222222222222/originals/33333333-3333-4333-8333-333333333333-9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08.jpg",
    );
  });

  it("creates short-lived R2 signed URLs without public object URLs", () => {
    const storage = createR2PrivateObjectStorage({
      accountId: "acct_123",
      bucketName: "fielddoc-private",
      accessKeyId: "access-key",
      secretAccessKey: "secret-key",
    });
    const url = new URL(
      storage.createPresignedUrl({
        method: "PUT",
        objectKey: "organizations/org/evidence/item/originals/media.jpg",
        expiresInSeconds: 600,
        now: new Date("2026-08-16T14:00:00.000Z"),
      }),
    );

    expect(url.origin).toBe("https://acct_123.r2.cloudflarestorage.com");
    expect(url.pathname).toBe(
      "/fielddoc-private/organizations/org/evidence/item/originals/media.jpg",
    );
    expect(url.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256");
    expect(url.searchParams.get("X-Amz-Expires")).toBe("600");
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("includes required upload headers in the signed URL contract", () => {
    const storage = createR2PrivateObjectStorage({
      accountId: "acct_123",
      bucketName: "fielddoc-private",
      accessKeyId: "access-key",
      secretAccessKey: "secret-key",
    });
    const url = new URL(
      storage.createPresignedUrl({
        method: "PUT",
        objectKey: "organizations/org/evidence/item/originals/media.jpg",
        expiresInSeconds: 600,
        signedHeaders: {
          "Content-Type": "image/jpeg",
          "x-amz-meta-sha256": testSha256,
        },
        now: new Date("2026-08-16T14:00:00.000Z"),
      }),
    );

    expect(url.searchParams.get("X-Amz-SignedHeaders")).toBe(
      "content-type;host;x-amz-meta-sha256",
    );
    expect(url.searchParams.get("X-Amz-Signature")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("verifies object size, content type, metadata hash, and byte hash", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: {
            "content-length": "4",
            "content-type": "text/plain",
            "x-amz-meta-sha256": testSha256,
          },
        }),
      )
      .mockResolvedValueOnce(new Response("test", { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const storage = createR2PrivateObjectStorage({
      accountId: "acct_123",
      bucketName: "fielddoc-private",
      accessKeyId: "access-key",
      secretAccessKey: "secret-key",
    });
    const verification = await storage.verifyObject({
      objectKey: "organizations/org/evidence/item/originals/media.txt",
      expectedSizeBytes: 4,
      expectedSha256: testSha256,
      expectedContentType: "text/plain",
      now: new Date("2026-08-16T14:00:00.000Z"),
    });

    expect(verification).toMatchObject({
      ok: true,
      sizeBytes: 4,
      contentType: "text/plain",
      sha256: testSha256,
      metadataSha256: testSha256,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects object verification when the byte hash differs", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: {
            "content-length": "5",
            "content-type": "text/plain",
          },
        }),
      )
      .mockResolvedValueOnce(new Response("wrong", { status: 200 }));

    vi.stubGlobal("fetch", fetchMock);

    const storage = createR2PrivateObjectStorage({
      accountId: "acct_123",
      bucketName: "fielddoc-private",
      accessKeyId: "access-key",
      secretAccessKey: "secret-key",
    });

    await expect(
      storage.verifyObject({
        objectKey: "organizations/org/evidence/item/originals/media.txt",
        expectedSizeBytes: 5,
        expectedSha256: testSha256,
        expectedContentType: "text/plain",
        now: new Date("2026-08-16T14:00:00.000Z"),
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "MEDIA_OBJECT_HASH_MISMATCH",
    });
  });

  it("rejects object verification when the private object is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(new Response(null, { status: 404 })),
    );

    const storage = createR2PrivateObjectStorage({
      accountId: "acct_123",
      bucketName: "fielddoc-private",
      accessKeyId: "access-key",
      secretAccessKey: "secret-key",
    });

    await expect(
      storage.verifyObject({
        objectKey: "organizations/org/evidence/item/originals/missing.jpg",
        expectedSizeBytes: 1024,
        expectedSha256: testSha256,
        expectedContentType: "image/jpeg",
        now: new Date("2026-08-16T14:00:00.000Z"),
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "MEDIA_OBJECT_NOT_FOUND",
    });
  });

  it("rejects object verification when the content type differs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: {
            "content-length": "4",
            "content-type": "application/pdf",
          },
        }),
      ),
    );

    const storage = createR2PrivateObjectStorage({
      accountId: "acct_123",
      bucketName: "fielddoc-private",
      accessKeyId: "access-key",
      secretAccessKey: "secret-key",
    });

    await expect(
      storage.verifyObject({
        objectKey: "organizations/org/evidence/item/originals/media.jpg",
        expectedSizeBytes: 4,
        expectedSha256: testSha256,
        expectedContentType: "image/jpeg",
        now: new Date("2026-08-16T14:00:00.000Z"),
      }),
    ).resolves.toMatchObject({
      ok: false,
      code: "MEDIA_OBJECT_TYPE_MISMATCH",
    });
  });
});
