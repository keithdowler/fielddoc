import {
  type Annotation,
  type AnnotationRepository,
  type CreateAnnotationInput,
  type SyncState,
} from "@fielddoc/domain";

import type { LocalDatabase } from "./database";
import { createLocalId } from "./id";
import { SqliteLocalMutationRepository } from "./mutations";

type AnnotationRow = {
  id: string;
  evidence_item_id: string;
  media_asset_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_state: SyncState;
};

function mapAnnotation(row: AnnotationRow): Annotation {
  return {
    id: row.id,
    evidenceItemId: row.evidence_item_id,
    mediaAssetId: row.media_asset_id,
    body: row.body,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncState: row.sync_state,
  };
}

export class SqliteAnnotationRepository implements AnnotationRepository {
  constructor(private readonly database: LocalDatabase) {}

  async create(input: CreateAnnotationInput): Promise<Annotation> {
    const body = input.body.trim();
    if (!body) {
      throw new Error("Annotation text is required.");
    }

    const now = new Date().toISOString();
    const annotation: Annotation = {
      id: createLocalId("annotation"),
      evidenceItemId: input.evidenceItemId,
      mediaAssetId: input.mediaAssetId ?? null,
      body,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncState: "PENDING",
    };

    await this.database.transaction(async (tx) => {
      await tx.run(
        `
          INSERT INTO annotations (
            id,
            evidence_item_id,
            media_asset_id,
            body,
            created_at,
            updated_at,
            deleted_at,
            sync_state
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          annotation.id,
          annotation.evidenceItemId,
          annotation.mediaAssetId,
          annotation.body,
          annotation.createdAt,
          annotation.updatedAt,
          annotation.deletedAt,
          annotation.syncState,
        ],
      );
      await new SqliteLocalMutationRepository(tx).enqueue({
        mutationId: `annotation:${annotation.id}:create:${annotation.updatedAt}`,
        entityType: "Annotation",
        entityId: annotation.id,
        operation: "CREATE",
        payloadRef: annotation.updatedAt,
        payloadJson: JSON.stringify(annotation),
        createdAt: now,
      });
    });

    return annotation;
  }

  async listByEvidenceItem(
    evidenceItemId: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<Annotation[]> {
    const rows = await this.database.getAll<AnnotationRow>(
      `
        SELECT * FROM annotations
        WHERE evidence_item_id = ?
          AND (? = 1 OR deleted_at IS NULL)
        ORDER BY deleted_at IS NOT NULL ASC, created_at ASC
      `,
      [evidenceItemId, options.includeDeleted ? 1 : 0],
    );

    return rows.map(mapAnnotation);
  }

  async listByEvidenceIds(evidenceItemIds: string[]): Promise<Annotation[]> {
    if (!evidenceItemIds.length) return [];

    const placeholders = evidenceItemIds.map(() => "?").join(", ");
    const rows = await this.database.getAll<AnnotationRow>(
      `
        SELECT * FROM annotations
        WHERE deleted_at IS NULL
          AND evidence_item_id IN (${placeholders})
        ORDER BY evidence_item_id ASC, created_at ASC
      `,
      evidenceItemIds,
    );

    return rows.map(mapAnnotation);
  }

  async delete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.database.transaction(async (tx) => {
      await tx.run(
        "UPDATE annotations SET deleted_at = ?, updated_at = ?, sync_state = ? WHERE id = ? AND deleted_at IS NULL",
        [now, now, "PENDING", id],
      );
      await new SqliteLocalMutationRepository(tx).enqueue({
        mutationId: `annotation:${id}:delete:${now}`,
        entityType: "Annotation",
        entityId: id,
        operation: "DELETE",
        payloadRef: now,
        payloadJson: JSON.stringify({ id, deletedAt: now }),
        createdAt: now,
      });
    });
  }

  async restore(id: string): Promise<Annotation> {
    const existing = await this.database.getFirst<AnnotationRow>(
      "SELECT * FROM annotations WHERE id = ?",
      [id],
    );

    if (!existing) {
      throw new Error("Annotation not found.");
    }

    const updatedAt = new Date().toISOString();
    const annotation: Annotation = {
      ...mapAnnotation(existing),
      deletedAt: null,
      updatedAt,
      syncState: "PENDING",
    };

    await this.database.transaction(async (tx) => {
      await tx.run(
        `
          UPDATE annotations
          SET deleted_at = NULL,
              updated_at = ?,
              sync_state = ?
          WHERE id = ?
        `,
        [annotation.updatedAt, annotation.syncState, id],
      );
      await new SqliteLocalMutationRepository(tx).enqueue({
        mutationId: `annotation:${id}:restore:${updatedAt}`,
        entityType: "Annotation",
        entityId: id,
        operation: "UPDATE",
        payloadRef: updatedAt,
        payloadJson: JSON.stringify(annotation),
        createdAt: updatedAt,
      });
    });

    return annotation;
  }
}
