import { describe, expect, it } from "vitest";

import { createWebMediaDownloadRedirectHandler } from "./media-download-route";
import type { MediaUploadRepository } from "../../api/media/neon-media-repository";
import type { PrivateObjectStorage } from "../../api/media/private-object-storage";
import type { AuditEventInput } from "../../api/audit/audit-log";

const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const mediaAssetId = "33333333-3333-4333-8333-333333333333";

describe("createWebMediaDownloadRedirectHandler", () => {
  it("requires an authenticated web user and active organization", async () => {
    const unauthenticated = await createWebMediaDownloadRedirectHandler({
      getAuthContext: async () => ({ userId: null, orgId: null }),
      createRepository,
      createStorage,
    })(mediaAssetId);

    expect(unauthenticated.status).toBe(401);

    const missingOrg = await createWebMediaDownloadRedirectHandler({
      getAuthContext: async () => ({ userId: "user_external", orgId: null }),
      createRepository,
      createStorage,
    })(mediaAssetId);

    expect(missingOrg.status).toBe(403);
  });

  it("redirects to a short-lived private media URL", async () => {
    const auditEvents: AuditEventInput[] = [];
    const response = await createWebMediaDownloadRedirectHandler({
      getAuthContext: async () => ({
        userId: "user_external",
        orgId: "org_external",
      }),
      createRepository,
      createStorage,
      createAuditWriter: () => ({
        record: async (event) => {
          auditEvents.push(event);
        },
      }),
      now: () => new Date("2026-08-17T15:00:00.000Z"),
    })(
      mediaAssetId,
      new Request("https://example.test/app/media/download", {
        headers: { "x-vercel-id": "iad1::req-media" },
      }),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("location")).toBe(
      "https://downloads.example.test/organizations/org/evidence/item/originals/media.jpg?expires=300",
    );
    expect(auditEvents).toContainEqual(
      expect.objectContaining({
        organizationId,
        actorUserId: userId,
        actorExternalId: "user_external",
        eventType: "web_media_download_redirect",
        entityType: "MediaAsset",
        entityId: mediaAssetId,
        requestId: "iad1::req-media",
      }),
    );
  });

  it("does not redirect media outside the signed-in organization", async () => {
    const response = await createWebMediaDownloadRedirectHandler({
      getAuthContext: async () => ({
        userId: "user_external",
        orgId: "org_external",
      }),
      createRepository: () => createRepository({ membership: null }),
      createStorage,
    })(mediaAssetId);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "ORGANIZATION_MEMBERSHIP_REQUIRED" },
    });
  });

  it("returns not found until the original has uploaded storage", async () => {
    const response = await createWebMediaDownloadRedirectHandler({
      getAuthContext: async () => ({
        userId: "user_external",
        orgId: "org_external",
      }),
      createRepository: () => createRepository({ storageObjectKey: null }),
      createStorage,
    })(mediaAssetId);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "MEDIA_ASSET_NOT_UPLOADED" },
    });
  });
});

function createRepository(
  input: {
    membership?: {
      organizationId: string;
      userId: string;
      role: string;
    } | null;
    storageObjectKey?: string | null;
  } = {},
): MediaUploadRepository {
  return {
    resolveMembership: async () =>
      input.membership === undefined
        ? { organizationId, userId, role: "admin" }
        : input.membership,
    evidenceBelongsToOrganization: async () => true,
    markMediaUploaded: async () => true,
    getStoredMediaAsset: async () => ({
      id: mediaAssetId,
      evidenceItemId: "44444444-4444-4444-8444-444444444444",
      mimeType: "image/jpeg",
      sha256:
        "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      sizeBytes: 1024,
      storageObjectKey:
        input.storageObjectKey === undefined
          ? "organizations/org/evidence/item/originals/media.jpg"
          : input.storageObjectKey,
    }),
  };
}

function createStorage(): PrivateObjectStorage {
  return {
    deleteObject: async () => undefined,
    createPresignedUrl: (input) =>
      `https://downloads.example.test/${input.objectKey}?expires=${input.expiresInSeconds}`,
    verifyObject: async () => ({
      ok: true,
      sizeBytes: 1024,
      contentType: "image/jpeg",
      sha256:
        "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      metadataSha256:
        "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    }),
  };
}
