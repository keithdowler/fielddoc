import { auth } from "@clerk/nextjs/server";
import { webServerEnvSchema } from "@fielddoc/config";
import {
  and,
  createNeonDatabase,
  eq,
  evidenceItems,
  isNull,
  mediaAssets,
  organizations,
  organizationMembers,
  projects,
  receivedLocalMutations,
  reportDrafts,
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
  status: string;
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
  status: string;
  generatedAt: Date | null;
  updatedAt: Date;
  hasGeneratedPdf: boolean;
};

export type WorkspaceData = {
  status: WorkspaceStatus;
  message: string;
  organizationName: string | null;
  organizationRole: string | null;
  projects: WorkspaceProject[];
  reports: WorkspaceReport[];
  syncReceiptCount: number;
  rejectedSyncReceiptCount: number;
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

  const [projectRows, evidenceRows, mediaRows, reportRows, receiptRows] =
    await Promise.all([
      db
        .select({
          id: projects.id,
          name: projects.name,
          customerCompany: projects.customerCompany,
          siteAddress: projects.siteAddress,
          workOrderReference: projects.workOrderReference,
          status: projects.status,
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
          caption: evidenceItems.caption,
          isImportant: evidenceItems.isImportant,
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
          storageObjectKey: mediaAssets.storageObjectKey,
        })
        .from(mediaAssets)
        .where(
          and(
            eq(mediaAssets.organizationId, membership.organizationId),
            isNull(mediaAssets.deletedAt),
          ),
        ),
      db
        .select({
          id: reportDrafts.id,
          projectId: reportDrafts.projectId,
          title: reportDrafts.title,
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

  const evidenceByProject = countBy(evidenceRows, (row) => row.projectId);
  const missingCaptionsByProject = countBy(
    evidenceRows.filter((row) => !row.caption?.trim()),
    (row) => row.projectId,
  );
  const importantEvidenceByProject = countBy(
    evidenceRows.filter((row) => row.isImportant),
    (row) => row.projectId,
  );
  const evidenceProjectById = new Map(
    evidenceRows.map((row) => [row.id, row.projectId]),
  );
  const mediaByProject = countBy(mediaRows, (row) => {
    return evidenceProjectById.get(row.evidenceItemId) ?? "unknown";
  });
  const uploadedMediaByProject = countBy(
    mediaRows.filter((row) => Boolean(row.storageObjectKey)),
    (row) => evidenceProjectById.get(row.evidenceItemId) ?? "unknown",
  );
  const reportsByProject = countBy(reportRows, (row) => row.projectId);
  const projectNameById = new Map(projectRows.map((row) => [row.id, row.name]));

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
      status: report.status,
      generatedAt: report.generatedAt,
      updatedAt: report.updatedAt,
      hasGeneratedPdf: Boolean(report.generatedPdfObjectKey),
    })),
    syncReceiptCount: receiptRows.length,
    rejectedSyncReceiptCount: receiptRows.filter(
      (receipt) => receipt.status === "rejected",
    ).length,
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
    syncReceiptCount: 0,
    rejectedSyncReceiptCount: 0,
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
