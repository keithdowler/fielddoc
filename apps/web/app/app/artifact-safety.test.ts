import { describe, expect, it } from "vitest";

import {
  internalReadinessNotice,
  proofPacketArchiveGuidance,
  proofPacketDownloadLabel,
} from "./artifact-safety";

describe("artifact safety copy", () => {
  it("keeps internal readiness distinct from customer FieldDoc reports", () => {
    expect(internalReadinessNotice.detail).toContain("not a customer report");
    expect(internalReadinessNotice.printTitle).toContain(
      "not a customer report",
    );
    expect(proofPacketDownloadLabel).toContain("customer FieldDoc Report");
    expect(proofPacketArchiveGuidance).toContain("not by printing Settings");
  });
});
