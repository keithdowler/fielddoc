import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Linking } from "react-native";

import {
  getLocalPdfActionState,
  type LocalPdfActionState,
} from "./local-pdf-actions-core";

export async function getLocalPdfState(
  localUri: string | null | undefined,
  hasUnsavedDraftChanges: boolean,
): Promise<LocalPdfActionState> {
  const [fileInfo, sharingAvailable] = await Promise.all([
    localUri
      ? FileSystem.getInfoAsync(localUri)
      : Promise.resolve({ exists: false }),
    Sharing.isAvailableAsync(),
  ]);

  return getLocalPdfActionState({
    localUri,
    fileExists: fileInfo.exists,
    sharingAvailable,
    hasUnsavedDraftChanges,
  });
}

export async function openLocalPdf(localUri: string): Promise<void> {
  const canOpen = await Linking.canOpenURL(localUri);

  if (canOpen) {
    await Linking.openURL(localUri);
    return;
  }

  if (await Sharing.isAvailableAsync()) {
    await shareLocalPdf(localUri);
    return;
  }

  throw new Error("No local PDF viewer is available on this device.");
}

export async function shareLocalPdf(localUri: string): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device.");
  }

  await Sharing.shareAsync(localUri, {
    UTI: "com.adobe.pdf",
    dialogTitle: "Share Proof Packet PDF",
    mimeType: "application/pdf",
  });
}
