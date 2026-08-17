import { describe, expect, it } from "vitest";

import { createNodeSqliteDatabase } from "@/infrastructure/local-store/node-sqlite-database.test-helper";
import { createLocalRepositories } from "@/infrastructure/local-store/repositories";

import {
  runMobileMediaUpload,
  type UploadBinaryInput,
} from "./mobile-media-upload";

async function withRepositories<T>(
  test: (
    repositories: Awaited<ReturnType<typeof createLocalRepositories>>,
  ) => Promise<T>,
): Promise<T> {
  const database = await createNodeSqliteDatabase();
  try {
    const repositories = await createLocalRepositories(database);
    return await test(repositories);
  } finally {
    database.close();
  }
}

describe("runMobileMediaUpload", () => {
  it("requires API configuration and auth before uploading originals", async () => {
    await withRepositories(async (repositories) => {
      const result = await runMobileMediaUpload({
        repositories,
        apiBaseUrl: null,
        tokenProvider: { getAccessToken: async () => "token" },
      });

      expect(result).toMatchObject({
        status: "not_configured",
        attemptedCount: 0,
      });

      const authResult = await runMobileMediaUpload({
        repositories,
        apiBaseUrl: "https://proof.example",
        tokenProvider: { getAccessToken: async () => null },
      });

      expect(authResult.status).toBe("auth_required");
    });
  });

  it("uploads pending media and marks the local asset uploaded", async () => {
    await withRepositories(async (repositories) => {
      const project = await repositories.projects.create({
        name: "Media upload project",
      });
      const evidence = await repositories.evidence.create({
        projectId: project.id,
        category: "BEFORE",
      });
      const media = await repositories.media.create({
        evidenceItemId: evidence.id,
        localUri: "file:///fielddoc/evidence-originals/original.jpg",
        mediaType: "IMAGE",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        sha256:
          "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
        sourceType: "CAMERA_PHOTO",
      });
      const prepareRequests: unknown[] = [];
      const uploadRequests: UploadBinaryInput[] = [];
      const completeRequests: unknown[] = [];

      const result = await runMobileMediaUpload({
        repositories,
        apiBaseUrl: "https://proof.example",
        tokenProvider: { getAccessToken: async () => "token" },
        now: () => new Date("2026-08-16T16:00:00.000Z"),
        apiClient: {
          async prepareMediaUpload(input) {
            prepareRequests.push(input);
            return {
              mediaAssetId: input.mediaAssetId,
              storageObjectKey:
                "organizations/org/evidence/item/originals/original.jpg",
              uploadUrl: "https://uploads.example.test/original.jpg",
              requiredHeaders: { "x-test": "yes" },
              expiresAt: "2026-08-16T16:10:00.000Z",
            };
          },
          async completeMediaUpload(input) {
            completeRequests.push(input);
            return {
              mediaAssetId: input.mediaAssetId,
              storageObjectKey: input.storageObjectKey,
              uploadedAt: input.uploadedAt,
              status: "recorded",
            };
          },
        },
        uploadBinary: async (input) => {
          uploadRequests.push(input);
          return { status: 200 };
        },
      });

      expect(result).toMatchObject({
        status: "success",
        attemptedCount: 1,
        uploadedCount: 1,
        pendingCount: 0,
      });
      expect(prepareRequests[0]).toMatchObject({
        mediaAssetId: media.id,
        evidenceItemId: evidence.id,
        fileExtension: "jpg",
      });
      expect(uploadRequests[0]).toMatchObject({
        uploadUrl: "https://uploads.example.test/original.jpg",
        localUri: media.localUri,
        requiredHeaders: { "x-test": "yes" },
      });
      expect(completeRequests[0]).toMatchObject({
        mediaAssetId: media.id,
        uploadedAt: "2026-08-16T16:00:00.000Z",
      });
      expect((await repositories.media.listPendingUpload()).length).toBe(0);
      expect(
        (await repositories.media.listByEvidenceItem(evidence.id))[0],
      ).toMatchObject({
        storageObjectKey:
          "organizations/org/evidence/item/originals/original.jpg",
        uploadedAt: "2026-08-16T16:00:00.000Z",
      });
    });
  });

  it("keeps failed uploads pending for retry", async () => {
    await withRepositories(async (repositories) => {
      const project = await repositories.projects.create({
        name: "Retry media project",
      });
      const evidence = await repositories.evidence.create({
        projectId: project.id,
        category: "AFTER",
      });
      await repositories.media.create({
        evidenceItemId: evidence.id,
        localUri: "file:///fielddoc/evidence-originals/after.jpg",
        mediaType: "IMAGE",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        sha256:
          "2f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
        sourceType: "PHOTO_LIBRARY",
      });

      const result = await runMobileMediaUpload({
        repositories,
        apiBaseUrl: "https://proof.example",
        tokenProvider: { getAccessToken: async () => "token" },
        apiClient: {
          async prepareMediaUpload(input) {
            return {
              mediaAssetId: input.mediaAssetId,
              storageObjectKey:
                "organizations/org/evidence/item/originals/after.jpg",
              uploadUrl: "https://uploads.example.test/after.jpg",
              requiredHeaders: {},
              expiresAt: "2026-08-16T16:10:00.000Z",
            };
          },
          async completeMediaUpload() {
            throw new Error("Should not complete failed uploads.");
          },
        },
        uploadBinary: async () => ({ status: 503 }),
      });

      expect(result).toMatchObject({
        status: "failed",
        attemptedCount: 1,
        uploadedCount: 0,
        failedCount: 1,
        pendingCount: 1,
        failedMediaAssetIds: [expect.any(String)],
        lastErrorCode: "MEDIA_UPLOAD_FAILED",
        lastErrorMessage: "Private media upload failed.",
      });
      expect(result.message).toContain("Private media upload failed.");
      expect((await repositories.media.listPendingUpload()).length).toBe(1);
    });
  });

  it("reports server-side integrity rejection after object upload", async () => {
    await withRepositories(async (repositories) => {
      const project = await repositories.projects.create({
        name: "Integrity failure project",
      });
      const evidence = await repositories.evidence.create({
        projectId: project.id,
        category: "WORK",
      });
      const media = await repositories.media.create({
        evidenceItemId: evidence.id,
        localUri: "file:///fielddoc/evidence-originals/work.jpg",
        mediaType: "IMAGE",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        sha256:
          "3f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
        sourceType: "CAMERA_PHOTO",
      });

      const result = await runMobileMediaUpload({
        repositories,
        apiBaseUrl: "https://proof.example",
        tokenProvider: { getAccessToken: async () => "token" },
        apiClient: {
          async prepareMediaUpload(input) {
            return {
              mediaAssetId: input.mediaAssetId,
              storageObjectKey:
                "organizations/org/evidence/item/originals/work.jpg",
              uploadUrl: "https://uploads.example.test/work.jpg",
              requiredHeaders: {
                "Content-Type": "image/jpeg",
                "x-amz-meta-sha256": input.sha256,
              },
              expiresAt: "2026-08-16T16:10:00.000Z",
            };
          },
          async completeMediaUpload() {
            throw new Error("Uploaded original bytes do not match.");
          },
        },
        uploadBinary: async () => ({ status: 200 }),
      });

      expect(result).toMatchObject({
        status: "failed",
        failedMediaAssetIds: [media.id],
        lastErrorCode: null,
        lastErrorMessage: "Uploaded original bytes do not match.",
      });
      expect(result.message).toContain("Uploaded original bytes do not match.");
      expect((await repositories.media.listPendingUpload()).length).toBe(1);
    });
  });
});
