import { randomUUID } from "node:crypto";

import {
  and,
  createNeonDatabase,
  desc,
  eq,
  isNull,
  organizations,
  organizationMembers,
  reportDrafts,
  reportExports,
  reportShareLinks,
  sql,
  users,
} from "@fielddoc/database";

import {
  SyncConfigurationError,
  type SyncAuthPrincipal,
  type SyncMembership,
} from "../sync/mutations/sync-service";

export type StoredReportDraft = {
  id: string;
  projectId: string;
  generatedPdfObjectKey: string | null;
};

export type StoredReportExport = {
  id: string;
  reportDraftId: string;
  storageObjectKey: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  generatedAt: Date;
  uploadedAt: Date;
};

export type StoredReportShareLink = {
  id: string;
  organizationId: string;
  reportExport: StoredReportExport;
  expiresAt: Date;
  revokedAt: Date | null;
};

export type ReportArchiveRepository = {
  resolveMembership(
    principal: SyncAuthPrincipal,
  ): Promise<SyncMembership | null>;
  getReportDraft(input: {
    organizationId: string;
    reportDraftId: string;
  }): Promise<StoredReportDraft | null>;
  recordReportExport(input: {
    organizationId: string;
    reportDraftId: string;
    storageObjectKey: string;
    sha256: string;
    sizeBytes: number;
    generatedAt: string;
    uploadedAt: string;
  }): Promise<StoredReportExport>;
  getLatestReportExport(input: {
    organizationId: string;
    reportDraftId: string;
  }): Promise<StoredReportExport | null>;
  createShareLink(input: {
    organizationId: string;
    reportExportId: string;
    createdByUserId: string;
    tokenHash: string;
    expiresAt: string;
  }): Promise<{ id: string; expiresAt: Date }>;
  getShareLinkByTokenHash(
    tokenHash: string,
  ): Promise<StoredReportShareLink | null>;
  recordShareLinkAccess(shareLinkId: string, accessedAt: Date): Promise<void>;
};

export function createNeonReportArchiveRepository(
  databaseUrl: string | undefined,
  idFactory: () => string = randomUUID,
): ReportArchiveRepository {
  if (!databaseUrl) {
    throw new SyncConfigurationError(
      "SYNC_PERSISTENCE_NOT_CONFIGURED",
      "Neon Postgres persistence is not configured.",
      503,
    );
  }

  const db = createNeonDatabase(databaseUrl);

  return {
    async resolveMembership(principal) {
      const rows = await db
        .select({
          organizationId: organizationMembers.organizationId,
          role: organizationMembers.role,
          userId: users.id,
        })
        .from(users)
        .innerJoin(
          organizationMembers,
          eq(users.id, organizationMembers.userId),
        )
        .innerJoin(
          organizations,
          eq(organizationMembers.organizationId, organizations.id),
        )
        .where(
          and(
            eq(users.externalAuthId, principal.externalAuthId),
            eq(organizations.externalAuthId, principal.organizationId),
            isNull(organizations.deletedAt),
            isNull(users.deletedAt),
          ),
        )
        .limit(1);

      return rows[0] ?? null;
    },

    async getReportDraft(input) {
      const rows = await db
        .select({
          id: reportDrafts.id,
          projectId: reportDrafts.projectId,
          generatedPdfObjectKey: reportDrafts.generatedPdfObjectKey,
        })
        .from(reportDrafts)
        .where(
          and(
            eq(reportDrafts.id, input.reportDraftId),
            eq(reportDrafts.organizationId, input.organizationId),
            isNull(reportDrafts.deletedAt),
          ),
        )
        .limit(1);

      return rows[0] ?? null;
    },

    async recordReportExport(input) {
      const exportId = idFactory();
      const values = {
        id: exportId,
        organizationId: input.organizationId,
        reportDraftId: input.reportDraftId,
        storageObjectKey: input.storageObjectKey,
        mimeType: "application/pdf",
        sizeBytes: input.sizeBytes,
        sha256: input.sha256,
        generatedAt: new Date(input.generatedAt),
        uploadedAt: new Date(input.uploadedAt),
        updatedAt: new Date(input.uploadedAt),
      };

      const rows = await db
        .insert(reportExports)
        .values(values)
        .onConflictDoUpdate({
          target: [reportExports.reportDraftId, reportExports.sha256],
          set: {
            storageObjectKey: input.storageObjectKey,
            sizeBytes: input.sizeBytes,
            generatedAt: new Date(input.generatedAt),
            uploadedAt: new Date(input.uploadedAt),
            updatedAt: new Date(input.uploadedAt),
            revokedAt: null,
            deletedAt: null,
          },
        })
        .returning({
          id: reportExports.id,
          reportDraftId: reportExports.reportDraftId,
          storageObjectKey: reportExports.storageObjectKey,
          mimeType: reportExports.mimeType,
          sizeBytes: reportExports.sizeBytes,
          sha256: reportExports.sha256,
          generatedAt: reportExports.generatedAt,
          uploadedAt: reportExports.uploadedAt,
        });

      await db
        .update(reportDrafts)
        .set({
          generatedPdfObjectKey: input.storageObjectKey,
          generatedAt: new Date(input.generatedAt),
          status: "ready",
          updatedAt: new Date(input.uploadedAt),
          serverVersion: sql`${reportDrafts.serverVersion} + 1`,
        })
        .where(
          and(
            eq(reportDrafts.id, input.reportDraftId),
            eq(reportDrafts.organizationId, input.organizationId),
            isNull(reportDrafts.deletedAt),
          ),
        );

      const row = rows[0];
      if (!row) throw new Error("Report export was not recorded.");
      return row;
    },

    async getLatestReportExport(input) {
      const rows = await db
        .select({
          id: reportExports.id,
          reportDraftId: reportExports.reportDraftId,
          storageObjectKey: reportExports.storageObjectKey,
          mimeType: reportExports.mimeType,
          sizeBytes: reportExports.sizeBytes,
          sha256: reportExports.sha256,
          generatedAt: reportExports.generatedAt,
          uploadedAt: reportExports.uploadedAt,
        })
        .from(reportExports)
        .where(
          and(
            eq(reportExports.organizationId, input.organizationId),
            eq(reportExports.reportDraftId, input.reportDraftId),
            isNull(reportExports.deletedAt),
            isNull(reportExports.revokedAt),
          ),
        )
        .orderBy(desc(reportExports.uploadedAt))
        .limit(1);

      return rows[0] ?? null;
    },

    async createShareLink(input) {
      const id = idFactory();
      const rows = await db
        .insert(reportShareLinks)
        .values({
          id,
          organizationId: input.organizationId,
          reportExportId: input.reportExportId,
          createdByUserId: input.createdByUserId,
          tokenHash: input.tokenHash,
          expiresAt: new Date(input.expiresAt),
        })
        .returning({
          id: reportShareLinks.id,
          expiresAt: reportShareLinks.expiresAt,
        });

      const row = rows[0];
      if (!row) throw new Error("Report share link was not recorded.");
      return row;
    },

    async getShareLinkByTokenHash(tokenHash) {
      const rows = await db
        .select({
          id: reportShareLinks.id,
          organizationId: reportShareLinks.organizationId,
          expiresAt: reportShareLinks.expiresAt,
          revokedAt: reportShareLinks.revokedAt,
          reportExportId: reportExports.id,
          reportDraftId: reportExports.reportDraftId,
          storageObjectKey: reportExports.storageObjectKey,
          mimeType: reportExports.mimeType,
          sizeBytes: reportExports.sizeBytes,
          sha256: reportExports.sha256,
          generatedAt: reportExports.generatedAt,
          uploadedAt: reportExports.uploadedAt,
        })
        .from(reportShareLinks)
        .innerJoin(
          reportExports,
          eq(reportShareLinks.reportExportId, reportExports.id),
        )
        .where(
          and(
            eq(reportShareLinks.tokenHash, tokenHash),
            isNull(reportExports.deletedAt),
            isNull(reportExports.revokedAt),
          ),
        )
        .limit(1);

      const row = rows[0];
      if (!row) return null;

      return {
        id: row.id,
        organizationId: row.organizationId,
        expiresAt: row.expiresAt,
        revokedAt: row.revokedAt,
        reportExport: {
          id: row.reportExportId,
          reportDraftId: row.reportDraftId,
          storageObjectKey: row.storageObjectKey,
          mimeType: row.mimeType,
          sizeBytes: row.sizeBytes,
          sha256: row.sha256,
          generatedAt: row.generatedAt,
          uploadedAt: row.uploadedAt,
        },
      };
    },

    async recordShareLinkAccess(shareLinkId, accessedAt) {
      await db
        .update(reportShareLinks)
        .set({
          lastAccessedAt: accessedAt,
          accessCount: sql`${reportShareLinks.accessCount} + 1`,
        })
        .where(eq(reportShareLinks.id, shareLinkId));
    },
  };
}
