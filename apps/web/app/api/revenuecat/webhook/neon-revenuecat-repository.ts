import { randomUUID } from "node:crypto";

import {
  and,
  createNeonDatabase,
  eq,
  isNull,
  organizationMembers,
  revenueCatWebhookEvents,
  subscriptionEntitlements,
  users,
} from "@fielddoc/database";

import {
  SyncConfigurationError,
  type SyncMembership,
} from "../../sync/mutations/sync-service";
import type { RevenueCatWebhookRepository } from "./revenuecat-webhook-service";

export function createNeonRevenueCatWebhookRepository(
  databaseUrl: string | undefined,
  idFactory: () => string = randomUUID,
): RevenueCatWebhookRepository {
  if (!databaseUrl) {
    throw new SyncConfigurationError(
      "SYNC_PERSISTENCE_NOT_CONFIGURED",
      "Neon Postgres persistence is not configured.",
      503,
    );
  }

  const db = createNeonDatabase(databaseUrl);

  return {
    async recordWebhookEvent(input) {
      const rows = await db
        .insert(revenueCatWebhookEvents)
        .values({
          id: idFactory(),
          providerEventId: input.eventId,
          eventType: input.eventType,
          appUserId: input.appUserId,
          productId: input.productId,
          entitlementIdsJson: input.entitlementIds,
          payloadJson: input.payload,
          receivedAt: input.receivedAt,
        })
        .onConflictDoNothing()
        .returning({ id: revenueCatWebhookEvents.id });

      return rows.length === 0 ? "duplicate" : "recorded";
    },

    async resolveUserMembership(appUserId) {
      const rows = await db
        .select({
          organizationId: organizationMembers.organizationId,
          userId: users.id,
          role: organizationMembers.role,
        })
        .from(users)
        .innerJoin(
          organizationMembers,
          eq(users.id, organizationMembers.userId),
        )
        .where(
          and(eq(users.externalAuthId, appUserId), isNull(users.deletedAt)),
        )
        .limit(1);

      return toMembership(rows[0]);
    },

    async upsertEntitlement(input) {
      await db
        .insert(subscriptionEntitlements)
        .values({
          id: idFactory(),
          organizationId: input.organizationId,
          userId: input.userId,
          provider: "revenuecat",
          providerCustomerId: input.providerCustomerId,
          entitlementId: input.entitlementId,
          status: input.status,
          productId: input.productId,
          store: input.store,
          environment: input.environment,
          originalTransactionId: input.originalTransactionId,
          purchasedAt: input.purchasedAt,
          expiresAt: input.expiresAt,
          revokedAt: input.revokedAt,
          lastEventAt: input.lastEventAt,
          payloadJson: input.payload,
          updatedAt: input.lastEventAt,
        })
        .onConflictDoUpdate({
          target: [
            subscriptionEntitlements.provider,
            subscriptionEntitlements.providerCustomerId,
            subscriptionEntitlements.entitlementId,
          ],
          set: {
            organizationId: input.organizationId,
            userId: input.userId,
            status: input.status,
            productId: input.productId,
            store: input.store,
            environment: input.environment,
            originalTransactionId: input.originalTransactionId,
            purchasedAt: input.purchasedAt,
            expiresAt: input.expiresAt,
            revokedAt: input.revokedAt,
            lastEventAt: input.lastEventAt,
            payloadJson: input.payload,
            updatedAt: input.lastEventAt,
            deletedAt: null,
          },
        });
    },
  };
}

function toMembership(
  row: SyncMembership | undefined,
): { organizationId: string; userId: string } | null {
  if (!row) return null;

  return {
    organizationId: row.organizationId,
    userId: row.userId,
  };
}
