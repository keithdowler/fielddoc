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

export type SyncMutationEnvelope = z.infer<typeof syncMutationEnvelopeSchema>;
export type SyncMutationUploadRequest = z.infer<
  typeof syncMutationUploadRequestSchema
>;
export type SyncMutationUploadResponse = z.infer<
  typeof syncMutationUploadResponseSchema
>;
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
