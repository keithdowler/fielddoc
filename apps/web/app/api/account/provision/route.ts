import { auth, currentUser } from "@clerk/nextjs/server";
import { webServerEnvSchema } from "@fielddoc/config";

import {
  createNeonAuditEventWriter,
  getRequestId,
  safelyRecordAuditEvent,
} from "../../audit/audit-log";
import {
  normalizeMembershipRole,
  normalizeOrganizationName,
} from "./account-provisioning";
import { createNeonAccountProvisioner } from "./neon-account-provisioner";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const env = webServerEnvSchema.parse(process.env);

  if (!env.DATABASE_URL) {
    return errorResponse(
      "ACCOUNT_PERSISTENCE_NOT_CONFIGURED",
      "Neon Postgres persistence is not configured.",
      503,
    );
  }

  const authContext = await auth();

  if (!authContext.userId) {
    return errorResponse("UNAUTHORIZED", "Sign in before provisioning.", 401);
  }

  if (!authContext.orgId) {
    return errorResponse(
      "ORGANIZATION_REQUIRED",
      "Select or create an organization before provisioning.",
      403,
    );
  }

  const clerkUser = await currentUser();
  const provisioner = createNeonAccountProvisioner(env.DATABASE_URL);
  const result = await provisioner.ensureAccount({
    clerkUserId: authContext.userId,
    clerkOrganizationId: authContext.orgId,
    organizationName: normalizeOrganizationName(authContext.orgSlug),
    email: clerkUser?.primaryEmailAddress?.emailAddress ?? null,
    role: normalizeMembershipRole(authContext.orgRole),
  });

  await safelyRecordAuditEvent(createNeonAuditEventWriter(env.DATABASE_URL), {
    organizationId: result.organizationId,
    actorUserId: result.userId,
    actorExternalId: authContext.userId,
    eventType: "account_provision",
    entityType: "Organization",
    entityId: result.organizationId,
    metadata: {
      clerkOrganizationId: authContext.orgId,
      role: result.role,
    },
    requestId: getRequestId(request),
  });

  return Response.json({
    status: "ready",
    account: result,
  });
}

function errorResponse(
  code: string,
  message: string,
  status: number,
): Response {
  return Response.json({ error: { code, message } }, { status });
}
