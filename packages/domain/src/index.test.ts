import { describe, expect, it } from "vitest";

import {
  evidenceCategories,
  getReportReadiness,
  projectStatuses,
  toProjectSummary,
  validateProjectForm,
} from "./index";

describe("domain constants", () => {
  it("keeps evidence categories aligned with the proof-packet workflow", () => {
    expect(evidenceCategories).toEqual([
      "BEFORE",
      "WORK",
      "AFTER",
      "DOCUMENT",
      "OTHER",
    ]);
  });

  it("starts projects in an explicit draft-capable lifecycle", () => {
    expect(projectStatuses).toContain("draft");
  });

  it("requires only a project name for local project creation", () => {
    expect(validateProjectForm({ name: "" })).toEqual({
      valid: false,
      errors: { name: "Project name is required." },
    });

    expect(validateProjectForm({ name: "Unit 12 turnover" })).toEqual({
      valid: true,
      errors: {},
    });
  });

  it("creates a draft project summary without duplicating app-local models", () => {
    expect(
      toProjectSummary(
        { name: "  Roof leak documentation  " },
        {
          id: "4b7c70cc-1deb-4897-b2f5-00db4d1ec806",
          organizationId: "8210f5e3-cf4b-4cdb-ac51-6c0ae2f0588a",
          now: "2026-08-12T20:00:00.000Z",
        },
      ),
    ).toMatchObject({
      name: "Roof leak documentation",
      status: "draft",
    });
  });

  it("reports proof packet readiness from evidence counts", () => {
    expect(
      getReportReadiness({
        beforeCount: 1,
        workCount: 0,
        afterCount: 1,
        documentCount: 0,
        missingCaptionCount: 0,
      }),
    ).toEqual({ ready: true, missing: [] });

    expect(
      getReportReadiness({
        beforeCount: 0,
        workCount: 2,
        afterCount: 0,
        documentCount: 1,
        missingCaptionCount: 3,
      }),
    ).toEqual({
      ready: false,
      missing: ["Before evidence", "After evidence", "Captions"],
    });
  });
});
