import {
  syncPullRequestSchema,
  syncPullResponseSchema,
  type SyncPullChanges,
} from "@fielddoc/validation";

import {
  getRequestId,
  safelyRecordAuditEvent,
  type AuditEventWriter,
} from "../../audit/audit-log";
import {
  SyncConfigurationError,
  type SyncApiErrorCode,
  type SyncAuthPrincipal,
  type SyncMembership,
  type SyncMutationAuthVerifier,
} from "../mutations/sync-service";

type SyncErrorStatus = 400 | 401 | 403 | 501 | 503;

export type PullChangesInput = {
  membership: SyncMembership;
  cursor: string | null;
  limit: number;
};

export type PullChangesResult = {
  changes: SyncPullChanges;
  cursor: string | null;
  hasMore: boolean;
};

export type SyncPullPersistence = {
  resolveMembership(
    principal: SyncAuthPrincipal,
  ): Promise<SyncMembership | null>;
  pullChanges(input: PullChangesInput): Promise<PullChangesResult>;
};

export type SyncPullPostHandlerDependencies = {
  createAuthVerifier: () => SyncMutationAuthVerifier;
  createPersistence: () => SyncPullPersistence;
  createAuditWriter?: () => AuditEventWriter;
  now?: () => Date;
};

export function createSyncPullPostHandler(
  dependencies: SyncPullPostHandlerDependencies,
): (request: Request) => Promise<Response> {
  return async function handleSyncPullPost(request) {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return errorResponse(
        "UNAUTHORIZED",
        "A bearer token is required before downloading cloud changes.",
        401,
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse("INVALID_JSON", "Request body must be JSON.", 400);
    }

    const parsed = syncPullRequestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: {
            code: "INVALID_SYNC_PULL",
            message: "Request body does not match the sync pull contract.",
            issues: parsed.error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          },
        },
        { status: 400 },
      );
    }

    let authVerifier: SyncMutationAuthVerifier;
    let persistence: SyncPullPersistence;

    try {
      authVerifier = dependencies.createAuthVerifier();
      persistence = dependencies.createPersistence();
    } catch (error) {
      if (error instanceof SyncConfigurationError) {
        return errorResponse(error.code, error.message, error.status);
      }

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

    const membership = await persistence.resolveMembership(
      authResult.principal,
    );

    if (!membership) {
      return errorResponse(
        "ORGANIZATION_MEMBERSHIP_REQUIRED",
        "Authenticated user is not a member of the active organization.",
        403,
      );
    }

    const result = await persistence.pullChanges({
      membership,
      cursor: parsed.data.cursor,
      limit: parsed.data.limit ?? 250,
    });

    const responseBody = syncPullResponseSchema.parse({
      serverTime: (dependencies.now ?? (() => new Date()))().toISOString(),
      cursor: result.cursor,
      hasMore: result.hasMore,
      changes: result.changes,
    });

    await safelyRecordAuditEvent(dependencies.createAuditWriter?.(), {
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      actorExternalId: authResult.principal.externalAuthId,
      eventType: "sync_pull",
      entityType: "SyncCursor",
      entityId: parsed.data.deviceId,
      metadata: {
        clientId: parsed.data.clientId,
        deviceId: parsed.data.deviceId,
        cursor: parsed.data.cursor,
        nextCursor: result.cursor,
        hasMore: result.hasMore,
        pulledCount: countPullChanges(result.changes),
      },
      requestId: getRequestId(request),
    });

    return Response.json(responseBody);
  };
}

function countPullChanges(changes: SyncPullChanges): number {
  return (
    changes.projects.length +
    changes.evidenceItems.length +
    changes.mediaAssets.length +
    changes.annotations.length +
    changes.documents.length +
    changes.reportDrafts.length
  );
}

function errorResponse(
  code: SyncApiErrorCode | "INVALID_SYNC_PULL",
  message: string,
  status: SyncErrorStatus,
): Response {
  return Response.json({ error: { code, message } }, { status });
}
