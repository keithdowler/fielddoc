import { describe, expect, it } from "vitest";

import { resolvePublicProductName, webServerEnvSchema } from "./index";

describe("resolvePublicProductName", () => {
  it("uses a configurable public product name", () => {
    expect(resolvePublicProductName("SiteProof")).toBe("SiteProof");
  });

  it("does not expose the internal codename by default", () => {
    expect(resolvePublicProductName(undefined)).toBe("Proof Packet");
  });
});

describe("webServerEnvSchema", () => {
  it("treats empty documented placeholders as unconfigured", () => {
    const parsed = webServerEnvSchema.parse({
      CLERK_SECRET_KEY: "",
      DATABASE_URL: "",
      SENTRY_DSN: "",
    });

    expect(parsed.CLERK_SECRET_KEY).toBeUndefined();
    expect(parsed.DATABASE_URL).toBeUndefined();
    expect(parsed.SENTRY_DSN).toBeUndefined();
  });
});
