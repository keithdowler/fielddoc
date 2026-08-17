import {
  createFieldDocApiClient,
  FieldDocApiError,
} from "@fielddoc/api-client";
import { publicMobileEnvSchema } from "@fielddoc/config";
import type { ReportDraft } from "@fielddoc/domain";

import type { LocalRepositories } from "@/infrastructure/local-store/repositories";
import { bytesToHex } from "@/infrastructure/media/media-metadata";

import type { MobileSyncTokenProvider } from "./mobile-outbox-sync";
import {
  type UploadBinary,
  uploadBinaryWithExpoFileSystem,
} from "./mobile-media-upload";

const defaultBatchSize = 5;
const pdfMimeType = "application/pdf";

export type MobileReportUploadStatus =
  | "not_configured"
  | "auth_required"
  | "idle"
  | "success"
  | "partial"
  | "failed";

export type MobileReportUploadResult = {
  status: MobileReportUploadStatus;
  message: string;
  attemptedCount: number;
  uploadedCount: number;
  failedCount: number;
  pendingCount: number;
  failedReportDraftIds: string[];
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
};

type MobileReportApiClient = Pick<
  ReturnType<typeof createFieldDocApiClient>,
  "prepareReportPdfUpload" | "completeReportPdfUpload"
>;

export type ReportPdfMetadata = {
  sizeBytes: number;
  sha256: string;
};

export type ReportPdfMetadataProvider = (
  localUri: string,
) => Promise<ReportPdfMetadata>;

export type RunMobileReportUploadInput = {
  repositories: LocalRepositories;
  tokenProvider: MobileSyncTokenProvider;
  apiBaseUrl?: string | null;
  apiClient?: MobileReportApiClient;
  uploadBinary?: UploadBinary;
  metadataProvider?: ReportPdfMetadataProvider;
  batchSize?: number;
  now?: () => Date;
};

export async function runMobileReportUpload({
  repositories,
  tokenProvider,
  apiBaseUrl = publicMobileEnvSchema.parse(process.env)
    .EXPO_PUBLIC_FIELDDOC_API_BASE_URL,
  apiClient,
  uploadBinary = uploadBinaryWithExpoFileSystem,
  metadataProvider = getLocalPdfUploadMetadata,
  batchSize = defaultBatchSize,
  now = () => new Date(),
}: RunMobileReportUploadInput): Promise<MobileReportUploadResult> {
  if (!apiBaseUrl) {
    return createResult({
      status: "not_configured",
      message:
        "Set EXPO_PUBLIC_FIELDDOC_API_BASE_URL before uploading report PDFs.",
      pendingCount: await countPendingReportUploads(repositories),
    });
  }

  const accessToken = await tokenProvider.getAccessToken();

  if (!accessToken) {
    return createResult({
      status: "auth_required",
      message: "Cloud sign-in is required before uploading report PDFs.",
      pendingCount: await countPendingReportUploads(repositories),
    });
  }

  const pendingReports =
    await repositories.reportDrafts.listPendingPdfUpload(batchSize);

  if (pendingReports.length === 0) {
    return createResult({
      status: "idle",
      message: "No generated report PDFs are waiting for cloud upload.",
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
  const failedReportDraftIds: string[] = [];
  let lastErrorCode: string | null = null;
  let lastErrorMessage: string | null = null;

  for (const reportDraft of pendingReports) {
    try {
      await uploadReportPdf({
        reportDraft,
        repositories,
        client,
        uploadBinary,
        metadataProvider,
        uploadedAt: now().toISOString(),
      });
      uploadedCount += 1;
    } catch (error) {
      failedCount += 1;
      failedReportDraftIds.push(reportDraft.id);
      const normalizedError = normalizeUploadError(error);
      lastErrorCode = normalizedError.code;
      lastErrorMessage = normalizedError.message;
    }
  }

  const pendingCount = await countPendingReportUploads(repositories);
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
        ? "Generated report PDFs were uploaded to private storage."
        : status === "partial"
          ? appendFailureReason(
              "Some report PDFs uploaded; retry the rest later.",
              lastErrorMessage,
            )
          : appendFailureReason(
              "Generated report PDFs could not be uploaded.",
              lastErrorMessage,
            ),
    attemptedCount: pendingReports.length,
    uploadedCount,
    failedCount,
    pendingCount,
    failedReportDraftIds,
    lastErrorCode,
    lastErrorMessage,
  });
}

async function uploadReportPdf({
  reportDraft,
  repositories,
  client,
  uploadBinary,
  metadataProvider,
  uploadedAt,
}: {
  reportDraft: ReportDraft;
  repositories: LocalRepositories;
  client: MobileReportApiClient;
  uploadBinary: UploadBinary;
  metadataProvider: ReportPdfMetadataProvider;
  uploadedAt: string;
}): Promise<void> {
  if (!reportDraft.generatedPdfUri) {
    throw new Error("Report draft does not have a generated local PDF.");
  }

  const metadata = await metadataProvider(reportDraft.generatedPdfUri);
  const generatedAt =
    reportDraft.generatedAt ??
    reportDraft.updatedAt ??
    new Date().toISOString();
  const prepareResponse = await client.prepareReportPdfUpload({
    reportDraftId: reportDraft.id,
    mimeType: pdfMimeType,
    sizeBytes: metadata.sizeBytes,
    sha256: metadata.sha256,
    generatedAt,
    fileExtension: "pdf",
  });
  const uploadResponse = await uploadBinary({
    uploadUrl: prepareResponse.uploadUrl,
    localUri: reportDraft.generatedPdfUri,
    mimeType: pdfMimeType,
    requiredHeaders: prepareResponse.requiredHeaders,
  });

  if (uploadResponse.status < 200 || uploadResponse.status >= 300) {
    throw new FieldDocApiError(
      "Private report upload failed.",
      uploadResponse.status,
      "REPORT_PDF_UPLOAD_FAILED",
    );
  }

  const completeResponse = await client.completeReportPdfUpload({
    reportDraftId: reportDraft.id,
    storageObjectKey: prepareResponse.storageObjectKey,
    sha256: metadata.sha256,
    sizeBytes: metadata.sizeBytes,
    generatedAt,
    uploadedAt,
  });

  await repositories.reportDrafts.markGeneratedPdfUploaded(reportDraft.id, {
    storageObjectKey: completeResponse.storageObjectKey,
    sha256: metadata.sha256,
    sizeBytes: metadata.sizeBytes,
    uploadedAt: completeResponse.uploadedAt,
  });
}

export async function getLocalPdfUploadMetadata(
  localUri: string,
): Promise<ReportPdfMetadata> {
  const FileSystem = await import("expo-file-system/legacy");
  const fileInfo = await FileSystem.getInfoAsync(localUri);

  if (!fileInfo.exists) {
    throw new Error("Generated report PDF was not found on this device.");
  }

  const { File } = await import("expo-file-system");
  const bytes = new Uint8Array(await new File(localUri).arrayBuffer());
  const Crypto = await import("expo-crypto");
  const digest = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    bytes,
  );

  return {
    sizeBytes: fileInfo.size ?? bytes.byteLength,
    sha256: bytesToHex(new Uint8Array(digest)),
  };
}

async function countPendingReportUploads(
  repositories: LocalRepositories,
): Promise<number> {
  return (await repositories.reportDrafts.listPendingPdfUpload(1000)).length;
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
    message: "Unknown report PDF upload failure.",
  };
}

function createResult(
  input: Partial<MobileReportUploadResult> &
    Pick<MobileReportUploadResult, "status" | "message">,
): MobileReportUploadResult {
  return {
    attemptedCount: 0,
    uploadedCount: 0,
    failedCount: 0,
    pendingCount: 0,
    failedReportDraftIds: [],
    lastErrorCode: null,
    lastErrorMessage: null,
    ...input,
  };
}

function appendFailureReason(message: string, reason: string | null): string {
  return reason ? `${message} Last error: ${reason}` : message;
}
