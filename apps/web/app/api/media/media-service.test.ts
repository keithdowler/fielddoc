import { describe, expect, it } from "vitest";

import {
  createMediaDownloadPrepareHandler,
  createMediaUploadCompleteHandler,
  createMediaUploadPrepareHandler,
} from "./media-service";
import type { MediaUploadRepository } from "./neon-media-repository";
import type { PrivateObjectStorage } from "./private-object-storage";
import type {
  SyncAuthPrincipal,
  SyncMutationAuthVerifier,
} from "../sync/mutations/sync-service";

const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const mediaAssetId = "33333333-3333-4333-8333-333333333333";
const evidenceItemId = "44444444-4444-4444-8444-444444444444";
const sha256 =
  "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";
const expectedObjectKey =
  "organizations/11111111-1111-4111-8111-111111111111/evidence/44444444-4444-4444-8444-444444444444/originals/33333333-3333-4333-8333-333333333333-9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08.jpg";

describe("media service", () => {
  it("requires bearer auth before preparing media uploads", async () => {
    const response = await createMediaUploadPrepareHandler(
      createDependencies(),
    )(
      new Request("https://example.test/api/media/uploads/prepare", {
        method: "POST",
        body: "{}",
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("prepares organization-scoped private upload URLs", async () => {
    const response = await createMediaUploadPrepareHandler(
      createDependencies(),
    )(
      jsonRequest("/api/media/uploads/prepare", {
        mediaAssetId,
        evidenceItemId,
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        sha256,
        fileExtension: "jpg",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      mediaAssetId,
      storageObjectKey: expectedObjectKey,
      uploadUrl: expect.stringContaining("https://uploads.example.test/"),
      requiredHeaders: {},
      expiresAt: "2026-08-16T14:10:00.000Z",
    });
  });

  it("records upload completion for canonical media", async () => {
    const repository = createRepository();
    const response = await createMediaUploadCompleteHandler(
      createDependencies({ repository }),
    )(
      jsonRequest("/api/media/uploads/complete", {
        mediaAssetId,
        storageObjectKey: expectedObjectKey,
        sha256,
        sizeBytes: 1024,
        uploadedAt: "2026-08-16T14:02:00.000Z",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "recorded",
      mediaAssetId,
    });
    expect(repository.lastMarkedUpload).toMatchObject({
      organizationId,
      mediaAssetId,
      storageObjectKey: expectedObjectKey,
    });
  });

  it("rejects upload completion for mismatched object keys", async () => {
    const response = await createMediaUploadCompleteHandler(
      createDependencies(),
    )(
      jsonRequest("/api/media/uploads/complete", {
        mediaAssetId,
        storageObjectKey: "organizations/other/evidence/item/originals/bad.jpg",
        sha256,
        sizeBytes: 1024,
        uploadedAt: "2026-08-16T14:02:00.000Z",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_STORAGE_OBJECT_KEY" },
    });
  });

  it("prepares private download URLs only after media has storage", async () => {
    const response = await createMediaDownloadPrepareHandler(
      createDependencies({
        repository: createRepository({
          storageObjectKey:
            "organizations/org/evidence/item/originals/media.jpg",
        }),
      }),
    )(jsonRequest("/api/media/downloads/prepare", { mediaAssetId }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      mediaAssetId,
      downloadUrl: expect.stringContaining("https://downloads.example.test/"),
      expiresAt: "2026-08-16T14:05:00.000Z",
    });
  });
});

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`https://example.test${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer token",
    },
    body: JSON.stringify(body),
  });
}

function createDependencies(
  input: {
    repository?: ReturnType<typeof createRepository>;
    storage?: PrivateObjectStorage;
  } = {},
) {
  return {
    createAuthVerifier: () => createAuthVerifier(),
    createRepository: () => input.repository ?? createRepository(),
    createStorage: () => input.storage ?? createStorage(),
    now: () => new Date("2026-08-16T14:00:00.000Z"),
  };
}

function createAuthVerifier(): SyncMutationAuthVerifier {
  const principal: SyncAuthPrincipal = {
    externalAuthId: "user_external",
    organizationId: "org_external",
    organizationRole: "org:admin",
  };

  return {
    verify: async () => ({ ok: true, principal }),
  };
}

function createRepository(input: { storageObjectKey?: string | null } = {}) {
  const repository: MediaUploadRepository & {
    lastMarkedUpload?: {
      organizationId: string;
      mediaAssetId: string;
      storageObjectKey: string;
      uploadedAt: string;
    };
  } = {
    resolveMembership: async () => ({
      organizationId,
      userId,
      role: "admin",
    }),
    evidenceBelongsToOrganization: async () => true,
    markMediaUploaded: async (upload) => {
      repository.lastMarkedUpload = upload;
      return true;
    },
    getStoredMediaAsset: async () => ({
      id: mediaAssetId,
      evidenceItemId,
      sha256,
      sizeBytes: 1024,
      storageObjectKey: input.storageObjectKey ?? null,
    }),
  };

  return repository;
}

function createStorage(): PrivateObjectStorage {
  return {
    createPresignedUrl: (input) =>
      input.method === "PUT"
        ? `https://uploads.example.test/${input.objectKey}`
        : `https://downloads.example.test/${input.objectKey}`,
  };
}
