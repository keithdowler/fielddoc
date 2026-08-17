import { describe, expect, it } from "vitest";
import { defaultReportSectionConfigs } from "@fielddoc/domain";

import { createNodeSqliteDatabase } from "@/infrastructure/local-store/node-sqlite-database.test-helper";
import { createLocalRepositories } from "@/infrastructure/local-store/repositories";

import { runMobileReportUpload } from "./mobile-report-upload";

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

const sha256 =
  "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";

describe("runMobileReportUpload", () => {
  it("uploads generated report PDFs and records private storage state", async () => {
    await withRepositories(async (repositories) => {
      const project = await repositories.projects.create({
        name: "Report upload project",
      });
      const draft = await repositories.reportDrafts.save({
        projectId: project.id,
        title: "Proof Packet",
        sections: defaultReportSectionConfigs,
      });
      const generatedDraft = await repositories.reportDrafts.markGeneratedPdf(
        draft.id,
        {
          localUri: "file:///fielddoc/reports/report.pdf",
          generatedAt: "2026-08-17T15:00:00.000Z",
        },
      );
      const calls: string[] = [];

      const result = await runMobileReportUpload({
        repositories,
        apiBaseUrl: "https://proof.example",
        tokenProvider: { getAccessToken: async () => "token" },
        now: () => new Date("2026-08-17T15:02:00.000Z"),
        metadataProvider: async (localUri) => {
          calls.push(`metadata:${localUri}`);
          return { sha256, sizeBytes: 4096 };
        },
        apiClient: {
          async prepareReportPdfUpload(input) {
            calls.push("prepare-report");
            return {
              reportDraftId: input.reportDraftId,
              storageObjectKey: `organizations/org/reports/${input.reportDraftId}/exports/${input.sha256}.pdf`,
              uploadUrl: "https://uploads.example.test/report.pdf",
              requiredHeaders: {
                "Content-Type": "application/pdf",
                "x-amz-meta-sha256": input.sha256,
              },
              expiresAt: "2026-08-17T15:10:00.000Z",
            };
          },
          async completeReportPdfUpload(input) {
            calls.push("complete-report");
            return {
              reportDraftId: input.reportDraftId,
              reportExportId: "44444444-4444-4444-8444-444444444444",
              storageObjectKey: input.storageObjectKey,
              uploadedAt: input.uploadedAt,
              status: "recorded",
            };
          },
        },
        uploadBinary: async () => {
          calls.push("binary");
          return { status: 200 };
        },
      });

      expect(result.status).toBe("success");
      expect(result.uploadedCount).toBe(1);
      expect(calls).toEqual([
        "metadata:file:///fielddoc/reports/report.pdf",
        "prepare-report",
        "binary",
        "complete-report",
      ]);
      await expect(
        repositories.reportDrafts.getById(generatedDraft.id),
      ).resolves.toMatchObject({
        id: generatedDraft.id,
        generatedPdfStorageObjectKey: `organizations/org/reports/${generatedDraft.id}/exports/${sha256}.pdf`,
        generatedPdfSha256: sha256,
        generatedPdfSizeBytes: 4096,
        generatedPdfUploadedAt: "2026-08-17T15:02:00.000Z",
      });
    });
  });

  it("returns idle when no generated report PDFs need upload", async () => {
    await withRepositories(async (repositories) => {
      const result = await runMobileReportUpload({
        repositories,
        apiBaseUrl: "https://proof.example",
        tokenProvider: { getAccessToken: async () => "token" },
      });

      expect(result).toMatchObject({
        status: "idle",
        attemptedCount: 0,
        pendingCount: 0,
      });
    });
  });

  it("keeps pending state when private PDF upload fails", async () => {
    await withRepositories(async (repositories) => {
      const project = await repositories.projects.create({
        name: "Failed report upload project",
      });
      const draft = await repositories.reportDrafts.save({
        projectId: project.id,
        title: "Proof Packet",
        sections: defaultReportSectionConfigs,
      });
      await repositories.reportDrafts.markGeneratedPdf(draft.id, {
        localUri: "file:///fielddoc/reports/report.pdf",
        generatedAt: "2026-08-17T15:00:00.000Z",
      });

      const result = await runMobileReportUpload({
        repositories,
        apiBaseUrl: "https://proof.example",
        tokenProvider: { getAccessToken: async () => "token" },
        metadataProvider: async () => ({ sha256, sizeBytes: 4096 }),
        apiClient: {
          async prepareReportPdfUpload(input) {
            return {
              reportDraftId: input.reportDraftId,
              storageObjectKey: `organizations/org/reports/${input.reportDraftId}/exports/${input.sha256}.pdf`,
              uploadUrl: "https://uploads.example.test/report.pdf",
              requiredHeaders: {},
              expiresAt: "2026-08-17T15:10:00.000Z",
            };
          },
          async completeReportPdfUpload() {
            throw new Error("Complete should not run after binary failure.");
          },
        },
        uploadBinary: async () => ({ status: 503 }),
      });

      expect(result.status).toBe("failed");
      expect(result.failedCount).toBe(1);
      expect(
        await repositories.reportDrafts.listPendingPdfUpload(),
      ).toHaveLength(1);
    });
  });
});
