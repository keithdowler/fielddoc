import {
  createFieldDocApiClient,
  FieldDocApiError,
} from "@fielddoc/api-client";
import { publicMobileEnvSchema } from "@fielddoc/config";
import type { MediaAsset } from "@fielddoc/domain";

import type { LocalRepositories } from "@/infrastructure/local-store/repositories";
import { extensionFromSource } from "@/infrastructure/media/media-metadata";

import type { MobileSyncTokenProvider } from "./mobile-outbox-sync";

const defaultBatchSize = 10;

export type MobileMediaUploadStatus =
  | "not_configured"
  | "auth_required"
  | "idle"
  | "success"
  | "partial"
  | "failed";

export type MobileMediaUploadResult = {
  status: MobileMediaUploadStatus;
  message: string;
  attemptedCount: number;
  uploadedCount: number;
  failedCount: number;
  pendingCount: number;
  failedMediaAssetIds: string[];
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
};

type MobileMediaApiClient = Pick<
  ReturnType<typeof createFieldDocApiClient>,
  "prepareMediaUpload" | "completeMediaUpload"
>;

export type UploadBinaryInput = {
  uploadUrl: string;
  localUri: string;
  mimeType: string;
  requiredHeaders: Record<string, string>;
};

export type UploadBinaryResult = {
  status: number;
};

export type UploadBinary = (
  input: UploadBinaryInput,
) => Promise<UploadBinaryResult>;

export type RunMobileMediaUploadInput = {
  repositories: LocalRepositories;
  tokenProvider: MobileSyncTokenProvider;
  apiBaseUrl?: string | null;
  apiClient?: MobileMediaApiClient;
  uploadBinary?: UploadBinary;
  batchSize?: number;
  now?: () => Date;
};

export async function runMobileMediaUpload({
  repositories,
  tokenProvider,
  apiBaseUrl = publicMobileEnvSchema.parse(process.env)
    .EXPO_PUBLIC_FIELDDOC_API_BASE_URL,
  apiClient,
  uploadBinary = uploadBinaryWithExpoFileSystem,
  batchSize = defaultBatchSize,
  now = () => new Date(),
}: RunMobileMediaUploadInput): Promise<MobileMediaUploadResult> {
  if (!apiBaseUrl) {
    return createResult({
      status: "not_configured",
      message: "Set EXPO_PUBLIC_FIELDDOC_API_BASE_URL before uploading media.",
      pendingCount: await countPendingMediaUploads(repositories),
    });
  }

  const accessToken = await tokenProvider.getAccessToken();

  if (!accessToken) {
    return createResult({
      status: "auth_required",
      message: "Cloud sign-in is required before uploading original media.",
      pendingCount: await countPendingMediaUploads(repositories),
    });
  }

  const pendingMedia = await repositories.media.listPendingUpload(batchSize);

  if (pendingMedia.length === 0) {
    return createResult({
      status: "idle",
      message: "No original media files are waiting for cloud upload.",
      pendingCount: 0,
    });
  }

  const client =
    apiClient ??
    createFieldDocApiClient({
      baseUrl: apiBaseUrl,
      accessToken,
    });
  let uploadedCount = 0;
  let failedCount = 0;
  const failedMediaAssetIds: string[] = [];
  let lastErrorCode: string | null = null;
  let lastErrorMessage: string | null = null;

  for (const media of pendingMedia) {
    try {
      await uploadMediaAsset({
        media,
        repositories,
        client,
        uploadBinary,
        uploadedAt: now().toISOString(),
      });
      uploadedCount += 1;
    } catch (error) {
      failedCount += 1;
      failedMediaAssetIds.push(media.id);
      const normalizedError = normalizeUploadError(error);
      lastErrorCode = normalizedError.code;
      lastErrorMessage = normalizedError.message;
    }
  }

  const pendingCount = await countPendingMediaUploads(repositories);
  const status =
    uploadedCount === 0
      ? "failed"
      : failedCount > 0 || pendingCount > 0
        ? "partial"
        : "success";

  return createResult({
    status,
    message:
      status === "success"
        ? "Original media files were uploaded to private storage."
        : status === "partial"
          ? appendFailureReason(
              "Some original media files uploaded; retry the rest later.",
              lastErrorMessage,
            )
          : appendFailureReason(
              "Original media files could not be uploaded.",
              lastErrorMessage,
            ),
    attemptedCount: pendingMedia.length,
    uploadedCount,
    failedCount,
    pendingCount,
    failedMediaAssetIds,
    lastErrorCode,
    lastErrorMessage,
  });
}

async function uploadMediaAsset({
  media,
  repositories,
  client,
  uploadBinary,
  uploadedAt,
}: {
  media: MediaAsset;
  repositories: LocalRepositories;
  client: MobileMediaApiClient;
  uploadBinary: UploadBinary;
  uploadedAt: string;
}): Promise<void> {
  const prepareResponse = await client.prepareMediaUpload({
    mediaAssetId: media.id,
    evidenceItemId: media.evidenceItemId,
    mimeType: media.mimeType,
    sizeBytes: media.sizeBytes,
    sha256: media.sha256,
    fileExtension: extensionFromSource(media.localUri, media.mimeType),
  });
  const uploadResponse = await uploadBinary({
    uploadUrl: prepareResponse.uploadUrl,
    localUri: media.localUri,
    mimeType: media.mimeType,
    requiredHeaders: prepareResponse.requiredHeaders,
  });

  if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
    throw new FieldDocApiError(
      "Private media upload failed.",
      uploadResponse.status,
      "MEDIA_UPLOAD_FAILED",
    );
  }

  const completeResponse = await client.completeMediaUpload({
    mediaAssetId: media.id,
    storageObjectKey: prepareResponse.storageObjectKey,
    sha256: media.sha256,
    sizeBytes: media.sizeBytes,
    uploadedAt,
  });

  await repositories.media.markUploaded(media.id, {
    storageObjectKey: completeResponse.storageObjectKey,
    uploadedAt: completeResponse.uploadedAt,
  });
}

async function uploadBinaryWithExpoFileSystem({
  uploadUrl,
  localUri,
  mimeType,
  requiredHeaders,
}: UploadBinaryInput): Promise<UploadBinaryResult> {
  const FileSystem = await import("expo-file-system/legacy");
  const response = await FileSystem.uploadAsync(uploadUrl, localUri, {
    httpMethod: "PUT",
    headers: requiredHeaders,
    mimeType,
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  });

  return { status: response.status };
}

async function countPendingMediaUploads(
  repositories: LocalRepositories,
): Promise<number> {
  return (await repositories.media.listPendingUpload(1000)).length;
}

function normalizeUploadError(error: unknown): {
  code: string | null;
  message: string;
} {
  if (error instanceof FieldDocApiError) {
    return {
      code: error.code ?? null,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      code: null,
      message: error.message,
    };
  }

  return {
    code: null,
    message: "Unknown media upload failure.",
  };
}

function appendFailureReason(message: string, reason: string | null): string {
  return reason ? `${message} Last error: ${reason}` : message;
}

function createResult(
  input: Partial<MobileMediaUploadResult>,
): MobileMediaUploadResult {
  return {
    status: input.status ?? "idle",
    message: input.message ?? "",
    attemptedCount: input.attemptedCount ?? 0,
    uploadedCount: input.uploadedCount ?? 0,
    failedCount: input.failedCount ?? 0,
    pendingCount: input.pendingCount ?? 0,
    failedMediaAssetIds: input.failedMediaAssetIds ?? [],
    lastErrorCode: input.lastErrorCode ?? null,
    lastErrorMessage: input.lastErrorMessage ?? null,
  };
}
