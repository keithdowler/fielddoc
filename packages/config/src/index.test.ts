import { describe, expect, it } from "vitest";

import {
  getWebProductionReadiness,
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
    expect(resolvePublicProductName(undefined)).toBe("FieldDoc");
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
      RESEND_FROM_EMAIL: "",
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
    expect(parsed.RESEND_FROM_EMAIL).toBeUndefined();
    expect(parsed.SENTRY_DSN).toBeUndefined();
  });
});

describe("getWebProductionReadiness", () => {
  it("reports exact missing production variables without exposing values", () => {
    const checks = getWebProductionReadiness({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_live_example",
      CLERK_SECRET_KEY: "sk_live_example",
      DATABASE_URL: "postgres://user:pass@example.invalid/db",
      R2_ACCOUNT_ID: "account",
      R2_ACCESS_KEY_ID: "access-key",
      R2_BUCKET_NAME: "fielddoc-prod",
      NEXT_PUBLIC_PRIVACY_POLICY_URL: "https://example.com/privacy",
      NEXT_PUBLIC_TERMS_URL: "https://example.com/terms",
    });

    expect(checks.find((check) => check.id === "web_auth")).toMatchObject({
      ready: true,
      missingVariableNames: [],
    });
    expect(
      checks.find((check) => check.id === "private_storage"),
    ).toMatchObject({
      ready: false,
      missingVariableNames: ["R2_SECRET_ACCESS_KEY"],
    });
    expect(checks.find((check) => check.id === "revenuecat")).toMatchObject({
      ready: false,
      missingVariableNames: ["REVENUECAT_WEBHOOK_SECRET"],
    });
    expect(checks.find((check) => check.id === "email")).toMatchObject({
      ready: false,
      missingVariableNames: ["RESEND_API_KEY", "RESEND_FROM_EMAIL"],
    });
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
