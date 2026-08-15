import { describe, expect, it } from "vitest";

import { resolvePublicProductName } from "./index";

describe("resolvePublicProductName", () => {
  it("uses a configurable public product name", () => {
    expect(resolvePublicProductName("SiteProof")).toBe("SiteProof");
  });

  it("does not expose the internal codename by default", () => {
    expect(resolvePublicProductName(undefined)).toBe("Proof Packet");
  });
});
