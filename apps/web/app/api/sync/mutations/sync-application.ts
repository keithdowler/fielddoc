import type { SyncMutationEnvelope } from "@fielddoc/validation";
import { z } from "zod";

import type { SyncMembership } from "./sync-service";

export type CanonicalMutationApplicationInput = {
  membership: SyncMembership;
  mutation: SyncMutationEnvelope;
};

export type CanonicalMutationApplicationResult =
  { status: "applied" } | { status: "rejected"; code: string; message: string };

export type CanonicalMutationRepository = {
  upsertProject(input: OrganizationPayload<ProjectPayload>): Promise<void>;
  archiveProject(input: OrganizationStateChange): Promise<void>;
  deleteProject(input: OrganizationStateChange): Promise<void>;
  upsertEvidenceItem(
    input: OrganizationPayload<EvidenceItemPayload>,
  ): Promise<void>;
  deleteEvidenceItem(input: OrganizationStateChange): Promise<void>;
  upsertMediaAsset(
    input: OrganizationPayload<MediaAssetPayload>,
  ): Promise<void>;
  deleteMediaAsset(input: OrganizationStateChange): Promise<void>;
  upsertAnnotation(
    input: OrganizationPayload<AnnotationPayload>,
  ): Promise<void>;
  deleteAnnotation(input: OrganizationStateChange): Promise<void>;
  upsertDocument(input: OrganizationPayload<DocumentPayload>): Promise<void>;
  deleteDocument(input: OrganizationStateChange): Promise<void>;
  upsertReportDraft(
    input: OrganizationPayload<ReportDraftPayload>,
  ): Promise<void>;
  deleteReportDraft(input: OrganizationStateChange): Promise<void>;
};

type OrganizationPayload<TPayload> = {
  organizationId: string;
  payload: TPayload;
};

type OrganizationStateChange = {
  organizationId: string;
  id: string;
  changedAt: string;
};

export async function applyCanonicalMutation(
  input: CanonicalMutationApplicationInput,
  repository: CanonicalMutationRepository,
): Promise<CanonicalMutationApplicationResult> {
  const organizationId = input.membership.organizationId;

  try {
    switch (input.mutation.entityType) {
      case "Project":
        return await applyProjectMutation(
          input.mutation,
          organizationId,
          repository,
        );
      case "EvidenceItem":
        return await applyEvidenceItemMutation(
          input.mutation,
          organizationId,
          repository,
        );
      case "MediaAsset":
        return await applyMediaAssetMutation(
          input.mutation,
          organizationId,
          repository,
        );
      case "Annotation":
        return await applyAnnotationMutation(
          input.mutation,
          organizationId,
          repository,
        );
      case "Document":
        return await applyDocumentMutation(
          input.mutation,
          organizationId,
          repository,
        );
      case "ReportDraft":
        return await applyReportDraftMutation(
          input.mutation,
          organizationId,
          repository,
        );
      default:
        return {
          status: "rejected",
          code: "CANONICAL_ENTITY_NOT_SUPPORTED",
          message: `${input.mutation.entityType} sync application is not implemented yet.`,
        };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        status: "rejected",
        code: "INVALID_CANONICAL_PAYLOAD",
        message: "Mutation payload cannot be applied to the canonical model.",
      };
    }

    throw error;
  }
}

async function applyProjectMutation(
  mutation: SyncMutationEnvelope,
  organizationId: string,
  repository: CanonicalMutationRepository,
): Promise<CanonicalMutationApplicationResult> {
  if (mutation.operation === "DELETE") {
    await repository.deleteProject(parseStateChange(mutation, organizationId));
    return { status: "applied" };
  }

  if (mutation.operation === "ARCHIVE") {
    const payload = projectArchivePayloadSchema.parse(mutation.payloadJson);
    await repository.archiveProject({
      organizationId,
      id: payload.id,
      changedAt: payload.archivedAt,
    });
    return { status: "applied" };
  }

  await repository.upsertProject({
    organizationId,
    payload: projectPayloadSchema.parse(mutation.payloadJson),
  });
  return { status: "applied" };
}

async function applyEvidenceItemMutation(
  mutation: SyncMutationEnvelope,
  organizationId: string,
  repository: CanonicalMutationRepository,
): Promise<CanonicalMutationApplicationResult> {
  if (mutation.operation === "DELETE") {
    await repository.deleteEvidenceItem(
      parseStateChange(mutation, organizationId),
    );
    return { status: "applied" };
  }

  await repository.upsertEvidenceItem({
    organizationId,
    payload: evidenceItemPayloadSchema.parse(mutation.payloadJson),
  });
  return { status: "applied" };
}

async function applyMediaAssetMutation(
  mutation: SyncMutationEnvelope,
  organizationId: string,
  repository: CanonicalMutationRepository,
): Promise<CanonicalMutationApplicationResult> {
  if (mutation.operation === "DELETE") {
    await repository.deleteMediaAsset(
      parseStateChange(mutation, organizationId),
    );
    return { status: "applied" };
  }

  await repository.upsertMediaAsset({
    organizationId,
    payload: mediaAssetPayloadSchema.parse(mutation.payloadJson),
  });
  return { status: "applied" };
}

async function applyAnnotationMutation(
  mutation: SyncMutationEnvelope,
  organizationId: string,
  repository: CanonicalMutationRepository,
): Promise<CanonicalMutationApplicationResult> {
  if (mutation.operation === "DELETE") {
    await repository.deleteAnnotation(
      parseStateChange(mutation, organizationId),
    );
    return { status: "applied" };
  }

  await repository.upsertAnnotation({
    organizationId,
    payload: annotationPayloadSchema.parse(mutation.payloadJson),
  });
  return { status: "applied" };
}

async function applyDocumentMutation(
  mutation: SyncMutationEnvelope,
  organizationId: string,
  repository: CanonicalMutationRepository,
): Promise<CanonicalMutationApplicationResult> {
  if (mutation.operation === "DELETE") {
    await repository.deleteDocument(parseStateChange(mutation, organizationId));
    return { status: "applied" };
  }

  await repository.upsertDocument({
    organizationId,
    payload: documentPayloadSchema.parse(mutation.payloadJson),
  });
  return { status: "applied" };
}

async function applyReportDraftMutation(
  mutation: SyncMutationEnvelope,
  organizationId: string,
  repository: CanonicalMutationRepository,
): Promise<CanonicalMutationApplicationResult> {
  if (mutation.operation === "DELETE") {
    await repository.deleteReportDraft(
      parseStateChange(mutation, organizationId),
    );
    return { status: "applied" };
  }

  await repository.upsertReportDraft({
    organizationId,
    payload: reportDraftPayloadSchema.parse(mutation.payloadJson),
  });
  return { status: "applied" };
}

function parseStateChange(
  mutation: SyncMutationEnvelope,
  organizationId: string,
): OrganizationStateChange {
  const payload = stateChangePayloadSchema.parse(mutation.payloadJson);

  return {
    organizationId,
    id: payload.id,
    changedAt: payload.deletedAt,
  };
}

const nullableTextSchema = z.string().nullable();
const nullableDateTimeSchema = z.string().datetime({ offset: true }).nullable();
const uuidSchema = z.string().uuid();
const isoDateTimeSchema = z.string().datetime({ offset: true });

const baseLocalPayloadSchema = z.object({
  id: uuidSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  deletedAt: nullableDateTimeSchema,
});

export const projectPayloadSchema = baseLocalPayloadSchema.extend({
  customerId: uuidSchema.nullable(),
  siteId: uuidSchema.nullable(),
  name: z.string().trim().min(1),
  customerCompany: nullableTextSchema,
  siteAddress: nullableTextSchema,
  workOrderReference: nullableTextSchema,
  scheduledDate: nullableTextSchema,
  notes: nullableTextSchema,
  status: z.enum(["draft", "active", "archived"]),
  archivedAt: nullableDateTimeSchema,
});

export type ProjectPayload = z.infer<typeof projectPayloadSchema>;

const projectArchivePayloadSchema = z.object({
  id: uuidSchema,
  status: z.literal("archived"),
  archivedAt: isoDateTimeSchema,
});

export const evidenceItemPayloadSchema = baseLocalPayloadSchema.extend({
  projectId: uuidSchema,
  category: z.enum(["BEFORE", "WORK", "AFTER", "DOCUMENT", "OTHER"]),
  title: nullableTextSchema,
  caption: nullableTextSchema,
  notes: nullableTextSchema,
  isImportant: z.boolean().default(false),
  sortOrder: z.number().int().nonnegative(),
  captureTimestamp: isoDateTimeSchema,
});

export type EvidenceItemPayload = z.infer<typeof evidenceItemPayloadSchema>;

export const mediaAssetPayloadSchema = baseLocalPayloadSchema.extend({
  evidenceItemId: uuidSchema,
  localUri: z.string().trim().min(1),
  storageObjectKey: nullableTextSchema,
  mediaType: z.enum(["IMAGE", "VIDEO", "DOCUMENT", "OTHER"]),
  mimeType: z.string().trim().min(1),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  caption: nullableTextSchema,
  notes: nullableTextSchema,
  captureTimestamp: isoDateTimeSchema,
  sourceType: z.enum([
    "CAMERA_PHOTO",
    "PHOTO_LIBRARY",
    "DOCUMENT_SCAN",
    "FILE_IMPORT",
  ]),
  originalAssetId: nullableTextSchema,
  derivativeType: nullableTextSchema,
  uploadedAt: nullableDateTimeSchema,
});

export type MediaAssetPayload = z.infer<typeof mediaAssetPayloadSchema>;

export const annotationPayloadSchema = baseLocalPayloadSchema.extend({
  evidenceItemId: uuidSchema,
  mediaAssetId: uuidSchema.nullable(),
  body: z.string().trim().min(1),
});

export type AnnotationPayload = z.infer<typeof annotationPayloadSchema>;

export const documentPayloadSchema = baseLocalPayloadSchema.extend({
  projectId: uuidSchema,
  evidenceItemId: uuidSchema.nullable(),
  title: z.string().trim().min(1),
  notes: nullableTextSchema,
});

export type DocumentPayload = z.infer<typeof documentPayloadSchema>;

export const reportDraftPayloadSchema = baseLocalPayloadSchema.extend({
  projectId: uuidSchema,
  title: z.string().trim().min(1),
  notes: nullableTextSchema,
  sectionsJson: z.string().trim().min(1),
  status: z.string().trim().min(1),
  generatedPdfUri: nullableTextSchema,
  generatedPdfStorageObjectKey: nullableTextSchema.optional(),
  generatedPdfSha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .nullable()
    .optional(),
  generatedPdfSizeBytes: z.number().int().nonnegative().nullable().optional(),
  generatedPdfUploadedAt: nullableDateTimeSchema.optional(),
  generatedAt: nullableDateTimeSchema,
});

export type ReportDraftPayload = z.infer<typeof reportDraftPayloadSchema>;

const stateChangePayloadSchema = z.object({
  id: uuidSchema,
  deletedAt: isoDateTimeSchema,
});
