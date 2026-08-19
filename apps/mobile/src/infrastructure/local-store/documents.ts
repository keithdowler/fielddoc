import {
  type CreateDocumentInput,
  type Document,
  type DocumentRepository,
  type SyncState,
  type UpdateDocumentInput,
  normalizeOptionalText,
} from "@fielddoc/domain";

import type { LocalDatabase } from "./database";
import { createLocalId } from "./id";
import { SqliteLocalMutationRepository } from "./mutations";

type DocumentRow = {
  id: string;
  project_id: string;
  evidence_item_id: string | null;
  media_asset_id: string | null;
  title: string;
  notes: string | null;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  sha256: string | null;
  page_count: number | null;
  source_type: Document["sourceType"];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_state: SyncState;
};

function mapDocument(row: DocumentRow): Document {
  return {
    id: row.id,
    projectId: row.project_id,
    evidenceItemId: row.evidence_item_id,
    mediaAssetId: row.media_asset_id,
    title: row.title,
    notes: row.notes,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    sha256: row.sha256,
    pageCount: row.page_count,
    sourceType: row.source_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncState: row.sync_state,
  };
}

export class SqliteDocumentRepository implements DocumentRepository {
  constructor(private readonly database: LocalDatabase) {}

  async create(input: CreateDocumentInput): Promise<Document> {
    const now = new Date().toISOString();
    const document: Document = {
      id: createLocalId("document"),
      projectId: input.projectId,
      evidenceItemId: input.evidenceItemId ?? null,
      mediaAssetId: input.mediaAssetId ?? null,
      title: input.title.trim() || "Untitled document",
      notes: normalizeOptionalText(input.notes),
      fileName: normalizeNullable(input.fileName),
      mimeType: normalizeNullable(input.mimeType),
      sizeBytes: input.sizeBytes ?? null,
      sha256: normalizeNullable(input.sha256),
      pageCount: input.pageCount ?? null,
      sourceType: input.sourceType ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncState: "PENDING",
    };

    await this.database.transaction(async (tx) => {
      await tx.run(
        `
          INSERT INTO documents (
            id,
            project_id,
            evidence_item_id,
            media_asset_id,
            title,
            notes,
            file_name,
            mime_type,
            size_bytes,
            sha256,
            page_count,
            source_type,
            created_at,
            updated_at,
            deleted_at,
            sync_state
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          document.id,
          document.projectId,
          document.evidenceItemId,
          document.mediaAssetId,
          document.title,
          document.notes,
          document.fileName,
          document.mimeType,
          document.sizeBytes,
          document.sha256,
          document.pageCount,
          document.sourceType,
          document.createdAt,
          document.updatedAt,
          document.deletedAt,
          document.syncState,
        ],
      );
      await new SqliteLocalMutationRepository(tx).enqueue({
        mutationId: `document:${document.id}:create:${document.updatedAt}`,
        entityType: "Document",
        entityId: document.id,
        operation: "CREATE",
        payloadRef: document.updatedAt,
        payloadJson: JSON.stringify(document),
        createdAt: now,
      });
    });

    return document;
  }

  async update(id: string, input: UpdateDocumentInput): Promise<Document> {
    const existing = await this.database.getFirst<DocumentRow>(
      "SELECT * FROM documents WHERE id = ? AND deleted_at IS NULL",
      [id],
    );

    if (!existing) {
      throw new Error("Document not found.");
    }

    const updatedAt = new Date().toISOString();
    const document: Document = {
      ...mapDocument(existing),
      title:
        input.title === undefined
          ? existing.title
          : input.title.trim() || existing.title,
      notes:
        input.notes === undefined
          ? existing.notes
          : normalizeOptionalText(input.notes),
      pageCount:
        input.pageCount === undefined ? existing.page_count : input.pageCount,
      updatedAt,
      syncState: "PENDING",
    };

    await this.database.transaction(async (tx) => {
      await tx.run(
        `
          UPDATE documents
          SET title = ?,
              notes = ?,
              page_count = ?,
              updated_at = ?,
              sync_state = ?
          WHERE id = ?
        `,
        [
          document.title,
          document.notes,
          document.pageCount,
          document.updatedAt,
          document.syncState,
          id,
        ],
      );
      await new SqliteLocalMutationRepository(tx).enqueue({
        mutationId: `document:${id}:update:${updatedAt}`,
        entityType: "Document",
        entityId: id,
        operation: "UPDATE",
        payloadRef: updatedAt,
        payloadJson: JSON.stringify(document),
        createdAt: updatedAt,
      });
    });

    return document;
  }

  async getById(id: string): Promise<Document | null> {
    const row = await this.database.getFirst<DocumentRow>(
      "SELECT * FROM documents WHERE id = ? AND deleted_at IS NULL",
      [id],
    );

    return row ? mapDocument(row) : null;
  }

  async listByProject(
    projectId: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<Document[]> {
    const rows = await this.database.getAll<DocumentRow>(
      `
        SELECT * FROM documents
        WHERE project_id = ?
          AND (? = 1 OR deleted_at IS NULL)
        ORDER BY deleted_at IS NOT NULL ASC, updated_at DESC, created_at DESC
      `,
      [projectId, options.includeDeleted ? 1 : 0],
    );

    return rows.map(mapDocument);
  }

  async listByEvidenceItem(
    evidenceItemId: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<Document[]> {
    const rows = await this.database.getAll<DocumentRow>(
      `
        SELECT * FROM documents
        WHERE evidence_item_id = ?
          AND (? = 1 OR deleted_at IS NULL)
        ORDER BY deleted_at IS NOT NULL ASC, updated_at DESC, created_at DESC
      `,
      [evidenceItemId, options.includeDeleted ? 1 : 0],
    );

    return rows.map(mapDocument);
  }

  async delete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.database.transaction(async (tx) => {
      await tx.run(
        `
          UPDATE documents
          SET deleted_at = ?,
              updated_at = ?,
              sync_state = ?
          WHERE id = ?
            AND deleted_at IS NULL
        `,
        [now, now, "PENDING", id],
      );
      await new SqliteLocalMutationRepository(tx).enqueue({
        mutationId: `document:${id}:delete:${now}`,
        entityType: "Document",
        entityId: id,
        operation: "DELETE",
        payloadRef: now,
        payloadJson: JSON.stringify({ id, deletedAt: now }),
        createdAt: now,
      });
    });
  }
}

function normalizeNullable(value: string | null | undefined): string | null {
  return value?.trim() || null;
}
