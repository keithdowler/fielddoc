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
  caption: string | null;
  capturedAt: string;
  mediaCount: number;
  annotationCount: number;
  missingCaption: boolean;
  isImportant: boolean;
};

export type ProofPacketSectionPreview = {
  category: EvidenceCategory;
  label: string;
  sortOrder: number;
  evidenceItems: ProofPacketEvidenceEntry[];
  evidenceCount: number;
  mediaCount: number;
  annotationCount: number;
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
        const caption = evidence.caption ?? mediaAssets[0]?.caption ?? null;

        return {
          evidence,
          mediaAssets,
          annotations,
          caption,
          capturedAt: evidence.captureTimestamp,
          mediaCount: mediaAssets.length,
          annotationCount: annotations.length,
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
          <p class="section-meta">${section.evidenceCount} evidence items, ${section.mediaCount} media files, ${section.annotationCount} notes</p>
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
      <div class="summary-box"><strong>${preview.totals.missingCaptions}</strong>Missing captions</div>
    </div>
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
  const visualMediaHtml = visualMedia
    .map(
      ({ media, embedded }) => `
        <figure class="media-figure">
          <img src="${escapeHtml(embedded?.dataUri ?? "")}" alt="${escapeHtml(embedded?.altText ?? media.caption ?? entry.caption ?? title)}" />
          <figcaption>${escapeHtml(media.caption ?? entry.caption ?? title)}</figcaption>
        </figure>
      `,
    )
    .join("");
  const documentCardsHtml = documentMedia
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
