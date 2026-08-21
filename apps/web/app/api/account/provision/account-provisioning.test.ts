import { describe, expect, it } from "vitest";

import {
  normalizeMembershipRole,
  normalizeOrganizationName,
} from "./account-provisioning";

describe("account provisioning normalization", () => {
  it("uses a stable organization fallback", () => {
    expect(normalizeOrganizationName("")).toBe("FieldDoc");
    expect(normalizeOrganizationName("  Acme Maintenance  ")).toBe(
      "Acme Maintenance",
    );
  });

  it("normalizes Clerk organization roles for local storage", () => {
    expect(normalizeMembershipRole("org:admin")).toBe("admin");
    expect(normalizeMembershipRole(null)).toBe("member");
  });
});
