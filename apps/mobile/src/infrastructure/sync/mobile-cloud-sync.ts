import type { FieldDocApiClient } from "@fielddoc/api-client";
import { publicMobileEnvSchema } from "@fielddoc/config";

import type { LocalRepositories } from "@/infrastructure/local-store/repositories";

import {
  runMobileMediaUpload,
  type MobileMediaUploadResult,
  type UploadBinary,
} from "./mobile-media-upload";
import {
  runMobileReportUpload,
  type MobileReportUploadResult,
} from "./mobile-report-upload";
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
  reports: MobileReportUploadResult | null;
};

type MobileCloudSyncApiClient = Pick<
  FieldDocApiClient,
  | "uploadLocalMutations"
  | "prepareMediaUpload"
  | "completeMediaUpload"
  | "prepareReportPdfUpload"
  | "completeReportPdfUpload"
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
      reports: null,
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
  const reports = await runMobileReportUpload({
    repositories,
    tokenProvider,
    apiBaseUrl,
    apiClient,
    uploadBinary,
    now,
  });

  return {
    status: combineCloudSyncStatus(metadata, media, reports),
    message: createCloudSyncMessage(metadata, media, reports),
    metadata,
    media,
    reports,
  };
}

function canUploadMediaAfterMetadata(status: MobileSyncResult["status"]) {
  return status === "success" || status === "idle";
}

function combineCloudSyncStatus(
  metadata: MobileSyncResult,
  media: MobileMediaUploadResult,
  reports: MobileReportUploadResult,
): MobileCloudSyncStatus {
  if (
    media.status === "not_configured" ||
    reports.status === "not_configured"
  ) {
    return "not_configured";
  }

  if (media.status === "auth_required" || reports.status === "auth_required") {
    return "auth_required";
  }

  if (media.status === "failed" || reports.status === "failed") {
    return "failed";
  }

  if (
    media.status === "partial" ||
    reports.status === "partial" ||
    metadata.status === "partial"
  ) {
    return "partial";
  }

  if (
    metadata.status === "idle" &&
    media.status === "idle" &&
    reports.status === "idle"
  ) {
    return "idle";
  }

  return "success";
}

function createCloudSyncMessage(
  metadata: MobileSyncResult,
  media: MobileMediaUploadResult,
  reports: MobileReportUploadResult,
): string {
  if (
    metadata.status === "idle" &&
    media.status === "idle" &&
    reports.status === "idle"
  ) {
    return "Everything is saved.";
  }

  if (media.status === "success" && reports.status === "success") {
    return "Your latest changes and files are saved.";
  }

  if (media.status === "success" && reports.status === "idle") {
    return "Your latest changes and photos are saved.";
  }

  if (media.status === "idle" && reports.status === "success") {
    return "Your latest changes and reports are saved.";
  }

  if (media.status === "idle" && reports.status === "idle") {
    return "Everything is saved.";
  }

  return media.status === "success" || media.status === "idle"
    ? reports.message
    : media.message;
}
