import { describe, expect, it } from "vitest";

import {
  publicMobileEnvSchema,
  publicWebEnvSchema,
  resolvePublicProductName,
  webServerEnvSchema,
} from "./index";

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

describe("publicWebEnvSchema", () => {
  it("validates public legal URLs when configured", () => {
    const parsed = publicWebEnvSchema.parse({
      NEXT_PUBLIC_PRIVACY_POLICY_URL: "https://example.com/privacy",
      NEXT_PUBLIC_TERMS_URL: "https://example.com/terms",
    });

    expect(parsed.NEXT_PUBLIC_PRIVACY_POLICY_URL).toBe(
      "https://example.com/privacy",
    );
    expect(parsed.NEXT_PUBLIC_TERMS_URL).toBe("https://example.com/terms");
  });
});

describe("publicMobileEnvSchema", () => {
  it("validates the public mobile API base URL", () => {
    const parsed = publicMobileEnvSchema.parse({
      EXPO_PUBLIC_FIELDDOC_API_BASE_URL: "https://fielddoc-web.vercel.app",
      EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example",
      EXPO_PUBLIC_PRIVACY_POLICY_URL: "https://example.com/privacy",
      EXPO_PUBLIC_TERMS_URL: "https://example.com/terms",
      EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: "appl_test_example",
      EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: "goog_test_example",
    });

    expect(parsed.EXPO_PUBLIC_FIELDDOC_API_BASE_URL).toBe(
      "https://fielddoc-web.vercel.app",
    );
    expect(parsed.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY).toBe("pk_test_example");
    expect(parsed.EXPO_PUBLIC_PRIVACY_POLICY_URL).toBe(
      "https://example.com/privacy",
    );
    expect(parsed.EXPO_PUBLIC_TERMS_URL).toBe("https://example.com/terms");
    expect(parsed.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY).toBe("appl_test_example");
    expect(parsed.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY).toBe(
      "goog_test_example",
    );
  });
});
