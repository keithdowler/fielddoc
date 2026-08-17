import { createHash, randomBytes } from "node:crypto";

import {
  reportPdfDownloadPrepareRequestSchema,
  reportPdfDownloadPrepareResponseSchema,
  reportPdfUploadCompleteRequestSchema,
  reportPdfUploadCompleteResponseSchema,
  reportPdfUploadPrepareRequestSchema,
  reportPdfUploadPrepareResponseSchema,
  reportShareLinkCreateRequestSchema,
  reportShareLinkCreateResponseSchema,
} from "@fielddoc/validation";
import { z } from "zod";

import {
  getRequestId,
  safelyRecordAuditEvent,
  type AuditEventWriter,
} from "../audit/audit-log";
import { MediaConfigurationError } from "../media/media-service";
import {
  createReportPdfObjectKey,
  type PrivateObjectStorage,
} from "../media/private-object-storage";
import {
  SyncConfigurationError,
  type SyncMembership,
  type SyncMutationAuthVerifier,
} from "../sync/mutations/sync-service";
import type { ReportArchiveRepository } from "./neon-report-repository";

type ReportApiDependencies = {
  createAuthVerifier: () => SyncMutationAuthVerifier;
  createRepository: () => ReportArchiveRepository;
  createStorage: () => PrivateObjectStorage;
  createAuditWriter?: () => AuditEventWriter;
  now?: () => Date;
  tokenFactory?: () => string;
};

type AuthenticatedReportRequest = {
  membership: SyncMembership;
  repository: ReportArchiveRepository;
};

const uploadUrlExpiresInSeconds = 10 * 60;
const downloadUrlExpiresInSeconds = 5 * 60;
const defaultShareLinkExpiresInMs = 7 * 24 * 60 * 60 * 1000;

export function createReportPdfUploadPrepareHandler(
  dependencies: ReportApiDependencies,
): (request: Request) => Promise<Response> {
  return async function handlePrepareReportPdfUpload(request) {
    const auth = await authenticateReportRequest(request, dependencies);

    if (auth instanceof Response) return auth;

    const parsed = await parseJsonBody(
      request,
      reportPdfUploadPrepareRequestSchema,
      "INVALID_REPORT_UPLOAD_PREPARE",
    );

    if (parsed instanceof Response) return parsed;

    const reportDraft = await auth.repository.getReportDraft({
      organizationId: auth.membership.organizationId,
      reportDraftId: parsed.reportDraftId,
    });

    if (!reportDraft) {
      return errorResponse(
        "REPORT_DRAFT_NOT_FOUND",
        "Report draft was not found for the active organization.",
        404,
      );
    }

    const storage = createStorageOrResponse(dependencies);

    if (storage instanceof Response) return storage;

    const now = dependencies.now?.() ?? new Date();
    const storageObjectKey = createReportPdfObjectKey({
      organizationId: auth.membership.organizationId,
      reportDraftId: parsed.reportDraftId,
      sha256: parsed.sha256,
      fileExtension: parsed.fileExtension,
    });
    const expiresAt = new Date(
      now.getTime() + uploadUrlExpiresInSeconds * 1000,
    ).toISOString();
    const requiredHeaders = {
      "Content-Type": parsed.mimeType,
      "x-amz-meta-sha256": parsed.sha256,
    };

    await recordReportAuditEvent(dependencies, request, {
      organizationId: auth.membership.organizationId,
      actorUserId: auth.membership.userId,
      eventType: "report_pdf_upload_prepare",
      entityType: "ReportDraft",
      entityId: parsed.reportDraftId,
      metadata: {
        projectId: reportDraft.projectId,
        storageObjectKey,
        sizeBytes: parsed.sizeBytes,
        sha256: parsed.sha256,
        expiresAt,
      },
    });

    return Response.json(
      reportPdfUploadPrepareResponseSchema.parse({
        reportDraftId: parsed.reportDraftId,
        storageObjectKey,
        uploadUrl: storage.createPresignedUrl({
          method: "PUT",
          objectKey: storageObjectKey,
          expiresInSeconds: uploadUrlExpiresInSeconds,
          signedHeaders: requiredHeaders,
          now,
        }),
        requiredHeaders,
        expiresAt,
      }),
    );
  };
}

export function createReportPdfUploadCompleteHandler(
  dependencies: ReportApiDependencies,
): (request: Request) => Promise<Response> {
  return async function handleCompleteReportPdfUpload(request) {
    const auth = await authenticateReportRequest(request, dependencies);

    if (auth instanceof Response) return auth;

    const parsed = await parseJsonBody(
      request,
      reportPdfUploadCompleteRequestSchema,
      "INVALID_REPORT_UPLOAD_COMPLETE",
    );

    if (parsed instanceof Response) return parsed;

    const reportDraft = await auth.repository.getReportDraft({
      organizationId: auth.membership.organizationId,
      reportDraftId: parsed.reportDraftId,
    });

    if (!reportDraft) {
      return errorResponse(
        "REPORT_DRAFT_NOT_FOUND",
        "Report draft was not found for the active organization.",
        404,
      );
    }

    if (
      parsed.storageObjectKey !==
      createReportPdfObjectKey({
        organizationId: auth.membership.organizationId,
        reportDraftId: parsed.reportDraftId,
        sha256: parsed.sha256,
      })
    ) {
      return errorResponse(
        "INVALID_STORAGE_OBJECT_KEY",
        "Completed report upload does not match the expected private object key.",
        400,
      );
    }

    const storage = createStorageOrResponse(dependencies);

    if (storage instanceof Response) return storage;

    const verification = await storage.verifyObject({
      objectKey: parsed.storageObjectKey,
      expectedSizeBytes: parsed.sizeBytes,
      expectedSha256: parsed.sha256,
      expectedContentType: "application/pdf",
      now: dependencies.now?.() ?? new Date(),
    });

    if (!verification.ok) {
      return errorResponse(
        verification.code,
        verification.message,
        verification.code === "MEDIA_OBJECT_VERIFICATION_FAILED" ? 502 : 409,
      );
    }

    const reportExport = await auth.repository.recordReportExport({
      organizationId: auth.membership.organizationId,
      reportDraftId: parsed.reportDraftId,
      storageObjectKey: parsed.storageObjectKey,
      sha256: parsed.sha256,
      sizeBytes: parsed.sizeBytes,
      generatedAt: parsed.generatedAt,
      uploadedAt: parsed.uploadedAt,
    });

    await recordReportAuditEvent(dependencies, request, {
      organizationId: auth.membership.organizationId,
      actorUserId: auth.membership.userId,
      eventType: "report_pdf_upload_complete",
      entityType: "ReportExport",
      entityId: reportExport.id,
      metadata: {
        reportDraftId: parsed.reportDraftId,
        storageObjectKey: reportExport.storageObjectKey,
        sha256: reportExport.sha256,
        sizeBytes: reportExport.sizeBytes,
        uploadedAt: reportExport.uploadedAt.toISOString(),
      },
    });

    return Response.json(
      reportPdfUploadCompleteResponseSchema.parse({
        reportDraftId: parsed.reportDraftId,
        reportExportId: reportExport.id,
        storageObjectKey: reportExport.storageObjectKey,
        uploadedAt: reportExport.uploadedAt.toISOString(),
        status: "recorded",
      }),
    );
  };
}

export function createReportPdfDownloadPrepareHandler(
  dependencies: ReportApiDependencies,
): (request: Request) => Promise<Response> {
  return async function handlePrepareReportPdfDownload(request) {
    const auth = await authenticateReportRequest(request, dependencies);

    if (auth instanceof Response) return auth;

    const parsed = await parseJsonBody(
      request,
      reportPdfDownloadPrepareRequestSchema,
      "INVALID_REPORT_DOWNLOAD_PREPARE",
    );

    if (parsed instanceof Response) return parsed;

    const reportExport = await auth.repository.getLatestReportExport({
      organizationId: auth.membership.organizationId,
      reportDraftId: parsed.reportDraftId,
    });

    if (!reportExport) {
      return errorResponse(
        "REPORT_EXPORT_NOT_FOUND",
        "Report PDF has not been uploaded to private storage yet.",
        404,
      );
    }

    const storage = createStorageOrResponse(dependencies);

    if (storage instanceof Response) return storage;

    const now = dependencies.now?.() ?? new Date();
    const expiresAt = new Date(
      now.getTime() + downloadUrlExpiresInSeconds * 1000,
    ).toISOString();
    const downloadUrl = storage.createPresignedUrl({
      method: "GET",
      objectKey: reportExport.storageObjectKey,
      expiresInSeconds: downloadUrlExpiresInSeconds,
      now,
    });

    await recordReportAuditEvent(dependencies, request, {
      organizationId: auth.membership.organizationId,
      actorUserId: auth.membership.userId,
      eventType: "report_pdf_download_prepare",
      entityType: "ReportExport",
      entityId: reportExport.id,
      metadata: {
        reportDraftId: parsed.reportDraftId,
        storageObjectKey: reportExport.storageObjectKey,
        expiresAt,
      },
    });

    return Response.json(
      reportPdfDownloadPrepareResponseSchema.parse({
        reportDraftId: parsed.reportDraftId,
        reportExportId: reportExport.id,
        storageObjectKey: reportExport.storageObjectKey,
        downloadUrl,
        expiresAt,
      }),
    );
  };
}

export function createReportShareLinkCreateHandler(
  dependencies: ReportApiDependencies,
): (request: Request) => Promise<Response> {
  return async function handleCreateReportShareLink(request) {
    const auth = await authenticateReportRequest(request, dependencies);

    if (auth instanceof Response) return auth;

    const parsed = await parseJsonBody(
      request,
      reportShareLinkCreateRequestSchema,
      "INVALID_REPORT_SHARE_LINK_CREATE",
    );

    if (parsed instanceof Response) return parsed;

    const reportExport = await auth.repository.getLatestReportExport({
      organizationId: auth.membership.organizationId,
      reportDraftId: parsed.reportDraftId,
    });

    if (!reportExport) {
      return errorResponse(
        "REPORT_EXPORT_NOT_FOUND",
        "Report PDF has not been uploaded to private storage yet.",
        404,
      );
    }

    const now = dependencies.now?.() ?? new Date();
    const expiresAt =
      parsed.expiresAt ??
      new Date(now.getTime() + defaultShareLinkExpiresInMs).toISOString();
    const token = dependencies.tokenFactory?.() ?? createShareToken();
    const shareLink = await auth.repository.createShareLink({
      organizationId: auth.membership.organizationId,
      reportExportId: reportExport.id,
      createdByUserId: auth.membership.userId,
      tokenHash: hashShareToken(token),
      expiresAt,
    });
    const shareUrl = new URL(`/share/reports/${token}`, request.url);

    await recordReportAuditEvent(dependencies, request, {
      organizationId: auth.membership.organizationId,
      actorUserId: auth.membership.userId,
      eventType: "report_share_link_create",
      entityType: "ReportShareLink",
      entityId: shareLink.id,
      metadata: {
        reportDraftId: parsed.reportDraftId,
        reportExportId: reportExport.id,
        expiresAt: shareLink.expiresAt.toISOString(),
      },
    });

    return Response.json(
      reportShareLinkCreateResponseSchema.parse({
        reportDraftId: parsed.reportDraftId,
        reportExportId: reportExport.id,
        shareLinkId: shareLink.id,
        shareUrl: shareUrl.toString(),
        expiresAt: shareLink.expiresAt.toISOString(),
      }),
    );
  };
}

export function createPublicReportShareRedirectHandler(
  dependencies: Pick<
    ReportApiDependencies,
    "createRepository" | "createStorage" | "createAuditWriter" | "now"
  >,
): (token: string, request?: Request) => Promise<Response> {
  return async function handlePublicReportShareRedirect(token, request) {
    if (!/^[A-Za-z0-9_-]{24,256}$/.test(token)) {
      return errorResponse(
        "REPORT_SHARE_LINK_NOT_FOUND",
        "Report share link was not found.",
        404,
      );
    }

    let repository: ReportArchiveRepository;
    let storage: PrivateObjectStorage;

    try {
      repository = dependencies.createRepository();
      storage = dependencies.createStorage();
    } catch (error) {
      const response = configurationErrorResponse(error);
      if (response) return response;
      throw error;
    }

    const shareLink = await repository.getShareLinkByTokenHash(
      hashShareToken(token),
    );

    if (!shareLink) {
      return errorResponse(
        "REPORT_SHARE_LINK_NOT_FOUND",
        "Report share link was not found.",
        404,
      );
    }

    const now = dependencies.now?.() ?? new Date();

    if (shareLink.revokedAt) {
      return errorResponse(
        "REPORT_SHARE_LINK_REVOKED",
        "Report share link has been revoked.",
        410,
      );
    }

    if (shareLink.expiresAt.getTime() <= now.getTime()) {
      return errorResponse(
        "REPORT_SHARE_LINK_EXPIRED",
        "Report share link has expired.",
        410,
      );
    }

    await repository.recordShareLinkAccess(shareLink.id, now);

    const downloadUrl = storage.createPresignedUrl({
      method: "GET",
      objectKey: shareLink.reportExport.storageObjectKey,
      expiresInSeconds: downloadUrlExpiresInSeconds,
      now,
    });

    await safelyRecordAuditEvent(dependencies.createAuditWriter?.(), {
      organizationId: shareLink.organizationId,
      eventType: "report_share_link_access",
      entityType: "ReportShareLink",
      entityId: shareLink.id,
      metadata: {
        reportExportId: shareLink.reportExport.id,
        reportDraftId: shareLink.reportExport.reportDraftId,
        expiresAt: shareLink.expiresAt.toISOString(),
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

async function authenticateReportRequest(
  request: Request,
  dependencies: ReportApiDependencies,
): Promise<AuthenticatedReportRequest | Response> {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return errorResponse(
      "UNAUTHORIZED",
      "A bearer token is required before accessing report storage.",
      401,
    );
  }

  let authVerifier: SyncMutationAuthVerifier;
  let repository: ReportArchiveRepository;

  try {
    authVerifier = dependencies.createAuthVerifier();
    repository = dependencies.createRepository();
  } catch (error) {
    const response = configurationErrorResponse(error);
    if (response) return response;
    throw error;
  }

  const authResult = await authVerifier.verify(request);

  if (!authResult.ok) {
    return errorResponse(
      authResult.code,
      authResult.message,
      authResult.status,
    );
  }

  const membership = await repository.resolveMembership(authResult.principal);

  if (!membership) {
    return errorResponse(
      "ORGANIZATION_MEMBERSHIP_REQUIRED",
      "Authenticated user is not a member of the active organization.",
      403,
    );
  }

  return { membership, repository };
}

async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  code: string,
): Promise<T | Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "Request body must be JSON.", 400);
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code,
          message: "Request body does not match the report API contract.",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
      { status: 400 },
    );
  }

  return parsed.data;
}

function createStorageOrResponse(
  dependencies: ReportApiDependencies,
): PrivateObjectStorage | Response {
  try {
    return dependencies.createStorage();
  } catch (error) {
    const response = configurationErrorResponse(error);
    if (response) return response;
    throw error;
  }
}

function configurationErrorResponse(error: unknown): Response | null {
  if (error instanceof SyncConfigurationError) {
    return errorResponse(error.code, error.message, error.status);
  }

  if (error instanceof MediaConfigurationError) {
    return errorResponse(error.code, error.message, error.status);
  }

  return null;
}

function createShareToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashShareToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function errorResponse(
  code: string,
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 410 | 501 | 502 | 503,
): Response {
  return Response.json({ error: { code, message } }, { status });
}

async function recordReportAuditEvent(
  dependencies: ReportApiDependencies,
  request: Request,
  event: Parameters<typeof safelyRecordAuditEvent>[1],
): Promise<void> {
  await safelyRecordAuditEvent(dependencies.createAuditWriter?.(), {
    ...event,
    requestId: getRequestId(request),
  });
}
