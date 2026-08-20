import { describe, expect, it } from "vitest";

import {
  internalReadinessNotice,
  proofPacketArchiveGuidance,
  proofPacketDownloadLabel,
} from "./artifact-safety";

describe("artifact safety copy", () => {
  it("keeps internal readiness distinct from customer Proof Packet exports", () => {
    expect(internalReadinessNotice.detail).toContain(
      "not a customer Proof Packet",
    );
    expect(internalReadinessNotice.printTitle).toContain("not a Proof Packet");
    expect(proofPacketDownloadLabel).toContain("customer Proof Packet PDF");
    expect(proofPacketArchiveGuidance).toContain("not by printing Settings");
  });
});
