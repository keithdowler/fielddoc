import { describe, expect, it } from "vitest";

import { summarizeAutomaticCloudSyncResults } from "./automatic-cloud-sync-state";

const saved = { status: "idle", message: "All changes are saved." } as const;

describe("summarizeAutomaticCloudSyncResults", () => {
  it("keeps sign-in requirements actionable", () => {
    expect(
      summarizeAutomaticCloudSyncResults(
        {
          status: "auth_required",
          message: "Sign in to save your changes across devices.",
        },
        saved,
      ),
    ).toEqual({
      status: "waiting",
      message: "Sign in to save your changes across devices.",
    });
  });

  it("does not label failed cloud saves as offline", () => {
    expect(
      summarizeAutomaticCloudSyncResults(
        { status: "failed", message: "Local changes could not be uploaded." },
        saved,
      ),
    ).toEqual({
      status: "error",
      message:
        "Local changes could not be uploaded. Your work is safe on this device.",
    });
  });

  it("does not treat partial saves as complete", () => {
    expect(
      summarizeAutomaticCloudSyncResults(
        { status: "partial", message: "Some photos could not be saved." },
        saved,
      ),
    ).toEqual({
      status: "error",
      message:
        "Some photos could not be saved. Your work is safe on this device.",
    });
  });

  it("explains when the signed-in account has no FieldDoc workspace", () => {
    expect(
      summarizeAutomaticCloudSyncResults(
        {
          status: "failed",
          message:
            "We could not find your FieldDoc workspace. Sign out and sign in again, then try saving.",
        },
        saved,
      ),
    ).toEqual({
      status: "error",
      message:
        "We could not find your FieldDoc workspace. Sign out and sign in again, then try saving.",
    });
  });

  it("explains when the user needs to choose between workspaces", () => {
    expect(
      summarizeAutomaticCloudSyncResults(
        {
          status: "failed",
          message:
            "This account has more than one FieldDoc workspace. Choose a workspace, then try again.",
        },
        saved,
      ),
    ).toEqual({
      status: "error",
      message:
        "This account has more than one FieldDoc workspace. Choose a workspace on the web, then try saving again.",
    });
  });

  it("keeps forbidden errors actionable without a support dead end", () => {
    expect(
      summarizeAutomaticCloudSyncResults(
        {
          status: "failed",
          message: "Forbidden",
        },
        saved,
      ),
    ).toEqual({
      status: "error",
      message:
        "Your account is connected, but FieldDoc could not save yet. Sign out and sign in again, then try saving.",
    });
  });

  it("tells TestFlight users to update when cloud config is missing", () => {
    expect(
      summarizeAutomaticCloudSyncResults(
        {
          status: "not_configured",
          message: "Cloud saving is unavailable in this version.",
        },
        saved,
      ),
    ).toEqual({
      status: "error",
      message:
        "This version cannot connect to FieldDoc cloud. Install the latest TestFlight build, then try again.",
    });
  });

  it("reports clean sync as saved", () => {
    expect(
      summarizeAutomaticCloudSyncResults(
        { status: "success", message: "Uploaded." },
        { status: "idle", message: "Everything is up to date." },
      ),
    ).toEqual({ status: "saved", message: "All changes saved." });
  });
});
