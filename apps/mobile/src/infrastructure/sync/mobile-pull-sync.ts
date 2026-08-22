import {
  createFieldDocApiClient,
  FieldDocApiError,
  type FieldDocApiClient,
} from "@fielddoc/api-client";
import { getPublicMobileEnv } from "@/infrastructure/config/public-mobile-env";

import type { LocalRepositories } from "@/infrastructure/local-store/repositories";

import type { MobileSyncTokenProvider } from "./mobile-outbox-sync";

const mobileClientId = "fielddoc-mobile";
const defaultPullLimit = 250;

export type MobilePullSyncStatus =
  | "not_configured"
  | "auth_required"
  | "idle"
  | "success"
  | "partial"
  | "failed";

export type MobilePullSyncResult = {
  status: MobilePullSyncStatus;
  message: string;
  pulledCount: number;
  appliedCount: number;
  conflictCount: number;
  unresolvedConflictCount: number;
  cursor: string | null;
  lastPulledAt: string | null;
  serverTime: string | null;
  hasMore: boolean;
};

type MobilePullApiClient = Pick<FieldDocApiClient, "pullSyncChanges">;

export type RunMobilePullSyncInput = {
  repositories: LocalRepositories;
  tokenProvider: MobileSyncTokenProvider;
  apiBaseUrl?: string | null;
  apiClient?: MobilePullApiClient;
  now?: () => Date;
};

export async function runMobilePullSync({
  repositories,
  tokenProvider,
  apiBaseUrl = getPublicMobileEnv().EXPO_PUBLIC_FIELDDOC_API_BASE_URL,
  apiClient,
  now = () => new Date(),
}: RunMobilePullSyncInput): Promise<MobilePullSyncResult> {
  if (!apiBaseUrl) {
    return createResult({
      status: "not_configured",
      message: "Cloud saving is unavailable in this version.",
      unresolvedConflictCount:
        await repositories.pullSync.countUnresolvedConflicts(),
    });
  }

  const accessToken = await tokenProvider.getAccessToken();

  if (!accessToken) {
    return createResult({
      status: "auth_required",
      message: "Sign in to keep your work current across devices.",
      unresolvedConflictCount:
        await repositories.pullSync.countUnresolvedConflicts(),
    });
  }

  try {
    const client =
      apiClient ??
      createFieldDocApiClient({
        baseUrl: apiBaseUrl,
        accessToken,
      });
    const response = await client.pullSyncChanges({
      clientId: mobileClientId,
      deviceId: await repositories.syncClientState.getOrCreateDeviceId(),
      cursor: await repositories.syncClientState.getPullCursor(),
      limit: defaultPullLimit,
    });
    const applied = await repositories.pullSync.applyChanges(response.changes);
    const pulledAt = now().toISOString();
    const unresolvedConflictCount =
      await repositories.pullSync.countUnresolvedConflicts();

    await repositories.syncClientState.recordPullResult({
      cursor: response.cursor,
      pulledAt,
      pulledCount: applied.pulledCount,
      appliedCount: applied.appliedCount,
      conflictCount: applied.conflictCount,
    });

    if (applied.pulledCount === 0) {
      return createResult({
        status: "idle",
        message: "Everything is up to date.",
        cursor: response.cursor,
        lastPulledAt: pulledAt,
        serverTime: response.serverTime,
        hasMore: response.hasMore,
        unresolvedConflictCount,
      });
    }

    return createResult({
      status: applied.conflictCount > 0 ? "partial" : "success",
      message:
        applied.conflictCount > 0
          ? "Your work is current, but some edits need review."
          : "Your work is up to date on this device.",
      pulledCount: applied.pulledCount,
      appliedCount: applied.appliedCount,
      conflictCount: applied.conflictCount,
      unresolvedConflictCount,
      cursor: response.cursor,
      lastPulledAt: pulledAt,
      serverTime: response.serverTime,
      hasMore: response.hasMore,
    });
  } catch (error) {
    return createResult({
      status: "failed",
      message:
        error instanceof FieldDocApiError
          ? error.message
          : "FieldDoc could not check for newer changes.",
      unresolvedConflictCount:
        await repositories.pullSync.countUnresolvedConflicts(),
    });
  }
}

function createResult(
  input: Partial<MobilePullSyncResult>,
): MobilePullSyncResult {
  return {
    status: input.status ?? "idle",
    message: input.message ?? "",
    pulledCount: input.pulledCount ?? 0,
    appliedCount: input.appliedCount ?? 0,
    conflictCount: input.conflictCount ?? 0,
    unresolvedConflictCount: input.unresolvedConflictCount ?? 0,
    cursor: input.cursor ?? null,
    lastPulledAt: input.lastPulledAt ?? null,
    serverTime: input.serverTime ?? null,
    hasMore: input.hasMore ?? false,
  };
}
