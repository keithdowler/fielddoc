import { describe, expect, it } from "vitest";

import {
  assembleProofPacketPreview,
  evidenceCategories,
  getIncludedReportSections,
  getReportDraftReadiness,
  getReportReadiness,
  normalizeReportSections,
  projectStatuses,
  renderProofPacketHtml,
  toProjectSummary,
  validateProjectForm,
  type Annotation,
  type EvidenceItem,
  type MediaAsset,
  type Project,
  type ReportDraft,
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

  it("normalizes local report draft sections and readiness", () => {
    const sections = normalizeReportSections([
      {
        category: "AFTER",
        label: "  Completion  ",
        included: true,
        sortOrder: 0,
      },
      {
        category: "BEFORE",
        label: "",
        included: false,
        sortOrder: 1,
      },
    ]);

    expect(sections.map((section) => section.category)).toEqual([
      "AFTER",
      "BEFORE",
      "WORK",
      "DOCUMENT",
      "OTHER",
    ]);
    expect(
      getIncludedReportSections(sections).map((section) => section.label),
    ).toEqual(["Completion", "Work", "Documents"]);
    expect(
      getReportDraftReadiness(
        {
          beforeCount: 0,
          workCount: 1,
          afterCount: 1,
          documentCount: 0,
          missingCaptionCount: 0,
        },
        sections,
      ),
    ).toEqual({ ready: true, missing: [] });
  });

  it("assembles a deterministic proof packet preview from local metadata", () => {
    const project: Project = {
      id: "project-1",
      customerId: null,
      siteId: null,
      name: "Unit 12 Turnover",
      customerCompany: "Rivergate",
      siteAddress: "12 Main Street",
      workOrderReference: "WO-100",
      scheduledDate: null,
      notes: null,
      status: "draft",
      createdAt: "2026-08-15T12:00:00.000Z",
      updatedAt: "2026-08-15T12:00:00.000Z",
      archivedAt: null,
      deletedAt: null,
      syncState: "PENDING",
    };
    const draft: ReportDraft = {
      id: "draft-1",
      projectId: project.id,
      title: "Unit 12 Proof Packet",
      notes: "Customer-ready once captions are complete.",
      sectionsJson: JSON.stringify([
        {
          category: "WORK",
          label: "Work Performed",
          included: true,
          sortOrder: 0,
        },
        { category: "BEFORE", label: "Before", included: true, sortOrder: 1 },
        { category: "AFTER", label: "After", included: false, sortOrder: 2 },
      ]),
      status: "draft",
      generatedPdfUri: null,
      generatedAt: null,
      createdAt: "2026-08-15T12:05:00.000Z",
      updatedAt: "2026-08-15T12:05:00.000Z",
      deletedAt: null,
      syncState: "PENDING",
    };
    const workEarly = createEvidence({
      id: "evidence-work-early",
      projectId: project.id,
      category: "WORK",
      title: "Prep",
      caption: null,
      captureTimestamp: "2026-08-15T13:00:00.000Z",
      sortOrder: 1,
    });
    const workLate = createEvidence({
      id: "evidence-work-late",
      projectId: project.id,
      category: "WORK",
      title: "Install",
      caption: "Cabinet installed",
      captureTimestamp: "2026-08-15T14:00:00.000Z",
      sortOrder: 0,
    });
    const before = createEvidence({
      id: "evidence-before",
      projectId: project.id,
      category: "BEFORE",
      title: "Existing wall",
      caption: null,
      captureTimestamp: "2026-08-15T12:30:00.000Z",
      sortOrder: 0,
    });
    const workMedia = createMediaAsset({
      id: "media-work",
      evidenceItemId: workEarly.id,
      caption: "Surface protected before work.",
      captureTimestamp: "2026-08-15T13:01:00.000Z",
    });
    const annotation = createAnnotation({
      id: "annotation-1",
      evidenceItemId: workEarly.id,
      body: "Plastic sheeting visible.",
    });

    const preview = assembleProofPacketPreview({
      project,
      draft,
      evidenceItems: [workLate, before, workEarly],
      mediaAssetsByEvidenceId: { [workEarly.id]: [workMedia] },
      annotationsByEvidenceId: { [workEarly.id]: [annotation] },
    });

    expect(preview.sections.map((section) => section.label)).toEqual([
      "Work Performed",
      "Before",
      "Documents",
    ]);
    expect(
      preview.sections[0]?.evidenceItems.map((entry) => entry.evidence.id),
    ).toEqual([workEarly.id, workLate.id]);
    expect(preview.sections[0]?.evidenceItems[0]).toMatchObject({
      caption: "Surface protected before work.",
      mediaCount: 1,
      annotationCount: 1,
      missingCaption: false,
    });
    expect(preview.totals).toEqual({
      sections: 3,
      evidenceItems: 3,
      mediaAssets: 1,
      annotations: 1,
      missingCaptions: 1,
    });
    expect(preview.ready).toBe(false);
    expect(preview.missing).toEqual(["Captions"]);

    const html = renderProofPacketHtml(preview, {
      generatedAt: "2026-08-15T15:00:00.000Z",
      productName: "Proof Packet",
    });

    expect(html).toContain("Unit 12 Proof Packet");
    expect(html).toContain("Generated locally 2026-08-15 15:00:00 UTC");
    expect(html).toContain("Surface protected before work.");
    expect(html).toContain("SHA-256 00");
    expect(html).toContain("Caption needed");
  });
});

function createEvidence(
  input: Pick<
    EvidenceItem,
    | "id"
    | "projectId"
    | "category"
    | "title"
    | "caption"
    | "captureTimestamp"
    | "sortOrder"
  >,
): EvidenceItem {
  return {
    ...input,
    notes: null,
    createdAt: input.captureTimestamp,
    updatedAt: input.captureTimestamp,
    deletedAt: null,
    syncState: "PENDING",
  };
}

function createMediaAsset(
  input: Pick<
    MediaAsset,
    "id" | "evidenceItemId" | "caption" | "captureTimestamp"
  >,
): MediaAsset {
  return {
    ...input,
    localUri: `file:///fielddoc/${input.id}.jpg`,
    mediaType: "IMAGE",
    mimeType: "image/jpeg",
    sizeBytes: 1024,
    sha256: "00",
    width: 800,
    height: 600,
    notes: null,
    sourceType: "CAMERA_PHOTO",
    originalAssetId: null,
    derivativeType: null,
    createdAt: input.captureTimestamp,
    updatedAt: input.captureTimestamp,
    deletedAt: null,
    syncState: "PENDING",
  };
}

function createAnnotation(
  input: Pick<Annotation, "id" | "evidenceItemId" | "body">,
): Annotation {
  return {
    ...input,
    mediaAssetId: null,
    createdAt: "2026-08-15T13:02:00.000Z",
    updatedAt: "2026-08-15T13:02:00.000Z",
    deletedAt: null,
    syncState: "PENDING",
  };
}
