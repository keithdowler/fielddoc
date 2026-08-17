import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";

import type { LocalDatabase } from "@/infrastructure/local-store/database";
import {
  clearLocalDeviceDatabase,
  countDeletedRows,
  createLocalPrivacyExport,
} from "./local-privacy-core";

const evidenceDirectoryName = "evidence-originals";
const proofPacketDirectoryName = "proof-packets";
const privacyExportDirectoryName = "privacy-exports";

export type ExportLocalDataResult = {
  status: "success" | "failed";
  message: string;
  localUri: string | null;
};

export type DeleteLocalDeviceDataResult = {
  status: "success" | "failed";
  message: string;
  deletedRows: number;
};

export async function exportLocalData(input: {
  database: LocalDatabase;
}): Promise<ExportLocalDataResult> {
  try {
    const exportedAt = new Date().toISOString();
    const archive = await createLocalPrivacyExport({
      database: input.database,
      exportedAt,
    });
    const directory = getDocumentStorageDirectory(privacyExportDirectoryName);
    const localUri = `${directory}fielddoc-local-export-${exportedAt
      .replace(/[^0-9]/g, "")
      .slice(0, 14)}.json`;

    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    await FileSystem.writeAsStringAsync(
      localUri,
      JSON.stringify(archive, null, 2),
      { encoding: FileSystem.EncodingType.UTF8 },
    );

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(localUri, {
        mimeType: "application/json",
        dialogTitle: "Export FieldDoc local metadata",
      });
    }

    return {
      status: "success",
      message:
        "Local metadata export created. Original media files and PDFs remain in app storage.",
      localUri,
    };
  } catch (error) {
    return {
      status: "failed",
      message:
        error instanceof Error
          ? error.message
          : "Local metadata export failed.",
      localUri: null,
    };
  }
}

export async function deleteLocalDeviceData(input: {
  database: LocalDatabase;
}): Promise<DeleteLocalDeviceDataResult> {
  try {
    const result = await clearLocalDeviceDatabase(input.database);

    await Promise.all([
      deleteAppDirectoryIfPresent(evidenceDirectoryName),
      deleteAppDirectoryIfPresent(proofPacketDirectoryName),
    ]);

    return {
      status: "success",
      message:
        "Local projects, evidence metadata, originals, generated PDFs, sync state, and queued mutations were removed from this device.",
      deletedRows: countDeletedRows(result),
    };
  } catch (error) {
    return {
      status: "failed",
      message:
        error instanceof Error
          ? error.message
          : "Local device data could not be deleted.",
      deletedRows: 0,
    };
  }
}

async function deleteAppDirectoryIfPresent(directoryName: string) {
  const directory = getDocumentStorageDirectory(directoryName);
  const info = await FileSystem.getInfoAsync(directory);

  if (info.exists) {
    await FileSystem.deleteAsync(directory, { idempotent: true });
  }
}

function getDocumentStorageDirectory(directoryName: string): string {
  if (!FileSystem.documentDirectory) {
    throw new Error("Local document storage is not available on this device.");
  }

  return `${FileSystem.documentDirectory}${directoryName}/`;
}
