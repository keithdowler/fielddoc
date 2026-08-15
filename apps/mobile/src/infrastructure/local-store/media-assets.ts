import {
  type CreateMediaAssetInput,
  type MediaAsset,
  type MediaAssetRepository,
  type SyncState,
  type UpdateMediaAssetMetadataInput,
  normalizeOptionalText,
} from "@fielddoc/domain";

import type { LocalDatabase } from "./database";
import { createLocalId } from "./id";
import { SqliteLocalMutationRepository } from "./mutations";

type MediaAssetRow = {
  id: string;
  evidence_item_id: string;
  local_uri: string;
  media_type: MediaAsset["mediaType"];
  mime_type: string;
  size_bytes: number;
  sha256: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  notes: string | null;
  capture_timestamp: string;
  source_type: MediaAsset["sourceType"];
  original_asset_id: string | null;
  derivative_type: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_state: SyncState;
};

type CountRow = {
  evidence_item_id: string;
  media_count: number;
};

function mapMediaAsset(row: MediaAssetRow): MediaAsset {
  return {
    id: row.id,
    evidenceItemId: row.evidence_item_id,
    localUri: row.local_uri,
    mediaType: row.media_type,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    sha256: row.sha256,
    width: row.width,
    height: row.height,
    caption: row.caption,
    notes: row.notes,
    captureTimestamp: row.capture_timestamp,
    sourceType: row.source_type,
    originalAssetId: row.original_asset_id,
    derivativeType: row.derivative_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncState: row.sync_state,
  };
}

export class SqliteMediaAssetRepository implements MediaAssetRepository {
  constructor(private readonly database: LocalDatabase) {}

  async create(input: CreateMediaAssetInput): Promise<MediaAsset> {
    const now = new Date().toISOString();
    const mediaAsset: MediaAsset = {
      id: createLocalId("media"),
      evidenceItemId: input.evidenceItemId,
      localUri: input.localUri,
      mediaType: input.mediaType,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      sha256: input.sha256,
      width: input.width ?? null,
      height: input.height ?? null,
      caption: normalizeOptionalText(input.caption),
      notes: normalizeOptionalText(input.notes),
      captureTimestamp: input.captureTimestamp ?? now,
      sourceType: input.sourceType,
      originalAssetId: input.originalAssetId ?? null,
      derivativeType: input.derivativeType ?? null,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncState: "PENDING",
    };

    await this.database.transaction(async (tx) => {
      await tx.run(
        `
          INSERT INTO media_assets (
            id,
            evidence_item_id,
            local_uri,
            media_type,
            mime_type,
            size_bytes,
            sha256,
            width,
            height,
            caption,
            notes,
            capture_timestamp,
            source_type,
            original_asset_id,
            derivative_type,
            created_at,
            updated_at,
            deleted_at,
            sync_state
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          mediaAsset.id,
          mediaAsset.evidenceItemId,
          mediaAsset.localUri,
          mediaAsset.mediaType,
          mediaAsset.mimeType,
          mediaAsset.sizeBytes,
          mediaAsset.sha256,
          mediaAsset.width,
          mediaAsset.height,
          mediaAsset.caption,
          mediaAsset.notes,
          mediaAsset.captureTimestamp,
          mediaAsset.sourceType,
          mediaAsset.originalAssetId,
          mediaAsset.derivativeType,
          mediaAsset.createdAt,
          mediaAsset.updatedAt,
          mediaAsset.deletedAt,
          mediaAsset.syncState,
        ],
      );
      await new SqliteLocalMutationRepository(tx).enqueue({
        mutationId: `media:${mediaAsset.id}:create:${mediaAsset.updatedAt}`,
        entityType: "MediaAsset",
        entityId: mediaAsset.id,
        operation: "CREATE",
        payloadRef: mediaAsset.updatedAt,
        payloadJson: JSON.stringify(mediaAsset),
        createdAt: now,
      });
    });

    return mediaAsset;
  }

  async updateMetadata(
    id: string,
    input: UpdateMediaAssetMetadataInput,
  ): Promise<MediaAsset> {
    const existing = await this.database.getFirst<MediaAssetRow>(
      "SELECT * FROM media_assets WHERE id = ?",
      [id],
    );

    if (!existing) {
      throw new Error("Media asset not found.");
    }

    const updatedAt = new Date().toISOString();
    const mediaAsset: MediaAsset = {
      ...mapMediaAsset(existing),
      caption:
        input.caption === undefined
          ? existing.caption
          : normalizeOptionalText(input.caption),
      notes:
        input.notes === undefined
          ? existing.notes
          : normalizeOptionalText(input.notes),
      updatedAt,
      syncState: "PENDING",
    };

    await this.database.transaction(async (tx) => {
      await tx.run(
        `
          UPDATE media_assets
          SET caption = ?,
              notes = ?,
              updated_at = ?,
              sync_state = ?
          WHERE id = ?
        `,
        [
          mediaAsset.caption,
          mediaAsset.notes,
          mediaAsset.updatedAt,
          mediaAsset.syncState,
          id,
        ],
      );
      await new SqliteLocalMutationRepository(tx).enqueue({
        mutationId: `media:${id}:update:${updatedAt}`,
        entityType: "MediaAsset",
        entityId: id,
        operation: "UPDATE",
        payloadRef: updatedAt,
        payloadJson: JSON.stringify(mediaAsset),
        createdAt: updatedAt,
      });
    });

    return mediaAsset;
  }

  async listByEvidenceItem(
    evidenceItemId: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<MediaAsset[]> {
    const rows = await this.database.getAll<MediaAssetRow>(
      `
        SELECT * FROM media_assets
        WHERE evidence_item_id = ?
          AND (? = 1 OR deleted_at IS NULL)
        ORDER BY deleted_at IS NOT NULL ASC, created_at ASC
      `,
      [evidenceItemId, options.includeDeleted ? 1 : 0],
    );

    return rows.map(mapMediaAsset);
  }

  async listByProject(projectId: string): Promise<MediaAsset[]> {
    const rows = await this.database.getAll<MediaAssetRow>(
      `
        SELECT media_assets.* FROM media_assets
        INNER JOIN evidence_items
          ON evidence_items.id = media_assets.evidence_item_id
        WHERE evidence_items.project_id = ?
          AND evidence_items.deleted_at IS NULL
          AND media_assets.deleted_at IS NULL
        ORDER BY evidence_items.sort_order ASC, media_assets.created_at ASC
      `,
      [projectId],
    );

    return rows.map(mapMediaAsset);
  }

  async listByEvidenceIds(evidenceItemIds: string[]): Promise<MediaAsset[]> {
    if (!evidenceItemIds.length) return [];

    const placeholders = evidenceItemIds.map(() => "?").join(", ");
    const rows = await this.database.getAll<MediaAssetRow>(
      `
        SELECT * FROM media_assets
        WHERE deleted_at IS NULL
          AND evidence_item_id IN (${placeholders})
        ORDER BY evidence_item_id ASC, capture_timestamp ASC, created_at ASC
      `,
      evidenceItemIds,
    );

    return rows.map(mapMediaAsset);
  }

  async countByEvidenceIds(
    evidenceItemIds: string[],
  ): Promise<Record<string, number>> {
    if (!evidenceItemIds.length) return {};

    const placeholders = evidenceItemIds.map(() => "?").join(", ");
    const rows = await this.database.getAll<CountRow>(
      `
        SELECT evidence_item_id, COUNT(*) AS media_count
        FROM media_assets
        WHERE deleted_at IS NULL
          AND evidence_item_id IN (${placeholders})
        GROUP BY evidence_item_id
      `,
      evidenceItemIds,
    );

    return Object.fromEntries(
      rows.map((row) => [row.evidence_item_id, row.media_count]),
    );
  }

  async delete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.database.transaction(async (tx) => {
      await tx.run(
        "UPDATE media_assets SET deleted_at = ?, updated_at = ?, sync_state = ? WHERE id = ? AND deleted_at IS NULL",
        [now, now, "PENDING", id],
      );
      await new SqliteLocalMutationRepository(tx).enqueue({
        mutationId: `media:${id}:delete:${now}`,
        entityType: "MediaAsset",
        entityId: id,
        operation: "DELETE",
        payloadRef: now,
        payloadJson: JSON.stringify({ id, deletedAt: now }),
        createdAt: now,
      });
    });
  }

  async restore(id: string): Promise<MediaAsset> {
    const existing = await this.database.getFirst<MediaAssetRow>(
      "SELECT * FROM media_assets WHERE id = ?",
      [id],
    );

    if (!existing) {
      throw new Error("Media asset not found.");
    }

    const updatedAt = new Date().toISOString();
    const mediaAsset: MediaAsset = {
      ...mapMediaAsset(existing),
      deletedAt: null,
      updatedAt,
      syncState: "PENDING",
    };

    await this.database.transaction(async (tx) => {
      await tx.run(
        `
          UPDATE media_assets
          SET deleted_at = NULL,
              updated_at = ?,
              sync_state = ?
          WHERE id = ?
        `,
        [mediaAsset.updatedAt, mediaAsset.syncState, id],
      );
      await new SqliteLocalMutationRepository(tx).enqueue({
        mutationId: `media:${id}:restore:${updatedAt}`,
        entityType: "MediaAsset",
        entityId: id,
        operation: "UPDATE",
        payloadRef: updatedAt,
        payloadJson: JSON.stringify(mediaAsset),
        createdAt: updatedAt,
      });
    });

    return mediaAsset;
  }
}
