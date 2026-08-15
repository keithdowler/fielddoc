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

export type SyncMutationEnvelope = z.infer<typeof syncMutationEnvelopeSchema>;
export type SyncMutationUploadRequest = z.infer<
  typeof syncMutationUploadRequestSchema
>;
export type SyncMutationUploadResponse = z.infer<
  typeof syncMutationUploadResponseSchema
>;
