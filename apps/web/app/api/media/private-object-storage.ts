import { Buffer } from "node:buffer";
import { createHmac, createHash } from "node:crypto";

export type PrivateObjectStorageConfig = {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export type PresignedObjectUrlInput = {
  method: "DELETE" | "GET" | "HEAD" | "PUT";
  objectKey: string;
  expiresInSeconds: number;
  signedHeaders?: Record<string, string>;
  now?: Date;
};

export type StoredObjectVerificationInput = {
  objectKey: string;
  expectedSizeBytes: number;
  expectedSha256: string;
  expectedContentType: string;
  now?: Date;
};

export type StoredObjectVerificationResult =
  | {
      ok: true;
      sizeBytes: number;
      contentType: string;
      sha256: string;
      metadataSha256: string | null;
    }
  | {
      ok: false;
      code:
        | "MEDIA_OBJECT_NOT_FOUND"
        | "MEDIA_OBJECT_SIZE_MISMATCH"
        | "MEDIA_OBJECT_TYPE_MISMATCH"
        | "MEDIA_OBJECT_HASH_MISMATCH"
        | "MEDIA_OBJECT_VERIFICATION_FAILED";
      message: string;
    };

export type PrivateObjectStorage = {
  createPresignedUrl(input: PresignedObjectUrlInput): string;
  deleteObject(objectKey: string): Promise<void>;
  verifyObject(
    input: StoredObjectVerificationInput,
  ): Promise<StoredObjectVerificationResult>;
};

export function createR2PrivateObjectStorage(
  config: PrivateObjectStorageConfig,
): PrivateObjectStorage {
  return {
    createPresignedUrl(input) {
      return createR2PresignedUrl(config, input);
    },
    async deleteObject(objectKey) {
      const url = createR2PresignedUrl(config, {
        method: "DELETE",
        objectKey,
        expiresInSeconds: 60,
      });
      const response = await fetch(url, { method: "DELETE" });

      if (!response.ok && response.status !== 404) {
        throw new Error("A private FieldDoc file could not be deleted.");
      }
    },
    async verifyObject(input) {
      return verifyR2Object(config, input);
    },
  };
}

export function createEvidenceObjectKey(input: {
  organizationId: string;
  evidenceItemId: string;
  mediaAssetId: string;
  sha256: string;
  fileExtension?: string;
}): string {
  const extension = input.fileExtension ? `.${input.fileExtension}` : "";

  return [
    "organizations",
    input.organizationId,
    "evidence",
    input.evidenceItemId,
    "originals",
    `${input.mediaAssetId}-${input.sha256}${extension}`,
  ].join("/");
}

export function createReportPdfObjectKey(input: {
  organizationId: string;
  reportDraftId: string;
  sha256: string;
  fileExtension?: "pdf";
}): string {
  const extension = input.fileExtension ? `.${input.fileExtension}` : ".pdf";

  return [
    "organizations",
    input.organizationId,
    "reports",
    input.reportDraftId,
    "exports",
    `${input.sha256}${extension}`,
  ].join("/");
}

function createR2PresignedUrl(
  config: PrivateObjectStorageConfig,
  input: PresignedObjectUrlInput,
): string {
  const now = input.now ?? new Date();
  const amzDate = toAmzDate(now);
  const dateStamp = amzDate.slice(0, 8);
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const credential = `${config.accessKeyId}/${credentialScope}`;
  const canonicalUri = `/${encodePathSegment(
    config.bucketName,
  )}/${input.objectKey.split("/").map(encodePathSegment).join("/")}`;
  const queryParams: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": credential,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(input.expiresInSeconds),
    "X-Amz-SignedHeaders": createSignedHeaderNames(input.signedHeaders),
  };
  const canonicalQuery = toCanonicalQuery(queryParams);
  const canonicalHeaders = createCanonicalHeaders(host, input.signedHeaders);
  const canonicalRequest = [
    input.method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    createSignedHeaderNames(input.signedHeaders),
    "UNSIGNED-PAYLOAD",
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const signingKey = getSignatureKey(
    config.secretAccessKey,
    dateStamp,
    "auto",
    "s3",
  );
  const signature = hmacHex(signingKey, stringToSign);

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

async function verifyR2Object(
  config: PrivateObjectStorageConfig,
  input: StoredObjectVerificationInput,
): Promise<StoredObjectVerificationResult> {
  const headUrl = createR2PresignedUrl(config, {
    method: "HEAD",
    objectKey: input.objectKey,
    expiresInSeconds: 60,
    now: input.now,
  });
  const headResponse = await fetch(headUrl, { method: "HEAD" }).catch(
    () => null,
  );

  if (!headResponse) {
    return {
      ok: false,
      code: "MEDIA_OBJECT_VERIFICATION_FAILED",
      message: "Private object storage could not be reached.",
    };
  }

  if (headResponse.status === 404) {
    return {
      ok: false,
      code: "MEDIA_OBJECT_NOT_FOUND",
      message: "Uploaded original was not found in private object storage.",
    };
  }

  if (!headResponse.ok) {
    return {
      ok: false,
      code: "MEDIA_OBJECT_VERIFICATION_FAILED",
      message: "Private object storage did not return object metadata.",
    };
  }

  const sizeBytes = Number(headResponse.headers.get("content-length"));
  const contentType = headResponse.headers.get("content-type") ?? "";
  const metadataSha256 = headResponse.headers.get("x-amz-meta-sha256");

  if (sizeBytes !== input.expectedSizeBytes) {
    return {
      ok: false,
      code: "MEDIA_OBJECT_SIZE_MISMATCH",
      message: "Uploaded original size does not match local evidence metadata.",
    };
  }

  if (!contentTypesMatch(contentType, input.expectedContentType)) {
    return {
      ok: false,
      code: "MEDIA_OBJECT_TYPE_MISMATCH",
      message:
        "Uploaded original content type does not match local evidence metadata.",
    };
  }

  if (metadataSha256 && metadataSha256 !== input.expectedSha256) {
    return {
      ok: false,
      code: "MEDIA_OBJECT_HASH_MISMATCH",
      message: "Uploaded original metadata hash does not match.",
    };
  }

  const getUrl = createR2PresignedUrl(config, {
    method: "GET",
    objectKey: input.objectKey,
    expiresInSeconds: 60,
    now: input.now,
  });
  const objectResponse = await fetch(getUrl).catch(() => null);

  if (!objectResponse?.ok) {
    return {
      ok: false,
      code: "MEDIA_OBJECT_VERIFICATION_FAILED",
      message: "Uploaded original could not be read for integrity checking.",
    };
  }

  const objectBytes = Buffer.from(await objectResponse.arrayBuffer());
  const sha256 = createHash("sha256").update(objectBytes).digest("hex");

  if (sha256 !== input.expectedSha256) {
    return {
      ok: false,
      code: "MEDIA_OBJECT_HASH_MISMATCH",
      message: "Uploaded original bytes do not match local evidence metadata.",
    };
  }

  return {
    ok: true,
    sizeBytes,
    contentType,
    sha256,
    metadataSha256,
  };
}

function createSignedHeaderNames(
  signedHeaders: Record<string, string> | undefined,
): string {
  return ["host", ...normalizeSignedHeaders(signedHeaders).map(([key]) => key)]
    .sort()
    .join(";");
}

function createCanonicalHeaders(
  host: string,
  signedHeaders: Record<string, string> | undefined,
): string {
  return [["host", host], ...normalizeSignedHeaders(signedHeaders)]
    .sort((left, right) => (left[0] ?? "").localeCompare(right[0] ?? ""))
    .map(([key, value]) => `${key}:${value}\n`)
    .join("");
}

function normalizeSignedHeaders(
  signedHeaders: Record<string, string> | undefined,
): Array<[string, string]> {
  return Object.entries(signedHeaders ?? {}).map(([key, value]) => [
    key.trim().toLowerCase(),
    value.trim().replace(/\s+/g, " "),
  ]);
}

function contentTypesMatch(actual: string, expected: string): boolean {
  return normalizeContentType(actual) === normalizeContentType(expected);
}

function normalizeContentType(value: string): string {
  return value.split(";")[0]?.trim().toLowerCase() ?? "";
}

function toCanonicalQuery(params: Record<string, string>): string {
  return Object.entries(params)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(
      ([key, value]) => `${encodeQueryValue(key)}=${encodeQueryValue(value)}`,
    )
    .join("&");
}

function encodePathSegment(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function encodeQueryValue(value: string): string {
  return encodePathSegment(value).replace(/%2F/g, "%2F");
}

function toAmzDate(date: Date): string {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: string | Buffer, value: string): Buffer {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function hmacHex(key: Buffer, value: string): string {
  return createHmac("sha256", key).update(value, "utf8").digest("hex");
}

function getSignatureKey(
  key: string,
  dateStamp: string,
  regionName: string,
  serviceName: string,
): Buffer {
  const kDate = hmac(`AWS4${key}`, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);

  return hmac(kService, "aws4_request");
}
