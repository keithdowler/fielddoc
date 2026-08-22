import { describe, expect, it } from "vitest";

import {
  accountSignInRoute,
  getPrimaryNavigationTitles,
  primaryNavigation,
} from "./app-navigation";

describe("primaryNavigation", () => {
  it("keeps the five required mobile destinations in order", () => {
    expect(getPrimaryNavigationTitles()).toEqual([
      "Home",
      "Projects",
      "Capture",
      "Reports",
      "Settings",
    ]);
  });

  it("provides labels and icons for accessible navigation", () => {
    expect(
      primaryNavigation.every((item) => item.accessibilityLabel && item.icon),
    ).toBe(true);
  });

  it("keeps account sign-in on a dedicated route", () => {
    expect(accountSignInRoute).toBe("/settings/sign-in");
    expect(primaryNavigation.map((item) => item.routeName)).not.toContain(
      "settings/sign-in",
    );
  });
});
