import {
  syncMutationUploadRequestSchema,
  syncMutationUploadResponseSchema,
  type SyncMutationEnvelope,
} from "@fielddoc/validation";

import {
  getRequestId,
  safelyRecordAuditEvent,
  type AuditEventWriter,
} from "../../audit/audit-log";

export type SyncApiErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_JSON"
  | "INVALID_SYNC_MUTATION_UPLOAD"
  | "ORGANIZATION_REQUIRED"
  | "ORGANIZATION_MEMBERSHIP_REQUIRED"
  | "WORKSPACE_CHOICE_REQUIRED"
  | "WORKSPACE_NOT_FOUND"
  | "SYNC_AUTH_NOT_CONFIGURED"
  | "SYNC_PERSISTENCE_NOT_CONFIGURED"
  | "SYNC_PERSISTENCE_WRITE_FAILED";

type SyncErrorStatus = 400 | 401 | 403 | 501 | 503;

export class SyncConfigurationError extends Error {
  constructor(
    readonly code: Extract<
      SyncApiErrorCode,
      "SYNC_AUTH_NOT_CONFIGURED" | "SYNC_PERSISTENCE_NOT_CONFIGURED"
    >,
    message: string,
    readonly status: 501 | 503,
  ) {
    super(message);
    this.name = "SyncConfigurationError";
  }
}

export type SyncAuthPrincipal = {
  externalAuthId: string;
  organizationId: string | null;
  organizationRole: string | null;
};

export type SyncMembership = {
  organizationId: string;
  userId: string;
  role: string;
};

export type SyncAuthResult =
  | { ok: true; principal: SyncAuthPrincipal }
  | {
      ok: false;
      code: Extract<SyncApiErrorCode, "UNAUTHORIZED">;
      message: string;
      status: 401;
    };

export type SyncMutationAuthVerifier = {
  verify(request: Request): Promise<SyncAuthResult>;
};

export type RecordReceivedMutationInput = {
  deviceId: string;
  membership: SyncMembership;
  mutation: SyncMutationEnvelope;
};

export type RecordReceivedMutationResult =
  | { status: "accepted" }
  | { status: "duplicate" }
  | { status: "rejected"; code: string; message: string };

export type SyncMutationPersistence = {
  resolveMembership(
    principal: SyncAuthPrincipal,
  ): Promise<SyncMembershipResolution>;
  recordReceivedMutation(
    input: RecordReceivedMutationInput,
  ): Promise<RecordReceivedMutationResult>;
};

export type SyncMembershipResolution =
  | SyncMembership
  | null
  | { status: "workspace_not_found" }
  | { status: "workspace_choice_required" };

export type SyncMembershipResolutionResult =
  | { ok: true; membership: SyncMembership }
  | {
      ok: false;
      code: Extract<
        SyncApiErrorCode,
        | "ORGANIZATION_MEMBERSHIP_REQUIRED"
        | "WORKSPACE_CHOICE_REQUIRED"
        | "WORKSPACE_NOT_FOUND"
      >;
      message: string;
      status: 403;
    };

export function resolveSyncMembershipResult(
  resolution: SyncMembershipResolution,
  principal: SyncAuthPrincipal,
): SyncMembershipResolutionResult {
  if (resolution && "organizationId" in resolution) {
    return { ok: true, membership: resolution };
  }

  if (
    resolution &&
    "status" in resolution &&
    resolution.status === "workspace_choice_required"
  ) {
    return {
      ok: false,
      code: "WORKSPACE_CHOICE_REQUIRED",
      message:
        "This account has more than one FieldDoc workspace. Choose a workspace, then try again.",
      status: 403,
    };
  }

  if (principal.organizationId) {
    return {
      ok: false,
      code: "ORGANIZATION_MEMBERSHIP_REQUIRED",
      message:
        "This account is not set up for the selected FieldDoc workspace.",
      status: 403,
    };
  }

  return {
    ok: false,
    code: "WORKSPACE_NOT_FOUND",
    message:
      "We could not find your FieldDoc workspace. Sign out and sign in again, then try saving.",
    status: 403,
  };
}

export type SyncMutationPostHandlerDependencies = {
  createAuthVerifier: () => SyncMutationAuthVerifier;
  createPersistence: () => SyncMutationPersistence;
  createAuditWriter?: () => AuditEventWriter;
  now?: () => Date;
};

const uploadableSyncStates = new Set(["PENDING", "FAILED"]);

export function createSyncMutationPostHandler(
  dependencies: SyncMutationPostHandlerDependencies,
): (request: Request) => Promise<Response> {
  return async function handleSyncMutationPost(request) {
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return errorResponse(
        "UNAUTHORIZED",
        "A bearer token is required before uploading local mutations.",
        401,
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse("INVALID_JSON", "Request body must be JSON.", 400);
    }

    const parsed = syncMutationUploadRequestSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        {
          error: {
            code: "INVALID_SYNC_MUTATION_UPLOAD" satisfies SyncApiErrorCode,
            message: "Request body does not match the sync mutation contract.",
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
    let persistence: SyncMutationPersistence;

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

    const membershipResult = resolveSyncMembershipResult(
      await persistence.resolveMembership(authResult.principal),
      authResult.principal,
    );

    if (!membershipResult.ok) {
      return errorResponse(
        membershipResult.code,
        membershipResult.message,
        membershipResult.status,
      );
    }

    const { membership } = membershipResult;

    const acceptedMutationIds: string[] = [];
    const duplicateMutationIds: string[] = [];
    const rejectedMutations: Array<{
      mutationId: string;
      code: string;
      message: string;
    }> = [];

    for (const mutation of parsed.data.mutations) {
      if (!uploadableSyncStates.has(mutation.syncState)) {
        rejectedMutations.push({
          mutationId: mutation.mutationId,
          code: "MUTATION_NOT_UPLOADABLE",
          message:
            "Only pending or failed local mutations can be uploaded to sync.",
        });
        continue;
      }

      try {
        const result = await persistence.recordReceivedMutation({
          deviceId: parsed.data.deviceId,
          membership,
          mutation,
        });

        if (result.status === "duplicate") {
          duplicateMutationIds.push(mutation.mutationId);
        } else if (result.status === "rejected") {
          rejectedMutations.push({
            mutationId: mutation.mutationId,
            code: result.code,
            message: result.message,
          });
        } else {
          acceptedMutationIds.push(mutation.mutationId);
        }
      } catch {
        rejectedMutations.push({
          mutationId: mutation.mutationId,
          code: "SYNC_PERSISTENCE_WRITE_FAILED",
          message: "Mutation could not be persisted for later sync processing.",
        });
      }
    }

    const responseBody = syncMutationUploadResponseSchema.parse({
      serverTime: (dependencies.now ?? (() => new Date()))().toISOString(),
      acceptedMutationIds,
      duplicateMutationIds,
      rejectedMutations,
      pullCursor: null,
    });

    await safelyRecordAuditEvent(dependencies.createAuditWriter?.(), {
      organizationId: membership.organizationId,
      actorUserId: membership.userId,
      actorExternalId: authResult.principal.externalAuthId,
      eventType: "sync_mutation_upload",
      entityType: "LocalMutationBatch",
      entityId: parsed.data.deviceId,
      metadata: {
        clientId: parsed.data.clientId,
        deviceId: parsed.data.deviceId,
        attemptedCount: parsed.data.mutations.length,
        acceptedCount: acceptedMutationIds.length,
        duplicateCount: duplicateMutationIds.length,
        rejectedCount: rejectedMutations.length,
      },
      requestId: getRequestId(request),
    });

    return Response.json(responseBody);
  };
}

function errorResponse(
  code: SyncApiErrorCode,
  message: string,
  status: SyncErrorStatus,
): Response {
  return Response.json({ error: { code, message } }, { status });
}
