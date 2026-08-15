export const evidenceCategories = [
  "BEFORE",
  "WORK",
  "AFTER",
  "DOCUMENT",
  "OTHER",
] as const;

export type EvidenceCategory = (typeof evidenceCategories)[number];

export const mediaSourceTypes = [
  "CAMERA_PHOTO",
  "PHOTO_LIBRARY",
  "DOCUMENT_SCAN",
  "FILE_IMPORT",
] as const;

export type MediaSourceType = (typeof mediaSourceTypes)[number];

export const mediaTypes = ["IMAGE", "VIDEO", "DOCUMENT", "OTHER"] as const;

export type MediaType = (typeof mediaTypes)[number];

export const syncStates = [
  "LOCAL_ONLY",
  "PENDING",
  "SYNCED",
  "FAILED",
  "CONFLICT",
] as const;

export type SyncState = (typeof syncStates)[number];

export const projectStatuses = ["draft", "active", "archived"] as const;

export type ProjectStatus = (typeof projectStatuses)[number];

export const localMutationOperations = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "ARCHIVE",
] as const;

export type LocalMutationOperation = (typeof localMutationOperations)[number];

export const localMutationEntityTypes = [
  "Project",
  "Customer",
  "Site",
  "EvidenceItem",
  "MediaAsset",
  "Annotation",
  "Document",
  "ReportDraft",
] as const;

export type LocalMutationEntityType = (typeof localMutationEntityTypes)[number];

export type Customer = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncState: SyncState;
};

export type Site = {
  id: string;
  customerId: string | null;
  name: string | null;
  address: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncState: SyncState;
};

export type Project = {
  id: string;
  customerId: string | null;
  siteId: string | null;
  name: string;
  customerCompany: string | null;
  siteAddress: string | null;
  workOrderReference: string | null;
  scheduledDate: string | null;
  notes: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  deletedAt: string | null;
  syncState: SyncState;
};

export type ProjectSummary = {
  id: string;
  organizationId: string;
  name: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
};

export type EvidenceItem = {
  id: string;
  projectId: string;
  category: EvidenceCategory;
  title: string | null;
  caption: string | null;
  notes: string | null;
  sortOrder: number;
  captureTimestamp: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncState: SyncState;
};

export type MediaAsset = {
  id: string;
  evidenceItemId: string;
  localUri: string;
  mediaType: MediaType;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  width: number | null;
  height: number | null;
  captureTimestamp: string;
  sourceType: MediaSourceType;
  originalAssetId: string | null;
  derivativeType: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncState: SyncState;
};

export type Annotation = {
  id: string;
  evidenceItemId: string;
  mediaAssetId: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncState: SyncState;
};

export type Document = {
  id: string;
  projectId: string;
  evidenceItemId: string | null;
  title: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncState: SyncState;
};

export type ReportDraft = {
  id: string;
  projectId: string;
  title: string;
  status: ProofPacketStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncState: SyncState;
};

export type LocalMutation = {
  mutationId: string;
  entityType: LocalMutationEntityType;
  entityId: string;
  operation: LocalMutationOperation;
  payloadRef: string;
  payloadJson: string;
  createdAt: string;
  attemptCount: number;
  syncState: SyncState;
};

export type OriginalEvidenceMetadata = {
  id: string;
  projectId: string;
  category: EvidenceCategory;
  capturedAt: string;
  clientCreatedAt: string;
  uploadedAt?: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  sourceType: MediaSourceType;
  storageObjectKey?: string;
  deviceMetadata?: Record<string, string | number | boolean>;
  location?: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
  };
};

export type ProofPacketStatus = "draft" | "generating" | "ready" | "failed";

export type ProjectFormInput = {
  name: string;
  customerCompany?: string;
  siteAddress?: string;
  workOrderReference?: string;
  scheduledDate?: string;
  notes?: string;
};

export type ProjectFormState = ProjectFormInput & {
  status: "idle" | "saving" | "saved" | "error";
  errorMessage?: string;
};

export type ProjectFormValidation = {
  valid: boolean;
  errors: Partial<Record<keyof ProjectFormInput, string>>;
};

export const initialProjectFormState: ProjectFormState = {
  name: "",
  customerCompany: "",
  siteAddress: "",
  workOrderReference: "",
  scheduledDate: "",
  notes: "",
  status: "idle",
};

export function normalizeOptionalText(
  value: string | undefined | null,
): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

export function validateProjectForm(
  input: ProjectFormInput,
): ProjectFormValidation {
  const errors: ProjectFormValidation["errors"] = {};

  if (!input.name.trim()) {
    errors.name = "Project name is required.";
  }

  if (
    input.scheduledDate?.trim() &&
    Number.isNaN(Date.parse(input.scheduledDate))
  ) {
    errors.scheduledDate = "Use a valid scheduled date.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function toProjectSummary(
  input: ProjectFormInput,
  options: { id: string; organizationId: string; now: string },
): ProjectSummary {
  const validation = validateProjectForm(input);

  if (!validation.valid) {
    throw new Error(validation.errors.name ?? "Project form is invalid.");
  }

  return {
    id: options.id,
    organizationId: options.organizationId,
    name: input.name.trim(),
    status: "draft",
    createdAt: options.now,
    updatedAt: options.now,
  };
}

export function toLocalProject(
  input: ProjectFormInput,
  options: {
    id: string;
    now: string;
    customerId?: string | null;
    siteId?: string | null;
  },
): Project {
  const validation = validateProjectForm(input);

  if (!validation.valid) {
    throw new Error(validation.errors.name ?? "Project form is invalid.");
  }

  return {
    id: options.id,
    customerId: options.customerId ?? null,
    siteId: options.siteId ?? null,
    name: input.name.trim(),
    customerCompany: normalizeOptionalText(input.customerCompany),
    siteAddress: normalizeOptionalText(input.siteAddress),
    workOrderReference: normalizeOptionalText(input.workOrderReference),
    scheduledDate: normalizeOptionalText(input.scheduledDate),
    notes: normalizeOptionalText(input.notes),
    status: "draft",
    createdAt: options.now,
    updatedAt: options.now,
    archivedAt: null,
    deletedAt: null,
    syncState: "PENDING",
  };
}

export type ProjectSearchOptions = {
  query?: string;
  includeArchived?: boolean;
  sortBy?: "updatedAt" | "createdAt" | "name" | "scheduledDate";
  sortDirection?: "asc" | "desc";
};

export type ProjectEvidenceSummary = {
  beforeCount: number;
  workCount: number;
  afterCount: number;
  documentCount: number;
  otherCount?: number;
  missingCaptionCount: number;
};

export function getReportReadiness(summary: ProjectEvidenceSummary): {
  ready: boolean;
  missing: string[];
} {
  const missing: string[] = [];

  if (summary.beforeCount === 0) missing.push("Before evidence");
  if (summary.afterCount === 0) missing.push("After evidence");
  if (summary.missingCaptionCount > 0) missing.push("Captions");

  return {
    ready: missing.length === 0,
    missing,
  };
}

export type CreateEvidenceInput = {
  projectId: string;
  category: EvidenceCategory;
  title?: string;
  caption?: string;
  notes?: string;
  captureTimestamp?: string;
};

export type LocalMutationInput = {
  mutationId?: string;
  entityType: LocalMutationEntityType;
  entityId: string;
  operation: LocalMutationOperation;
  payloadRef: string;
  payloadJson: string;
  createdAt: string;
  syncState?: SyncState;
};

export interface ProjectRepository {
  create(input: ProjectFormInput): Promise<Project>;
  update(id: string, input: ProjectFormInput): Promise<Project>;
  archive(id: string): Promise<void>;
  delete(id: string): Promise<void>;
  getById(id: string): Promise<Project | null>;
  list(options?: ProjectSearchOptions): Promise<Project[]>;
}

export interface EvidenceRepository {
  create(input: CreateEvidenceInput): Promise<EvidenceItem>;
  update(
    id: string,
    input: Partial<CreateEvidenceInput>,
  ): Promise<EvidenceItem>;
  delete(id: string): Promise<void>;
  listByProject(projectId: string): Promise<EvidenceItem[]>;
  summarizeProject(projectId: string): Promise<ProjectEvidenceSummary>;
}

export interface LocalMutationRepository {
  enqueue(input: LocalMutationInput): Promise<LocalMutation>;
  listPending(): Promise<LocalMutation[]>;
  countPending(): Promise<number>;
}
