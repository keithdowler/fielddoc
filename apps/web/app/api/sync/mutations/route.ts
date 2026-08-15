import { webServerEnvSchema } from "@fielddoc/config";
import { initialSyncMigrationId } from "@fielddoc/database";
import { syncMutationUploadRequestSchema } from "@fielddoc/validation";

export const runtime = "nodejs";

type ApiErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_JSON"
  | "INVALID_SYNC_MUTATION_UPLOAD"
  | "SYNC_AUTH_NOT_CONFIGURED"
  | "SYNC_PERSISTENCE_NOT_CONFIGURED"
  | "SYNC_PERSISTENCE_NOT_IMPLEMENTED";

export async function POST(request: Request): Promise<Response> {
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
          code: "INVALID_SYNC_MUTATION_UPLOAD" satisfies ApiErrorCode,
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

  const env = webServerEnvSchema.parse(process.env);

  if (!env.CLERK_SECRET_KEY) {
    return errorResponse(
      "SYNC_AUTH_NOT_CONFIGURED",
      "Server auth verification is not configured.",
      501,
    );
  }

  if (!env.DATABASE_URL) {
    return errorResponse(
      "SYNC_PERSISTENCE_NOT_CONFIGURED",
      "Neon Postgres persistence is not configured.",
      503,
    );
  }

  return Response.json(
    {
      error: {
        code: "SYNC_PERSISTENCE_NOT_IMPLEMENTED" satisfies ApiErrorCode,
        message:
          "The sync contract is available, but mutation persistence is not implemented in this sprint.",
        migrationRequired: initialSyncMigrationId,
      },
    },
    { status: 501 },
  );
}

export async function GET(): Promise<Response> {
  return Response.json({
    name: "FieldDoc sync mutation upload",
    status: "contract-only",
    accepts: "POST",
    migrationRequired: initialSyncMigrationId,
  });
}

function errorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
): Response {
  return Response.json({ error: { code, message } }, { status });
}
