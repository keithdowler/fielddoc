import { webServerEnvSchema } from "@fielddoc/config";
import { initialSyncMigrationId } from "@fielddoc/database";

import {
  createClerkSyncAuthVerifier,
  parseAuthorizedParties,
} from "./clerk-auth";
import { createNeonSyncMutationPersistence } from "./neon-persistence";
import { createSyncMutationPostHandler } from "./sync-service";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const env = webServerEnvSchema.parse(process.env);
  const handler = createSyncMutationPostHandler({
    createAuthVerifier: () =>
      createClerkSyncAuthVerifier({
        secretKey: env.CLERK_SECRET_KEY,
        publishableKey: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        jwtKey: env.CLERK_JWT_KEY,
        authorizedParties: parseAuthorizedParties(env.CLERK_AUTHORIZED_PARTIES),
      }),
    createPersistence: () =>
      createNeonSyncMutationPersistence(env.DATABASE_URL),
  });

  return handler(request);
}

export async function GET(): Promise<Response> {
  return Response.json({
    name: "FieldDoc sync mutation upload",
    status: "canonical-metadata-sync-ready",
    accepts: "POST",
    applies: [
      "Project",
      "EvidenceItem",
      "MediaAsset",
      "Annotation",
      "ReportDraft",
    ],
    migrationRequired: initialSyncMigrationId,
  });
}
