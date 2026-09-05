import {
  and,
  createNeonDatabase,
  eq,
  isNull,
  organizations,
  organizationMembers,
  users,
} from "@fielddoc/database";

import type {
  SyncAuthPrincipal,
  SyncMembershipResolution,
} from "./sync-service";

type NeonDatabase = ReturnType<typeof createNeonDatabase>;

export async function resolveNeonSyncMembership(
  db: NeonDatabase,
  principal: SyncAuthPrincipal,
): Promise<SyncMembershipResolution> {
  if (principal.organizationId) {
    const rows = await selectMembershipRows(db)
      .where(
        and(
          eq(users.externalAuthId, principal.externalAuthId),
          eq(organizations.externalAuthId, principal.organizationId),
          isNull(organizations.deletedAt),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  const rows = await selectMembershipRows(db)
    .where(
      and(
        eq(users.externalAuthId, principal.externalAuthId),
        isNull(organizations.deletedAt),
        isNull(users.deletedAt),
      ),
    )
    .limit(2);

  if (rows.length === 1) return rows[0];
  if (rows.length > 1) return { status: "workspace_choice_required" };

  return { status: "workspace_not_found" };
}

function selectMembershipRows(db: NeonDatabase) {
  return db
    .select({
      organizationId: organizationMembers.organizationId,
      role: organizationMembers.role,
      userId: users.id,
    })
    .from(users)
    .innerJoin(organizationMembers, eq(users.id, organizationMembers.userId))
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id),
    );
}
