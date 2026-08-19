import type {
  SyncPullAnnotation,
  SyncPullChanges,
  SyncPullDocument,
  SyncPullEvidenceItem,
  SyncPullMediaAsset,
  SyncPullProject,
  SyncPullReportDraft,
} from "@fielddoc/validation";

import type { LocalDatabase } from "./database";

type PullEntityType =
  | "Project"
  | "EvidenceItem"
  | "MediaAsset"
  | "Annotation"
  | "Document"
  | "ReportDraft";

type ExistingRow = {
  id: string;
  updated_at: string;
  sync_state: string;
  [key: string]: string | number | null;
};

type PullApplyResult = {
  pulledCount: number;
  appliedCount: number;
  conflictCount: number;
};

const conflictStates = new Set(["PENDING", "FAILED", "CONFLICT"]);

export class SqlitePullSyncRepository {
  constructor(private readonly database: LocalDatabase) {}

  async applyChanges(changes: SyncPullChanges): Promise<PullApplyResult> {
    const result: PullApplyResult = {
      pulledCount: countPulledRecords(changes),
      appliedCount: 0,
      conflictCount: 0,
    };

    await this.database.transaction(async (tx) => {
      for (const project of changes.projects) {
        const applied = await applyProject(tx, project);
        addApplyResult(result, applied);
      }

      for (const evidenceItem of changes.evidenceItems) {
        const applied = await applyEvidenceItem(tx, evidenceItem);
        addApplyResult(result, applied);
      }

      for (const mediaAsset of changes.mediaAssets) {
        const applied = await applyMediaAsset(tx, mediaAsset);
        addApplyResult(result, applied);
      }

      for (const annotation of changes.annotations) {
        const applied = await applyAnnotation(tx, annotation);
        addApplyResult(result, applied);
      }

      for (const document of changes.documents) {
        const applied = await applyDocument(tx, document);
        addApplyResult(result, applied);
      }

      for (const reportDraft of changes.reportDrafts) {
        const applied = await applyReportDraft(tx, reportDraft);
        addApplyResult(result, applied);
      }
    });

    return result;
  }

  async countUnresolvedConflicts(): Promise<number> {
    const row = await this.database.getFirst<{ count: number }>(
      `
        SELECT COUNT(*) AS count
        FROM local_sync_conflicts
        WHERE resolved_at IS NULL
      `,
    );

    return row?.count ?? 0;
  }
}

function countPulledRecords(changes: SyncPullChanges): number {
  return (
    changes.projects.length +
    changes.evidenceItems.length +
    changes.mediaAssets.length +
    changes.annotations.length +
    changes.documents.length +
    changes.reportDrafts.length
  );
}

function addApplyResult(
  result: PullApplyResult,
  applied: "applied" | "conflict",
): void {
  if (applied === "applied") {
    result.appliedCount += 1;
  } else {
    result.conflictCount += 1;
  }
}

async function shouldPreserveLocalConflict(
  database: LocalDatabase,
  tableName: string,
  entityType: PullEntityType,
  entityId: string,
  serverUpdatedAt: string,
  serverPayload: unknown,
): Promise<boolean> {
  const existing = await database.getFirst<ExistingRow>(
    `SELECT * FROM ${tableName} WHERE id = ?`,
    [entityId],
  );

  if (
    !existing ||
    !conflictStates.has(existing.sync_state) ||
    existing.updated_at === serverUpdatedAt
  ) {
    return false;
  }

  await database.run(`UPDATE ${tableName} SET sync_state = ? WHERE id = ?`, [
    "CONFLICT",
    entityId,
  ]);
  await database.run(
    `
      INSERT OR IGNORE INTO local_sync_conflicts (
        id,
        entity_type,
        entity_id,
        local_payload_json,
        server_payload_json,
        detected_at,
        resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL)
    `,
    [
      `${entityType}:${entityId}:${serverUpdatedAt}`,
      entityType,
      entityId,
      JSON.stringify(existing),
      JSON.stringify(serverPayload),
      new Date().toISOString(),
    ],
  );

  return true;
}

async function applyProject(
  database: LocalDatabase,
  project: SyncPullProject,
): Promise<"applied" | "conflict"> {
  if (
    await shouldPreserveLocalConflict(
      database,
      "projects",
      "Project",
      project.id,
      project.updatedAt,
      project,
    )
  ) {
    return "conflict";
  }

  await ensureProjectReferences(database, project);
  await database.run(
    `
      INSERT INTO projects (
        id,
        customer_id,
        site_id,
        name,
        customer_company,
        site_address,
        work_order_reference,
        scheduled_date,
        notes,
        status,
        created_at,
        updated_at,
        archived_at,
        deleted_at,
        sync_state
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED')
      ON CONFLICT(id) DO UPDATE SET
        customer_id = excluded.customer_id,
        site_id = excluded.site_id,
        name = excluded.name,
        customer_company = excluded.customer_company,
        site_address = excluded.site_address,
        work_order_reference = excluded.work_order_reference,
        scheduled_date = excluded.scheduled_date,
        notes = excluded.notes,
        status = excluded.status,
        updated_at = excluded.updated_at,
        archived_at = excluded.archived_at,
        deleted_at = excluded.deleted_at,
        sync_state = 'SYNCED'
    `,
    [
      project.id,
      project.customerId,
      project.siteId,
      project.name,
      project.customerCompany,
      project.siteAddress,
      project.workOrderReference,
      project.scheduledDate,
      project.notes,
      project.status,
      project.createdAt,
      project.updatedAt,
      project.archivedAt,
      project.deletedAt,
    ],
  );

  return "applied";
}

async function ensureProjectReferences(
  database: LocalDatabase,
  project: SyncPullProject,
): Promise<void> {
  if (project.customerId) {
    await database.run(
      `
        INSERT OR IGNORE INTO customers (
          id,
          name,
          created_at,
          updated_at,
          deleted_at,
          sync_state
        ) VALUES (?, ?, ?, ?, NULL, 'SYNCED')
      `,
      [
        project.customerId,
        project.customerCompany ?? "Cloud customer",
        project.createdAt,
        project.updatedAt,
      ],
    );
  }

  if (project.siteId) {
    await database.run(
      `
        INSERT OR IGNORE INTO sites (
          id,
          customer_id,
          name,
          address,
          created_at,
          updated_at,
          deleted_at,
          sync_state
        ) VALUES (?, ?, ?, ?, ?, ?, NULL, 'SYNCED')
      `,
      [
        project.siteId,
        project.customerId,
        project.siteAddress,
        project.siteAddress,
        project.createdAt,
        project.updatedAt,
      ],
    );
  }
}

async function applyEvidenceItem(
  database: LocalDatabase,
  evidenceItem: SyncPullEvidenceItem,
): Promise<"applied" | "conflict"> {
  if (
    await shouldPreserveLocalConflict(
      database,
      "evidence_items",
      "EvidenceItem",
      evidenceItem.id,
      evidenceItem.updatedAt,
      evidenceItem,
    )
  ) {
    return "conflict";
  }

  await database.run(
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
        sync_state,
        is_important
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED', ?)
      ON CONFLICT(id) DO UPDATE SET
        project_id = excluded.project_id,
        category = excluded.category,
        title = excluded.title,
        caption = excluded.caption,
        notes = excluded.notes,
        sort_order = excluded.sort_order,
        capture_timestamp = excluded.capture_timestamp,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at,
        sync_state = 'SYNCED',
        is_important = excluded.is_important
    `,
    [
      evidenceItem.id,
      evidenceItem.projectId,
      evidenceItem.category,
      evidenceItem.title,
      evidenceItem.caption,
      evidenceItem.notes,
      evidenceItem.sortOrder,
      evidenceItem.captureTimestamp,
      evidenceItem.createdAt,
      evidenceItem.updatedAt,
      evidenceItem.deletedAt,
      evidenceItem.isImportant ? 1 : 0,
    ],
  );

  return "applied";
}

async function applyMediaAsset(
  database: LocalDatabase,
  mediaAsset: SyncPullMediaAsset,
): Promise<"applied" | "conflict"> {
  if (
    await shouldPreserveLocalConflict(
      database,
      "media_assets",
      "MediaAsset",
      mediaAsset.id,
      mediaAsset.updatedAt,
      mediaAsset,
    )
  ) {
    return "conflict";
  }

  const existing = await database.getFirst<{ local_uri: string | null }>(
    "SELECT local_uri FROM media_assets WHERE id = ?",
    [mediaAsset.id],
  );
  const localUri =
    existing?.local_uri ??
    `cloud://media/${mediaAsset.storageObjectKey ?? mediaAsset.id}`;

  await database.run(
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
        capture_timestamp,
        source_type,
        original_asset_id,
        derivative_type,
        created_at,
        updated_at,
        deleted_at,
        sync_state,
        caption,
        notes,
        storage_object_key,
        uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED', ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        evidence_item_id = excluded.evidence_item_id,
        local_uri = excluded.local_uri,
        media_type = excluded.media_type,
        mime_type = excluded.mime_type,
        size_bytes = excluded.size_bytes,
        sha256 = excluded.sha256,
        width = excluded.width,
        height = excluded.height,
        capture_timestamp = excluded.capture_timestamp,
        source_type = excluded.source_type,
        original_asset_id = excluded.original_asset_id,
        derivative_type = excluded.derivative_type,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at,
        sync_state = 'SYNCED',
        caption = excluded.caption,
        notes = excluded.notes,
        storage_object_key = excluded.storage_object_key,
        uploaded_at = excluded.uploaded_at
    `,
    [
      mediaAsset.id,
      mediaAsset.evidenceItemId,
      localUri,
      mediaAsset.mediaType,
      mediaAsset.mimeType,
      mediaAsset.sizeBytes,
      mediaAsset.sha256,
      mediaAsset.width,
      mediaAsset.height,
      mediaAsset.captureTimestamp,
      mediaAsset.sourceType,
      mediaAsset.originalAssetId,
      mediaAsset.derivativeType,
      mediaAsset.createdAt,
      mediaAsset.updatedAt,
      mediaAsset.deletedAt,
      mediaAsset.caption,
      mediaAsset.notes,
      mediaAsset.storageObjectKey,
      mediaAsset.uploadedAt,
    ],
  );

  return "applied";
}

async function applyAnnotation(
  database: LocalDatabase,
  annotation: SyncPullAnnotation,
): Promise<"applied" | "conflict"> {
  if (
    await shouldPreserveLocalConflict(
      database,
      "annotations",
      "Annotation",
      annotation.id,
      annotation.updatedAt,
      annotation,
    )
  ) {
    return "conflict";
  }

  await database.run(
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SYNCED')
      ON CONFLICT(id) DO UPDATE SET
        evidence_item_id = excluded.evidence_item_id,
        media_asset_id = excluded.media_asset_id,
        body = excluded.body,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at,
        sync_state = 'SYNCED'
    `,
    [
      annotation.id,
      annotation.evidenceItemId,
      annotation.mediaAssetId,
      annotation.body,
      annotation.createdAt,
      annotation.updatedAt,
      annotation.deletedAt,
    ],
  );

  return "applied";
}

async function applyDocument(
  database: LocalDatabase,
  document: SyncPullDocument,
): Promise<"applied" | "conflict"> {
  if (
    await shouldPreserveLocalConflict(
      database,
      "documents",
      "Document",
      document.id,
      document.updatedAt,
      document,
    )
  ) {
    return "conflict";
  }

  await database.run(
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'SYNCED')
      ON CONFLICT(id) DO UPDATE SET
        project_id = excluded.project_id,
        evidence_item_id = excluded.evidence_item_id,
        media_asset_id = excluded.media_asset_id,
        title = excluded.title,
        notes = excluded.notes,
        file_name = excluded.file_name,
        mime_type = excluded.mime_type,
        size_bytes = excluded.size_bytes,
        sha256 = excluded.sha256,
        page_count = excluded.page_count,
        source_type = excluded.source_type,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at,
        sync_state = 'SYNCED'
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
    ],
  );

  return "applied";
}

async function applyReportDraft(
  database: LocalDatabase,
  reportDraft: SyncPullReportDraft,
): Promise<"applied" | "conflict"> {
  if (
    await shouldPreserveLocalConflict(
      database,
      "report_drafts",
      "ReportDraft",
      reportDraft.id,
      reportDraft.updatedAt,
      reportDraft,
    )
  ) {
    return "conflict";
  }

  await database.run(
    `
      INSERT INTO report_drafts (
        id,
        project_id,
        title,
        status,
        created_at,
        updated_at,
        deleted_at,
        sync_state,
        notes,
        sections_json,
        generated_at,
        generated_pdf_storage_object_key,
        generated_pdf_uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'SYNCED', ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        project_id = excluded.project_id,
        title = excluded.title,
        status = excluded.status,
        updated_at = excluded.updated_at,
        deleted_at = excluded.deleted_at,
        sync_state = 'SYNCED',
        notes = excluded.notes,
        sections_json = excluded.sections_json,
        generated_at = excluded.generated_at,
        generated_pdf_storage_object_key = excluded.generated_pdf_storage_object_key,
        generated_pdf_uploaded_at = excluded.generated_pdf_uploaded_at
    `,
    [
      reportDraft.id,
      reportDraft.projectId,
      reportDraft.title,
      reportDraft.status,
      reportDraft.createdAt,
      reportDraft.updatedAt,
      reportDraft.deletedAt,
      reportDraft.notes,
      reportDraft.sectionsJson,
      reportDraft.generatedAt,
      reportDraft.generatedPdfObjectKey,
      reportDraft.generatedPdfObjectKey ? reportDraft.updatedAt : null,
    ],
  );

  return "applied";
}
