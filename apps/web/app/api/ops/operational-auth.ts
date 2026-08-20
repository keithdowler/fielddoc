import { auth, currentUser } from "@clerk/nextjs/server";
import {
  createNeonDatabase,
  organizationMembers,
  organizations,
  users,
} from "@fielddoc/database";
import { and, eq, isNull } from "drizzle-orm";

export type OperationalAuthContext = {
  organizationId: string;
  userId: string;
  externalOrganizationId: string;
  externalUserId: string;
  email: string | null;
};

export class OperationalAuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

export async function requireOperationalAuth(
  databaseUrl: string | undefined,
): Promise<OperationalAuthContext> {
  if (!databaseUrl) {
    throw new OperationalAuthError(
      "DATABASE_NOT_CONFIGURED",
      "Neon Postgres persistence is required before running provider checks.",
      503,
    );
  }

  const authContext = await auth();

  if (!authContext.userId) {
    throw new OperationalAuthError(
      "UNAUTHORIZED",
      "Sign in before running provider checks.",
      401,
    );
  }

  if (!authContext.orgId) {
    throw new OperationalAuthError(
      "ORGANIZATION_REQUIRED",
      "Select a Clerk organization before running provider checks.",
      403,
    );
  }

  const db = createNeonDatabase(databaseUrl);
  const [membership] = await db
    .select({
      organizationId: organizations.id,
      userId: users.id,
    })
    .from(users)
    .innerJoin(organizationMembers, eq(users.id, organizationMembers.userId))
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(
      and(
        eq(users.externalAuthId, authContext.userId),
        eq(organizations.externalAuthId, authContext.orgId),
        isNull(users.deletedAt),
        isNull(organizations.deletedAt),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new OperationalAuthError(
      "TENANT_NOT_PROVISIONED",
      "Provision this organization before running provider checks.",
      403,
    );
  }

  const clerkUser = await currentUser();

  return {
    organizationId: membership.organizationId,
    userId: membership.userId,
    externalOrganizationId: authContext.orgId,
    externalUserId: authContext.userId,
    email: clerkUser?.primaryEmailAddress?.emailAddress ?? null,
  };
}

export function operationalAuthErrorResponse(error: OperationalAuthError) {
  return Response.json(
    {
      error: {
        code: error.code,
        message: error.message,
      },
    },
    { status: error.status },
  );
}
