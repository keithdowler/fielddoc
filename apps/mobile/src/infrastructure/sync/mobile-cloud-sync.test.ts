import { describe, expect, it } from "vitest";

import { createNodeSqliteDatabase } from "@/infrastructure/local-store/node-sqlite-database.test-helper";
import { createLocalRepositories } from "@/infrastructure/local-store/repositories";

import { runMobileCloudSync } from "./mobile-cloud-sync";

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

describe("runMobileCloudSync", () => {
  it("uploads metadata before attempting original media binaries", async () => {
    await withRepositories(async (repositories) => {
      const project = await repositories.projects.create({
        name: "Ordered sync project",
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
      const calls: string[] = [];

      const result = await runMobileCloudSync({
        repositories,
        apiBaseUrl: "https://proof.example",
        tokenProvider: { getAccessToken: async () => "token" },
        now: () => new Date("2026-08-17T15:00:00.000Z"),
        apiClient: {
          async uploadLocalMutations(input) {
            calls.push("metadata");
            return {
              serverTime: "2026-08-17T15:00:01.000Z",
              acceptedMutationIds: input.mutations.map(
                (mutation) => mutation.mutationId,
              ),
              duplicateMutationIds: [],
              rejectedMutations: [],
              pullCursor: null,
            };
          },
          async prepareMediaUpload(input) {
            calls.push("prepare-media");
            return {
              mediaAssetId: input.mediaAssetId,
              storageObjectKey:
                "organizations/org/evidence/item/originals/original.jpg",
              uploadUrl: "https://uploads.example.test/original.jpg",
              requiredHeaders: {},
              expiresAt: "2026-08-17T15:10:00.000Z",
            };
          },
          async completeMediaUpload(input) {
            calls.push("complete-media");
            return {
              mediaAssetId: input.mediaAssetId,
              storageObjectKey: input.storageObjectKey,
              uploadedAt: input.uploadedAt,
              status: "recorded",
            };
          },
          async prepareReportPdfUpload() {
            throw new Error("Report PDF upload should not start.");
          },
          async completeReportPdfUpload() {
            throw new Error("Report PDF upload should not complete.");
          },
        },
        uploadBinary: async () => {
          calls.push("binary");
          return { status: 200 };
        },
      });

      expect(calls).toEqual([
        "metadata",
        "prepare-media",
        "binary",
        "complete-media",
      ]);
      expect(result.status).toBe("success");
      expect(result.metadata.acceptedCount).toBeGreaterThan(0);
      expect(result.media?.uploadedCount).toBe(1);
      expect(result.reports?.status).toBe("idle");
      expect(
        (await repositories.media.listByEvidenceItem(evidence.id))[0],
      ).toMatchObject({
        id: media.id,
        storageObjectKey:
          "organizations/org/evidence/item/originals/original.jpg",
      });
    });
  });

  it("does not upload media when metadata sync needs attention", async () => {
    await withRepositories(async (repositories) => {
      const project = await repositories.projects.create({
        name: "Rejected metadata project",
      });
      const evidence = await repositories.evidence.create({
        projectId: project.id,
        category: "WORK",
      });
      await repositories.media.create({
        evidenceItemId: evidence.id,
        localUri: "file:///fielddoc/evidence-originals/work.jpg",
        mediaType: "IMAGE",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        sha256:
          "1f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
        sourceType: "PHOTO_LIBRARY",
      });
      let mediaPrepared = false;

      const result = await runMobileCloudSync({
        repositories,
        apiBaseUrl: "https://proof.example",
        tokenProvider: { getAccessToken: async () => "token" },
        apiClient: {
          async uploadLocalMutations(input) {
            return {
              serverTime: "2026-08-17T15:00:01.000Z",
              acceptedMutationIds: [],
              duplicateMutationIds: [],
              rejectedMutations: input.mutations.map((mutation) => ({
                mutationId: mutation.mutationId,
                code: "TEST_REJECTED",
                message: "Rejected for test.",
              })),
              pullCursor: null,
            };
          },
          async prepareMediaUpload() {
            mediaPrepared = true;
            throw new Error("Media upload should not start.");
          },
          async completeMediaUpload() {
            throw new Error("Media upload should not complete.");
          },
          async prepareReportPdfUpload() {
            throw new Error("Report PDF upload should not start.");
          },
          async completeReportPdfUpload() {
            throw new Error("Report PDF upload should not complete.");
          },
        },
      });

      expect(result.status).toBe("partial");
      expect(result.media).toBeNull();
      expect(mediaPrepared).toBe(false);
    });
  });
});
