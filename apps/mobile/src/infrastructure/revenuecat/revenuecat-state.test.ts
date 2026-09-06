import { describe, expect, it } from "vitest";

import { getRevenueCatStatusCopy, toRevenueCatState } from "./revenuecat-state";

describe("toRevenueCatState", () => {
  it("requires platform keys before enabling paid features", () => {
    const state = toRevenueCatState({
      isConfigured: false,
      isSignedIn: true,
      entitlements: [],
    });

    expect(state.status).toBe("not_configured");
    expect(getRevenueCatStatusCopy(state).tone).toBe("warning");
  });

  it("does not describe automatic saving as subscription gated", () => {
    const state = toRevenueCatState({
      isConfigured: true,
      isSignedIn: true,
      entitlements: [],
    });
    const copy = getRevenueCatStatusCopy(state);

    expect(copy.title).toBe("Report sharing locked");
    expect(copy.message).toContain("Automatic saving uses");
  });

  it("detects active fielddoc_pro entitlements", () => {
    expect(
      toRevenueCatState({
        isConfigured: true,
        isSignedIn: true,
        entitlements: [
          {
            entitlementId: "fielddoc_pro",
            status: "active",
            productId: "fielddoc_pro_monthly",
            expiresAt: "2026-09-17T15:00:00.000Z",
            lastCheckedAt: "2026-08-17T15:00:00.000Z",
          },
        ],
        nowIso: "2026-08-17T16:00:00.000Z",
      }).status,
    ).toBe("active");
  });
});
