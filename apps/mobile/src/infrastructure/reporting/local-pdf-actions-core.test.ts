import { describe, expect, it } from "vitest";

import { getLocalPdfActionState } from "./local-pdf-actions-core";

describe("local PDF action state", () => {
  it("requires a current generated PDF before opening or sharing", () => {
    expect(
      getLocalPdfActionState({
        localUri: null,
        fileExists: false,
        sharingAvailable: true,
        hasUnsavedDraftChanges: false,
      }),
    ).toEqual({
      canOpen: false,
      canShare: false,
      reason: "Generate the report PDF first.",
    });
  });

  it("blocks stale PDFs when draft changes are unsaved", () => {
    expect(
      getLocalPdfActionState({
        localUri: "file:///proof-packets/packet.pdf",
        fileExists: true,
        sharingAvailable: true,
        hasUnsavedDraftChanges: true,
      }),
    ).toEqual({
      canOpen: false,
      canShare: false,
      reason: "Save draft changes and regenerate the PDF first.",
    });
  });

  it("allows open but not share when platform sharing is unavailable", () => {
    expect(
      getLocalPdfActionState({
        localUri: "file:///proof-packets/packet.pdf",
        fileExists: true,
        sharingAvailable: false,
        hasUnsavedDraftChanges: false,
      }),
    ).toEqual({
      canOpen: true,
      canShare: false,
      reason: "Sharing is not available on this device.",
    });
  });
});
