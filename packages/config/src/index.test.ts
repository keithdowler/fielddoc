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
      CLERK_JWT_KEY: "",
      CLERK_AUTHORIZED_PARTIES: "",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
      NEXT_PUBLIC_CLERK_SIGN_IN_URL: "",
      NEXT_PUBLIC_CLERK_SIGN_UP_URL: "",
      NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: "",
      NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: "",
      DATABASE_URL: "",
      SENTRY_DSN: "",
    });

    expect(parsed.CLERK_SECRET_KEY).toBeUndefined();
    expect(parsed.CLERK_JWT_KEY).toBeUndefined();
    expect(parsed.CLERK_AUTHORIZED_PARTIES).toBeUndefined();
    expect(parsed.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY).toBeUndefined();
    expect(parsed.NEXT_PUBLIC_CLERK_SIGN_IN_URL).toBeUndefined();
    expect(parsed.NEXT_PUBLIC_CLERK_SIGN_UP_URL).toBeUndefined();
    expect(
      parsed.NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL,
    ).toBeUndefined();
    expect(
      parsed.NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL,
    ).toBeUndefined();
    expect(parsed.DATABASE_URL).toBeUndefined();
    expect(parsed.SENTRY_DSN).toBeUndefined();
  });
});
