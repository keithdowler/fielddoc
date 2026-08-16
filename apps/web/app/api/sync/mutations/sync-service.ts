import {
  syncMutationUploadRequestSchema,
  syncMutationUploadResponseSchema,
  type SyncMutationEnvelope,
} from "@fielddoc/validation";

export type SyncApiErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_JSON"
  | "INVALID_SYNC_MUTATION_UPLOAD"
  | "ORGANIZATION_REQUIRED"
  | "ORGANIZATION_MEMBERSHIP_REQUIRED"
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
  organizationId: string;
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
      code: Extract<SyncApiErrorCode, "UNAUTHORIZED" | "ORGANIZATION_REQUIRED">;
      message: string;
      status: 401 | 403;
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
  ): Promise<SyncMembership | null>;
  recordReceivedMutation(
    input: RecordReceivedMutationInput,
  ): Promise<RecordReceivedMutationResult>;
};

export type SyncMutationPostHandlerDependencies = {
  createAuthVerifier: () => SyncMutationAuthVerifier;
  createPersistence: () => SyncMutationPersistence;
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
