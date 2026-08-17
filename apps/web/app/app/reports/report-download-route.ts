import type { ReportArchiveRepository } from "../../api/reports/neon-report-repository";
import {
  getRequestId,
  safelyRecordAuditEvent,
  type AuditEventWriter,
} from "../../api/audit/audit-log";
import {
  MediaConfigurationError,
  type MediaConfigurationErrorCode,
} from "../../api/media/media-service";
import type { PrivateObjectStorage } from "../../api/media/private-object-storage";
import { SyncConfigurationError } from "../../api/sync/mutations/sync-service";

type WebAuthContext = {
  userId: string | null;
  orgId: string | null;
};

type WebReportDownloadDependencies = {
  getAuthContext: () => Promise<WebAuthContext>;
  createRepository: () => ReportArchiveRepository;
  createStorage: () => PrivateObjectStorage;
  createAuditWriter?: () => AuditEventWriter;
  now?: () => Date;
};

const downloadUrlExpiresInSeconds = 5 * 60;

export function createWebReportDownloadRedirectHandler(
  dependencies: WebReportDownloadDependencies,
): (reportDraftId: string, request?: Request) => Promise<Response> {
  return async function handleWebReportDownload(reportDraftId, request) {
    if (!isUuid(reportDraftId)) {
      return errorResponse(
        "INVALID_REPORT_DRAFT_ID",
        "Report draft identifier is invalid.",
        400,
      );
    }

    const authContext = await dependencies.getAuthContext();

    if (!authContext.userId) {
      return errorResponse(
        "UNAUTHORIZED",
        "Sign in before downloading report PDFs.",
        401,
      );
    }

    if (!authContext.orgId) {
      return errorResponse(
        "ORGANIZATION_REQUIRED",
        "Select a Clerk organization before downloading report PDFs.",
        403,
      );
    }

    let repository: ReportArchiveRepository;
    let storage: PrivateObjectStorage;

    try {
      repository = dependencies.createRepository();
      storage = dependencies.createStorage();
    } catch (error) {
      if (error instanceof SyncConfigurationError) {
        return errorResponse(error.code, error.message, error.status);
      }

      if (error instanceof MediaConfigurationError) {
        return errorResponse(error.code, error.message, error.status);
      }

      throw error;
    }

    const membership = await repository.resolveMembership({
      externalAuthId: authContext.userId,
      organizationId: authContext.orgId,
      organizationRole: "org:member",
    });

    if (!membership) {
      return errorResponse(
        "ORGANIZATION_MEMBERSHIP_REQUIRED",
        "Authenticated user is not a member of the active organization.",
        403,
      );
    }

    const reportExport = await repository.getLatestReportExport({
      organizationId: membership.organizationId,
      reportDraftId,
    });

    if (!reportExport) {
      return errorResponse(
        "REPORT_EXPORT_NOT_FOUND",
        "Report PDF has not been uploaded to private storage yet.",
        404,
      );
    }

    const downloadUrl = storage.createPresignedUrl({
      method: "GET",
      objectKey: reportExport.storageObjectKey,
      expiresInSeconds: downloadUrlExpiresInSeconds,
      now: dependencies.now?.() ?? new Date(),
    });

    await safelyRecordAuditEvent(dependencies.createAuditWriter?.(), {
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      actorExternalId: authContext.userId,
      eventType: "web_report_download_redirect",
      entityType: "ReportExport",
      entityId: reportExport.id,
      metadata: {
        reportDraftId,
        storageObjectKey: reportExport.storageObjectKey,
      },
      requestId: request ? getRequestId(request) : null,
    });

    return new Response(null, {
      status: 302,
      headers: {
        "Cache-Control": "no-store",
        Location: downloadUrl,
      },
    });
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function errorResponse(
  code:
    | "INVALID_REPORT_DRAFT_ID"
    | "UNAUTHORIZED"
    | "ORGANIZATION_REQUIRED"
    | "ORGANIZATION_MEMBERSHIP_REQUIRED"
    | "REPORT_EXPORT_NOT_FOUND"
    | "SYNC_AUTH_NOT_CONFIGURED"
    | "SYNC_PERSISTENCE_NOT_CONFIGURED"
    | MediaConfigurationErrorCode,
  message: string,
  status: 400 | 401 | 403 | 404 | 501 | 503,
): Response {
  return Response.json({ error: { code, message } }, { status });
}
