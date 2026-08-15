import type { CreateMediaAssetInput, MediaSourceType } from "@fielddoc/domain";
import * as Crypto from "expo-crypto";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";

import { createLocalId } from "@/infrastructure/local-store/id";
import {
  bytesToHex,
  extensionFromSource,
  inferMediaType,
} from "./media-metadata";

export type PreparedLocalMediaAsset = Omit<
  CreateMediaAssetInput,
  "evidenceItemId"
> & {
  displayName: string;
};

type PickedMedia = {
  uri: string;
  sourceType: MediaSourceType;
  mimeType?: string | null;
  sizeBytes?: number | null;
  width?: number | null;
  height?: number | null;
  fileName?: string | null;
  originalAssetId?: string | null;
  captureTimestamp?: string;
};

export async function captureCameraPhoto(): Promise<PreparedLocalMediaAsset | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Camera permission is required to capture evidence.");
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 1,
    exif: false,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  return prepareLocalMediaAsset({
    uri: asset.uri,
    sourceType: "CAMERA_PHOTO",
    mimeType: asset.mimeType,
    sizeBytes: asset.fileSize,
    width: normalizeDimension(asset.width),
    height: normalizeDimension(asset.height),
    fileName: asset.fileName,
    originalAssetId: asset.assetId,
    captureTimestamp: new Date().toISOString(),
  });
}

export async function pickPhotoLibraryMedia(): Promise<PreparedLocalMediaAsset | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error("Photo library permission is required to attach evidence.");
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 1,
    exif: false,
    allowsMultipleSelection: false,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  return prepareLocalMediaAsset({
    uri: asset.uri,
    sourceType: "PHOTO_LIBRARY",
    mimeType: asset.mimeType,
    sizeBytes: asset.fileSize,
    width: normalizeDimension(asset.width),
    height: normalizeDimension(asset.height),
    fileName: asset.fileName,
    originalAssetId: asset.assetId,
    captureTimestamp: new Date().toISOString(),
  });
}

export async function importLocalFile(): Promise<PreparedLocalMediaAsset | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: "*/*",
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset) return null;

  return prepareLocalMediaAsset({
    uri: asset.uri,
    sourceType: "FILE_IMPORT",
    mimeType: asset.mimeType,
    sizeBytes: asset.size,
    fileName: asset.name,
    captureTimestamp: new Date(asset.lastModified).toISOString(),
  });
}

export async function prepareLocalMediaAsset(
  picked: PickedMedia,
): Promise<PreparedLocalMediaAsset> {
  const mimeType = picked.mimeType ?? "application/octet-stream";
  const extension = extensionFromSource(picked.uri, mimeType, picked.fileName);
  const destinationDirectory = getEvidenceStorageDirectory();
  const localUri = `${destinationDirectory}${createLocalId("original")}.${extension}`;

  await FileSystem.makeDirectoryAsync(destinationDirectory, {
    intermediates: true,
  });
  await FileSystem.copyAsync({ from: picked.uri, to: localUri });

  const fileInfo = await FileSystem.getInfoAsync(localUri);
  if (!fileInfo.exists) {
    throw new Error("Captured media could not be copied into local storage.");
  }

  const sizeBytes = picked.sizeBytes ?? fileInfo.size ?? 0;
  const imageSize =
    picked.width && picked.height
      ? { width: picked.width, height: picked.height }
      : await getImageSize(localUri, mimeType);

  return {
    localUri,
    mediaType: inferMediaType(mimeType),
    mimeType,
    sizeBytes,
    sha256: await sha256File(localUri),
    width: imageSize?.width ?? null,
    height: imageSize?.height ?? null,
    captureTimestamp: picked.captureTimestamp ?? new Date().toISOString(),
    sourceType: picked.sourceType,
    originalAssetId: picked.originalAssetId ?? null,
    derivativeType: null,
    displayName: picked.fileName ?? `Evidence ${picked.sourceType}`,
  };
}

function getEvidenceStorageDirectory(): string {
  if (!FileSystem.documentDirectory) {
    throw new Error("Local document storage is not available on this device.");
  }

  return `${FileSystem.documentDirectory}evidence-originals/`;
}

async function sha256File(uri: string): Promise<string> {
  const bytes = new Uint8Array(await new File(uri).arrayBuffer());
  const digest = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    bytes,
  );
  return bytesToHex(new Uint8Array(digest));
}

function normalizeDimension(value: number | null | undefined): number | null {
  return value && value > 0 ? value : null;
}

function getImageSize(
  uri: string,
  mimeType: string,
): Promise<{ width: number; height: number } | null> {
  if (!mimeType.startsWith("image/")) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      () => resolve(null),
    );
  });
}
