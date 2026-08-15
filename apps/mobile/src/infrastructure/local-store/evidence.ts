import {
  type CreateEvidenceInput,
  type EvidenceItem,
  type EvidenceRepository,
  type ProjectEvidenceSummary,
  type SyncState,
  normalizeOptionalText,
} from "@fielddoc/domain";

import type { LocalDatabase } from "./database";
import { createLocalId } from "./id";
import { SqliteLocalMutationRepository } from "./mutations";

type EvidenceRow = {
  id: string;
  project_id: string;
  category: EvidenceItem["category"];
  title: string | null;
  caption: string | null;
  notes: string | null;
  sort_order: number;
  capture_timestamp: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  sync_state: SyncState;
};

function mapEvidence(row: EvidenceRow): EvidenceItem {
  return {
    id: row.id,
    projectId: row.project_id,
    category: row.category,
    title: row.title,
    caption: row.caption,
    notes: row.notes,
    sortOrder: row.sort_order,
    captureTimestamp: row.capture_timestamp,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    syncState: row.sync_state,
  };
}

export class SqliteEvidenceRepository implements EvidenceRepository {
  constructor(private readonly database: LocalDatabase) {}

  async create(input: CreateEvidenceInput): Promise<EvidenceItem> {
    const now = new Date().toISOString();
    const sortRow = await this.database.getFirst<{ next_sort_order: number }>(
      "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort_order FROM evidence_items WHERE project_id = ?",
      [input.projectId],
    );
    const evidence: EvidenceItem = {
      id: createLocalId("evidence"),
      projectId: input.projectId,
      category: input.category,
      title: normalizeOptionalText(input.title),
      caption: normalizeOptionalText(input.caption),
      notes: normalizeOptionalText(input.notes),
      sortOrder: sortRow?.next_sort_order ?? 0,
      captureTimestamp: input.captureTimestamp ?? now,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      syncState: "PENDING",
    };

    await this.database.transaction(async (tx) => {
      await tx.run(
        `
          INSERT INTO evidence_items (
            id,
            project_id,
            category,
            title,
            caption,
            notes,
            sort_order,
            capture_timestamp,
            created_at,
            updated_at,
            deleted_at,
            sync_state
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          evidence.id,
          evidence.projectId,
          evidence.category,
          evidence.title,
          evidence.caption,
          evidence.notes,
          evidence.sortOrder,
          evidence.captureTimestamp,
          evidence.createdAt,
          evidence.updatedAt,
          evidence.deletedAt,
          evidence.syncState,
        ],
      );
      await new SqliteLocalMutationRepository(tx).enqueue({
        mutationId: `evidence:${evidence.id}:create:${evidence.updatedAt}`,
        entityType: "EvidenceItem",
        entityId: evidence.id,
        operation: "CREATE",
        payloadRef: evidence.updatedAt,
        payloadJson: JSON.stringify(evidence),
        createdAt: now,
      });
    });

    return evidence;
  }

  async update(
    id: string,
    input: Partial<CreateEvidenceInput>,
  ): Promise<EvidenceItem> {
    const existing = await this.database.getFirst<EvidenceRow>(
      "SELECT * FROM evidence_items WHERE id = ? AND deleted_at IS NULL",
      [id],
    );

    if (!existing) {
      throw new Error("Evidence item not found.");
    }

    const updatedAt = new Date().toISOString();
    const evidence: EvidenceItem = {
      ...mapEvidence(existing),
      category: input.category ?? existing.category,
      title:
        input.title === undefined
          ? existing.title
          : normalizeOptionalText(input.title),
      caption:
        input.caption === undefined
          ? existing.caption
          : normalizeOptionalText(input.caption),
      notes:
        input.notes === undefined
          ? existing.notes
          : normalizeOptionalText(input.notes),
      captureTimestamp: input.captureTimestamp ?? existing.capture_timestamp,
      updatedAt,
      syncState: "PENDING",
    };

    await this.database.transaction(async (tx) => {
      await tx.run(
        `
          UPDATE evidence_items
          SET category = ?,
              title = ?,
              caption = ?,
              notes = ?,
              capture_timestamp = ?,
              updated_at = ?,
              sync_state = ?
          WHERE id = ? AND deleted_at IS NULL
        `,
        [
          evidence.category,
          evidence.title,
          evidence.caption,
          evidence.notes,
          evidence.captureTimestamp,
          evidence.updatedAt,
          evidence.syncState,
          id,
        ],
      );
      await new SqliteLocalMutationRepository(tx).enqueue({
        mutationId: `evidence:${id}:update:${updatedAt}`,
        entityType: "EvidenceItem",
        entityId: id,
        operation: "UPDATE",
        payloadRef: updatedAt,
        payloadJson: JSON.stringify(evidence),
        createdAt: updatedAt,
      });
    });

    return evidence;
  }

  async delete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.database.transaction(async (tx) => {
      await tx.run(
        "UPDATE evidence_items SET deleted_at = ?, updated_at = ?, sync_state = ? WHERE id = ? AND deleted_at IS NULL",
        [now, now, "PENDING", id],
      );
      await new SqliteLocalMutationRepository(tx).enqueue({
        mutationId: `evidence:${id}:delete:${now}`,
        entityType: "EvidenceItem",
        entityId: id,
        operation: "DELETE",
        payloadRef: now,
        payloadJson: JSON.stringify({ id, deletedAt: now }),
        createdAt: now,
      });
    });
  }

  async listByProject(projectId: string): Promise<EvidenceItem[]> {
    const rows = await this.database.getAll<EvidenceRow>(
      `
        SELECT * FROM evidence_items
        WHERE project_id = ? AND deleted_at IS NULL
        ORDER BY
          CASE category
            WHEN 'BEFORE' THEN 0
            WHEN 'WORK' THEN 1
            WHEN 'AFTER' THEN 2
            WHEN 'DOCUMENT' THEN 3
            ELSE 4
          END ASC,
          sort_order ASC,
          capture_timestamp ASC
      `,
      [projectId],
    );

    return rows.map(mapEvidence);
  }

  async summarizeProject(projectId: string): Promise<ProjectEvidenceSummary> {
    const items = await this.listByProject(projectId);

    return {
      beforeCount: items.filter((item) => item.category === "BEFORE").length,
      workCount: items.filter((item) => item.category === "WORK").length,
      afterCount: items.filter((item) => item.category === "AFTER").length,
      documentCount: items.filter((item) => item.category === "DOCUMENT")
        .length,
      otherCount: items.filter((item) => item.category === "OTHER").length,
      missingCaptionCount: items.filter((item) => !item.caption?.trim()).length,
    };
  }
}
