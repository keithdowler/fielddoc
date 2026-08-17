import { describe, expect, it } from "vitest";

import {
  getMobileAuthStatus,
  getMobileAuthStatusCopy,
} from "./mobile-auth-state";

describe("mobile auth state", () => {
  it("reports missing Clerk configuration before checking session state", () => {
    expect(
      getMobileAuthStatus({
        isConfigured: false,
        isLoaded: true,
        isSignedIn: true,
      }),
    ).toBe("not_configured");
  });

  it("distinguishes loading, signed-out, and signed-in states", () => {
    expect(
      getMobileAuthStatus({
        isConfigured: true,
        isLoaded: false,
        isSignedIn: false,
      }),
    ).toBe("loading");
    expect(
      getMobileAuthStatus({
        isConfigured: true,
        isLoaded: true,
        isSignedIn: false,
      }),
    ).toBe("signed_out");
    expect(
      getMobileAuthStatus({
        isConfigured: true,
        isLoaded: true,
        isSignedIn: true,
      }),
    ).toBe("signed_in");
  });

  it("keeps user-facing sync guidance mapped for every state", () => {
    expect(getMobileAuthStatusCopy("signed_in").title).toBe(
      "Cloud account connected",
    );
    expect(getMobileAuthStatusCopy("signed_out").message).toContain("Sign in");
  });
});
