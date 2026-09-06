import { describe, expect, it } from "vitest";

import {
  createInactiveFieldDocProMessage,
  hasRevenueCatFieldDocPro,
  mapCustomerInfoToEntitlements,
} from "./revenuecat-entitlements";

describe("mapCustomerInfoToEntitlements", () => {
  it("uses active FieldDoc Pro entitlements directly", () => {
    const entitlements = mapCustomerInfoToEntitlements({
      requestDate: "2026-09-05T12:00:00.000Z",
      entitlements: {
        all: {
          fielddoc_pro: {
            identifier: "fielddoc_pro",
            isActive: true,
            productIdentifier: "fielddoc_pro_monthly",
            expirationDate: "2026-10-05T12:00:00.000Z",
          },
        },
      },
      activeSubscriptions: ["fielddoc_pro_monthly"],
    });

    expect(hasRevenueCatFieldDocPro(entitlements)).toBe(true);
  });

  it("recovers active FieldDoc Pro from the product subscription when entitlement mapping is missing", () => {
    const entitlements = mapCustomerInfoToEntitlements({
      requestDate: "2026-09-05T12:00:00.000Z",
      entitlements: { all: {} },
      activeSubscriptions: ["fielddoc_pro_monthly"],
      allExpirationDates: {
        fielddoc_pro_monthly: "2026-10-05T12:00:00.000Z",
      },
    });

    expect(entitlements).toContainEqual({
      entitlementId: "fielddoc_pro",
      status: "active",
      productId: "fielddoc_pro_monthly",
      expiresAt: "2026-10-05T12:00:00.000Z",
      lastCheckedAt: "2026-09-05T12:00:00.000Z",
    });
    expect(hasRevenueCatFieldDocPro(entitlements)).toBe(true);
  });

  it("keeps restore messaging inactive when no FieldDoc Pro purchase is present", () => {
    const entitlements = mapCustomerInfoToEntitlements({
      requestDate: "2026-09-05T12:00:00.000Z",
      entitlements: { all: {} },
      activeSubscriptions: [],
    });

    expect(hasRevenueCatFieldDocPro(entitlements)).toBe(false);
    expect(createInactiveFieldDocProMessage(entitlements)).toContain(
      "No FieldDoc Pro purchase was found",
    );
  });
});
