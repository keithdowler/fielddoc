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

export const subscriptionEntitlementStatuses = [
  "active",
  "inactive",
  "unknown",
] as const;

export type SubscriptionEntitlementStatus =
  (typeof subscriptionEntitlementStatuses)[number];

export const fieldDocProEntitlementId = "fielddoc_pro";
export const fieldDocProEntitlementAliases = [
  fieldDocProEntitlementId,
  "FieldDocPro",
  "FieldDoc Pro",
] as const;

export function isFieldDocProEntitlementId(entitlementId: string): boolean {
  return fieldDocProEntitlementAliases.some((alias) => alias === entitlementId);
}

export type SubscriptionEntitlement = {
  entitlementId: string;
  status: SubscriptionEntitlementStatus;
  productId: string | null;
  expiresAt: string | null;
  lastCheckedAt: string;
};

export type UserActionStatus = "complete" | "action_needed" | "blocked";

export type UserActionChecklistItem = {
  id: string;
  status: UserActionStatus;
  label: string;
  detail: string;
  actionLabel: string | null;
};

export type ReportUsabilityChecklistInput = {
  projectSelected: boolean;
  beforeCount: number;
  workCount: number;
  afterCount: number;
  documentCount: number;
  missingCaptionCount: number;
  hasGeneratedPdf: boolean;
  reportPdfUploaded: boolean;
  mediaCount: number;
  uploadedMediaCount: number;
  externalOriginalDocumentCount?: number;
  metadataOnlyDocumentCount?: number;
  subscriptionActive?: boolean;
  privateStorageReady?: boolean;
};

export function getReportUsabilityChecklist(
  input: ReportUsabilityChecklistInput,
): UserActionChecklistItem[] {
  const hasAnyEvidence =
    input.beforeCount +
      input.workCount +
      input.afterCount +
      input.documentCount >
    0;
  const pendingOriginals = Math.max(
    input.mediaCount - input.uploadedMediaCount,
    0,
  );

  return [
    {
      id: "project",
      status: input.projectSelected ? "complete" : "blocked",
      label: "Choose a project",
      detail: input.projectSelected
        ? "This report is tied to one local job."
        : "Create or select a job before making a report.",
      actionLabel: input.projectSelected ? null : "Choose project",
    },
    {
      id: "before",
      status: input.beforeCount > 0 ? "complete" : "action_needed",
      label: "Before evidence",
      detail:
        input.beforeCount > 0
          ? `${formatCount(input.beforeCount, "before item", "before items")} saved.`
          : "Add at least one Before photo when the starting condition matters.",
      actionLabel: input.beforeCount > 0 ? null : "Add Before",
    },
    {
      id: "work",
      status: input.workCount > 0 ? "complete" : "action_needed",
      label: "Work evidence",
      detail:
        input.workCount > 0
          ? `${formatCount(input.workCount, "work item", "work items")} saved.`
          : "Add Work evidence to show what changed.",
      actionLabel: input.workCount > 0 ? null : "Add Work",
    },
    {
      id: "after",
      status: input.afterCount > 0 ? "complete" : "action_needed",
      label: "After evidence",
      detail:
        input.afterCount > 0
          ? `${formatCount(input.afterCount, "after item", "after items")} saved.`
          : "Add After evidence so the final condition is clear.",
      actionLabel: input.afterCount > 0 ? null : "Add After",
    },
    {
      id: "documents",
      status: input.documentCount > 0 ? "complete" : "action_needed",
      label: "Documents",
      detail:
        input.documentCount > 0
          ? `${formatCount(input.documentCount, "document", "documents")} attached.`
          : "Attach signed paperwork, PDFs, or supporting files when available.",
      actionLabel: input.documentCount > 0 ? null : "Add documents",
    },
    {
      id: "captions",
      status:
        input.missingCaptionCount === 0 && hasAnyEvidence
          ? "complete"
          : "action_needed",
      label: "Captions",
      detail:
        input.missingCaptionCount === 0 && hasAnyEvidence
          ? "Evidence has the caption detail needed for review."
          : input.missingCaptionCount > 0
            ? `${formatCount(input.missingCaptionCount, "item needs", "items need")} a plain-language caption.`
            : "Add evidence first, then give it short captions.",
      actionLabel:
        input.missingCaptionCount === 0 && hasAnyEvidence
          ? null
          : "Review captions",
    },
    {
      id: "generate_pdf",
      status: input.hasGeneratedPdf ? "complete" : "action_needed",
      label: "Make report PDF",
      detail: input.hasGeneratedPdf
        ? "A local Proof Packet PDF exists on this device."
        : "Generate a PDF after the evidence and captions look right.",
      actionLabel: input.hasGeneratedPdf ? null : "Generate PDF",
    },
    {
      id: "subscription",
      status:
        input.subscriptionActive === false
          ? "blocked"
          : input.subscriptionActive === true
            ? "complete"
            : "action_needed",
      label: "Subscription",
      detail:
        input.subscriptionActive === false
          ? "Cloud backup and report archive need an active subscription."
          : input.subscriptionActive === true
            ? "Cloud backup features are available on this device."
            : "Sign in and refresh subscription before cloud delivery.",
      actionLabel:
        input.subscriptionActive === true ? null : "Check subscription",
    },
    {
      id: "backup_originals",
      status:
        input.privateStorageReady === false
          ? "blocked"
          : pendingOriginals === 0
            ? "complete"
            : "action_needed",
      label: "Back up original files",
      detail:
        input.privateStorageReady === false
          ? "Private storage is not configured yet."
          : pendingOriginals === 0
            ? "Original files are backed up or there are no originals yet."
            : `${formatCount(pendingOriginals, "original file is", "original files are")} still only on this device.`,
      actionLabel:
        pendingOriginals === 0 && input.privateStorageReady !== false
          ? null
          : "Back up now",
    },
    {
      id: "upload_pdf",
      status:
        input.reportPdfUploaded || !input.hasGeneratedPdf
          ? input.reportPdfUploaded
            ? "complete"
            : "action_needed"
          : "action_needed",
      label: "Archive report PDF",
      detail: input.reportPdfUploaded
        ? "The generated PDF is stored in the private cloud archive."
        : input.hasGeneratedPdf
          ? "Back up the generated PDF before sharing from the web."
          : "Generate the PDF before archiving it.",
      actionLabel: input.reportPdfUploaded ? null : "Archive PDF",
    },
  ];
}

export function hasActiveFieldDocProEntitlement(
  entitlements: readonly SubscriptionEntitlement[],
  nowIso: string = new Date().toISOString(),
): boolean {
  const now = new Date(nowIso).getTime();

  return entitlements.some((entitlement) => {
    if (
      !isFieldDocProEntitlementId(entitlement.entitlementId) ||
      entitlement.status !== "active"
    ) {
      return false;
    }

    return (
      entitlement.expiresAt === null ||
      new Date(entitlement.expiresAt).getTime() > now
    );
  });
}

export function getCloudFeatureGate(input: {
  isSignedIn: boolean;
  entitlementConfigured: boolean;
  entitlements: readonly SubscriptionEntitlement[];
  nowIso?: string;
}): { allowed: boolean; reason: string | null } {
  if (!input.isSignedIn) {
    return {
      allowed: false,
      reason: "Sign in before using cloud subscription features.",
    };
  }

  if (!input.entitlementConfigured) {
    return {
      allowed: false,
      reason:
        "RevenueCat is not configured on this build, so paid cloud features are disabled.",
    };
  }

  if (
    !hasActiveFieldDocProEntitlement(
      input.entitlements,
      input.nowIso ?? new Date().toISOString(),
    )
  ) {
    return {
      allowed: false,
      reason:
        "An active Proof Packet subscription is required for cloud sync and report archive uploads.",
    };
  }

  return { allowed: true, reason: null };
}

export type BetaReadinessStage =
  | "setup_required"
  | "field_validation"
  | "beta_candidate"
  | "production_candidate";

export type BetaReadinessRiskSeverity = "blocker" | "warning";

export type BetaReadinessRisk = {
  id: string;
  severity: BetaReadinessRiskSeverity;
  label: string;
  detail: string;
};

export type BetaReadinessSummaryInput = {
  tenantReady: boolean;
  privateStorageReady: boolean;
  revenueCatWebhookReady: boolean;
  emailDeliveryReady: boolean;
  errorReportingReady: boolean;
  legalUrlsReady: boolean;
  projectCount: number;
  evidenceCount: number;
  mediaAssetCount: number;
  uploadedMediaAssetCount: number;
  reportDraftCount: number;
  archivedReportPdfCount: number;
  syncReceiptCount: number;
  rejectedSyncReceiptCount: number;
  auditEventCount: number;
  shareLinkCount: number;
  missingCaptionCount: number;
};

export type BetaReadinessSummary = {
  score: number;
  stage: BetaReadinessStage;
  headline: string;
  detail: string;
  blockers: BetaReadinessRisk[];
  warnings: BetaReadinessRisk[];
  nextActions: string[];
};

export function getBetaReadinessSummary(
  input: BetaReadinessSummaryInput,
): BetaReadinessSummary {
  const blockers: BetaReadinessRisk[] = [];
  const warnings: BetaReadinessRisk[] = [];

  if (!input.tenantReady) {
    blockers.push({
      id: "tenant",
      severity: "blocker",
      label: "Provision tenant",
      detail:
        "The signed-in Clerk organization must be bridged into the internal tenant model.",
    });
  }

  if (!input.privateStorageReady) {
    blockers.push({
      id: "private_storage",
      severity: "blocker",
      label: "Configure private object storage",
      detail:
        "Originals and generated PDFs need private storage before leaving device storage.",
    });
  }

  if (input.projectCount === 0) {
    warnings.push({
      id: "project_validation",
      severity: "warning",
      label: "Upload a real field project",
      detail:
        "At least one mobile-created project should be synced before beta validation.",
    });
  }

  if (input.evidenceCount === 0) {
    warnings.push({
      id: "evidence_validation",
      severity: "warning",
      label: "Capture real evidence",
      detail:
        "A beta candidate needs real before/work/after or document evidence in the cloud.",
    });
  }

  if (input.mediaAssetCount > input.uploadedMediaAssetCount) {
    warnings.push({
      id: "media_uploads",
      severity: "warning",
      label: "Upload remaining originals",
      detail:
        "Some media metadata is synced, but the immutable original files are still device-local.",
    });
  }

  if (input.reportDraftCount > 0 && input.archivedReportPdfCount === 0) {
    warnings.push({
      id: "report_archive",
      severity: "warning",
      label: "Archive a generated Proof Packet",
      detail:
        "Generated PDF archival should be verified before relying on the web report archive.",
    });
  }

  if (input.rejectedSyncReceiptCount > 0) {
    warnings.push({
      id: "rejected_sync",
      severity: "warning",
      label: "Review rejected sync receipts",
      detail:
        "Rejected mutations should be understood before adding more production traffic.",
    });
  }

  if (input.missingCaptionCount > 0) {
    warnings.push({
      id: "missing_captions",
      severity: "warning",
      label: "Finish evidence captions",
      detail:
        "Missing captions reduce report quality and should be visible before delivery.",
    });
  }

  if (!input.revenueCatWebhookReady) {
    warnings.push({
      id: "revenuecat_webhook",
      severity: "warning",
      label: "Configure RevenueCat webhook",
      detail:
        "The client can read subscription state, but the server cannot yet trust provider events.",
    });
  }

  if (!input.emailDeliveryReady) {
    warnings.push({
      id: "email_delivery",
      severity: "warning",
      label: "Configure email delivery",
      detail:
        "Report link delivery and account lifecycle emails need a production email provider.",
    });
  }

  if (!input.errorReportingReady) {
    warnings.push({
      id: "error_reporting",
      severity: "warning",
      label: "Configure error reporting",
      detail:
        "Broad beta support needs privacy-safe crash and server error visibility.",
    });
  }

  if (!input.legalUrlsReady) {
    warnings.push({
      id: "legal_urls",
      severity: "warning",
      label: "Publish legal URLs",
      detail:
        "Privacy and terms URLs are required before App Store and customer-facing launch.",
    });
  }

  const completedChecks = [
    input.tenantReady,
    input.privateStorageReady,
    input.revenueCatWebhookReady,
    input.emailDeliveryReady,
    input.errorReportingReady,
    input.legalUrlsReady,
    input.projectCount > 0,
    input.evidenceCount > 0,
    input.mediaAssetCount === 0 ||
      input.uploadedMediaAssetCount >= input.mediaAssetCount,
    input.reportDraftCount === 0 || input.archivedReportPdfCount > 0,
    input.rejectedSyncReceiptCount === 0,
    input.auditEventCount > 0,
  ].filter(Boolean).length;
  const score = Math.round((completedChecks / 12) * 100);
  const hasFieldEvidence = input.projectCount > 0 && input.evidenceCount > 0;
  const hasArchiveProof =
    input.archivedReportPdfCount > 0 && input.uploadedMediaAssetCount > 0;
  const stage: BetaReadinessStage =
    blockers.length > 0
      ? "setup_required"
      : score >= 92 && warnings.length === 0
        ? "production_candidate"
        : hasFieldEvidence && hasArchiveProof
          ? "beta_candidate"
          : "field_validation";

  const nextActions = [...blockers, ...warnings]
    .slice(0, 4)
    .map((risk) => risk.label);

  return {
    score,
    stage,
    headline: getBetaReadinessHeadline(stage),
    detail: getBetaReadinessDetail(stage, input),
    blockers,
    warnings,
    nextActions:
      nextActions.length > 0
        ? nextActions
        : [
            "Run one real field packet through mobile, cloud sync, and web review.",
          ],
  };
}

function getBetaReadinessHeadline(stage: BetaReadinessStage): string {
  switch (stage) {
    case "production_candidate":
      return "Production candidate";
    case "beta_candidate":
      return "Beta candidate";
    case "field_validation":
      return "Ready for field validation";
    case "setup_required":
      return "Setup required";
  }
}

function getBetaReadinessDetail(
  stage: BetaReadinessStage,
  input: BetaReadinessSummaryInput,
): string {
  switch (stage) {
    case "production_candidate":
      return "Core cloud, storage, billing, legal, and observability checks are configured.";
    case "beta_candidate":
      return `${input.projectCount} projects, ${input.evidenceCount} evidence items, and ${input.archivedReportPdfCount} archived PDFs are visible in the cloud workspace.`;
    case "field_validation":
      return "The cloud foundation is connected. Run more real field work through sync, report archive, and web review.";
    case "setup_required":
      return "Complete required tenant and storage setup before treating cloud workflows as available.";
  }
}

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
  isImportant: boolean;
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
  storageObjectKey: string | null;
  mediaType: MediaType;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  width: number | null;
  height: number | null;
  caption: string | null;
  notes: string | null;
  captureTimestamp: string;
  sourceType: MediaSourceType;
  originalAssetId: string | null;
  derivativeType: string | null;
  uploadedAt: string | null;
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
  mediaAssetId: string | null;
  title: string;
  notes: string | null;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  sha256: string | null;
  pageCount: number | null;
  sourceType: MediaSourceType | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncState: SyncState;
};

export type ReportDraft = {
  id: string;
  projectId: string;
  title: string;
  notes: string | null;
  sectionsJson: string;
  status: ProofPacketStatus;
  generatedPdfUri: string | null;
  generatedPdfStorageObjectKey: string | null;
  generatedPdfSha256: string | null;
  generatedPdfSizeBytes: number | null;
  generatedPdfUploadedAt: string | null;
  generatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  syncState: SyncState;
};

export type ReportHistoryItem = {
  draftId: string;
  projectId: string;
  projectName: string;
  title: string;
  status: ProofPacketStatus;
  generatedPdfUri: string | null;
  generatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  hasGeneratedPdf: boolean;
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
  importantCount?: number;
  mediaAssetCount?: number;
  missingCaptionCount: number;
};

export type ReportSectionConfig = {
  category: EvidenceCategory;
  label: string;
  included: boolean;
  sortOrder: number;
};

export type ReportDraftCompositionInput = {
  projectId: string;
  title?: string;
  notes?: string;
  sections: ReportSectionConfig[];
};

export type ProofPacketEvidenceEntry = {
  evidence: EvidenceItem;
  mediaAssets: MediaAsset[];
  annotations: Annotation[];
  documents: ProofPacketDocumentEntry[];
  caption: string | null;
  capturedAt: string;
  mediaCount: number;
  annotationCount: number;
  documentCount: number;
  visualDocumentCount: number;
  externalOriginalDocumentCount: number;
  metadataOnlyDocumentCount: number;
  missingCaption: boolean;
  isImportant: boolean;
};

export type ProofPacketDocumentPreviewKind =
  "visual" | "external_original" | "metadata_only" | "incomplete";

export type ProofPacketDocumentFileProfile =
  | "scanned_pages"
  | "imported_pdf"
  | "imported_image"
  | "imported_file"
  | "unknown";

export type ProofPacketDocumentEntry = {
  document: Document;
  previewKind: ProofPacketDocumentPreviewKind;
  fileProfile: ProofPacketDocumentFileProfile;
  visualMediaAssetId: string | null;
  visualMediaAssetIds: string[];
  visualPageCount: number;
  label: string;
  detail: string;
  proofSummary: string;
  recommendedAction: string | null;
  missingMetadata: string[];
};

export type ProofPacketSectionPreview = {
  category: EvidenceCategory;
  label: string;
  sortOrder: number;
  evidenceItems: ProofPacketEvidenceEntry[];
  evidenceCount: number;
  mediaCount: number;
  annotationCount: number;
  documentCount: number;
  visualDocumentCount: number;
  externalOriginalDocumentCount: number;
  metadataOnlyDocumentCount: number;
};

export type ProofPacketPreview = {
  project: Project;
  draft: ReportDraft;
  title: string;
  notes: string | null;
  sections: ProofPacketSectionPreview[];
  totals: {
    sections: number;
    evidenceItems: number;
    mediaAssets: number;
    annotations: number;
    documents: number;
    visualDocuments: number;
    externalOriginalDocuments: number;
    metadataOnlyDocuments: number;
    missingCaptions: number;
  };
  ready: boolean;
  missing: string[];
};

export type ProofPacketPreviewInput = {
  project: Project;
  draft: ReportDraft;
  evidenceItems: EvidenceItem[];
  mediaAssetsByEvidenceId: Record<string, MediaAsset[]>;
  annotationsByEvidenceId: Record<string, Annotation[]>;
  documentsByEvidenceId?: Record<string, Document[]>;
};

export type ProofPacketHtmlOptions = {
  generatedAt: string;
  productName?: string;
  branding?: ReportBranding;
  embeddedMedia?: Record<string, ProofPacketEmbeddedMedia>;
};

export type ProofPacketEmbeddedMedia = {
  dataUri: string;
  altText?: string;
};

export type GeneratedProofPacket = {
  draftId: string;
  projectId: string;
  localUri: string;
  fileName: string;
  generatedAt: string;
  sizeBytes: number;
  pageCount: number | null;
};

export type ProofPacketRenderOptions = {
  generatedAt?: string;
  branding?: ReportBranding;
};

export type ReportBranding = {
  companyName: string | null;
  preparedBy: string | null;
  footerText: string | null;
  accentColor: string;
  updatedAt: string;
};

export type ReportDeliveryReadinessInput = {
  reportReady: boolean;
  hasGeneratedPdf: boolean;
  reportPdfUploaded: boolean;
  mediaCount: number;
  uploadedMediaCount: number;
  missingCaptionCount: number;
  documentCount?: number;
  visualDocumentCount?: number;
  externalOriginalDocumentCount?: number;
  metadataOnlyDocumentCount?: number;
  privateStorageReady?: boolean;
  subscriptionActive?: boolean;
  shareLinkCount?: number;
};

export type ReportDeliveryReadinessStatus =
  | "needs_evidence"
  | "needs_captions"
  | "generate_pdf"
  | "subscription_required"
  | "storage_not_configured"
  | "upload_required"
  | "ready_to_share";

export type ReportDeliveryReadiness = {
  ready: boolean;
  status: ReportDeliveryReadinessStatus;
  label: string;
  detail: string;
  blockers: string[];
  warnings: string[];
};

export type SaveReportBrandingInput = {
  companyName?: string;
  preparedBy?: string;
  footerText?: string;
  accentColor?: string;
};

export const reportBrandingAccentColors = [
  "#0f5b78",
  "#166534",
  "#7c2d12",
  "#3730a3",
  "#11181c",
] as const;

export const defaultReportBranding: ReportBranding = {
  companyName: null,
  preparedBy: null,
  footerText: null,
  accentColor: reportBrandingAccentColors[0],
  updatedAt: new Date(0).toISOString(),
};

export function normalizeReportBranding(
  input: SaveReportBrandingInput,
  options: { existing?: ReportBranding | null; now: string },
): ReportBranding {
  const existing = options.existing ?? defaultReportBranding;
  const accentColor =
    input.accentColor &&
    reportBrandingAccentColors.includes(
      input.accentColor as (typeof reportBrandingAccentColors)[number],
    )
      ? input.accentColor
      : existing.accentColor;

  return {
    companyName:
      input.companyName === undefined
        ? existing.companyName
        : normalizeOptionalText(input.companyName),
    preparedBy:
      input.preparedBy === undefined
        ? existing.preparedBy
        : normalizeOptionalText(input.preparedBy),
    footerText:
      input.footerText === undefined
        ? existing.footerText
        : normalizeOptionalText(input.footerText),
    accentColor,
    updatedAt: options.now,
  };
}

export const defaultReportSectionConfigs: ReportSectionConfig[] = [
  { category: "BEFORE", label: "Before", included: true, sortOrder: 0 },
  { category: "WORK", label: "Work", included: true, sortOrder: 1 },
  { category: "AFTER", label: "After", included: true, sortOrder: 2 },
  { category: "DOCUMENT", label: "Documents", included: true, sortOrder: 3 },
  { category: "OTHER", label: "Other", included: false, sortOrder: 4 },
];

export function normalizeReportSections(
  sections: ReportSectionConfig[],
): ReportSectionConfig[] {
  const byCategory = new Map(
    sections.map((section) => [section.category, section]),
  );

  return defaultReportSectionConfigs
    .map((fallback) => {
      const section = byCategory.get(fallback.category);
      const sortOrder =
        section && Number.isFinite(section.sortOrder)
          ? section.sortOrder
          : fallback.sortOrder;

      return {
        category: fallback.category,
        label: section?.label?.trim() || fallback.label,
        included: section?.included ?? fallback.included,
        sortOrder,
      };
    })
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map((section, index) => ({ ...section, sortOrder: index }));
}

export function getIncludedReportSections(
  sections: ReportSectionConfig[],
): ReportSectionConfig[] {
  return normalizeReportSections(sections).filter(
    (section) => section.included,
  );
}

export function getReportSectionEvidenceCount(
  summary: ProjectEvidenceSummary,
  category: EvidenceCategory,
): number {
  if (category === "BEFORE") return summary.beforeCount;
  if (category === "WORK") return summary.workCount;
  if (category === "AFTER") return summary.afterCount;
  if (category === "DOCUMENT") return summary.documentCount;
  return summary.otherCount ?? 0;
}

export function getReportDraftReadiness(
  summary: ProjectEvidenceSummary,
  sections: ReportSectionConfig[],
): {
  ready: boolean;
  missing: string[];
} {
  const includedSections = getIncludedReportSections(sections);
  const includedCategories = new Set(
    includedSections.map((section) => section.category),
  );
  const missing: string[] = [];

  if (!includedSections.length) {
    missing.push("Report sections");
  }

  if (includedCategories.has("BEFORE") && summary.beforeCount === 0) {
    missing.push("Before evidence");
  }

  if (includedCategories.has("AFTER") && summary.afterCount === 0) {
    missing.push("After evidence");
  }

  if (summary.missingCaptionCount > 0) {
    missing.push("Captions");
  }

  const includedMediaCount = includedSections.reduce(
    (count, section) =>
      count + getReportSectionEvidenceCount(summary, section.category),
    0,
  );

  if (includedMediaCount === 0) {
    missing.push("Included evidence");
  }

  return {
    ready: missing.length === 0,
    missing,
  };
}

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

export function getProofPacketDocumentEntry(
  document: Document,
  mediaAssets: MediaAsset[],
): ProofPacketDocumentEntry {
  const visualMediaAssets = getDocumentVisualMediaAssets(document, mediaAssets);
  const visualMediaAssetIds = visualMediaAssets.map((media) => media.id);
  const fileProfile = getDocumentFileProfile(document, visualMediaAssets);
  const visualPageCount =
    document.pageCount ?? Math.max(visualMediaAssetIds.length, 1);
  const missingMetadata = [
    document.fileName ? null : "file name",
    document.mimeType ? null : "mime type",
    document.sizeBytes === null ? "file size" : null,
    document.sha256 || visualMediaAssetIds.length > 0 ? null : "SHA-256",
  ].filter((item): item is string => Boolean(item));

  if (visualMediaAssetIds.length > 0) {
    return {
      document,
      previewKind: "visual",
      fileProfile,
      visualMediaAssetId: visualMediaAssetIds[0] ?? null,
      visualMediaAssetIds,
      visualPageCount,
      label:
        visualPageCount === 1
          ? "Visual document page"
          : "Visual document pages",
      detail:
        visualPageCount === 1
          ? "This scanned document is linked to an image original and can be embedded in the packet preview."
          : `This scanned document has ${visualPageCount} visual pages that can be embedded in the packet preview.`,
      proofSummary:
        visualPageCount === 1
          ? "Visual page embedded from immutable local media."
          : `${visualPageCount} visual pages embedded from immutable local media.`,
      recommendedAction: null,
      missingMetadata,
    };
  }

  if (missingMetadata.length === 0 && isExternalOriginalDocument(document)) {
    return {
      document,
      previewKind: "external_original",
      fileProfile,
      visualMediaAssetId: null,
      visualMediaAssetIds: [],
      visualPageCount: 0,
      label: getExternalOriginalLabel(document),
      detail:
        document.mimeType === "application/pdf"
          ? "This imported PDF is preserved as an immutable original with file metadata and SHA-256, but its pages are not rasterized into the packet yet."
          : "This imported document is preserved as an immutable original with file metadata and SHA-256, but it is not visually embedded in the packet.",
      proofSummary:
        "Original file hash, size, MIME type, and source are preserved for delivery review.",
      recommendedAction:
        document.mimeType === "application/pdf"
          ? "Open the original PDF from private storage for full visual review until PDF page previews are available."
          : "Open the original document from private storage for full visual review.",
      missingMetadata,
    };
  }

  if (missingMetadata.length === 0) {
    return {
      document,
      previewKind: "metadata_only",
      fileProfile,
      visualMediaAssetId: null,
      visualMediaAssetIds: [],
      visualPageCount: 0,
      label: "Metadata-only document",
      detail:
        "This document is tracked with immutable metadata and SHA-256, but its pages are not visually embedded.",
      proofSummary:
        "Document metadata is complete; no visual preview is available in this packet.",
      recommendedAction:
        "Open the original document separately before sending the packet.",
      missingMetadata,
    };
  }

  return {
    document,
    previewKind: "incomplete",
    fileProfile,
    visualMediaAssetId: null,
    visualMediaAssetIds: [],
    visualPageCount: 0,
    label: "Incomplete document metadata",
    detail: `Missing ${missingMetadata.join(", ")} before this document is delivery-ready.`,
    proofSummary:
      "Document metadata is incomplete and should not be treated as delivery-ready proof.",
    recommendedAction: `Complete ${missingMetadata.join(", ")} before delivery.`,
    missingMetadata,
  };
}

export function getDocumentFileProfile(
  document: Document,
  visualMediaAssets: MediaAsset[] = [],
): ProofPacketDocumentFileProfile {
  if (visualMediaAssets.length > 0) {
    return "scanned_pages";
  }

  if (document.mimeType === "application/pdf") {
    return "imported_pdf";
  }

  if (document.sourceType === "DOCUMENT_SCAN") {
    return "scanned_pages";
  }

  if (document.mimeType?.startsWith("image/")) {
    return "imported_image";
  }

  if (document.sourceType === "FILE_IMPORT" || document.mimeType) {
    return "imported_file";
  }

  return "unknown";
}

export function isExternalOriginalDocument(document: Document): boolean {
  return (
    document.sourceType === "FILE_IMPORT" ||
    document.mimeType === "application/pdf" ||
    document.mimeType === "application/msword" ||
    document.mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

function getExternalOriginalLabel(document: Document): string {
  if (document.mimeType === "application/pdf") return "Imported PDF original";
  if (document.mimeType?.startsWith("image/")) return "Imported image original";
  return "Imported document original";
}

export function getDocumentVisualMediaAssets(
  document: Document,
  mediaAssets: MediaAsset[],
): MediaAsset[] {
  const linkedMedia = document.mediaAssetId
    ? mediaAssets.find((media) => media.id === document.mediaAssetId)
    : undefined;
  const scanPageCandidates =
    document.sourceType === "DOCUMENT_SCAN" && document.evidenceItemId
      ? mediaAssets.filter(
          (media) =>
            media.evidenceItemId === document.evidenceItemId &&
            media.sourceType === "DOCUMENT_SCAN",
        )
      : [];
  const candidatesById = new Map<string, MediaAsset>();

  if (linkedMedia) {
    candidatesById.set(linkedMedia.id, linkedMedia);
  }

  for (const media of scanPageCandidates) {
    candidatesById.set(media.id, media);
  }

  return Array.from(candidatesById.values())
    .filter(
      (media) =>
        media.mediaType === "IMAGE" &&
        media.mimeType.startsWith("image/") &&
        media.deletedAt === null,
    )
    .sort(compareMediaForPacket);
}

export function getReportDeliveryReadiness(
  input: ReportDeliveryReadinessInput,
): ReportDeliveryReadiness {
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!input.reportReady) {
    blockers.push(
      input.missingCaptionCount > 0
        ? "Finish required captions and included evidence."
        : "Add required included evidence before delivery.",
    );
  }

  if (input.missingCaptionCount > 0) {
    blockers.push(`${input.missingCaptionCount} captions still need review.`);
  }

  if (!input.hasGeneratedPdf) {
    blockers.push("Generate the Proof Packet PDF.");
  }

  if (input.subscriptionActive === false) {
    blockers.push("Activate the subscription entitlement.");
  }

  if (input.privateStorageReady === false) {
    blockers.push("Configure private object storage.");
  }

  if (input.hasGeneratedPdf && !input.reportPdfUploaded) {
    blockers.push("Upload the generated PDF to private storage.");
  }

  if (input.mediaCount !== input.uploadedMediaCount) {
    const pendingMediaCount = input.mediaCount - input.uploadedMediaCount;
    blockers.push(
      `Upload ${formatCount(pendingMediaCount, "original media file", "original media files")}.`,
    );
  }

  const incompleteDocuments =
    (input.documentCount ?? 0) -
    (input.visualDocumentCount ?? 0) -
    (input.externalOriginalDocumentCount ?? 0) -
    (input.metadataOnlyDocumentCount ?? 0);

  if (incompleteDocuments > 0) {
    blockers.push(
      `Complete metadata for ${formatCount(incompleteDocuments, "supporting document", "supporting documents")}.`,
    );
  }

  if ((input.metadataOnlyDocumentCount ?? 0) > 0) {
    warnings.push(
      `${formatCount(input.metadataOnlyDocumentCount ?? 0, "supporting document is", "supporting documents are")} metadata-only in the packet.`,
    );
  }

  if ((input.externalOriginalDocumentCount ?? 0) > 0) {
    warnings.push(
      `${formatCount(input.externalOriginalDocumentCount ?? 0, "imported document is", "imported documents are")} available as original files but not visually embedded.`,
    );
  }

  if ((input.shareLinkCount ?? 0) === 0 && input.reportPdfUploaded) {
    warnings.push("No customer share link has been issued yet.");
  }

  if (!input.reportReady) {
    return {
      ready: false,
      status:
        input.missingCaptionCount > 0 ? "needs_captions" : "needs_evidence",
      label:
        input.missingCaptionCount > 0 ? "Needs captions" : "Needs evidence",
      detail: "The report is not ready for customer delivery yet.",
      blockers: uniqueStrings(blockers),
      warnings,
    };
  }

  if (!input.hasGeneratedPdf) {
    return {
      ready: false,
      status: "generate_pdf",
      label: "Generate PDF",
      detail: "The report metadata is ready; generate the customer PDF next.",
      blockers: uniqueStrings(blockers),
      warnings,
    };
  }

  if (input.subscriptionActive === false) {
    return {
      ready: false,
      status: "subscription_required",
      label: "Subscription required",
      detail: "Cloud delivery is gated until an active entitlement is present.",
      blockers: uniqueStrings(blockers),
      warnings,
    };
  }

  if (input.privateStorageReady === false) {
    return {
      ready: false,
      status: "storage_not_configured",
      label: "Storage required",
      detail: "Private object storage must be configured before delivery.",
      blockers: uniqueStrings(blockers),
      warnings,
    };
  }

  if (
    !input.reportPdfUploaded ||
    input.mediaCount !== input.uploadedMediaCount ||
    incompleteDocuments > 0
  ) {
    return {
      ready: false,
      status: "upload_required",
      label: "Upload required",
      detail:
        "The PDF and originals must be archived before customer delivery.",
      blockers: uniqueStrings(blockers),
      warnings,
    };
  }

  return {
    ready: true,
    status: "ready_to_share",
    label: "Ready to share",
    detail:
      input.shareLinkCount && input.shareLinkCount > 0
        ? "The packet has archived originals, an uploaded PDF, and issued share links."
        : "The packet has archived originals and an uploaded PDF.",
    blockers: [],
    warnings,
  };
}

export function assembleProofPacketPreview(
  input: ProofPacketPreviewInput,
): ProofPacketPreview {
  const sections = parseReportDraftSections(input.draft.sectionsJson);
  const sectionPreviews = getIncludedReportSections(sections).map((section) => {
    const evidenceItems = input.evidenceItems
      .filter((evidence) => evidence.category === section.category)
      .sort(compareEvidenceForPacket)
      .map((evidence): ProofPacketEvidenceEntry => {
        const mediaAssets = (
          input.mediaAssetsByEvidenceId[evidence.id] ?? []
        ).sort(compareMediaForPacket);
        const annotations = (
          input.annotationsByEvidenceId[evidence.id] ?? []
        ).sort(compareAnnotationsForPacket);
        const documents = (input.documentsByEvidenceId?.[evidence.id] ?? [])
          .sort(compareDocumentsForPacket)
          .map((document) =>
            getProofPacketDocumentEntry(document, mediaAssets),
          );
        const caption = evidence.caption ?? mediaAssets[0]?.caption ?? null;

        return {
          evidence,
          mediaAssets,
          annotations,
          documents,
          caption,
          capturedAt: evidence.captureTimestamp,
          mediaCount: mediaAssets.length,
          annotationCount: annotations.length,
          documentCount: documents.length,
          visualDocumentCount: documents.filter(
            (document) => document.previewKind === "visual",
          ).length,
          externalOriginalDocumentCount: documents.filter(
            (document) => document.previewKind === "external_original",
          ).length,
          metadataOnlyDocumentCount: documents.filter(
            (document) => document.previewKind === "metadata_only",
          ).length,
          missingCaption: !caption?.trim(),
          isImportant: evidence.isImportant,
        };
      });

    return {
      category: section.category,
      label: section.label,
      sortOrder: section.sortOrder,
      evidenceItems,
      evidenceCount: evidenceItems.length,
      mediaCount: evidenceItems.reduce(
        (count, evidence) => count + evidence.mediaCount,
        0,
      ),
      annotationCount: evidenceItems.reduce(
        (count, evidence) => count + evidence.annotationCount,
        0,
      ),
      documentCount: evidenceItems.reduce(
        (count, evidence) => count + evidence.documentCount,
        0,
      ),
      visualDocumentCount: evidenceItems.reduce(
        (count, evidence) => count + evidence.visualDocumentCount,
        0,
      ),
      externalOriginalDocumentCount: evidenceItems.reduce(
        (count, evidence) => count + evidence.externalOriginalDocumentCount,
        0,
      ),
      metadataOnlyDocumentCount: evidenceItems.reduce(
        (count, evidence) => count + evidence.metadataOnlyDocumentCount,
        0,
      ),
    };
  });
  const summary = summarizeProofPacketSections(sectionPreviews);
  const readiness = getReportDraftReadiness(summary, sections);

  return {
    project: input.project,
    draft: input.draft,
    title: input.draft.title,
    notes: input.draft.notes,
    sections: sectionPreviews,
    totals: {
      sections: sectionPreviews.length,
      evidenceItems: sectionPreviews.reduce(
        (count, section) => count + section.evidenceCount,
        0,
      ),
      mediaAssets: sectionPreviews.reduce(
        (count, section) => count + section.mediaCount,
        0,
      ),
      annotations: sectionPreviews.reduce(
        (count, section) => count + section.annotationCount,
        0,
      ),
      documents: sectionPreviews.reduce(
        (count, section) => count + section.documentCount,
        0,
      ),
      visualDocuments: sectionPreviews.reduce(
        (count, section) => count + section.visualDocumentCount,
        0,
      ),
      externalOriginalDocuments: sectionPreviews.reduce(
        (count, section) => count + section.externalOriginalDocumentCount,
        0,
      ),
      metadataOnlyDocuments: sectionPreviews.reduce(
        (count, section) => count + section.metadataOnlyDocumentCount,
        0,
      ),
      missingCaptions: summary.missingCaptionCount,
    },
    ready: readiness.ready,
    missing: readiness.missing,
  };
}

export function parseReportDraftSections(
  sectionsJson: string,
): ReportSectionConfig[] {
  try {
    const parsed = JSON.parse(sectionsJson) as ReportSectionConfig[];
    return normalizeReportSections(parsed);
  } catch {
    return defaultReportSectionConfigs;
  }
}

export function renderProofPacketHtml(
  preview: ProofPacketPreview,
  options: ProofPacketHtmlOptions,
): string {
  const productName = escapeHtml(options.productName ?? "Proof Packet");
  const branding = options.branding ?? defaultReportBranding;
  const accentColor = escapeHtml(branding.accentColor);
  const generatedAt = escapeHtml(formatPacketTimestamp(options.generatedAt));
  const project = preview.project;
  const projectRows = [
    ["Project", project.name],
    ["Customer", project.customerCompany],
    ["Site", project.siteAddress],
    ["Work order", project.workOrderReference],
    ["Scheduled", project.scheduledDate],
    ["Prepared by", branding.preparedBy],
  ]
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<tr><th>${escapeHtml(label ?? "")}</th><td>${escapeHtml(value ?? "")}</td></tr>`,
    )
    .join("");
  const sectionHtml = preview.sections
    .map(
      (section, sectionIndex) => `
        <section class="packet-section">
          <h2>${sectionIndex + 1}. ${escapeHtml(section.label)}</h2>
          <p class="section-meta">${section.evidenceCount} evidence items, ${section.mediaCount} media files, ${section.documentCount} documents, ${section.annotationCount} notes</p>
          ${
            section.evidenceItems.length
              ? section.evidenceItems
                  .map((entry, entryIndex) =>
                    renderEvidenceEntryHtml(
                      entry,
                      sectionIndex,
                      entryIndex,
                      options.embeddedMedia,
                    ),
                  )
                  .join("")
              : '<p class="empty">No evidence in this section.</p>'
          }
        </section>
      `,
    )
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(preview.title)}</title>
    <style>
      @page { margin: 36px; }
      * { box-sizing: border-box; }
      body {
        color: #11181c;
        font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
        font-size: 12px;
        line-height: 1.45;
        margin: 0;
      }
      header {
        border-bottom: 2px solid ${accentColor};
        margin-bottom: 20px;
        padding-bottom: 16px;
      }
      .eyebrow {
        color: #52636b;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1 {
        font-size: 28px;
        line-height: 1.1;
        margin: 4px 0 8px;
      }
      h2 {
        border-bottom: 1px solid #cbd3d3;
        font-size: 18px;
        margin: 24px 0 4px;
        padding-bottom: 6px;
      }
      h3 {
        font-size: 14px;
        margin: 0 0 4px;
      }
      table {
        border-collapse: collapse;
        margin: 14px 0;
        width: 100%;
      }
      th, td {
        border-bottom: 1px solid #e8ecec;
        padding: 6px 8px;
        text-align: left;
        vertical-align: top;
      }
      th {
        color: #52636b;
        font-size: 10px;
        text-transform: uppercase;
        width: 120px;
      }
      .summary-grid {
        display: grid;
        gap: 8px;
        grid-template-columns: repeat(4, 1fr);
        margin: 14px 0;
      }
      .summary-box {
        border: 1px solid #cbd3d3;
        border-radius: 6px;
        padding: 8px;
      }
      .summary-box strong {
        display: block;
        font-size: 18px;
      }
      .section-meta,
      .muted {
        color: #52636b;
      }
      .entry {
        break-inside: avoid;
        border: 1px solid #cbd3d3;
        border-radius: 6px;
        margin-top: 10px;
        padding: 10px;
      }
      .caption-needed {
        color: #8a5b00;
        font-weight: 800;
      }
      .important-badge {
        background: #fff7d6;
        border: 1px solid #b58100;
        border-radius: 999px;
        color: #5f3f00;
        display: inline-block;
        font-size: 10px;
        font-weight: 800;
        margin: 6px 0;
        padding: 3px 8px;
        text-transform: uppercase;
      }
      .document-card {
        background: #f8faf9;
        border: 1px solid #cbd3d3;
        border-left: 4px solid ${accentColor};
        border-radius: 6px;
        margin: 8px 0;
        padding: 9px 10px;
      }
      .document-card strong {
        display: block;
        margin-bottom: 2px;
      }
      .document-pages {
        margin-top: 6px;
      }
      .media-list,
      .annotation-list {
        margin: 8px 0 0 18px;
        padding: 0;
      }
      .media-grid {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin: 10px 0;
      }
      .media-figure {
        border: 1px solid #cbd3d3;
        border-radius: 6px;
        margin: 0;
        overflow: hidden;
      }
      .media-figure img {
        display: block;
        height: 190px;
        object-fit: cover;
        width: 100%;
      }
      .media-figure figcaption {
        color: #52636b;
        font-size: 10px;
        padding: 6px 8px;
      }
      footer {
        border-top: 1px solid #cbd3d3;
        color: #52636b;
        font-size: 10px;
        margin-top: 28px;
        padding-top: 10px;
      }
    </style>
  </head>
  <body>
    <header>
      <div class="eyebrow">${productName}</div>
      <h1>${escapeHtml(preview.title)}</h1>
      ${
        branding.companyName
          ? `<div class="muted">${escapeHtml(branding.companyName)}</div>`
          : ""
      }
      <div class="muted">Generated locally ${generatedAt}</div>
      ${preview.notes ? `<p>${escapeHtml(preview.notes)}</p>` : ""}
    </header>
    <table aria-label="Project metadata">
      <tbody>${projectRows}</tbody>
    </table>
    <div class="summary-grid">
      <div class="summary-box"><strong>${preview.totals.sections}</strong>Sections</div>
      <div class="summary-box"><strong>${preview.totals.evidenceItems}</strong>Evidence</div>
      <div class="summary-box"><strong>${preview.totals.mediaAssets}</strong>Media</div>
      <div class="summary-box"><strong>${preview.totals.documents}</strong>Documents</div>
      <div class="summary-box"><strong>${preview.totals.missingCaptions}</strong>Missing captions</div>
    </div>
    ${
      preview.totals.documents
        ? `<p class="section-meta">Document appendix: ${preview.totals.visualDocuments} visual document pages embedded, ${preview.totals.externalOriginalDocuments} imported originals preserved for external review, ${preview.totals.metadataOnlyDocuments} metadata-only documents preserved with SHA-256 and file metadata.</p>`
        : ""
    }
    ${sectionHtml}
    <footer>
      Generated from local offline evidence. Original evidence remains immutable; embedded visuals are report renderings of the stored originals and do not alter source files.
      ${branding.footerText ? `<br />${escapeHtml(branding.footerText)}` : ""}
    </footer>
  </body>
</html>`;
}

export interface ProofPacketRenderer {
  render(
    preview: ProofPacketPreview,
    options?: ProofPacketRenderOptions,
  ): Promise<GeneratedProofPacket>;
}

function summarizeProofPacketSections(
  sections: ProofPacketSectionPreview[],
): ProjectEvidenceSummary {
  return {
    beforeCount: getSectionEvidenceCount(sections, "BEFORE"),
    workCount: getSectionEvidenceCount(sections, "WORK"),
    afterCount: getSectionEvidenceCount(sections, "AFTER"),
    documentCount: getSectionEvidenceCount(sections, "DOCUMENT"),
    otherCount: getSectionEvidenceCount(sections, "OTHER"),
    mediaAssetCount: sections.reduce(
      (count, section) => count + section.mediaCount,
      0,
    ),
    missingCaptionCount: sections.reduce(
      (count, section) =>
        count +
        section.evidenceItems.filter((evidence) => evidence.missingCaption)
          .length,
      0,
    ),
  };
}

function getSectionEvidenceCount(
  sections: ProofPacketSectionPreview[],
  category: EvidenceCategory,
): number {
  return (
    sections.find((section) => section.category === category)?.evidenceCount ??
    0
  );
}

function compareEvidenceForPacket(
  first: EvidenceItem,
  second: EvidenceItem,
): number {
  return (
    first.captureTimestamp.localeCompare(second.captureTimestamp) ||
    first.sortOrder - second.sortOrder ||
    first.createdAt.localeCompare(second.createdAt) ||
    first.id.localeCompare(second.id)
  );
}

function compareMediaForPacket(first: MediaAsset, second: MediaAsset): number {
  return (
    first.captureTimestamp.localeCompare(second.captureTimestamp) ||
    first.createdAt.localeCompare(second.createdAt) ||
    first.id.localeCompare(second.id)
  );
}

function compareAnnotationsForPacket(
  first: Annotation,
  second: Annotation,
): number {
  return (
    first.createdAt.localeCompare(second.createdAt) ||
    first.id.localeCompare(second.id)
  );
}

function compareDocumentsForPacket(first: Document, second: Document): number {
  return (
    first.updatedAt.localeCompare(second.updatedAt) ||
    first.createdAt.localeCompare(second.createdAt) ||
    first.id.localeCompare(second.id)
  );
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export type CreateEvidenceInput = {
  projectId: string;
  category: EvidenceCategory;
  title?: string;
  caption?: string;
  notes?: string;
  isImportant?: boolean;
  captureTimestamp?: string;
};

export type CreateMediaAssetInput = {
  evidenceItemId: string;
  localUri: string;
  mediaType: MediaType;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  width?: number | null;
  height?: number | null;
  caption?: string;
  notes?: string;
  captureTimestamp?: string;
  sourceType: MediaSourceType;
  originalAssetId?: string | null;
  derivativeType?: string | null;
};

export type UpdateMediaAssetMetadataInput = {
  caption?: string;
  notes?: string;
};

export type ReplaceMediaAssetInput = CreateMediaAssetInput & {
  replacedMediaAssetId: string;
};

export type MarkMediaAssetUploadedInput = {
  storageObjectKey: string;
  uploadedAt: string;
};

export type CreateAnnotationInput = {
  evidenceItemId: string;
  mediaAssetId?: string | null;
  body: string;
};

export type CreateDocumentInput = {
  projectId: string;
  evidenceItemId?: string | null;
  mediaAssetId?: string | null;
  title: string;
  notes?: string;
  fileName?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  sha256?: string | null;
  pageCount?: number | null;
  sourceType?: MediaSourceType | null;
};

export type UpdateDocumentInput = Partial<
  Pick<CreateDocumentInput, "title" | "notes" | "pageCount">
>;

export type SaveReportDraftInput = ReportDraftCompositionInput & {
  id?: string;
  status?: ProofPacketStatus;
};

export type MarkReportDraftGeneratedInput = {
  localUri: string;
  generatedAt: string;
};

export type MarkReportDraftUploadedInput = {
  storageObjectKey: string;
  sha256: string;
  sizeBytes: number;
  uploadedAt: string;
};

export type ReportHistoryOptions = {
  projectId?: string;
  includeDrafts?: boolean;
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

export interface MediaAssetRepository {
  create(input: CreateMediaAssetInput): Promise<MediaAsset>;
  updateMetadata(
    id: string,
    input: UpdateMediaAssetMetadataInput,
  ): Promise<MediaAsset>;
  markUploaded(
    id: string,
    input: MarkMediaAssetUploadedInput,
  ): Promise<MediaAsset>;
  replace(input: ReplaceMediaAssetInput): Promise<{
    replacement: MediaAsset;
    replaced: MediaAsset;
  }>;
  listByEvidenceItem(
    evidenceItemId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<MediaAsset[]>;
  listByProject(projectId: string): Promise<MediaAsset[]>;
  listByEvidenceIds(evidenceItemIds: string[]): Promise<MediaAsset[]>;
  listPendingUpload(limit?: number): Promise<MediaAsset[]>;
  countByEvidenceIds(
    evidenceItemIds: string[],
  ): Promise<Record<string, number>>;
  delete(id: string): Promise<void>;
  restore(id: string): Promise<MediaAsset>;
}

export interface AnnotationRepository {
  create(input: CreateAnnotationInput): Promise<Annotation>;
  listByEvidenceItem(
    evidenceItemId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<Annotation[]>;
  listByEvidenceIds(evidenceItemIds: string[]): Promise<Annotation[]>;
  delete(id: string): Promise<void>;
  restore(id: string): Promise<Annotation>;
}

export interface DocumentRepository {
  create(input: CreateDocumentInput): Promise<Document>;
  update(id: string, input: UpdateDocumentInput): Promise<Document>;
  getById(id: string): Promise<Document | null>;
  listByProject(
    projectId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<Document[]>;
  listByEvidenceItem(
    evidenceItemId: string,
    options?: { includeDeleted?: boolean },
  ): Promise<Document[]>;
  delete(id: string): Promise<void>;
}

export interface ReportDraftRepository {
  save(input: SaveReportDraftInput): Promise<ReportDraft>;
  markGeneratedPdf(
    id: string,
    input: MarkReportDraftGeneratedInput,
  ): Promise<ReportDraft>;
  markGeneratedPdfUploaded(
    id: string,
    input: MarkReportDraftUploadedInput,
  ): Promise<ReportDraft>;
  getById(id: string): Promise<ReportDraft | null>;
  getLatestByProject(projectId: string): Promise<ReportDraft | null>;
  listByProject(projectId: string): Promise<ReportDraft[]>;
  listHistory(options?: ReportHistoryOptions): Promise<ReportHistoryItem[]>;
  listPendingPdfUpload(limit?: number): Promise<ReportDraft[]>;
  delete(id: string): Promise<void>;
}

export interface ReportBrandingRepository {
  get(): Promise<ReportBranding>;
  save(input: SaveReportBrandingInput): Promise<ReportBranding>;
}

function renderEvidenceEntryHtml(
  entry: ProofPacketEvidenceEntry,
  sectionIndex: number,
  entryIndex: number,
  embeddedMedia: Record<string, ProofPacketEmbeddedMedia> = {},
): string {
  const title = entry.evidence.title ?? "Untitled evidence";
  const visualMedia = entry.mediaAssets
    .map((media) => ({
      media,
      embedded: embeddedMedia[media.id],
    }))
    .filter(({ media, embedded }) => media.mediaType === "IMAGE" && embedded);
  const documentMedia = entry.mediaAssets.filter(
    (media) =>
      media.mediaType === "DOCUMENT" || media.mimeType === "application/pdf",
  );
  const documentEntriesHtml = entry.documents
    .map((documentEntry) => {
      const document = documentEntry.document;
      const metadata = [
        document.fileName,
        document.mimeType,
        documentEntry.visualPageCount > 0
          ? formatCount(documentEntry.visualPageCount, "page", "pages")
          : document.pageCount
            ? formatCount(document.pageCount, "page", "pages")
            : null,
        document.sizeBytes === null ? null : formatBytes(document.sizeBytes),
        `profile ${documentEntry.fileProfile.replaceAll("_", " ")}`,
        document.sourceType
          ? `source ${document.sourceType.toLowerCase().replaceAll("_", " ")}`
          : null,
        document.sha256 ? `SHA-256 ${document.sha256}` : null,
      ]
        .filter((item): item is string => Boolean(item))
        .map(escapeHtml)
        .join(" - ");
      const pageHashes = documentEntry.visualMediaAssetIds
        .map((mediaId, index) => {
          const media = entry.mediaAssets.find((item) => item.id === mediaId);
          return media
            ? `Page ${index + 1}: SHA-256 ${media.sha256.slice(0, 16)}`
            : null;
        })
        .filter((item): item is string => Boolean(item))
        .map(escapeHtml)
        .join(" - ");

      return `
        <div class="document-card">
          <strong>${escapeHtml(document.title)}</strong>
          <div class="muted">${escapeHtml(documentEntry.label)}</div>
          ${metadata ? `<div class="muted">${metadata}</div>` : ""}
          ${pageHashes ? `<div class="muted document-pages">${pageHashes}</div>` : ""}
          <div>${escapeHtml(document.notes ?? documentEntry.detail)}</div>
          <div class="muted">${escapeHtml(documentEntry.proofSummary)}</div>
          ${
            documentEntry.recommendedAction
              ? `<div class="muted">${escapeHtml(documentEntry.recommendedAction)}</div>`
              : ""
          }
        </div>
      `;
    })
    .join("");
  const documentedMediaAssetIds = new Set(
    entry.documents.flatMap((documentEntry) => [
      documentEntry.document.mediaAssetId,
      ...documentEntry.visualMediaAssetIds,
    ]),
  );
  const visualMediaHtml = visualMedia
    .map(({ media, embedded }, index) => {
      const documentScanPageCount = visualMedia.filter(
        ({ media: candidate }) => candidate.sourceType === "DOCUMENT_SCAN",
      ).length;
      const caption =
        media.sourceType === "DOCUMENT_SCAN" && documentScanPageCount > 1
          ? `Document page ${index + 1} - ${media.caption ?? entry.caption ?? title}`
          : (media.caption ?? entry.caption ?? title);

      return `
        <figure class="media-figure">
          <img src="${escapeHtml(embedded?.dataUri ?? "")}" alt="${escapeHtml(embedded?.altText ?? caption)}" />
          <figcaption>${escapeHtml(caption)}</figcaption>
        </figure>
      `;
    })
    .join("");
  const documentCardsHtml = documentMedia
    .filter((media) => !documentedMediaAssetIds.has(media.id))
    .map(
      (media) => `
        <div class="document-card">
          <strong>${escapeHtml(media.caption ?? entry.caption ?? title)}</strong>
          <div class="muted">${escapeHtml(media.mimeType)} - ${formatBytes(media.sizeBytes)}</div>
          <div class="muted">SHA-256 ${escapeHtml(media.sha256)}</div>
          ${
            media.notes
              ? `<div>${escapeHtml(media.notes)}</div>`
              : '<div class="muted">Document referenced by metadata. Non-image document pages are not visually embedded in this packet.</div>'
          }
        </div>
      `,
    )
    .join("");
  const mediaItems = entry.mediaAssets
    .map(
      (media) =>
        `<li>${escapeHtml(media.mediaType)} - ${escapeHtml(media.mimeType)} - ${formatBytes(media.sizeBytes)} - SHA-256 ${escapeHtml(media.sha256.slice(0, 16))}</li>`,
    )
    .join("");
  const annotationItems = entry.annotations
    .map((annotation) => `<li>${escapeHtml(annotation.body)}</li>`)
    .join("");

  return `
    <article class="entry">
      <h3>${sectionIndex + 1}.${entryIndex + 1} ${escapeHtml(title)}</h3>
      <div class="muted">${escapeHtml(formatPacketTimestamp(entry.capturedAt))}</div>
      ${entry.isImportant ? '<div class="important-badge">Important evidence</div>' : ""}
      <p class="${entry.missingCaption ? "caption-needed" : ""}">
        ${escapeHtml(entry.caption ?? "Caption needed")}
      </p>
      ${visualMediaHtml ? `<div class="media-grid">${visualMediaHtml}</div>` : ""}
      ${documentEntriesHtml}
      ${documentCardsHtml}
      ${
        mediaItems
          ? `<p class="muted">Media files</p><ul class="media-list">${mediaItems}</ul>`
          : '<p class="muted">No media files attached.</p>'
      }
      ${
        annotationItems
          ? `<p class="muted">Notes</p><ul class="annotation-list">${annotationItems}</ul>`
          : ""
      }
    </article>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatPacketTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date
    .toISOString()
    .replace("T", " ")
    .replace(/\.\d{3}Z$/, " UTC");
}

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${Math.round(sizeBytes / 1024)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface LocalMutationRepository {
  enqueue(input: LocalMutationInput): Promise<LocalMutation>;
  listPending(): Promise<LocalMutation[]>;
  listUploadable(limit?: number): Promise<LocalMutation[]>;
  countPending(): Promise<number>;
  markSynced(mutationIds: string[]): Promise<void>;
  markFailed(mutationIds: string[]): Promise<void>;
}
