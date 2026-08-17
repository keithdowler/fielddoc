import { webServerEnvSchema } from "@fielddoc/config";

import {
  createClerkSyncAuthVerifier,
  parseAuthorizedParties,
} from "../mutations/clerk-auth";
import { createNeonSyncPullPersistence } from "./neon-pull-repository";
import { createSyncPullPostHandler } from "./sync-pull-service";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const env = webServerEnvSchema.parse(process.env);
  const handler = createSyncPullPostHandler({
    createAuthVerifier: () =>
      createClerkSyncAuthVerifier({
        secretKey: env.CLERK_SECRET_KEY,
        publishableKey: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
        jwtKey: env.CLERK_JWT_KEY,
        authorizedParties: parseAuthorizedParties(env.CLERK_AUTHORIZED_PARTIES),
      }),
    createPersistence: () => createNeonSyncPullPersistence(env.DATABASE_URL),
  });

  return handler(request);
}

export async function GET(): Promise<Response> {
  return Response.json({
    name: "FieldDoc sync pull",
    status: "canonical-download-ready",
    accepts: "POST",
    returns: [
      "Project",
      "EvidenceItem",
      "MediaAsset",
      "Annotation",
      "Document",
      "ReportDraft",
    ],
  });
}
