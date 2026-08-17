import {
  evidenceCategories,
  localMutationEntityTypes,
  localMutationOperations,
  mediaSourceTypes,
  projectStatuses,
  syncStates,
} from "@fielddoc/domain";
import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const evidenceCategorySchema = z.enum(evidenceCategories);
export const projectStatusSchema = z.enum(projectStatuses);
export const syncStateSchema = z.enum(syncStates);
export const localMutationEntityTypeSchema = z.enum(localMutationEntityTypes);
export const localMutationOperationSchema = z.enum(localMutationOperations);

export const projectSummarySchema = z.object({
  id: uuidSchema,
  organizationId: uuidSchema,
  name: z.string().trim().min(1),
  status: projectStatusSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const originalEvidenceMetadataSchema = z.object({
  id: uuidSchema,
  projectId: uuidSchema,
  category: evidenceCategorySchema,
  capturedAt: isoDateTimeSchema,
  clientCreatedAt: isoDateTimeSchema,
  uploadedAt: isoDateTimeSchema.optional(),
  mimeType: z.string().trim().min(1),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  sourceType: z.enum(mediaSourceTypes),
  storageObjectKey: z.string().trim().min(1).optional(),
  deviceMetadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      accuracyMeters: z.number().nonnegative().optional(),
    })
    .optional(),
});

export const syncMutationPayloadSchema = z.record(z.string(), z.unknown());

export const syncMutationEnvelopeSchema = z.object({
  mutationId: z.string().trim().min(1),
  entityType: localMutationEntityTypeSchema,
  entityId: uuidSchema,
  operation: localMutationOperationSchema,
  payloadRef: z.string().trim().min(1),
  payloadJson: syncMutationPayloadSchema,
  createdAt: isoDateTimeSchema,
  attemptCount: z.number().int().nonnegative(),
  syncState: syncStateSchema,
});

export const syncMutationUploadRequestSchema = z.object({
  clientId: z.string().trim().min(1),
  deviceId: z.string().trim().min(1),
  sentAt: isoDateTimeSchema,
  mutations: z.array(syncMutationEnvelopeSchema).max(100),
});

export const syncMutationRejectedSchema = z.object({
  mutationId: z.string().trim().min(1),
  code: z.string().trim().min(1),
  message: z.string().trim().min(1),
});

export const syncMutationUploadResponseSchema = z.object({
  serverTime: isoDateTimeSchema,
  acceptedMutationIds: z.array(z.string().trim().min(1)),
  duplicateMutationIds: z.array(z.string().trim().min(1)),
  rejectedMutations: z.array(syncMutationRejectedSchema),
  pullCursor: z.string().trim().min(1).nullable(),
});

const canonicalBaseSchema = z.object({
  id: uuidSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  deletedAt: isoDateTimeSchema.nullable(),
  serverVersion: z.number().int().positive(),
});

export const syncPullProjectSchema = canonicalBaseSchema.extend({
  customerId: uuidSchema.nullable(),
  siteId: uuidSchema.nullable(),
  name: z.string().trim().min(1),
  customerCompany: z.string().nullable(),
  siteAddress: z.string().nullable(),
  workOrderReference: z.string().nullable(),
  scheduledDate: z.string().nullable(),
  notes: z.string().nullable(),
  status: projectStatusSchema,
  archivedAt: isoDateTimeSchema.nullable(),
});

export const syncPullEvidenceItemSchema = canonicalBaseSchema.extend({
  projectId: uuidSchema,
  category: evidenceCategorySchema,
  title: z.string().nullable(),
  caption: z.string().nullable(),
  notes: z.string().nullable(),
  isImportant: z.boolean(),
  sortOrder: z.number().int(),
  captureTimestamp: isoDateTimeSchema,
});

export const syncPullMediaAssetSchema = canonicalBaseSchema.extend({
  evidenceItemId: uuidSchema,
  storageObjectKey: z.string().nullable(),
  mediaType: z.enum(["IMAGE", "VIDEO", "DOCUMENT", "OTHER"]),
  mimeType: z.string().trim().min(1),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  width: z.number().int().nonnegative().nullable(),
  height: z.number().int().nonnegative().nullable(),
  caption: z.string().nullable(),
  notes: z.string().nullable(),
  captureTimestamp: isoDateTimeSchema,
  sourceType: z.enum(mediaSourceTypes),
  originalAssetId: z.string().nullable(),
  derivativeType: z.string().nullable(),
  uploadedAt: isoDateTimeSchema.nullable(),
});

export const syncPullAnnotationSchema = canonicalBaseSchema.extend({
  evidenceItemId: uuidSchema,
  mediaAssetId: uuidSchema.nullable(),
  body: z.string().trim().min(1),
});

export const syncPullDocumentSchema = canonicalBaseSchema.extend({
  projectId: uuidSchema,
  evidenceItemId: uuidSchema.nullable(),
  title: z.string().trim().min(1),
  notes: z.string().nullable(),
});

export const syncPullReportDraftSchema = canonicalBaseSchema.extend({
  projectId: uuidSchema,
  title: z.string().trim().min(1),
  notes: z.string().nullable(),
  sectionsJson: z.string().trim().min(1),
  status: z.string().trim().min(1),
  generatedPdfObjectKey: z.string().nullable(),
  generatedAt: isoDateTimeSchema.nullable(),
});

export const syncPullChangesSchema = z.object({
  projects: z.array(syncPullProjectSchema),
  evidenceItems: z.array(syncPullEvidenceItemSchema),
  mediaAssets: z.array(syncPullMediaAssetSchema),
  annotations: z.array(syncPullAnnotationSchema),
  documents: z.array(syncPullDocumentSchema),
  reportDrafts: z.array(syncPullReportDraftSchema),
});

export const syncPullRequestSchema = z.object({
  clientId: z.string().trim().min(1),
  deviceId: z.string().trim().min(1),
  cursor: z.string().trim().min(1).nullable(),
  limit: z.number().int().min(1).max(500).optional(),
});

export const syncPullResponseSchema = z.object({
  serverTime: isoDateTimeSchema,
  cursor: z.string().trim().min(1).nullable(),
  hasMore: z.boolean(),
  changes: syncPullChangesSchema,
});

export const mediaUploadPrepareRequestSchema = z.object({
  mediaAssetId: uuidSchema,
  evidenceItemId: uuidSchema,
  mimeType: z.string().trim().min(1),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  fileExtension: z
    .string()
    .trim()
    .regex(/^[a-z0-9]{1,12}$/)
    .optional(),
});

export const mediaUploadPrepareResponseSchema = z.object({
  mediaAssetId: uuidSchema,
  storageObjectKey: z.string().trim().min(1),
  uploadUrl: z.string().url(),
  requiredHeaders: z.record(z.string(), z.string()),
  expiresAt: isoDateTimeSchema,
});

export const mediaUploadCompleteRequestSchema = z.object({
  mediaAssetId: uuidSchema,
  storageObjectKey: z.string().trim().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  sizeBytes: z.number().int().nonnegative(),
  uploadedAt: isoDateTimeSchema,
});

export const mediaUploadCompleteResponseSchema = z.object({
  mediaAssetId: uuidSchema,
  storageObjectKey: z.string().trim().min(1),
  uploadedAt: isoDateTimeSchema,
  status: z.literal("recorded"),
});

export const mediaDownloadPrepareRequestSchema = z.object({
  mediaAssetId: uuidSchema,
});

export const mediaDownloadPrepareResponseSchema = z.object({
  mediaAssetId: uuidSchema,
  storageObjectKey: z.string().trim().min(1),
  downloadUrl: z.string().url(),
  expiresAt: isoDateTimeSchema,
});

export const reportPdfUploadPrepareRequestSchema = z.object({
  reportDraftId: uuidSchema,
  mimeType: z.literal("application/pdf"),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  generatedAt: isoDateTimeSchema,
  fileExtension: z.literal("pdf").optional(),
});

export const reportPdfUploadPrepareResponseSchema = z.object({
  reportDraftId: uuidSchema,
  storageObjectKey: z.string().trim().min(1),
  uploadUrl: z.string().url(),
  requiredHeaders: z.record(z.string(), z.string()),
  expiresAt: isoDateTimeSchema,
});

export const reportPdfUploadCompleteRequestSchema = z.object({
  reportDraftId: uuidSchema,
  storageObjectKey: z.string().trim().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  sizeBytes: z.number().int().nonnegative(),
  generatedAt: isoDateTimeSchema,
  uploadedAt: isoDateTimeSchema,
});

export const reportPdfUploadCompleteResponseSchema = z.object({
  reportDraftId: uuidSchema,
  reportExportId: uuidSchema,
  storageObjectKey: z.string().trim().min(1),
  uploadedAt: isoDateTimeSchema,
  status: z.literal("recorded"),
});

export const reportPdfDownloadPrepareRequestSchema = z.object({
  reportDraftId: uuidSchema,
});

export const reportPdfDownloadPrepareResponseSchema = z.object({
  reportDraftId: uuidSchema,
  reportExportId: uuidSchema,
  storageObjectKey: z.string().trim().min(1),
  downloadUrl: z.string().url(),
  expiresAt: isoDateTimeSchema,
});

export const reportShareLinkCreateRequestSchema = z.object({
  reportDraftId: uuidSchema,
  expiresAt: isoDateTimeSchema.optional(),
});

export const reportShareLinkCreateResponseSchema = z.object({
  reportDraftId: uuidSchema,
  reportExportId: uuidSchema,
  shareLinkId: uuidSchema,
  shareUrl: z.string().url(),
  expiresAt: isoDateTimeSchema,
});

export const revenueCatWebhookEventSchema = z
  .object({
    id: z.string().trim().min(1),
    type: z.string().trim().min(1),
    app_user_id: z.string().trim().min(1),
    product_id: z.string().trim().min(1).nullish(),
    entitlement_id: z.string().trim().min(1).nullish(),
    entitlement_ids: z.array(z.string().trim().min(1)).nullish(),
    store: z.string().trim().min(1).nullish(),
    environment: z.string().trim().min(1).nullish(),
    original_transaction_id: z.string().trim().min(1).nullish(),
    transaction_id: z.string().trim().min(1).nullish(),
    purchased_at_ms: z.number().int().nonnegative().nullish(),
    expiration_at_ms: z.number().int().nonnegative().nullish(),
  })
  .passthrough();

export const revenueCatWebhookRequestSchema = z
  .object({
    event: revenueCatWebhookEventSchema,
    api_version: z.string().trim().min(1).optional(),
  })
  .passthrough();

export const revenueCatWebhookResponseSchema = z.object({
  status: z.enum(["accepted", "duplicate"]),
  eventId: z.string().trim().min(1),
  entitlementsApplied: z.number().int().nonnegative(),
});

export type SyncMutationEnvelope = z.infer<typeof syncMutationEnvelopeSchema>;
export type SyncMutationUploadRequest = z.infer<
  typeof syncMutationUploadRequestSchema
>;
export type SyncMutationUploadResponse = z.infer<
  typeof syncMutationUploadResponseSchema
>;
export type SyncPullProject = z.infer<typeof syncPullProjectSchema>;
export type SyncPullEvidenceItem = z.infer<typeof syncPullEvidenceItemSchema>;
export type SyncPullMediaAsset = z.infer<typeof syncPullMediaAssetSchema>;
export type SyncPullAnnotation = z.infer<typeof syncPullAnnotationSchema>;
export type SyncPullDocument = z.infer<typeof syncPullDocumentSchema>;
export type SyncPullReportDraft = z.infer<typeof syncPullReportDraftSchema>;
export type SyncPullChanges = z.infer<typeof syncPullChangesSchema>;
export type SyncPullRequest = z.infer<typeof syncPullRequestSchema>;
export type SyncPullResponse = z.infer<typeof syncPullResponseSchema>;
export type MediaUploadPrepareRequest = z.infer<
  typeof mediaUploadPrepareRequestSchema
>;
export type MediaUploadPrepareResponse = z.infer<
  typeof mediaUploadPrepareResponseSchema
>;
export type MediaUploadCompleteRequest = z.infer<
  typeof mediaUploadCompleteRequestSchema
>;
export type MediaUploadCompleteResponse = z.infer<
  typeof mediaUploadCompleteResponseSchema
>;
export type MediaDownloadPrepareRequest = z.infer<
  typeof mediaDownloadPrepareRequestSchema
>;
export type MediaDownloadPrepareResponse = z.infer<
  typeof mediaDownloadPrepareResponseSchema
>;
export type ReportPdfUploadPrepareRequest = z.infer<
  typeof reportPdfUploadPrepareRequestSchema
>;
export type ReportPdfUploadPrepareResponse = z.infer<
  typeof reportPdfUploadPrepareResponseSchema
>;
export type ReportPdfUploadCompleteRequest = z.infer<
  typeof reportPdfUploadCompleteRequestSchema
>;
export type ReportPdfUploadCompleteResponse = z.infer<
  typeof reportPdfUploadCompleteResponseSchema
>;
export type ReportPdfDownloadPrepareRequest = z.infer<
  typeof reportPdfDownloadPrepareRequestSchema
>;
export type ReportPdfDownloadPrepareResponse = z.infer<
  typeof reportPdfDownloadPrepareResponseSchema
>;
export type ReportShareLinkCreateRequest = z.infer<
  typeof reportShareLinkCreateRequestSchema
>;
export type ReportShareLinkCreateResponse = z.infer<
  typeof reportShareLinkCreateResponseSchema
>;
export type RevenueCatWebhookEvent = z.infer<
  typeof revenueCatWebhookEventSchema
>;
export type RevenueCatWebhookRequest = z.infer<
  typeof revenueCatWebhookRequestSchema
>;
export type RevenueCatWebhookResponse = z.infer<
  typeof revenueCatWebhookResponseSchema
>;
