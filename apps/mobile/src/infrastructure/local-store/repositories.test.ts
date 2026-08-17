import { describe, expect, it } from "vitest";
import { defaultReportSectionConfigs } from "@fielddoc/domain";

import { createNodeSqliteDatabase } from "./node-sqlite-database.test-helper";
import { createLocalRepositories } from "./repositories";
import { localDatabaseVersion } from "./schema";

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

describe("SQLite local repositories", () => {
  it("migrates from an empty database", async () => {
    await withRepositories(async ({ database }) => {
      const row = await database.getFirst<{ version: number }>(
        "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1",
      );
      const indexRow = await database.getFirst<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_media_assets_evidence'",
      );
      const captionColumn = await database.getFirst<{ name: string }>(
        "SELECT name FROM pragma_table_info('media_assets') WHERE name = 'caption'",
      );
      const sectionsColumn = await database.getFirst<{ name: string }>(
        "SELECT name FROM pragma_table_info('report_drafts') WHERE name = 'sections_json'",
      );
      const generatedPdfColumn = await database.getFirst<{ name: string }>(
        "SELECT name FROM pragma_table_info('report_drafts') WHERE name = 'generated_pdf_uri'",
      );
      const reportDraftIndex = await database.getFirst<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_report_drafts_project_updated'",
      );
      const syncClientStateTable = await database.getFirst<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sync_client_state'",
      );
      const mediaStorageColumn = await database.getFirst<{ name: string }>(
        "SELECT name FROM pragma_table_info('media_assets') WHERE name = 'storage_object_key'",
      );
      const mediaUploadedAtColumn = await database.getFirst<{ name: string }>(
        "SELECT name FROM pragma_table_info('media_assets') WHERE name = 'uploaded_at'",
      );
      const importantEvidenceColumn = await database.getFirst<{
        name: string;
      }>(
        "SELECT name FROM pragma_table_info('evidence_items') WHERE name = 'is_important'",
      );

      expect(row?.version).toBe(localDatabaseVersion);
      expect(indexRow?.name).toBe("idx_media_assets_evidence");
      expect(captionColumn?.name).toBe("caption");
      expect(sectionsColumn?.name).toBe("sections_json");
      expect(generatedPdfColumn?.name).toBe("generated_pdf_uri");
      expect(reportDraftIndex?.name).toBe("idx_report_drafts_project_updated");
      expect(syncClientStateTable?.name).toBe("sync_client_state");
      expect(mediaStorageColumn?.name).toBe("storage_object_key");
      expect(mediaUploadedAtColumn?.name).toBe("uploaded_at");
      expect(importantEvidenceColumn?.name).toBe("is_important");
    });
  });

  it("persists projects and supports search and ordering", async () => {
    await withRepositories(async ({ projects }) => {
      const first = await projects.create({
        name: "Unit 12 Turnover",
        customerCompany: "Rivergate",
      });
      await projects.create({ name: "HVAC filter", siteAddress: "Warehouse" });

      expect(
        (await projects.list({ query: "river" })).map((project) => project.id),
      ).toEqual([first.id]);
      expect(
        (await projects.list({ sortBy: "name", sortDirection: "asc" })).map(
          (project) => project.name,
        ),
      ).toEqual(["HVAC filter", "Unit 12 Turnover"]);
    });
  });

  it("soft deletes projects and generates mutations", async () => {
    await withRepositories(async ({ projects, mutations }) => {
      const project = await projects.create({ name: "Soft delete me" });
      await projects.delete(project.id);

      expect(await projects.getById(project.id)).toBeNull();
      expect(await mutations.countPending()).toBe(2);
      expect(
        (await mutations.listPending()).map((mutation) => mutation.operation),
      ).toEqual(["CREATE", "DELETE"]);
    });
  });

  it("archives projects without deleting their record", async () => {
    await withRepositories(async ({ projects }) => {
      const project = await projects.create({ name: "Archive me" });
      await projects.archive(project.id);

      expect(await projects.list()).toEqual([]);
      expect((await projects.list({ includeArchived: true }))[0]?.status).toBe(
        "archived",
      );
    });
  });

  it("stores evidence metadata in project order and summarizes report readiness", async () => {
    await withRepositories(async ({ projects, evidence }) => {
      const project = await projects.create({ name: "Evidence project" });
      const after = await evidence.create({
        projectId: project.id,
        category: "AFTER",
        title: "Done",
        caption: "Finished work",
      });
      const before = await evidence.create({
        projectId: project.id,
        category: "BEFORE",
        title: "Before",
      });

      expect(
        (await evidence.listByProject(project.id)).map((item) => item.id),
      ).toEqual([before.id, after.id]);
      expect(await evidence.summarizeProject(project.id)).toMatchObject({
        beforeCount: 1,
        afterCount: 1,
        missingCaptionCount: 1,
      });
    });
  });

  it("persists important evidence and generates update mutations", async () => {
    await withRepositories(async ({ projects, evidence, mutations }) => {
      const project = await projects.create({ name: "Important project" });
      const item = await evidence.create({
        projectId: project.id,
        category: "WORK",
        title: "Critical damage",
        isImportant: true,
      });

      expect(item.isImportant).toBe(true);
      expect(await evidence.summarizeProject(project.id)).toMatchObject({
        importantCount: 1,
      });

      const updated = await evidence.update(item.id, { isImportant: false });

      expect(updated.isImportant).toBe(false);
      expect(await evidence.summarizeProject(project.id)).toMatchObject({
        importantCount: 0,
      });
      expect(
        (await mutations.listPending()).map((mutation) => mutation.operation),
      ).toEqual(["CREATE", "CREATE", "UPDATE"]);
    });
  });

  it("stores local media assets and summarizes attached originals", async () => {
    await withRepositories(async ({ projects, evidence, media, mutations }) => {
      const project = await projects.create({ name: "Media project" });
      const item = await evidence.create({
        projectId: project.id,
        category: "BEFORE",
        title: "Front elevation",
        caption: "Before work started",
      });
      const mediaAsset = await media.create({
        evidenceItemId: item.id,
        localUri: "file:///fielddoc/evidence-originals/original.jpg",
        mediaType: "IMAGE",
        mimeType: "image/jpeg",
        sizeBytes: 2048,
        sha256:
          "3a6eb0790f39ac87c94f3856b2dd2c5d110e6811602261a9a923d3bb23adc8b7",
        width: 1200,
        height: 800,
        captureTimestamp: "2026-08-15T12:00:00.000Z",
        sourceType: "CAMERA_PHOTO",
      });

      expect(await media.listByEvidenceItem(item.id)).toEqual([mediaAsset]);
      expect(await media.listByProject(project.id)).toEqual([mediaAsset]);
      expect(await media.listByEvidenceIds([item.id])).toEqual([mediaAsset]);
      expect(await media.countByEvidenceIds([item.id])).toEqual({
        [item.id]: 1,
      });
      expect(await evidence.summarizeProject(project.id)).toMatchObject({
        beforeCount: 1,
        mediaAssetCount: 1,
        missingCaptionCount: 0,
      });
      expect(
        (await mutations.listPending()).map((mutation) => mutation.entityType),
      ).toEqual(["Project", "EvidenceItem", "MediaAsset"]);
    });
  });

  it("marks media assets uploaded without mutating immutable original metadata", async () => {
    await withRepositories(async ({ projects, evidence, media, mutations }) => {
      const project = await projects.create({ name: "Cloud media project" });
      const item = await evidence.create({
        projectId: project.id,
        category: "WORK",
      });
      const mediaAsset = await media.create({
        evidenceItemId: item.id,
        localUri: "file:///fielddoc/evidence-originals/original.jpg",
        mediaType: "IMAGE",
        mimeType: "image/jpeg",
        sizeBytes: 8192,
        sha256:
          "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
        width: 1600,
        height: 1200,
        sourceType: "CAMERA_PHOTO",
      });

      const uploaded = await media.markUploaded(mediaAsset.id, {
        storageObjectKey:
          "organizations/org-1/evidence/item-1/originals/media-1.jpg",
        uploadedAt: "2026-08-16T14:00:00.000Z",
      });
      const pending = await mutations.listPending();
      const uploadMutation = pending.at(-1);

      expect(uploaded).toMatchObject({
        id: mediaAsset.id,
        localUri: mediaAsset.localUri,
        sha256: mediaAsset.sha256,
        storageObjectKey:
          "organizations/org-1/evidence/item-1/originals/media-1.jpg",
        uploadedAt: "2026-08-16T14:00:00.000Z",
        syncState: "PENDING",
      });
      expect(uploadMutation).toMatchObject({
        entityType: "MediaAsset",
        entityId: mediaAsset.id,
        operation: "UPDATE",
      });
      expect(JSON.parse(uploadMutation?.payloadJson ?? "{}")).toMatchObject({
        storageObjectKey:
          "organizations/org-1/evidence/item-1/originals/media-1.jpg",
        uploadedAt: "2026-08-16T14:00:00.000Z",
      });
    });
  });

  it("soft deletes media assets without deleting evidence metadata", async () => {
    await withRepositories(async ({ projects, evidence, media, mutations }) => {
      const project = await projects.create({ name: "Delete media project" });
      const item = await evidence.create({
        projectId: project.id,
        category: "WORK",
      });
      const mediaAsset = await media.create({
        evidenceItemId: item.id,
        localUri: "file:///fielddoc/evidence-originals/original.pdf",
        mediaType: "DOCUMENT",
        mimeType: "application/pdf",
        sizeBytes: 4096,
        sha256:
          "11507a0e2f5e69d5c15a8e65b7ef464041602a06120573cd9f8021c3d1f2f4e7",
        sourceType: "FILE_IMPORT",
      });

      await media.delete(mediaAsset.id);

      expect(await media.listByEvidenceItem(item.id)).toEqual([]);
      expect(await media.listByEvidenceIds([item.id])).toEqual([]);
      expect((await evidence.listByProject(project.id))[0]?.id).toBe(item.id);
      expect(await evidence.summarizeProject(project.id)).toMatchObject({
        workCount: 1,
        mediaAssetCount: 0,
      });
      expect(
        (await mutations.listPending()).map((mutation) => mutation.operation),
      ).toEqual(["CREATE", "CREATE", "CREATE", "DELETE"]);
    });
  });

  it("updates and restores media asset captions without changing original metadata", async () => {
    await withRepositories(async ({ projects, evidence, media, mutations }) => {
      const project = await projects.create({ name: "Caption media project" });
      const item = await evidence.create({
        projectId: project.id,
        category: "AFTER",
      });
      const mediaAsset = await media.create({
        evidenceItemId: item.id,
        localUri: "file:///fielddoc/evidence-originals/original.jpg",
        mediaType: "IMAGE",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        sha256:
          "98ea6e4f216f6b40ff97e8c9f869121554d2fe7d3a3b0a2f3ea5b785a003d77d",
        sourceType: "PHOTO_LIBRARY",
      });

      const updated = await media.updateMetadata(mediaAsset.id, {
        caption: "Finished trim",
        notes: "Shows caulk line after punch list.",
      });
      await media.delete(mediaAsset.id);
      const restored = await media.restore(mediaAsset.id);

      expect(updated).toMatchObject({
        id: mediaAsset.id,
        localUri: mediaAsset.localUri,
        sha256: mediaAsset.sha256,
        caption: "Finished trim",
        notes: "Shows caulk line after punch list.",
      });
      expect(restored.deletedAt).toBeNull();
      expect(restored.caption).toBe("Finished trim");
      expect(await media.listByEvidenceItem(item.id)).toHaveLength(1);
      expect(
        (await mutations.listPending()).map((mutation) => mutation.operation),
      ).toEqual(["CREATE", "CREATE", "CREATE", "UPDATE", "DELETE", "UPDATE"]);
    });
  });

  it("stores and restores non-destructive annotations", async () => {
    await withRepositories(
      async ({ projects, evidence, media, annotations, mutations }) => {
        const project = await projects.create({ name: "Annotation project" });
        const item = await evidence.create({
          projectId: project.id,
          category: "BEFORE",
        });
        const mediaAsset = await media.create({
          evidenceItemId: item.id,
          localUri: "file:///fielddoc/evidence-originals/original.jpg",
          mediaType: "IMAGE",
          mimeType: "image/jpeg",
          sizeBytes: 1024,
          sha256:
            "b94d27b9934d3e08a52e52d7da7dabfadee09a0f399175a67d90b4d85b9a827a",
          sourceType: "CAMERA_PHOTO",
        });
        const annotation = await annotations.create({
          evidenceItemId: item.id,
          mediaAssetId: mediaAsset.id,
          body: "Existing damage visible at lower hinge.",
        });

        await annotations.delete(annotation.id);
        expect(await annotations.listByEvidenceItem(item.id)).toEqual([]);
        expect(
          await annotations.listByEvidenceItem(item.id, {
            includeDeleted: true,
          }),
        ).toHaveLength(1);

        const restored = await annotations.restore(annotation.id);

        expect(restored.deletedAt).toBeNull();
        expect(await annotations.listByEvidenceIds([item.id])).toMatchObject([
          {
            body: "Existing damage visible at lower hinge.",
            mediaAssetId: mediaAsset.id,
          },
        ]);
        expect(await annotations.listByEvidenceItem(item.id)).toMatchObject([
          {
            body: "Existing damage visible at lower hinge.",
            mediaAssetId: mediaAsset.id,
          },
        ]);
        expect(
          (await mutations.listPending()).map(
            (mutation) => mutation.entityType,
          ),
        ).toEqual([
          "Project",
          "EvidenceItem",
          "MediaAsset",
          "Annotation",
          "Annotation",
          "Annotation",
        ]);
      },
    );
  });

  it("saves and updates local report draft composition", async () => {
    await withRepositories(async ({ projects, reportDrafts, mutations }) => {
      const project = await projects.create({ name: "Report project" });
      const draft = await reportDrafts.save({
        projectId: project.id,
        title: "  Unit 12 closeout  ",
        notes: "  Internal QA note  ",
        sections: [
          {
            category: "AFTER",
            label: "Completion",
            included: true,
            sortOrder: 0,
          },
          {
            category: "BEFORE",
            label: "Existing conditions",
            included: true,
            sortOrder: 1,
          },
        ],
      });

      expect(draft).toMatchObject({
        projectId: project.id,
        title: "Unit 12 closeout",
        notes: "Internal QA note",
        status: "draft",
        generatedPdfUri: null,
        generatedAt: null,
        syncState: "PENDING",
      });
      expect(JSON.parse(draft.sectionsJson).slice(0, 2)).toMatchObject([
        { category: "AFTER", label: "Completion", included: true },
        { category: "BEFORE", label: "Existing conditions", included: true },
      ]);

      const updated = await reportDrafts.save({
        id: draft.id,
        projectId: project.id,
        title: "Final proof packet",
        notes: "",
        sections: defaultReportSectionConfigs.map((section) =>
          section.category === "OTHER"
            ? { ...section, included: true, sortOrder: 0 }
            : { ...section, sortOrder: section.sortOrder + 1 },
        ),
      });

      expect(updated.id).toBe(draft.id);
      expect(updated.notes).toBeNull();
      expect(updated.status).toBe("draft");
      expect(updated.generatedPdfUri).toBeNull();
      expect(await reportDrafts.listByProject(project.id)).toHaveLength(1);
      expect((await reportDrafts.getLatestByProject(project.id))?.title).toBe(
        "Final proof packet",
      );
      expect((await reportDrafts.getById(draft.id))?.title).toBe(
        "Final proof packet",
      );
      expect(
        (await mutations.listPending()).map((mutation) => mutation.operation),
      ).toEqual(["CREATE", "CREATE", "UPDATE"]);
    });
  });

  it("lists local report history with generated-only defaults and project filters", async () => {
    await withRepositories(async ({ projects, reportDrafts }) => {
      const generatedProject = await projects.create({
        name: "Generated history project",
      });
      const draftProject = await projects.create({
        name: "Draft history project",
      });
      const generatedDraft = await reportDrafts.save({
        projectId: generatedProject.id,
        title: "Generated closeout",
        sections: defaultReportSectionConfigs,
      });
      const unsentDraft = await reportDrafts.save({
        projectId: draftProject.id,
        title: "Draft closeout",
        sections: defaultReportSectionConfigs,
      });

      await reportDrafts.markGeneratedPdf(generatedDraft.id, {
        localUri: "file:///fielddoc/proof-packets/generated-history.pdf",
        generatedAt: "2026-08-15T15:00:00.000Z",
      });

      expect(
        (await reportDrafts.listHistory()).map((item) => item.draftId),
      ).toEqual([generatedDraft.id]);

      const fullHistory = await reportDrafts.listHistory({
        includeDrafts: true,
      });

      expect(fullHistory).toMatchObject([
        {
          draftId: generatedDraft.id,
          projectName: "Generated history project",
          title: "Generated closeout",
          hasGeneratedPdf: true,
          status: "ready",
        },
        {
          draftId: unsentDraft.id,
          projectName: "Draft history project",
          title: "Draft closeout",
          hasGeneratedPdf: false,
          status: "draft",
        },
      ]);
      expect(
        (
          await reportDrafts.listHistory({
            projectId: draftProject.id,
            includeDrafts: true,
          })
        ).map((item) => item.draftId),
      ).toEqual([unsentDraft.id]);
    });
  });

  it("marks report drafts with a generated local PDF and invalidates stale output on save", async () => {
    await withRepositories(async ({ projects, reportDrafts, mutations }) => {
      const project = await projects.create({ name: "Generated report" });
      const draft = await reportDrafts.save({
        projectId: project.id,
        sections: defaultReportSectionConfigs,
      });
      const generated = await reportDrafts.markGeneratedPdf(draft.id, {
        localUri: "file:///fielddoc/proof-packets/generated-report.pdf",
        generatedAt: "2026-08-15T15:00:00.000Z",
      });

      expect(generated).toMatchObject({
        id: draft.id,
        status: "ready",
        generatedPdfUri: "file:///fielddoc/proof-packets/generated-report.pdf",
        generatedPdfStorageObjectKey: null,
        generatedPdfSha256: null,
        generatedPdfSizeBytes: null,
        generatedPdfUploadedAt: null,
        generatedAt: "2026-08-15T15:00:00.000Z",
      });

      const edited = await reportDrafts.save({
        id: draft.id,
        projectId: project.id,
        title: "Edited report",
        sections: defaultReportSectionConfigs,
      });

      expect(edited.status).toBe("draft");
      expect(edited.generatedPdfUri).toBeNull();
      expect(edited.generatedPdfStorageObjectKey).toBeNull();
      expect(edited.generatedPdfSha256).toBeNull();
      expect(edited.generatedPdfSizeBytes).toBeNull();
      expect(edited.generatedPdfUploadedAt).toBeNull();
      expect(edited.generatedAt).toBeNull();
      expect(
        (await mutations.listPending()).map((mutation) => mutation.operation),
      ).toEqual(["CREATE", "CREATE", "UPDATE", "UPDATE"]);
    });
  });

  it("marks generated report PDFs as uploaded and tracks pending PDF upload order", async () => {
    await withRepositories(async ({ projects, reportDrafts, mutations }) => {
      const project = await projects.create({ name: "Uploaded report" });
      const draft = await reportDrafts.save({
        projectId: project.id,
        sections: defaultReportSectionConfigs,
      });
      const generated = await reportDrafts.markGeneratedPdf(draft.id, {
        localUri: "file:///fielddoc/proof-packets/generated-report.pdf",
        generatedAt: "2026-08-15T15:00:00.000Z",
      });

      expect(await reportDrafts.listPendingPdfUpload()).toMatchObject([
        { id: generated.id },
      ]);

      const uploaded = await reportDrafts.markGeneratedPdfUploaded(
        generated.id,
        {
          storageObjectKey:
            "organizations/org/reports/report/exports/generated-report.pdf",
          sha256:
            "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
          sizeBytes: 4096,
          uploadedAt: "2026-08-15T15:05:00.000Z",
        },
      );

      expect(uploaded).toMatchObject({
        generatedPdfStorageObjectKey:
          "organizations/org/reports/report/exports/generated-report.pdf",
        generatedPdfSha256:
          "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
        generatedPdfSizeBytes: 4096,
        generatedPdfUploadedAt: "2026-08-15T15:05:00.000Z",
      });
      expect(await reportDrafts.listPendingPdfUpload()).toEqual([]);
      expect(
        (await mutations.listPending()).map((mutation) => mutation.entityType),
      ).toEqual(["Project", "ReportDraft", "ReportDraft", "ReportDraft"]);
    });
  });

  it("soft deletes report drafts and generates a durable mutation", async () => {
    await withRepositories(async ({ projects, reportDrafts, mutations }) => {
      const project = await projects.create({ name: "Delete report draft" });
      const draft = await reportDrafts.save({
        projectId: project.id,
        sections: defaultReportSectionConfigs,
      });

      await reportDrafts.delete(draft.id);

      expect(await reportDrafts.getLatestByProject(project.id)).toBeNull();
      expect(await reportDrafts.listByProject(project.id)).toEqual([]);
      expect(
        (await mutations.listPending()).map((mutation) => mutation.entityType),
      ).toEqual(["Project", "ReportDraft", "ReportDraft"]);
      expect(
        (await mutations.listPending()).map((mutation) => mutation.operation),
      ).toEqual(["CREATE", "CREATE", "DELETE"]);
    });
  });

  it("deduplicates mutations by mutation id", async () => {
    await withRepositories(async ({ mutations }) => {
      await mutations.enqueue({
        mutationId: "same-mutation",
        entityType: "Project",
        entityId: "project-1",
        operation: "UPDATE",
        payloadRef: "v1",
        payloadJson: "{}",
        createdAt: "2026-08-12T20:00:00.000Z",
      });
      await mutations.enqueue({
        mutationId: "same-mutation",
        entityType: "Project",
        entityId: "project-1",
        operation: "UPDATE",
        payloadRef: "v1",
        payloadJson: '{"ignored":true}',
        createdAt: "2026-08-12T20:00:01.000Z",
      });

      expect(await mutations.countPending()).toBe(1);
      expect((await mutations.listPending())[0]?.payloadJson).toBe("{}");
    });
  });

  it("lists uploadable mutations and reconciles receipt states", async () => {
    await withRepositories(async ({ mutations }) => {
      await mutations.enqueue({
        mutationId: "pending-mutation",
        entityType: "Project",
        entityId: "3f205a6f-3f5f-4f85-baba-f1dac348273a",
        operation: "CREATE",
        payloadRef: "v1",
        payloadJson: "{}",
        createdAt: "2026-08-16T10:00:00.000Z",
        syncState: "PENDING",
      });
      await mutations.enqueue({
        mutationId: "local-only-mutation",
        entityType: "Project",
        entityId: "3f205a6f-3f5f-4f85-baba-f1dac348273a",
        operation: "UPDATE",
        payloadRef: "v2",
        payloadJson: "{}",
        createdAt: "2026-08-16T10:01:00.000Z",
        syncState: "LOCAL_ONLY",
      });

      expect(
        (await mutations.listUploadable()).map(
          (mutation) => mutation.mutationId,
        ),
      ).toEqual(["pending-mutation"]);

      await mutations.markSynced(["pending-mutation"]);
      await mutations.markFailed(["local-only-mutation"]);

      const rows = await mutations.listPending();
      expect(rows).toMatchObject([
        {
          mutationId: "local-only-mutation",
          attemptCount: 1,
          syncState: "FAILED",
        },
      ]);
    });
  });

  it("creates a stable local sync device id", async () => {
    await withRepositories(async ({ syncClientState }) => {
      const first = await syncClientState.getOrCreateDeviceId();
      const second = await syncClientState.getOrCreateDeviceId();

      expect(first).toBe(second);
      expect(first).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
    });
  });
});
