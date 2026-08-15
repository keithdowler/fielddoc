import {
  evidenceCategories,
  mediaSourceTypes,
  projectStatuses,
} from "@fielddoc/domain";
import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const evidenceCategorySchema = z.enum(evidenceCategories);
export const projectStatusSchema = z.enum(projectStatuses);

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
