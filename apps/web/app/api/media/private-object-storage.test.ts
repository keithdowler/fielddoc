import { describe, expect, it } from "vitest";

import {
  createEvidenceObjectKey,
  createR2PrivateObjectStorage,
} from "./private-object-storage";

describe("private object storage", () => {
  it("scopes original evidence objects by organization and evidence item", () => {
    expect(
      createEvidenceObjectKey({
        organizationId: "11111111-1111-4111-8111-111111111111",
        evidenceItemId: "22222222-2222-4222-8222-222222222222",
        mediaAssetId: "33333333-3333-4333-8333-333333333333",
        sha256:
          "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
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
});
