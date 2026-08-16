import {
  createFieldDocApiClient,
  FieldDocApiError,
  type FieldDocApiClient,
} from "@fielddoc/api-client";
import type { LocalMutation } from "@fielddoc/domain";
import type { SyncMutationUploadResponse } from "@fielddoc/validation";
import { publicMobileEnvSchema } from "@fielddoc/config";

import type { LocalRepositories } from "@/infrastructure/local-store/repositories";

const mobileClientId = "fielddoc-mobile";
const defaultBatchSize = 100;

export type MobileSyncStatus =
  | "not_configured"
  | "auth_required"
  | "idle"
  | "success"
  | "partial"
  | "failed";

export type MobileSyncResult = {
  status: MobileSyncStatus;
  message: string;
  attemptedCount: number;
  acceptedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  pendingCount: number;
  serverTime: string | null;
};

export type MobileSyncTokenProvider = {
  getAccessToken(): Promise<string | null>;
};

export type RunMobileOutboxSyncInput = {
  repositories: LocalRepositories;
  tokenProvider: MobileSyncTokenProvider;
  apiBaseUrl?: string | null;
  apiClient?: FieldDocApiClient;
  now?: () => Date;
};

export async function runMobileOutboxSync({
  repositories,
  tokenProvider,
  apiBaseUrl = publicMobileEnvSchema.parse(process.env)
    .EXPO_PUBLIC_FIELDDOC_API_BASE_URL,
  apiClient,
  now = () => new Date(),
}: RunMobileOutboxSyncInput): Promise<MobileSyncResult> {
  if (!apiBaseUrl) {
    return createResult({
      status: "not_configured",
      message: "Set EXPO_PUBLIC_FIELDDOC_API_BASE_URL before syncing.",
      pendingCount: await repositories.mutations.countPending(),
    });
  }

  const accessToken = await tokenProvider.getAccessToken();

  if (!accessToken) {
    return createResult({
      status: "auth_required",
      message: "Cloud sign-in is required before uploading local changes.",
      pendingCount: await repositories.mutations.countPending(),
    });
  }

  const mutations =
    await repositories.mutations.listUploadable(defaultBatchSize);

  if (mutations.length === 0) {
    return createResult({
      status: "idle",
      message: "No uploadable local changes are waiting.",
      pendingCount: await repositories.mutations.countPending(),
    });
  }

  try {
    const client =
      apiClient ??
      createFieldDocApiClient({
        baseUrl: apiBaseUrl,
        accessToken,
      });
    const response = await client.uploadLocalMutations({
      clientId: mobileClientId,
      deviceId: await repositories.syncClientState.getOrCreateDeviceId(),
      sentAt: now().toISOString(),
      mutations: mutations.map(toUploadEnvelope),
    });

    await reconcileMutationUploadResponse(repositories, response);

    const pendingCount = await repositories.mutations.countPending();
    const rejectedCount = response.rejectedMutations.length;
    const acceptedCount = response.acceptedMutationIds.length;
    const duplicateCount = response.duplicateMutationIds.length;

    return createResult({
      status: rejectedCount > 0 ? "partial" : "success",
      message:
        rejectedCount > 0
          ? "Some local changes need attention before they can sync."
          : "Local metadata changes were received by the cloud.",
      attemptedCount: mutations.length,
      acceptedCount,
      duplicateCount,
      rejectedCount,
      pendingCount,
      serverTime: response.serverTime,
    });
  } catch (error) {
    await repositories.mutations.markFailed(
      mutations.map((mutation) => mutation.mutationId),
    );

    return createResult({
      status: "failed",
      message:
        error instanceof FieldDocApiError
          ? error.message
          : "Local changes could not be uploaded.",
      attemptedCount: mutations.length,
      pendingCount: await repositories.mutations.countPending(),
    });
  }
}

export async function reconcileMutationUploadResponse(
  repositories: LocalRepositories,
  response: SyncMutationUploadResponse,
): Promise<void> {
  await repositories.mutations.markSynced([
    ...response.acceptedMutationIds,
    ...response.duplicateMutationIds,
  ]);
  await repositories.mutations.markFailed(
    response.rejectedMutations.map((mutation) => mutation.mutationId),
  );
}

function toUploadEnvelope(mutation: LocalMutation) {
  return {
    mutationId: mutation.mutationId,
    entityType: mutation.entityType,
    entityId: mutation.entityId,
    operation: mutation.operation,
    payloadRef: mutation.payloadRef,
    payloadJson: JSON.parse(mutation.payloadJson) as Record<string, unknown>,
    createdAt: mutation.createdAt,
    attemptCount: mutation.attemptCount,
    syncState: mutation.syncState,
  };
}

function createResult(input: Partial<MobileSyncResult>): MobileSyncResult {
  return {
    status: input.status ?? "idle",
    message: input.message ?? "",
    attemptedCount: input.attemptedCount ?? 0,
    acceptedCount: input.acceptedCount ?? 0,
    duplicateCount: input.duplicateCount ?? 0,
    rejectedCount: input.rejectedCount ?? 0,
    pendingCount: input.pendingCount ?? 0,
    serverTime: input.serverTime ?? null,
  };
}
