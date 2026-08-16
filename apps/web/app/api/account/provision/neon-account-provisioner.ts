import { randomUUID } from "node:crypto";
import {
  createNeonDatabase,
  eq,
  organizations,
  organizationMembers,
  users,
} from "@fielddoc/database";

import type {
  AccountProvisioner,
  AccountProvisioningInput,
  AccountProvisioningResult,
} from "./account-provisioning";

export function createNeonAccountProvisioner(
  databaseUrl: string,
): AccountProvisioner {
  const db = createNeonDatabase(databaseUrl);

  return {
    async ensureAccount(
      input: AccountProvisioningInput,
    ): Promise<AccountProvisioningResult> {
      const [organization] = await db
        .insert(organizations)
        .values({
          id: randomUUID(),
          externalAuthId: input.clerkOrganizationId,
          name: input.organizationName,
        })
        .onConflictDoUpdate({
          target: organizations.externalAuthId,
          set: {
            name: input.organizationName,
            updatedAt: new Date(),
          },
        })
        .returning({ id: organizations.id });

      const [user] = await db
        .insert(users)
        .values({
          id: randomUUID(),
          externalAuthId: input.clerkUserId,
          email: input.email,
        })
        .onConflictDoUpdate({
          target: users.externalAuthId,
          set: {
            email: input.email,
            updatedAt: new Date(),
          },
        })
        .returning({ id: users.id });

      if (!organization || !user) {
        throw new Error("Account provisioning did not return persisted IDs.");
      }

      await db
        .insert(organizationMembers)
        .values({
          organizationId: organization.id,
          userId: user.id,
          role: input.role,
        })
        .onConflictDoUpdate({
          target: [
            organizationMembers.organizationId,
            organizationMembers.userId,
          ],
          set: {
            role: input.role,
          },
        });

      const [membership] = await db
        .select({
          organizationId: organizationMembers.organizationId,
          userId: organizationMembers.userId,
          role: organizationMembers.role,
        })
        .from(organizationMembers)
        .where(eq(organizationMembers.userId, user.id))
        .limit(1);

      if (!membership) {
        throw new Error("Account membership was not persisted.");
      }

      return membership;
    },
  };
}
