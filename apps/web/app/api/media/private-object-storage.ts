import { createHmac, createHash } from "node:crypto";

export type PrivateObjectStorageConfig = {
  accountId: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
};

export type PresignedObjectUrlInput = {
  method: "GET" | "PUT";
  objectKey: string;
  expiresInSeconds: number;
  now?: Date;
};

export type PrivateObjectStorage = {
  createPresignedUrl(input: PresignedObjectUrlInput): string;
};

export function createR2PrivateObjectStorage(
  config: PrivateObjectStorageConfig,
): PrivateObjectStorage {
  return {
    createPresignedUrl(input) {
      return createR2PresignedUrl(config, input);
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
    "X-Amz-SignedHeaders": "host",
  };
  const canonicalQuery = toCanonicalQuery(queryParams);
  const canonicalHeaders = `host:${host}\n`;
  const canonicalRequest = [
    input.method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    "host",
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
