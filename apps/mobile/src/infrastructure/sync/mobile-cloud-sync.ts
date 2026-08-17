import type { FieldDocApiClient } from "@fielddoc/api-client";
import { publicMobileEnvSchema } from "@fielddoc/config";

import type { LocalRepositories } from "@/infrastructure/local-store/repositories";

import {
  runMobileMediaUpload,
  type MobileMediaUploadResult,
  type UploadBinary,
} from "./mobile-media-upload";
import {
  runMobileOutboxSync,
  type MobileSyncResult,
  type MobileSyncTokenProvider,
} from "./mobile-outbox-sync";

export type MobileCloudSyncStatus =
  | "not_configured"
  | "auth_required"
  | "idle"
  | "success"
  | "partial"
  | "failed";

export type MobileCloudSyncResult = {
  status: MobileCloudSyncStatus;
  message: string;
  metadata: MobileSyncResult;
  media: MobileMediaUploadResult | null;
};

type MobileCloudSyncApiClient = Pick<
  FieldDocApiClient,
  "uploadLocalMutations" | "prepareMediaUpload" | "completeMediaUpload"
>;

export type RunMobileCloudSyncInput = {
  repositories: LocalRepositories;
  tokenProvider: MobileSyncTokenProvider;
  apiBaseUrl?: string | null;
  apiClient?: MobileCloudSyncApiClient;
  uploadBinary?: UploadBinary;
  now?: () => Date;
};

export async function runMobileCloudSync({
  repositories,
  tokenProvider,
  apiBaseUrl = publicMobileEnvSchema.parse(process.env)
    .EXPO_PUBLIC_FIELDDOC_API_BASE_URL,
  apiClient,
  uploadBinary,
  now,
}: RunMobileCloudSyncInput): Promise<MobileCloudSyncResult> {
  const metadata = await runMobileOutboxSync({
    repositories,
    tokenProvider,
    apiBaseUrl,
    apiClient,
    now,
  });

  if (!canUploadMediaAfterMetadata(metadata.status)) {
    return {
      status: metadata.status,
      message: metadata.message,
      metadata,
      media: null,
    };
  }

  const media = await runMobileMediaUpload({
    repositories,
    tokenProvider,
    apiBaseUrl,
    apiClient,
    uploadBinary,
    now,
  });

  return {
    status: combineCloudSyncStatus(metadata, media),
    message: createCloudSyncMessage(metadata, media),
    metadata,
    media,
  };
}

function canUploadMediaAfterMetadata(status: MobileSyncResult["status"]) {
  return status === "success" || status === "idle";
}

function combineCloudSyncStatus(
  metadata: MobileSyncResult,
  media: MobileMediaUploadResult,
): MobileCloudSyncStatus {
  if (media.status === "not_configured" || media.status === "auth_required") {
    return media.status;
  }

  if (media.status === "failed") {
    return "failed";
  }

  if (media.status === "partial" || metadata.status === "partial") {
    return "partial";
  }

  if (metadata.status === "idle" && media.status === "idle") {
    return "idle";
  }

  return "success";
}

function createCloudSyncMessage(
  metadata: MobileSyncResult,
  media: MobileMediaUploadResult,
): string {
  if (metadata.status === "idle" && media.status === "idle") {
    return "No metadata or original media is waiting for cloud upload.";
  }

  if (media.status === "success") {
    return "Metadata and original media are uploaded.";
  }

  if (media.status === "idle") {
    return "Metadata is current; no original media is waiting for upload.";
  }

  return media.message;
}
