import {
  createNeonDatabase,
  eq,
  receivedLocalMutations,
} from "@fielddoc/database";

import {
  SyncConfigurationError,
  type RecordReceivedMutationInput,
  type RecordReceivedMutationResult,
  type SyncAuthPrincipal,
  type SyncMembershipResolution,
  type SyncMutationPersistence,
} from "./sync-service";
import { createNeonCanonicalMutationRepository } from "./neon-canonical-repository";
import { resolveNeonSyncMembership } from "./neon-membership";
import { applyCanonicalMutation } from "./sync-application";

export function createNeonSyncMutationPersistence(
  databaseUrl: string | undefined,
): SyncMutationPersistence {
  if (!databaseUrl) {
    throw new SyncConfigurationError(
      "SYNC_PERSISTENCE_NOT_CONFIGURED",
      "Neon Postgres persistence is not configured.",
      503,
    );
  }

  const db = createNeonDatabase(databaseUrl);
  const canonicalRepository = createNeonCanonicalMutationRepository(db);

  return {
    async resolveMembership(
      principal: SyncAuthPrincipal,
    ): Promise<SyncMembershipResolution> {
      return resolveNeonSyncMembership(db, principal);
    },

    async recordReceivedMutation(
      input: RecordReceivedMutationInput,
    ): Promise<RecordReceivedMutationResult> {
      const inserted = await db
        .insert(receivedLocalMutations)
        .values({
          mutationId: input.mutation.mutationId,
          organizationId: input.membership.organizationId,
          userId: input.membership.userId,
          deviceId: input.deviceId,
          entityType: input.mutation.entityType,
          entityId: input.mutation.entityId,
          operation: input.mutation.operation,
          payloadRef: input.mutation.payloadRef,
          payloadJson: input.mutation.payloadJson,
          clientCreatedAt: new Date(input.mutation.createdAt),
          status: "accepted",
        })
        .onConflictDoNothing()
        .returning({ mutationId: receivedLocalMutations.mutationId });

      return inserted.length === 0
        ? { status: "duplicate" }
        : applyCanonicalMutation(input, canonicalRepository).then(
            async (result) => {
              if (result.status === "applied") {
                return { status: "accepted" };
              }

              await markReceiptRejected(input.mutation.mutationId, result.code);

              return result;
            },
            async () => {
              await markReceiptRejected(
                input.mutation.mutationId,
                "CANONICAL_APPLICATION_FAILED",
              );

              return {
                status: "rejected",
                code: "CANONICAL_APPLICATION_FAILED",
                message:
                  "Mutation receipt was stored, but canonical sync application failed.",
              };
            },
          );
    },
  };

  async function markReceiptRejected(
    mutationId: string,
    rejectionCode: string,
  ): Promise<void> {
    await db
      .update(receivedLocalMutations)
      .set({
        status: "rejected",
        rejectionCode,
      })
      .where(eq(receivedLocalMutations.mutationId, mutationId));
  }
}
