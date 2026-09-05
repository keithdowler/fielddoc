import {
  and,
  createNeonDatabase,
  eq,
  evidenceItems,
  isNull,
  mediaAssets,
} from "@fielddoc/database";

import {
  SyncConfigurationError,
  type SyncAuthPrincipal,
  type SyncMembershipResolution,
} from "../sync/mutations/sync-service";
import { resolveNeonSyncMembership } from "../sync/mutations/neon-membership";

export type StoredMediaAsset = {
  id: string;
  evidenceItemId: string;
  mimeType: string;
  sha256: string;
  sizeBytes: number;
  storageObjectKey: string | null;
};

export type MediaUploadRepository = {
  resolveMembership(
    principal: SyncAuthPrincipal,
  ): Promise<SyncMembershipResolution>;
  evidenceBelongsToOrganization(input: {
    organizationId: string;
    evidenceItemId: string;
  }): Promise<boolean>;
  markMediaUploaded(input: {
    organizationId: string;
    mediaAssetId: string;
    storageObjectKey: string;
    uploadedAt: string;
  }): Promise<boolean>;
  getStoredMediaAsset(input: {
    organizationId: string;
    mediaAssetId: string;
  }): Promise<StoredMediaAsset | null>;
};

export function createNeonMediaUploadRepository(
  databaseUrl: string | undefined,
): MediaUploadRepository {
  if (!databaseUrl) {
    throw new SyncConfigurationError(
      "SYNC_PERSISTENCE_NOT_CONFIGURED",
      "Neon Postgres persistence is not configured.",
      503,
    );
  }

  const db = createNeonDatabase(databaseUrl);

  return {
    async resolveMembership(principal) {
      return resolveNeonSyncMembership(db, principal);
    },

    async evidenceBelongsToOrganization(input) {
      const rows = await db
        .select({ id: evidenceItems.id })
        .from(evidenceItems)
        .where(
          and(
            eq(evidenceItems.id, input.evidenceItemId),
            eq(evidenceItems.organizationId, input.organizationId),
            isNull(evidenceItems.deletedAt),
          ),
        )
        .limit(1);

      return rows.length > 0;
    },

    async markMediaUploaded(input) {
      const rows = await db
        .update(mediaAssets)
        .set({
          storageObjectKey: input.storageObjectKey,
          uploadedAt: new Date(input.uploadedAt),
          updatedAt: new Date(input.uploadedAt),
        })
        .where(
          and(
            eq(mediaAssets.id, input.mediaAssetId),
            eq(mediaAssets.organizationId, input.organizationId),
            isNull(mediaAssets.deletedAt),
          ),
        )
        .returning({ id: mediaAssets.id });

      return rows.length > 0;
    },

    async getStoredMediaAsset(input) {
      const rows = await db
        .select({
          id: mediaAssets.id,
          evidenceItemId: mediaAssets.evidenceItemId,
          mimeType: mediaAssets.mimeType,
          sha256: mediaAssets.sha256,
          sizeBytes: mediaAssets.sizeBytes,
          storageObjectKey: mediaAssets.storageObjectKey,
        })
        .from(mediaAssets)
        .where(
          and(
            eq(mediaAssets.id, input.mediaAssetId),
            eq(mediaAssets.organizationId, input.organizationId),
            isNull(mediaAssets.deletedAt),
          ),
        )
        .limit(1);

      return rows[0] ?? null;
    },
  };
}
