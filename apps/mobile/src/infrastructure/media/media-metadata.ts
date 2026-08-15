import type { MediaType } from "@fielddoc/domain";

const mimeExtensions: Record<string, string> = {
  "application/pdf": "pdf",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "text/plain": "txt",
  "video/quicktime": "mov",
  "video/mp4": "mp4",
};

export function inferMediaType(mimeType: string): MediaType {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (
    mimeType === "application/pdf" ||
    mimeType.includes("document") ||
    mimeType.startsWith("text/")
  ) {
    return "DOCUMENT";
  }

  return "OTHER";
}

export function extensionFromSource(
  sourceUri: string,
  mimeType: string,
  preferredName?: string | null,
): string {
  const fromName = extensionFromPath(preferredName ?? "");
  if (fromName) return fromName;

  const fromUri = extensionFromPath(sourceUri);
  if (fromUri) return fromUri;

  return mimeExtensions[mimeType] ?? "bin";
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function extensionFromPath(path: string): string | null {
  const cleanPath = path.split("?")[0]?.split("#")[0] ?? "";
  const lastSegment = cleanPath.split("/").at(-1) ?? "";
  const match = /\.([a-zA-Z0-9]+)$/.exec(lastSegment);
  return match?.[1]?.toLowerCase() ?? null;
}
