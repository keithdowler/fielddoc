import {
  type ProofPacketStatus,
  type MarkReportDraftGeneratedInput,
  type MarkReportDraftUploadedInput,
  type ReportHistoryItem,
  type ReportHistoryOptions,
  type ReportDraft,
  type ReportDraftRepository,
  type SaveReportDraftInput,
  type SyncState,
  normalizeOptionalText,
  normalizeReportSections,
} from "@fielddoc/domain";

import type { LocalDatabase } from "./database";
import { createLocalId } from "./id";
import { SqliteLocalMutationRepository } from "./mutations";

type ReportDraftRow = {
  id: string;
  project_id: string;
  title: string;
  notes: string | null;
  sections_json: string;
  status: ProofPacketStatus;
  generated_pdf_uri: string | null;
  generated_pdf_storage_object_key: string | null;
  generated_pdf_sha256: string | null;
  generated_pdf_size_bytes: number | null;
  generated_pdf_uploaded_at: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_state: SyncState;
};

type ReportHistoryRow = {
  draft_id: string;
  project_id: string;
  project_name: string;
  title: string;
  status: ProofPacketStatus;
  generated_pdf_uri: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
  sync_state: SyncState;
};

function mapReportDraft(row: ReportDraftRow): ReportDraft {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    notes: row.notes,
    sectionsJson: row.sections_json,
    status: row.status,
    generatedPdfUri: row.generated_pdf_uri,
    generatedPdfStorageObjectKey: row.generated_pdf_storage_object_key,
    generatedPdfSha256: row.generated_pdf_sha256,
    generatedPdfSizeBytes: row.generated_pdf_size_bytes,
    generatedPdfUploadedAt: row.generated_pdf_uploaded_at,
    generatedAt: row.generated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncState: row.sync_state,
  };
}

function mapReportHistory(row: ReportHistoryRow): ReportHistoryItem {
  return {
    draftId: row.draft_id,
    projectId: row.project_id,
    projectName: row.project_name,
    title: row.title,
    status: row.status,
    generatedPdfUri: row.generated_pdf_uri,
    generatedAt: row.generated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    hasGeneratedPdf: Boolean(row.generated_pdf_uri),
    syncState: row.sync_state,
  };
}

export class SqliteReportDraftRepository implements ReportDraftRepository {
  constructor(private readonly database: LocalDatabase) {}

  async save(input: SaveReportDraftInput): Promise<ReportDraft> {
    const now = new Date().toISOString();
    const existing = input.id
      ? await this.database.getFirst<ReportDraftRow>(
          "SELECT * FROM report_drafts WHERE id = ? AND deleted_at IS NULL",
          [input.id],
        )
      : await this.getLatestRowByProject(input.projectId);
    const sectionsJson = JSON.stringify(
      normalizeReportSections(input.sections),
    );
    const title = input.title?.trim() || "FieldDoc Report Draft";
    const reportDraft: ReportDraft = {
      id: existing?.id ?? createLocalId("report"),
      projectId: input.projectId,
      title,
      notes: normalizeOptionalText(input.notes),
      sectionsJson,
      status: "draft",
      generatedPdfUri: null,
      generatedPdfStorageObjectKey: null,
      generatedPdfSha256: null,
      generatedPdfSizeBytes: null,
      generatedPdfUploadedAt: null,
      generatedAt: null,
      createdAt: existing?.created_at ?? now,
      updatedAt: now,
      deletedAt: null,
      syncState: "PENDING",
    };
    const operation = existing ? "UPDATE" : "CREATE";

    await this.database.transaction(async (tx) => {
      if (existing) {
        await tx.run(
          `
            UPDATE report_drafts
            SET title = ?,
                notes = ?,
                sections_json = ?,
                status = ?,
                generated_pdf_uri = ?,
                generated_pdf_storage_object_key = ?,
                generated_pdf_sha256 = ?,
                generated_pdf_size_bytes = ?,
                generated_pdf_uploaded_at = ?,
                generated_at = ?,
                updated_at = ?,
                sync_state = ?
            WHERE id = ?
          `,
          [
            reportDraft.title,
            reportDraft.notes,
            reportDraft.sectionsJson,
            reportDraft.status,
            reportDraft.generatedPdfUri,
            reportDraft.generatedPdfStorageObjectKey,
            reportDraft.generatedPdfSha256,
            reportDraft.generatedPdfSizeBytes,
            reportDraft.generatedPdfUploadedAt,
            reportDraft.generatedAt,
            reportDraft.updatedAt,
            reportDraft.syncState,
            reportDraft.id,
          ],
        );
      } else {
        await tx.run(
          `
            INSERT INTO report_drafts (
              id,
              project_id,
              title,
              notes,
              sections_json,
              status,
              generated_pdf_uri,
              generated_pdf_storage_object_key,
              generated_pdf_sha256,
              generated_pdf_size_bytes,
              generated_pdf_uploaded_at,
              generated_at,
              created_at,
              updated_at,
              deleted_at,
              sync_state
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            reportDraft.id,
            reportDraft.projectId,
            reportDraft.title,
            reportDraft.notes,
            reportDraft.sectionsJson,
            reportDraft.status,
            reportDraft.generatedPdfUri,
            reportDraft.generatedPdfStorageObjectKey,
            reportDraft.generatedPdfSha256,
            reportDraft.generatedPdfSizeBytes,
            reportDraft.generatedPdfUploadedAt,
            reportDraft.generatedAt,
            reportDraft.createdAt,
            reportDraft.updatedAt,
            reportDraft.deletedAt,
            reportDraft.syncState,
          ],
        );
      }

      await new SqliteLocalMutationRepository(tx).enqueue({
        mutationId: `report:${reportDraft.id}:${operation.toLowerCase()}:${reportDraft.updatedAt}`,
        entityType: "ReportDraft",
        entityId: reportDraft.id,
        operation,
        payloadRef: reportDraft.updatedAt,
        payloadJson: JSON.stringify(reportDraft),
        createdAt: now,
      });
    });

    return reportDraft;
  }

  async markGeneratedPdf(
    id: string,
    input: MarkReportDraftGeneratedInput,
  ): Promise<ReportDraft> {
    const existing = await this.database.getFirst<ReportDraftRow>(
      "SELECT * FROM report_drafts WHERE id = ? AND deleted_at IS NULL",
      [id],
    );

    if (!existing) {
      throw new Error("Report draft not found.");
    }

    const now = new Date().toISOString();
    const reportDraft: ReportDraft = {
      ...mapReportDraft(existing),
      status: "ready",
      generatedPdfUri: input.localUri,
      generatedPdfStorageObjectKey: null,
      generatedPdfSha256: null,
      generatedPdfSizeBytes: null,
      generatedPdfUploadedAt: null,
      generatedAt: input.generatedAt,
      updatedAt: now,
      syncState: "PENDING",
    };

    await this.database.transaction(async (tx) => {
      await tx.run(
        `
          UPDATE report_drafts
          SET status = ?,
              generated_pdf_uri = ?,
              generated_pdf_storage_object_key = ?,
              generated_pdf_sha256 = ?,
              generated_pdf_size_bytes = ?,
              generated_pdf_uploaded_at = ?,
              generated_at = ?,
              updated_at = ?,
              sync_state = ?
          WHERE id = ? AND deleted_at IS NULL
        `,
        [
          reportDraft.status,
          reportDraft.generatedPdfUri,
          reportDraft.generatedPdfStorageObjectKey,
          reportDraft.generatedPdfSha256,
          reportDraft.generatedPdfSizeBytes,
          reportDraft.generatedPdfUploadedAt,
          reportDraft.generatedAt,
          reportDraft.updatedAt,
          reportDraft.syncState,
          id,
        ],
      );
      await new SqliteLocalMutationRepository(tx).enqueue({
        mutationId: `report:${id}:generated-pdf:${reportDraft.updatedAt}`,
        entityType: "ReportDraft",
        entityId: id,
        operation: "UPDATE",
        payloadRef: reportDraft.updatedAt,
        payloadJson: JSON.stringify(reportDraft),
        createdAt: now,
      });
    });

    return reportDraft;
  }

  async markGeneratedPdfUploaded(
    id: string,
    input: MarkReportDraftUploadedInput,
  ): Promise<ReportDraft> {
    const existing = await this.database.getFirst<ReportDraftRow>(
      "SELECT * FROM report_drafts WHERE id = ? AND deleted_at IS NULL",
      [id],
    );

    if (!existing) {
      throw new Error("Report draft not found.");
    }

    const now = new Date().toISOString();
    const reportDraft: ReportDraft = {
      ...mapReportDraft(existing),
      generatedPdfStorageObjectKey: input.storageObjectKey,
      generatedPdfSha256: input.sha256,
      generatedPdfSizeBytes: input.sizeBytes,
      generatedPdfUploadedAt: input.uploadedAt,
      updatedAt: now,
      syncState: "PENDING",
    };

    await this.database.transaction(async (tx) => {
      await tx.run(
        `
          UPDATE report_drafts
          SET generated_pdf_storage_object_key = ?,
              generated_pdf_sha256 = ?,
              generated_pdf_size_bytes = ?,
              generated_pdf_uploaded_at = ?,
              updated_at = ?,
              sync_state = ?
          WHERE id = ? AND deleted_at IS NULL
        `,
        [
          reportDraft.generatedPdfStorageObjectKey,
          reportDraft.generatedPdfSha256,
          reportDraft.generatedPdfSizeBytes,
          reportDraft.generatedPdfUploadedAt,
          reportDraft.updatedAt,
          reportDraft.syncState,
          id,
        ],
      );
      await new SqliteLocalMutationRepository(tx).enqueue({
        mutationId: `report:${id}:cloud-pdf:${reportDraft.updatedAt}`,
        entityType: "ReportDraft",
        entityId: id,
        operation: "UPDATE",
        payloadRef: reportDraft.updatedAt,
        payloadJson: JSON.stringify(reportDraft),
        createdAt: now,
      });
    });

    return reportDraft;
  }

  async getLatestByProject(projectId: string): Promise<ReportDraft | null> {
    const row = await this.getLatestRowByProject(projectId);
    return row ? mapReportDraft(row) : null;
  }

  async getById(id: string): Promise<ReportDraft | null> {
    const row = await this.database.getFirst<ReportDraftRow>(
      "SELECT * FROM report_drafts WHERE id = ? AND deleted_at IS NULL",
      [id],
    );

    return row ? mapReportDraft(row) : null;
  }

  async listByProject(projectId: string): Promise<ReportDraft[]> {
    const rows = await this.database.getAll<ReportDraftRow>(
      `
        SELECT * FROM report_drafts
        WHERE project_id = ? AND deleted_at IS NULL
        ORDER BY updated_at DESC
      `,
      [projectId],
    );

    return rows.map(mapReportDraft);
  }

  async listHistory(
    options: ReportHistoryOptions = {},
  ): Promise<ReportHistoryItem[]> {
    const where = [
      "report_drafts.deleted_at IS NULL",
      "projects.deleted_at IS NULL",
    ];
    const params: string[] = [];

    if (options.projectId) {
      where.push("report_drafts.project_id = ?");
      params.push(options.projectId);
    }

    if (!options.includeDrafts) {
      where.push("report_drafts.generated_pdf_uri IS NOT NULL");
    }

    const rows = await this.database.getAll<ReportHistoryRow>(
      `
        SELECT
          report_drafts.id AS draft_id,
          report_drafts.project_id AS project_id,
          projects.name AS project_name,
          report_drafts.title AS title,
          report_drafts.status AS status,
          report_drafts.generated_pdf_uri AS generated_pdf_uri,
          report_drafts.generated_at AS generated_at,
          report_drafts.created_at AS created_at,
          report_drafts.updated_at AS updated_at,
          report_drafts.sync_state AS sync_state
        FROM report_drafts
        INNER JOIN projects
          ON projects.id = report_drafts.project_id
        WHERE ${where.join(" AND ")}
        ORDER BY
          report_drafts.generated_at IS NULL ASC,
          COALESCE(report_drafts.generated_at, report_drafts.updated_at) DESC,
          report_drafts.updated_at DESC
      `,
      params,
    );

    return rows.map(mapReportHistory);
  }

  async listPendingPdfUpload(limit = 10): Promise<ReportDraft[]> {
    const rows = await this.database.getAll<ReportDraftRow>(
      `
        SELECT * FROM report_drafts
        WHERE generated_pdf_uri IS NOT NULL
          AND generated_pdf_uploaded_at IS NULL
          AND deleted_at IS NULL
        ORDER BY COALESCE(generated_at, updated_at) ASC
        LIMIT ?
      `,
      [limit],
    );

    return rows.map(mapReportDraft);
  }

  async delete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.database.transaction(async (tx) => {
      await tx.run(
        "UPDATE report_drafts SET deleted_at = ?, updated_at = ?, sync_state = ? WHERE id = ? AND deleted_at IS NULL",
        [now, now, "PENDING", id],
      );
      await new SqliteLocalMutationRepository(tx).enqueue({
        mutationId: `report:${id}:delete:${now}`,
        entityType: "ReportDraft",
        entityId: id,
        operation: "DELETE",
        payloadRef: now,
        payloadJson: JSON.stringify({ id, deletedAt: now }),
        createdAt: now,
      });
    });
  }

  private getLatestRowByProject(
    projectId: string,
  ): Promise<ReportDraftRow | null> {
    return this.database.getFirst<ReportDraftRow>(
      `
        SELECT * FROM report_drafts
        WHERE project_id = ? AND deleted_at IS NULL
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      [projectId],
    );
  }
}
