export type LocalPdfActionCheck = {
  localUri: string | null | undefined;
  fileExists: boolean;
  sharingAvailable: boolean;
  hasUnsavedDraftChanges: boolean;
};

export type LocalPdfActionState = {
  canOpen: boolean;
  canShare: boolean;
  reason: string | null;
};

export function getLocalPdfActionState(
  check: LocalPdfActionCheck,
): LocalPdfActionState {
  if (check.hasUnsavedDraftChanges) {
    return {
      canOpen: false,
      canShare: false,
      reason: "Save draft changes and regenerate the PDF first.",
    };
  }

  if (!check.localUri) {
    return {
      canOpen: false,
      canShare: false,
      reason: "Generate a local PDF first.",
    };
  }

  if (!check.fileExists) {
    return {
      canOpen: false,
      canShare: false,
      reason: "The local PDF file could not be found on this device.",
    };
  }

  return {
    canOpen: true,
    canShare: check.sharingAvailable,
    reason: check.sharingAvailable
      ? null
      : "Sharing is not available on this device.",
  };
}
