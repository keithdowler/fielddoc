import {
  and,
  annotations,
  asc,
  createNeonDatabase,
  documents,
  eq,
  evidenceItems,
  gt,
  mediaAssets,
  organizations,
  organizationMembers,
  projects,
  reportDrafts,
  users,
} from "@fielddoc/database";
import { mediaSourceTypes, type MediaSourceType } from "@fielddoc/domain";
import type {
  SyncPullAnnotation,
  SyncPullChanges,
  SyncPullDocument,
  SyncPullEvidenceItem,
  SyncPullMediaAsset,
  SyncPullProject,
  SyncPullReportDraft,
} from "@fielddoc/validation";

import {
  SyncConfigurationError,
  type SyncAuthPrincipal,
  type SyncMembership,
} from "../mutations/sync-service";
import type {
  PullChangesInput,
  PullChangesResult,
  SyncPullPersistence,
} from "./sync-pull-service";

type NeonDatabase = ReturnType<typeof createNeonDatabase>;

export function createNeonSyncPullPersistence(
  databaseUrl: string | undefined,
): SyncPullPersistence {
  if (!databaseUrl) {
    throw new SyncConfigurationError(
      "SYNC_PERSISTENCE_NOT_CONFIGURED",
      "Neon Postgres persistence is not configured.",
      503,
    );
  }

  return createNeonSyncPullRepository(createNeonDatabase(databaseUrl));
}

export function createNeonSyncPullRepository(
  db: NeonDatabase,
): SyncPullPersistence {
  return {
    async resolveMembership(
      principal: SyncAuthPrincipal,
    ): Promise<SyncMembership | null> {
      const rows = await db
        .select({
          organizationId: organizationMembers.organizationId,
          role: organizationMembers.role,
          userId: users.id,
        })
        .from(users)
        .innerJoin(
          organizationMembers,
          eq(users.id, organizationMembers.userId),
        )
        .innerJoin(
          organizations,
          eq(organizationMembers.organizationId, organizations.id),
        )
        .where(
          and(
            eq(users.externalAuthId, principal.externalAuthId),
            eq(organizations.externalAuthId, principal.organizationId),
          ),
        )
        .limit(1);

      return rows[0] ?? null;
    },

    async pullChanges(input: PullChangesInput): Promise<PullChangesResult> {
      const since = parseCursor(input.cursor);

      const [
        projectRows,
        evidenceRows,
        mediaRows,
        annotationRows,
        documentRows,
        reportDraftRows,
      ] = await Promise.all([
        db
          .select()
          .from(projects)
          .where(
            and(
              eq(projects.organizationId, input.membership.organizationId),
              gt(projects.updatedAt, since),
            ),
          )
          .orderBy(asc(projects.updatedAt))
          .limit(input.limit),
        db
          .select()
          .from(evidenceItems)
          .where(
            and(
              eq(evidenceItems.organizationId, input.membership.organizationId),
              gt(evidenceItems.updatedAt, since),
            ),
          )
          .orderBy(asc(evidenceItems.updatedAt))
          .limit(input.limit),
        db
          .select()
          .from(mediaAssets)
          .where(
            and(
              eq(mediaAssets.organizationId, input.membership.organizationId),
              gt(mediaAssets.updatedAt, since),
            ),
          )
          .orderBy(asc(mediaAssets.updatedAt))
          .limit(input.limit),
        db
          .select()
          .from(annotations)
          .where(
            and(
              eq(annotations.organizationId, input.membership.organizationId),
              gt(annotations.updatedAt, since),
            ),
          )
          .orderBy(asc(annotations.updatedAt))
          .limit(input.limit),
        db
          .select()
          .from(documents)
          .where(
            and(
              eq(documents.organizationId, input.membership.organizationId),
              gt(documents.updatedAt, since),
            ),
          )
          .orderBy(asc(documents.updatedAt))
          .limit(input.limit),
        db
          .select()
          .from(reportDrafts)
          .where(
            and(
              eq(reportDrafts.organizationId, input.membership.organizationId),
              gt(reportDrafts.updatedAt, since),
            ),
          )
          .orderBy(asc(reportDrafts.updatedAt))
          .limit(input.limit),
      ]);

      const changes: SyncPullChanges = {
        projects: projectRows.map(toProject),
        evidenceItems: evidenceRows.map(toEvidenceItem),
        mediaAssets: mediaRows.map(toMediaAsset),
        annotations: annotationRows.map(toAnnotation),
        documents: documentRows.map(toDocument),
        reportDrafts: reportDraftRows.map(toReportDraft),
      };
      const cursor = maxUpdatedAt(changes) ?? new Date().toISOString();
      const hasMore = [
        projectRows,
        evidenceRows,
        mediaRows,
        annotationRows,
        documentRows,
        reportDraftRows,
      ].some((rows) => rows.length >= input.limit);

      return { changes, cursor, hasMore };
    },
  };
}

function parseCursor(cursor: string | null): Date {
  if (!cursor) return new Date(0);

  const parsed = new Date(cursor);

  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function maxUpdatedAt(changes: SyncPullChanges): string | null {
  const timestamps = [
    ...changes.projects,
    ...changes.evidenceItems,
    ...changes.mediaAssets,
    ...changes.annotations,
    ...changes.documents,
    ...changes.reportDrafts,
  ].map((record) => record.updatedAt);

  return timestamps.sort().at(-1) ?? null;
}

function toProject(row: typeof projects.$inferSelect): SyncPullProject {
  return {
    id: row.id,
    customerId: row.customerId,
    siteId: row.siteId,
    name: row.name,
    customerCompany: row.customerCompany,
    siteAddress: row.siteAddress,
    workOrderReference: row.workOrderReference,
    scheduledDate: row.scheduledDate,
    notes: row.notes,
    status: row.status,
    archivedAt: toIso(row.archivedAt),
    createdAt: toRequiredIso(row.createdAt),
    updatedAt: toRequiredIso(row.updatedAt),
    deletedAt: toIso(row.deletedAt),
    serverVersion: row.serverVersion,
  };
}

function toEvidenceItem(
  row: typeof evidenceItems.$inferSelect,
): SyncPullEvidenceItem {
  return {
    id: row.id,
    projectId: row.projectId,
    category: row.category,
    title: row.title,
    caption: row.caption,
    notes: row.notes,
    isImportant: row.isImportant,
    sortOrder: row.sortOrder,
    captureTimestamp: toRequiredIso(row.captureTimestamp),
    createdAt: toRequiredIso(row.createdAt),
    updatedAt: toRequiredIso(row.updatedAt),
    deletedAt: toIso(row.deletedAt),
    serverVersion: row.serverVersion,
  };
}

function toMediaAsset(
  row: typeof mediaAssets.$inferSelect,
): SyncPullMediaAsset {
  return {
    id: row.id,
    evidenceItemId: row.evidenceItemId,
    storageObjectKey: row.storageObjectKey,
    mediaType: row.mediaType,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
    width: row.width,
    height: row.height,
    caption: row.caption,
    notes: row.notes,
    captureTimestamp: toRequiredIso(row.captureTimestamp),
    sourceType: row.sourceType,
    originalAssetId: row.originalAssetId,
    derivativeType: row.derivativeType,
    uploadedAt: toIso(row.uploadedAt),
    createdAt: toRequiredIso(row.createdAt),
    updatedAt: toRequiredIso(row.updatedAt),
    deletedAt: toIso(row.deletedAt),
    serverVersion: row.serverVersion,
  };
}

function toAnnotation(
  row: typeof annotations.$inferSelect,
): SyncPullAnnotation {
  return {
    id: row.id,
    evidenceItemId: row.evidenceItemId,
    mediaAssetId: row.mediaAssetId,
    body: row.body,
    createdAt: toRequiredIso(row.createdAt),
    updatedAt: toRequiredIso(row.updatedAt),
    deletedAt: toIso(row.deletedAt),
    serverVersion: row.serverVersion,
  };
}

function toDocument(row: typeof documents.$inferSelect): SyncPullDocument {
  return {
    id: row.id,
    projectId: row.projectId,
    evidenceItemId: row.evidenceItemId,
    mediaAssetId: row.mediaAssetId,
    title: row.title,
    notes: row.notes,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    sha256: row.sha256,
    pageCount: row.pageCount,
    sourceType: toMediaSourceType(row.sourceType),
    createdAt: toRequiredIso(row.createdAt),
    updatedAt: toRequiredIso(row.updatedAt),
    deletedAt: toIso(row.deletedAt),
    serverVersion: row.serverVersion,
  };
}

function toMediaSourceType(value: string | null): MediaSourceType | null {
  if (value === null) {
    return null;
  }

  return mediaSourceTypes.includes(value as MediaSourceType)
    ? (value as MediaSourceType)
    : null;
}

function toReportDraft(
  row: typeof reportDrafts.$inferSelect,
): SyncPullReportDraft {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    notes: row.notes,
    sectionsJson: JSON.stringify(row.sectionsJson),
    status: row.status,
    generatedPdfObjectKey: row.generatedPdfObjectKey,
    generatedAt: toIso(row.generatedAt),
    createdAt: toRequiredIso(row.createdAt),
    updatedAt: toRequiredIso(row.updatedAt),
    deletedAt: toIso(row.deletedAt),
    serverVersion: row.serverVersion,
  };
}

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function toRequiredIso(value: Date): string {
  return value.toISOString();
}
