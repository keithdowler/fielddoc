import {
  mediaDownloadPrepareRequestSchema,
  mediaDownloadPrepareResponseSchema,
  mediaUploadCompleteRequestSchema,
  mediaUploadCompleteResponseSchema,
  mediaUploadPrepareRequestSchema,
  mediaUploadPrepareResponseSchema,
} from "@fielddoc/validation";
import { z } from "zod";

import {
  SyncConfigurationError,
  type SyncMembership,
  type SyncMutationAuthVerifier,
} from "../sync/mutations/sync-service";
import {
  createEvidenceObjectKey,
  type PrivateObjectStorage,
} from "./private-object-storage";
import type { MediaUploadRepository } from "./neon-media-repository";

type MediaApiDependencies = {
  createAuthVerifier: () => SyncMutationAuthVerifier;
  createRepository: () => MediaUploadRepository;
  createStorage: () => PrivateObjectStorage;
  now?: () => Date;
};

type AuthenticatedMediaRequest = {
  membership: SyncMembership;
  repository: MediaUploadRepository;
};

export class MediaConfigurationError extends Error {
  constructor(
    readonly code: "PRIVATE_OBJECT_STORAGE_NOT_CONFIGURED",
    message: string,
    readonly status: 503,
  ) {
    super(message);
    this.name = "MediaConfigurationError";
  }
}

const uploadUrlExpiresInSeconds = 10 * 60;
const downloadUrlExpiresInSeconds = 5 * 60;

export function createMediaUploadPrepareHandler(
  dependencies: MediaApiDependencies,
): (request: Request) => Promise<Response> {
  return async function handlePrepareMediaUpload(request) {
    const auth = await authenticateMediaRequest(request, dependencies);

    if (auth instanceof Response) return auth;

    const parsed = await parseJsonBody(
      request,
      mediaUploadPrepareRequestSchema,
      "INVALID_MEDIA_UPLOAD_PREPARE",
    );

    if (parsed instanceof Response) return parsed;

    const belongsToOrganization =
      await auth.repository.evidenceBelongsToOrganization({
        organizationId: auth.membership.organizationId,
        evidenceItemId: parsed.evidenceItemId,
      });

    if (!belongsToOrganization) {
      return errorResponse(
        "EVIDENCE_NOT_FOUND",
        "Evidence item was not found for the active organization.",
        404,
      );
    }

    const storage = createStorageOrResponse(dependencies);

    if (storage instanceof Response) return storage;

    const now = dependencies.now?.() ?? new Date();
    const expiresAt = new Date(
      now.getTime() + uploadUrlExpiresInSeconds * 1000,
    ).toISOString();
    const storageObjectKey = createEvidenceObjectKey({
      organizationId: auth.membership.organizationId,
      evidenceItemId: parsed.evidenceItemId,
      mediaAssetId: parsed.mediaAssetId,
      sha256: parsed.sha256,
      fileExtension: parsed.fileExtension,
    });
    const uploadUrl = storage.createPresignedUrl({
      method: "PUT",
      objectKey: storageObjectKey,
      expiresInSeconds: uploadUrlExpiresInSeconds,
      now,
    });

    return Response.json(
      mediaUploadPrepareResponseSchema.parse({
        mediaAssetId: parsed.mediaAssetId,
        storageObjectKey,
        uploadUrl,
        requiredHeaders: {},
        expiresAt,
      }),
    );
  };
}

export function createMediaUploadCompleteHandler(
  dependencies: MediaApiDependencies,
): (request: Request) => Promise<Response> {
  return async function handleCompleteMediaUpload(request) {
    const auth = await authenticateMediaRequest(request, dependencies);

    if (auth instanceof Response) return auth;

    const parsed = await parseJsonBody(
      request,
      mediaUploadCompleteRequestSchema,
      "INVALID_MEDIA_UPLOAD_COMPLETE",
    );

    if (parsed instanceof Response) return parsed;

    const mediaAsset = await auth.repository.getStoredMediaAsset({
      organizationId: auth.membership.organizationId,
      mediaAssetId: parsed.mediaAssetId,
    });

    if (!mediaAsset) {
      return errorResponse(
        "MEDIA_ASSET_NOT_FOUND",
        "Media asset was not found for the active organization.",
        404,
      );
    }

    if (
      mediaAsset.sha256 !== parsed.sha256 ||
      mediaAsset.sizeBytes !== parsed.sizeBytes ||
      !isExpectedEvidenceObjectKey({
        storageObjectKey: parsed.storageObjectKey,
        organizationId: auth.membership.organizationId,
        evidenceItemId: mediaAsset.evidenceItemId,
        mediaAssetId: parsed.mediaAssetId,
        sha256: parsed.sha256,
      })
    ) {
      return errorResponse(
        "INVALID_STORAGE_OBJECT_KEY",
        "Completed media upload does not match the canonical media record.",
        400,
      );
    }

    const updated = await auth.repository.markMediaUploaded({
      organizationId: auth.membership.organizationId,
      mediaAssetId: parsed.mediaAssetId,
      storageObjectKey: parsed.storageObjectKey,
      uploadedAt: parsed.uploadedAt,
    });

    if (!updated) {
      return errorResponse(
        "MEDIA_ASSET_NOT_FOUND",
        "Media asset was not found for the active organization.",
        404,
      );
    }

    return Response.json(
      mediaUploadCompleteResponseSchema.parse({
        mediaAssetId: parsed.mediaAssetId,
        storageObjectKey: parsed.storageObjectKey,
        uploadedAt: parsed.uploadedAt,
        status: "recorded",
      }),
    );
  };
}

export function createMediaDownloadPrepareHandler(
  dependencies: MediaApiDependencies,
): (request: Request) => Promise<Response> {
  return async function handlePrepareMediaDownload(request) {
    const auth = await authenticateMediaRequest(request, dependencies);

    if (auth instanceof Response) return auth;

    const parsed = await parseJsonBody(
      request,
      mediaDownloadPrepareRequestSchema,
      "INVALID_MEDIA_DOWNLOAD_PREPARE",
    );

    if (parsed instanceof Response) return parsed;

    const mediaAsset = await auth.repository.getStoredMediaAsset({
      organizationId: auth.membership.organizationId,
      mediaAssetId: parsed.mediaAssetId,
    });

    if (!mediaAsset?.storageObjectKey) {
      return errorResponse(
        "MEDIA_ASSET_NOT_UPLOADED",
        "Media asset does not have private object storage yet.",
        404,
      );
    }

    const storage = createStorageOrResponse(dependencies);

    if (storage instanceof Response) return storage;

    const now = dependencies.now?.() ?? new Date();
    const expiresAt = new Date(
      now.getTime() + downloadUrlExpiresInSeconds * 1000,
    ).toISOString();
    const downloadUrl = storage.createPresignedUrl({
      method: "GET",
      objectKey: mediaAsset.storageObjectKey,
      expiresInSeconds: downloadUrlExpiresInSeconds,
      now,
    });

    return Response.json(
      mediaDownloadPrepareResponseSchema.parse({
        mediaAssetId: parsed.mediaAssetId,
        storageObjectKey: mediaAsset.storageObjectKey,
        downloadUrl,
        expiresAt,
      }),
    );
  };
}

async function authenticateMediaRequest(
  request: Request,
  dependencies: MediaApiDependencies,
): Promise<AuthenticatedMediaRequest | Response> {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return errorResponse(
      "UNAUTHORIZED",
      "A bearer token is required before accessing media storage.",
      401,
    );
  }

  let authVerifier: SyncMutationAuthVerifier;
  let repository: MediaUploadRepository;

  try {
    authVerifier = dependencies.createAuthVerifier();
    repository = dependencies.createRepository();
  } catch (error) {
    if (error instanceof SyncConfigurationError) {
      return errorResponse(error.code, error.message, error.status);
    }

    throw error;
  }

  const authResult = await authVerifier.verify(request);

  if (!authResult.ok) {
    return errorResponse(
      authResult.code,
      authResult.message,
      authResult.status,
    );
  }

  const membership = await repository.resolveMembership(authResult.principal);

  if (!membership) {
    return errorResponse(
      "ORGANIZATION_MEMBERSHIP_REQUIRED",
      "Authenticated user is not a member of the active organization.",
      403,
    );
  }

  return { membership, repository };
}

async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  code: string,
): Promise<T | Response> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "Request body must be JSON.", 400);
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code,
          message: "Request body does not match the media API contract.",
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
      { status: 400 },
    );
  }

  return parsed.data;
}

function createStorageOrResponse(
  dependencies: MediaApiDependencies,
): PrivateObjectStorage | Response {
  try {
    return dependencies.createStorage();
  } catch (error) {
    if (error instanceof SyncConfigurationError) {
      return errorResponse(error.code, error.message, error.status);
    }

    if (error instanceof MediaConfigurationError) {
      return errorResponse(error.code, error.message, error.status);
    }

    throw error;
  }
}

function isExpectedEvidenceObjectKey(input: {
  storageObjectKey: string;
  organizationId: string;
  evidenceItemId: string;
  mediaAssetId: string;
  sha256: string;
}): boolean {
  const expectedBaseKey = createEvidenceObjectKey({
    organizationId: input.organizationId,
    evidenceItemId: input.evidenceItemId,
    mediaAssetId: input.mediaAssetId,
    sha256: input.sha256,
  });

  return (
    input.storageObjectKey === expectedBaseKey ||
    input.storageObjectKey.startsWith(`${expectedBaseKey}.`)
  );
}

function errorResponse(
  code: string,
  message: string,
  status: 400 | 401 | 403 | 404 | 501 | 503,
): Response {
  return Response.json({ error: { code, message } }, { status });
}
