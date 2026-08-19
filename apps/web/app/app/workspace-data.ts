import { auth } from "@clerk/nextjs/server";
import {
  getWebProductionReadiness,
  publicWebEnvSchema,
  webServerEnvSchema,
} from "@fielddoc/config";
import {
  defaultReportSectionConfigs,
  getBetaReadinessSummary,
  getReportDraftReadiness,
  type BetaReadinessSummary,
  type EvidenceCategory,
  type ProjectEvidenceSummary,
  type ReportSectionConfig,
} from "@fielddoc/domain";
import {
  and,
  annotations,
  auditEvents,
  createNeonDatabase,
  desc,
  eq,
  evidenceItems,
  isNull,
  mediaAssets,
  organizations,
  organizationMembers,
  projects,
  receivedLocalMutations,
  reportDrafts,
  reportExports,
  reportShareLinks,
  sql,
  users,
} from "@fielddoc/database";

export type WorkspaceStatus =
  "missing_organization" | "missing_database" | "not_provisioned" | "ready";

export type WorkspaceProject = {
  id: string;
  name: string;
  customerCompany: string | null;
  siteAddress: string | null;
  workOrderReference: string | null;
  scheduledDate: string | null;
  notes: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  evidenceCount: number;
  mediaCount: number;
  uploadedMediaCount: number;
  importantEvidenceCount: number;
  missingCaptionCount: number;
  reportDraftCount: number;
};

export type WorkspaceReport = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  notes: string | null;
  sectionsJson: unknown;
  status: string;
  generatedAt: Date | null;
  updatedAt: Date;
  hasGeneratedPdf: boolean;
  generatedPdfObjectKey: string | null;
};

export type WorkspaceMediaAsset = {
  id: string;
  projectId: string;
  projectName: string;
  evidenceItemId: string;
  evidenceTitle: string | null;
  evidenceCaption: string | null;
  evidenceCategory: EvidenceCategory;
  mediaType: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  caption: string | null;
  notes: string | null;
  captureTimestamp: Date;
  uploadedAt: Date | null;
  hasUploadedOriginal: boolean;
};

export type WorkspaceAnnotation = {
  id: string;
  projectId: string;
  evidenceItemId: string;
  mediaAssetId: string | null;
  body: string;
  createdAt: Date;
};

export type WorkspaceEvidenceItem = {
  id: string;
  projectId: string;
  category: EvidenceCategory;
  title: string | null;
  caption: string | null;
  notes: string | null;
  isImportant: boolean;
  sortOrder: number;
  captureTimestamp: Date;
  createdAt: Date;
  updatedAt: Date;
  media: WorkspaceMediaAsset[];
  annotations: WorkspaceAnnotation[];
  mediaCount: number;
  uploadedMediaCount: number;
  annotationCount: number;
  missingCaption: boolean;
};

export type WorkspaceEvidenceSection = {
  category: EvidenceCategory;
  label: string;
  evidenceItems: WorkspaceEvidenceItem[];
  evidenceCount: number;
  mediaCount: number;
  uploadedMediaCount: number;
  annotationCount: number;
  importantCount: number;
  missingCaptionCount: number;
};

export type WorkspaceProjectDetail = WorkspaceProject & {
  evidenceSections: WorkspaceEvidenceSection[];
  reports: WorkspaceReport[];
  readiness: {
    ready: boolean;
    missing: string[];
  };
};

export type WorkspaceReportDetail = WorkspaceReport & {
  project: WorkspaceProject;
  sections: WorkspaceEvidenceSection[];
  readiness: {
    ready: boolean;
    missing: string[];
  };
  totals: {
    evidenceCount: number;
    mediaCount: number;
    uploadedMediaCount: number;
    annotationCount: number;
    missingCaptionCount: number;
    importantCount: number;
  };
  sectionConfig: ReportSectionConfig[];
};

export type WorkspaceData = {
  status: WorkspaceStatus;
  message: string;
  organizationName: string | null;
  organizationRole: string | null;
  projects: WorkspaceProject[];
  reports: WorkspaceReport[];
  evidence: WorkspaceEvidenceItem[];
  media: WorkspaceMediaAsset[];
  annotations: WorkspaceAnnotation[];
  syncReceiptCount: number;
  rejectedSyncReceiptCount: number;
  reportExportCount: number;
  reportShareLinkCount: number;
  auditEventCount: number;
  recentAuditEvents: WorkspaceAuditEvent[];
  diagnosticsWarning: string | null;
  betaReadiness: BetaReadinessSummary;
};

export type WorkspaceAuditEvent = {
  id: string;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: Date;
};

export async function getWorkspaceData(): Promise<WorkspaceData> {
  const authContext = await auth();

  if (!authContext.orgId || !authContext.userId) {
    return emptyWorkspaceData({
      status: "missing_organization",
      message:
        "Select or create a Clerk organization before viewing workspace data.",
    });
  }

  const env = webServerEnvSchema.parse(process.env);
  const publicEnv = publicWebEnvSchema.parse(process.env);
  const productionReadiness = getWebProductionReadiness({
    ...env,
    ...publicEnv,
  });

  if (!env.DATABASE_URL) {
    return emptyWorkspaceData({
      status: "missing_database",
      message:
        "Set DATABASE_URL in Vercel before reading synced workspace data.",
    });
  }

  const db = createNeonDatabase(env.DATABASE_URL);
  const [membership] = await db
    .select({
      organizationId: organizations.id,
      organizationName: organizations.name,
      role: organizationMembers.role,
    })
    .from(users)
    .innerJoin(organizationMembers, eq(users.id, organizationMembers.userId))
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(
      and(
        eq(users.externalAuthId, authContext.userId),
        eq(organizations.externalAuthId, authContext.orgId),
        isNull(users.deletedAt),
        isNull(organizations.deletedAt),
      ),
    )
    .limit(1);

  if (!membership) {
    return emptyWorkspaceData({
      status: "not_provisioned",
      message:
        "This Clerk organization has not been provisioned into the internal tenant model yet.",
    });
  }

  const [
    projectRows,
    evidenceRows,
    mediaRows,
    annotationRows,
    reportRows,
    receiptRows,
  ] = await Promise.all([
    db
      .select({
        id: projects.id,
        name: projects.name,
        customerCompany: projects.customerCompany,
        siteAddress: projects.siteAddress,
        workOrderReference: projects.workOrderReference,
        scheduledDate: projects.scheduledDate,
        notes: projects.notes,
        status: projects.status,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, membership.organizationId),
          isNull(projects.deletedAt),
        ),
      )
      .orderBy(sql`${projects.updatedAt} desc`),
    db
      .select({
        id: evidenceItems.id,
        projectId: evidenceItems.projectId,
        category: evidenceItems.category,
        title: evidenceItems.title,
        caption: evidenceItems.caption,
        notes: evidenceItems.notes,
        isImportant: evidenceItems.isImportant,
        sortOrder: evidenceItems.sortOrder,
        captureTimestamp: evidenceItems.captureTimestamp,
        createdAt: evidenceItems.createdAt,
        updatedAt: evidenceItems.updatedAt,
      })
      .from(evidenceItems)
      .where(
        and(
          eq(evidenceItems.organizationId, membership.organizationId),
          isNull(evidenceItems.deletedAt),
        ),
      ),
    db
      .select({
        id: mediaAssets.id,
        evidenceItemId: mediaAssets.evidenceItemId,
        projectId: evidenceItems.projectId,
        evidenceCategory: evidenceItems.category,
        evidenceTitle: evidenceItems.title,
        evidenceCaption: evidenceItems.caption,
        mediaType: mediaAssets.mediaType,
        mimeType: mediaAssets.mimeType,
        sizeBytes: mediaAssets.sizeBytes,
        sha256: mediaAssets.sha256,
        caption: mediaAssets.caption,
        notes: mediaAssets.notes,
        captureTimestamp: mediaAssets.captureTimestamp,
        storageObjectKey: mediaAssets.storageObjectKey,
        uploadedAt: mediaAssets.uploadedAt,
      })
      .from(mediaAssets)
      .innerJoin(
        evidenceItems,
        eq(mediaAssets.evidenceItemId, evidenceItems.id),
      )
      .where(
        and(
          eq(mediaAssets.organizationId, membership.organizationId),
          isNull(evidenceItems.deletedAt),
          isNull(mediaAssets.deletedAt),
        ),
      ),
    db
      .select({
        id: annotations.id,
        projectId: evidenceItems.projectId,
        evidenceItemId: annotations.evidenceItemId,
        mediaAssetId: annotations.mediaAssetId,
        body: annotations.body,
        createdAt: annotations.createdAt,
      })
      .from(annotations)
      .innerJoin(
        evidenceItems,
        eq(annotations.evidenceItemId, evidenceItems.id),
      )
      .where(
        and(
          eq(annotations.organizationId, membership.organizationId),
          isNull(evidenceItems.deletedAt),
          isNull(annotations.deletedAt),
        ),
      ),
    db
      .select({
        id: reportDrafts.id,
        projectId: reportDrafts.projectId,
        title: reportDrafts.title,
        notes: reportDrafts.notes,
        sectionsJson: reportDrafts.sectionsJson,
        status: reportDrafts.status,
        generatedAt: reportDrafts.generatedAt,
        generatedPdfObjectKey: reportDrafts.generatedPdfObjectKey,
        updatedAt: reportDrafts.updatedAt,
      })
      .from(reportDrafts)
      .where(
        and(
          eq(reportDrafts.organizationId, membership.organizationId),
          isNull(reportDrafts.deletedAt),
        ),
      )
      .orderBy(sql`${reportDrafts.updatedAt} desc`),
    db
      .select({
        mutationId: receivedLocalMutations.mutationId,
        status: receivedLocalMutations.status,
      })
      .from(receivedLocalMutations)
      .where(
        eq(receivedLocalMutations.organizationId, membership.organizationId),
      ),
  ]);
  const diagnostics = await getOptionalWorkspaceDiagnostics(
    db,
    membership.organizationId,
  );
  const isEnvironmentReady = (id: string) =>
    productionReadiness.find((item) => item.id === id)?.ready ?? false;

  const evidenceByProject = countBy(evidenceRows, (row) => row.projectId);
  const missingCaptionsByProject = countBy(
    evidenceRows.filter((row) => !row.caption?.trim()),
    (row) => row.projectId,
  );
  const importantEvidenceByProject = countBy(
    evidenceRows.filter((row) => row.isImportant),
    (row) => row.projectId,
  );
  const mediaByProject = countBy(mediaRows, (row) => row.projectId);
  const uploadedMediaByProject = countBy(
    mediaRows.filter((row) => Boolean(row.storageObjectKey)),
    (row) => row.projectId,
  );
  const reportsByProject = countBy(reportRows, (row) => row.projectId);
  const projectNameById = new Map(projectRows.map((row) => [row.id, row.name]));
  const mediaByEvidence = groupBy(
    mediaRows.map((media) => ({
      id: media.id,
      projectId: media.projectId,
      projectName: projectNameById.get(media.projectId) ?? "Unknown project",
      evidenceItemId: media.evidenceItemId,
      evidenceTitle: media.evidenceTitle,
      evidenceCaption: media.evidenceCaption,
      evidenceCategory: media.evidenceCategory,
      mediaType: media.mediaType,
      mimeType: media.mimeType,
      sizeBytes: media.sizeBytes,
      sha256: media.sha256,
      caption: media.caption,
      notes: media.notes,
      captureTimestamp: media.captureTimestamp,
      uploadedAt: media.uploadedAt,
      hasUploadedOriginal: Boolean(media.storageObjectKey),
    })),
    (media) => media.evidenceItemId,
  );
  const annotationsByEvidence = groupBy(
    annotationRows,
    (row) => row.evidenceItemId,
  );
  const evidence = evidenceRows.map((row) => {
    const media = mediaByEvidence[row.id] ?? [];
    const annotations = annotationsByEvidence[row.id] ?? [];

    return {
      ...row,
      media,
      annotations,
      mediaCount: media.length,
      uploadedMediaCount: media.filter((item) => item.hasUploadedOriginal)
        .length,
      annotationCount: annotations.length,
      missingCaption:
        !row.caption?.trim() && !media.some((item) => item.caption?.trim()),
    };
  });
  const media = Object.values(mediaByEvidence).flat();
  const uploadedMediaCount = media.filter(
    (item) => item.hasUploadedOriginal,
  ).length;

  return {
    status: "ready",
    message: "Workspace data loaded from Neon.",
    organizationName: membership.organizationName,
    organizationRole: membership.role,
    projects: projectRows.map((project) => ({
      ...project,
      evidenceCount: evidenceByProject[project.id] ?? 0,
      mediaCount: mediaByProject[project.id] ?? 0,
      uploadedMediaCount: uploadedMediaByProject[project.id] ?? 0,
      importantEvidenceCount: importantEvidenceByProject[project.id] ?? 0,
      missingCaptionCount: missingCaptionsByProject[project.id] ?? 0,
      reportDraftCount: reportsByProject[project.id] ?? 0,
    })),
    reports: reportRows.map((report) => ({
      id: report.id,
      projectId: report.projectId,
      projectName: projectNameById.get(report.projectId) ?? "Unknown project",
      title: report.title,
      notes: report.notes,
      sectionsJson: report.sectionsJson,
      status: report.status,
      generatedAt: report.generatedAt,
      updatedAt: report.updatedAt,
      hasGeneratedPdf: Boolean(report.generatedPdfObjectKey),
      generatedPdfObjectKey: report.generatedPdfObjectKey,
    })),
    evidence,
    media,
    annotations: annotationRows,
    syncReceiptCount: receiptRows.length,
    rejectedSyncReceiptCount: receiptRows.filter(
      (receipt) => receipt.status === "rejected",
    ).length,
    reportExportCount: diagnostics.reportExportCount,
    reportShareLinkCount: diagnostics.reportShareLinkCount,
    auditEventCount: diagnostics.auditEventCount,
    recentAuditEvents: diagnostics.recentAuditEvents,
    diagnosticsWarning: diagnostics.warning,
    betaReadiness: getBetaReadinessSummary({
      tenantReady: true,
      privateStorageReady: isEnvironmentReady("private_storage"),
      revenueCatWebhookReady: isEnvironmentReady("revenuecat"),
      emailDeliveryReady: isEnvironmentReady("email"),
      errorReportingReady: isEnvironmentReady("error_reporting"),
      legalUrlsReady: isEnvironmentReady("legal_urls"),
      projectCount: projectRows.length,
      evidenceCount: evidence.length,
      mediaAssetCount: media.length,
      uploadedMediaAssetCount: uploadedMediaCount,
      reportDraftCount: reportRows.length,
      archivedReportPdfCount: diagnostics.reportExportCount,
      syncReceiptCount: receiptRows.length,
      rejectedSyncReceiptCount: receiptRows.filter(
        (receipt) => receipt.status === "rejected",
      ).length,
      auditEventCount: diagnostics.auditEventCount,
      shareLinkCount: diagnostics.reportShareLinkCount,
      missingCaptionCount: evidence.filter((item) => item.missingCaption)
        .length,
    }),
  };
}

function emptyWorkspaceData(
  input: Pick<WorkspaceData, "status" | "message">,
): WorkspaceData {
  return {
    ...input,
    organizationName: null,
    organizationRole: null,
    projects: [],
    reports: [],
    evidence: [],
    media: [],
    annotations: [],
    syncReceiptCount: 0,
    rejectedSyncReceiptCount: 0,
    reportExportCount: 0,
    reportShareLinkCount: 0,
    auditEventCount: 0,
    recentAuditEvents: [],
    diagnosticsWarning: null,
    betaReadiness: getBetaReadinessSummary({
      tenantReady: false,
      privateStorageReady: false,
      revenueCatWebhookReady: false,
      emailDeliveryReady: false,
      errorReportingReady: false,
      legalUrlsReady: false,
      projectCount: 0,
      evidenceCount: 0,
      mediaAssetCount: 0,
      uploadedMediaAssetCount: 0,
      reportDraftCount: 0,
      archivedReportPdfCount: 0,
      syncReceiptCount: 0,
      rejectedSyncReceiptCount: 0,
      auditEventCount: 0,
      shareLinkCount: 0,
      missingCaptionCount: 0,
    }),
  };
}

async function getOptionalWorkspaceDiagnostics(
  db: ReturnType<typeof createNeonDatabase>,
  organizationId: string,
): Promise<{
  reportExportCount: number;
  reportShareLinkCount: number;
  auditEventCount: number;
  recentAuditEvents: WorkspaceAuditEvent[];
  warning: string | null;
}> {
  try {
    const [
      reportExportRows,
      reportShareLinkRows,
      auditEventCountRows,
      auditEventRows,
    ] = await Promise.all([
      db
        .select({ id: reportExports.id })
        .from(reportExports)
        .where(eq(reportExports.organizationId, organizationId)),
      db
        .select({ id: reportShareLinks.id })
        .from(reportShareLinks)
        .where(eq(reportShareLinks.organizationId, organizationId)),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(auditEvents)
        .where(eq(auditEvents.organizationId, organizationId)),
      db
        .select({
          id: auditEvents.id,
          eventType: auditEvents.eventType,
          entityType: auditEvents.entityType,
          entityId: auditEvents.entityId,
          createdAt: auditEvents.createdAt,
        })
        .from(auditEvents)
        .where(eq(auditEvents.organizationId, organizationId))
        .orderBy(desc(auditEvents.createdAt))
        .limit(10),
    ]);

    return {
      reportExportCount: reportExportRows.length,
      reportShareLinkCount: reportShareLinkRows.length,
      auditEventCount: auditEventCountRows[0]?.count ?? 0,
      recentAuditEvents: auditEventRows,
      warning: null,
    };
  } catch {
    return {
      reportExportCount: 0,
      reportShareLinkCount: 0,
      auditEventCount: 0,
      recentAuditEvents: [],
      warning:
        "Optional diagnostics are unavailable. Confirm report export and audit migrations have been applied in Neon.",
    };
  }
}

export function getProjectDetailFromWorkspaceData(
  workspace: WorkspaceData,
  projectId: string,
): WorkspaceProjectDetail | null {
  if (workspace.status !== "ready") return null;

  const project = workspace.projects.find((item) => item.id === projectId);

  if (!project) return null;

  const evidence = workspace.evidence
    .filter((item) => item.projectId === project.id)
    .sort(compareEvidence);
  const evidenceSections = buildEvidenceSections(
    evidence,
    defaultReportSectionConfigs,
  );

  return {
    ...project,
    evidenceSections,
    reports: workspace.reports
      .filter((report) => report.projectId === project.id)
      .sort(compareReports),
    readiness: getReportDraftReadiness(
      summarizeEvidenceSections(evidenceSections),
      defaultReportSectionConfigs,
    ),
  };
}

export function getReportDetailFromWorkspaceData(
  workspace: WorkspaceData,
  reportDraftId: string,
): WorkspaceReportDetail | null {
  if (workspace.status !== "ready") return null;

  const report = workspace.reports.find((item) => item.id === reportDraftId);

  if (!report) return null;

  const project = workspace.projects.find(
    (item) => item.id === report.projectId,
  );

  if (!project) return null;

  const sectionConfig = normalizeSections(report);
  const evidence = workspace.evidence
    .filter((item) => item.projectId === project.id)
    .sort(compareEvidence);
  const sections = buildEvidenceSections(evidence, sectionConfig).filter(
    (section) =>
      sectionConfig.find((config) => config.category === section.category)
        ?.included,
  );
  const totals = summarizeEvidenceSections(sections);

  return {
    ...report,
    project,
    sections,
    readiness: getReportDraftReadiness(totals, sectionConfig),
    totals: {
      evidenceCount:
        totals.beforeCount +
        totals.workCount +
        totals.afterCount +
        totals.documentCount +
        (totals.otherCount ?? 0),
      mediaCount: totals.mediaAssetCount ?? 0,
      uploadedMediaCount: sections.reduce(
        (count, section) => count + section.uploadedMediaCount,
        0,
      ),
      annotationCount: sections.reduce(
        (count, section) => count + section.annotationCount,
        0,
      ),
      missingCaptionCount: totals.missingCaptionCount,
      importantCount: totals.importantCount ?? 0,
    },
    sectionConfig,
  };
}

function countBy<T>(
  items: T[],
  getKey: (item: T) => string,
): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function groupBy<T>(
  items: T[],
  getKey: (item: T) => string,
): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const key = getKey(item);
    groups[key] = [...(groups[key] ?? []), item];
    return groups;
  }, {});
}

function buildEvidenceSections(
  evidenceItems: WorkspaceEvidenceItem[],
  sectionConfig: ReportSectionConfig[],
): WorkspaceEvidenceSection[] {
  return sectionConfig.map((section) => {
    const evidence = evidenceItems.filter(
      (item) => item.category === section.category,
    );

    return {
      category: section.category,
      label: section.label,
      evidenceItems: evidence,
      evidenceCount: evidence.length,
      mediaCount: evidence.reduce((count, item) => count + item.mediaCount, 0),
      uploadedMediaCount: evidence.reduce(
        (count, item) => count + item.uploadedMediaCount,
        0,
      ),
      annotationCount: evidence.reduce(
        (count, item) => count + item.annotationCount,
        0,
      ),
      importantCount: evidence.filter((item) => item.isImportant).length,
      missingCaptionCount: evidence.filter((item) => item.missingCaption)
        .length,
    };
  });
}

function summarizeEvidenceSections(
  sections: WorkspaceEvidenceSection[],
): ProjectEvidenceSummary {
  return {
    beforeCount: getSectionEvidenceCount(sections, "BEFORE"),
    workCount: getSectionEvidenceCount(sections, "WORK"),
    afterCount: getSectionEvidenceCount(sections, "AFTER"),
    documentCount: getSectionEvidenceCount(sections, "DOCUMENT"),
    otherCount: getSectionEvidenceCount(sections, "OTHER"),
    importantCount: sections.reduce(
      (count, section) => count + section.importantCount,
      0,
    ),
    mediaAssetCount: sections.reduce(
      (count, section) => count + section.mediaCount,
      0,
    ),
    missingCaptionCount: sections.reduce(
      (count, section) => count + section.missingCaptionCount,
      0,
    ),
  };
}

function getSectionEvidenceCount(
  sections: WorkspaceEvidenceSection[],
  category: EvidenceCategory,
): number {
  return (
    sections.find((section) => section.category === category)?.evidenceCount ??
    0
  );
}

function normalizeSections(report: WorkspaceReport): ReportSectionConfig[] {
  const rawSectionsJson = "sectionsJson" in report ? report.sectionsJson : null;

  if (!rawSectionsJson) return defaultReportSectionConfigs;

  try {
    const parsed =
      typeof rawSectionsJson === "string"
        ? JSON.parse(rawSectionsJson)
        : rawSectionsJson;

    return defaultReportSectionConfigs
      .map((fallback) => {
        const section = Array.isArray(parsed)
          ? (parsed as Partial<ReportSectionConfig>[]).find(
              (item) => item.category === fallback.category,
            )
          : null;

        return {
          category: fallback.category,
          label: section?.label?.trim() || fallback.label,
          included: section?.included ?? fallback.included,
          sortOrder:
            typeof section?.sortOrder === "number"
              ? section.sortOrder
              : fallback.sortOrder,
        };
      })
      .sort((first, second) => first.sortOrder - second.sortOrder)
      .map((section, index) => ({ ...section, sortOrder: index }));
  } catch {
    return defaultReportSectionConfigs;
  }
}

function compareEvidence(
  first: WorkspaceEvidenceItem,
  second: WorkspaceEvidenceItem,
): number {
  return (
    first.captureTimestamp.getTime() - second.captureTimestamp.getTime() ||
    first.sortOrder - second.sortOrder ||
    first.createdAt.getTime() - second.createdAt.getTime() ||
    first.id.localeCompare(second.id)
  );
}

function compareReports(
  first: WorkspaceReport,
  second: WorkspaceReport,
): number {
  return second.updatedAt.getTime() - first.updatedAt.getTime();
}
