import {
  and,
  annotations,
  createNeonDatabase,
  documents,
  eq,
  evidenceItems,
  mediaAssets,
  projects,
  reportDrafts,
  sql,
} from "@fielddoc/database";

import type {
  AnnotationPayload,
  CanonicalMutationRepository,
  DocumentPayload,
  EvidenceItemPayload,
  MediaAssetPayload,
  ProjectPayload,
  ReportDraftPayload,
} from "./sync-application";

type NeonDatabase = ReturnType<typeof createNeonDatabase>;

export function createNeonCanonicalMutationRepository(
  db: NeonDatabase,
): CanonicalMutationRepository {
  return {
    async upsertProject({ organizationId, payload }) {
      await db
        .insert(projects)
        .values(toProjectValues(organizationId, payload))
        .onConflictDoUpdate({
          target: projects.id,
          set: {
            customerId: payload.customerId,
            siteId: payload.siteId,
            name: payload.name,
            customerCompany: payload.customerCompany,
            siteAddress: payload.siteAddress,
            workOrderReference: payload.workOrderReference,
            scheduledDate: payload.scheduledDate,
            notes: payload.notes,
            status: payload.status,
            archivedAt: toDate(payload.archivedAt),
            updatedAt: new Date(payload.updatedAt),
            deletedAt: toDate(payload.deletedAt),
            serverVersion: sql`${projects.serverVersion} + 1`,
          },
        });
    },

    async archiveProject({ organizationId, id, changedAt }) {
      await db
        .update(projects)
        .set({
          status: "archived",
          archivedAt: new Date(changedAt),
          updatedAt: new Date(changedAt),
          serverVersion: sql`${projects.serverVersion} + 1`,
        })
        .where(
          and(eq(projects.id, id), eq(projects.organizationId, organizationId)),
        );
    },

    async deleteProject({ organizationId, id, changedAt }) {
      await db
        .update(projects)
        .set({
          deletedAt: new Date(changedAt),
          updatedAt: new Date(changedAt),
          serverVersion: sql`${projects.serverVersion} + 1`,
        })
        .where(
          and(eq(projects.id, id), eq(projects.organizationId, organizationId)),
        );
    },

    async upsertEvidenceItem({ organizationId, payload }) {
      await db
        .insert(evidenceItems)
        .values(toEvidenceItemValues(organizationId, payload))
        .onConflictDoUpdate({
          target: evidenceItems.id,
          set: {
            projectId: payload.projectId,
            category: payload.category,
            title: payload.title,
            caption: payload.caption,
            notes: payload.notes,
            isImportant: payload.isImportant,
            sortOrder: payload.sortOrder,
            captureTimestamp: new Date(payload.captureTimestamp),
            updatedAt: new Date(payload.updatedAt),
            deletedAt: toDate(payload.deletedAt),
            serverVersion: sql`${evidenceItems.serverVersion} + 1`,
          },
        });
    },

    async deleteEvidenceItem({ organizationId, id, changedAt }) {
      await db
        .update(evidenceItems)
        .set({
          deletedAt: new Date(changedAt),
          updatedAt: new Date(changedAt),
          serverVersion: sql`${evidenceItems.serverVersion} + 1`,
        })
        .where(
          and(
            eq(evidenceItems.id, id),
            eq(evidenceItems.organizationId, organizationId),
          ),
        );
    },

    async upsertMediaAsset({ organizationId, payload }) {
      await db
        .insert(mediaAssets)
        .values(toMediaAssetValues(organizationId, payload))
        .onConflictDoUpdate({
          target: mediaAssets.id,
          set: {
            evidenceItemId: payload.evidenceItemId,
            mediaType: payload.mediaType,
            mimeType: payload.mimeType,
            sizeBytes: payload.sizeBytes,
            sha256: payload.sha256,
            width: payload.width,
            height: payload.height,
            caption: payload.caption,
            notes: payload.notes,
            captureTimestamp: new Date(payload.captureTimestamp),
            sourceType: payload.sourceType,
            originalAssetId: payload.originalAssetId,
            derivativeType: payload.derivativeType,
            isOriginal: payload.derivativeType === null,
            storageObjectKey: payload.storageObjectKey,
            uploadedAt: toDate(payload.uploadedAt),
            updatedAt: new Date(payload.updatedAt),
            deletedAt: toDate(payload.deletedAt),
            serverVersion: sql`${mediaAssets.serverVersion} + 1`,
          },
        });
    },

    async deleteMediaAsset({ organizationId, id, changedAt }) {
      await db
        .update(mediaAssets)
        .set({
          deletedAt: new Date(changedAt),
          updatedAt: new Date(changedAt),
          serverVersion: sql`${mediaAssets.serverVersion} + 1`,
        })
        .where(
          and(
            eq(mediaAssets.id, id),
            eq(mediaAssets.organizationId, organizationId),
          ),
        );
    },

    async upsertAnnotation({ organizationId, payload }) {
      await db
        .insert(annotations)
        .values(toAnnotationValues(organizationId, payload))
        .onConflictDoUpdate({
          target: annotations.id,
          set: {
            evidenceItemId: payload.evidenceItemId,
            mediaAssetId: payload.mediaAssetId,
            body: payload.body,
            updatedAt: new Date(payload.updatedAt),
            deletedAt: toDate(payload.deletedAt),
            serverVersion: sql`${annotations.serverVersion} + 1`,
          },
        });
    },

    async deleteAnnotation({ organizationId, id, changedAt }) {
      await db
        .update(annotations)
        .set({
          deletedAt: new Date(changedAt),
          updatedAt: new Date(changedAt),
          serverVersion: sql`${annotations.serverVersion} + 1`,
        })
        .where(
          and(
            eq(annotations.id, id),
            eq(annotations.organizationId, organizationId),
          ),
        );
    },

    async upsertDocument({ organizationId, payload }) {
      await db
        .insert(documents)
        .values(toDocumentValues(organizationId, payload))
        .onConflictDoUpdate({
          target: documents.id,
          set: {
            projectId: payload.projectId,
            evidenceItemId: payload.evidenceItemId,
            title: payload.title,
            notes: payload.notes,
            updatedAt: new Date(payload.updatedAt),
            deletedAt: toDate(payload.deletedAt),
            serverVersion: sql`${documents.serverVersion} + 1`,
          },
        });
    },

    async deleteDocument({ organizationId, id, changedAt }) {
      await db
        .update(documents)
        .set({
          deletedAt: new Date(changedAt),
          updatedAt: new Date(changedAt),
          serverVersion: sql`${documents.serverVersion} + 1`,
        })
        .where(
          and(
            eq(documents.id, id),
            eq(documents.organizationId, organizationId),
          ),
        );
    },

    async upsertReportDraft({ organizationId, payload }) {
      await db
        .insert(reportDrafts)
        .values(toReportDraftValues(organizationId, payload))
        .onConflictDoUpdate({
          target: reportDrafts.id,
          set: {
            projectId: payload.projectId,
            title: payload.title,
            notes: payload.notes,
            sectionsJson: parseSectionsJson(payload.sectionsJson),
            status: payload.status,
            generatedPdfObjectKey:
              payload.generatedPdfStorageObjectKey === undefined
                ? sql`${reportDrafts.generatedPdfObjectKey}`
                : payload.generatedPdfStorageObjectKey,
            generatedAt: toDate(payload.generatedAt),
            updatedAt: new Date(payload.updatedAt),
            deletedAt: toDate(payload.deletedAt),
            serverVersion: sql`${reportDrafts.serverVersion} + 1`,
          },
        });
    },

    async deleteReportDraft({ organizationId, id, changedAt }) {
      await db
        .update(reportDrafts)
        .set({
          deletedAt: new Date(changedAt),
          updatedAt: new Date(changedAt),
          serverVersion: sql`${reportDrafts.serverVersion} + 1`,
        })
        .where(
          and(
            eq(reportDrafts.id, id),
            eq(reportDrafts.organizationId, organizationId),
          ),
        );
    },
  };
}

function toProjectValues(organizationId: string, payload: ProjectPayload) {
  return {
    id: payload.id,
    organizationId,
    customerId: payload.customerId,
    siteId: payload.siteId,
    name: payload.name,
    customerCompany: payload.customerCompany,
    siteAddress: payload.siteAddress,
    workOrderReference: payload.workOrderReference,
    scheduledDate: payload.scheduledDate,
    notes: payload.notes,
    status: payload.status,
    archivedAt: toDate(payload.archivedAt),
    createdAt: new Date(payload.createdAt),
    updatedAt: new Date(payload.updatedAt),
    deletedAt: toDate(payload.deletedAt),
  };
}

function toEvidenceItemValues(
  organizationId: string,
  payload: EvidenceItemPayload,
) {
  return {
    id: payload.id,
    organizationId,
    projectId: payload.projectId,
    category: payload.category,
    title: payload.title,
    caption: payload.caption,
    notes: payload.notes,
    isImportant: payload.isImportant,
    sortOrder: payload.sortOrder,
    captureTimestamp: new Date(payload.captureTimestamp),
    createdAt: new Date(payload.createdAt),
    updatedAt: new Date(payload.updatedAt),
    deletedAt: toDate(payload.deletedAt),
  };
}

function toMediaAssetValues(
  organizationId: string,
  payload: MediaAssetPayload,
) {
  return {
    id: payload.id,
    organizationId,
    evidenceItemId: payload.evidenceItemId,
    storageObjectKey: payload.storageObjectKey,
    mediaType: payload.mediaType,
    mimeType: payload.mimeType,
    sizeBytes: payload.sizeBytes,
    sha256: payload.sha256,
    width: payload.width,
    height: payload.height,
    caption: payload.caption,
    notes: payload.notes,
    captureTimestamp: new Date(payload.captureTimestamp),
    sourceType: payload.sourceType,
    originalAssetId: payload.originalAssetId,
    derivativeType: payload.derivativeType,
    isOriginal: payload.derivativeType === null,
    uploadedAt: toDate(payload.uploadedAt),
    createdAt: new Date(payload.createdAt),
    updatedAt: new Date(payload.updatedAt),
    deletedAt: toDate(payload.deletedAt),
  };
}

function toAnnotationValues(
  organizationId: string,
  payload: AnnotationPayload,
) {
  return {
    id: payload.id,
    organizationId,
    evidenceItemId: payload.evidenceItemId,
    mediaAssetId: payload.mediaAssetId,
    body: payload.body,
    createdAt: new Date(payload.createdAt),
    updatedAt: new Date(payload.updatedAt),
    deletedAt: toDate(payload.deletedAt),
  };
}

function toDocumentValues(organizationId: string, payload: DocumentPayload) {
  return {
    id: payload.id,
    organizationId,
    projectId: payload.projectId,
    evidenceItemId: payload.evidenceItemId,
    title: payload.title,
    notes: payload.notes,
    createdAt: new Date(payload.createdAt),
    updatedAt: new Date(payload.updatedAt),
    deletedAt: toDate(payload.deletedAt),
  };
}

function toReportDraftValues(
  organizationId: string,
  payload: ReportDraftPayload,
) {
  return {
    id: payload.id,
    organizationId,
    projectId: payload.projectId,
    title: payload.title,
    notes: payload.notes,
    sectionsJson: parseSectionsJson(payload.sectionsJson),
    status: payload.status,
    generatedPdfObjectKey: payload.generatedPdfStorageObjectKey ?? null,
    generatedAt: toDate(payload.generatedAt),
    createdAt: new Date(payload.createdAt),
    updatedAt: new Date(payload.updatedAt),
    deletedAt: toDate(payload.deletedAt),
  };
}

function parseSectionsJson(value: string): unknown {
  return JSON.parse(value);
}

function toDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}
