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
