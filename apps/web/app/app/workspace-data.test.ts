import { describe, expect, it } from "vitest";
import { getBetaReadinessSummary } from "@fielddoc/domain";

import {
  getProjectDetailFromWorkspaceData,
  getReportDetailFromWorkspaceData,
  type WorkspaceAnnotation,
  type WorkspaceData,
  type WorkspaceEvidenceItem,
  type WorkspaceMediaAsset,
  type WorkspaceProject,
  type WorkspaceReport,
} from "./workspace-data";

const projectId = "11111111-1111-4111-8111-111111111111";
const otherProjectId = "22222222-2222-4222-8222-222222222222";
const beforeEvidenceId = "33333333-3333-4333-8333-333333333333";
const workEvidenceId = "44444444-4444-4444-8444-444444444444";
const reportId = "55555555-5555-4555-8555-555555555555";

describe("workspace detail read models", () => {
  it("assembles tenant-scoped project detail with evidence sections and media", () => {
    const workspace = createWorkspaceData();
    const detail = getProjectDetailFromWorkspaceData(workspace, projectId);

    expect(detail).toMatchObject({
      id: projectId,
      name: "Maple Turnover",
      evidenceCount: 2,
      mediaCount: 2,
      uploadedMediaCount: 1,
      missingCaptionCount: 1,
    });
    expect(detail?.evidenceSections).toHaveLength(5);
    expect(
      detail?.evidenceSections.find((section) => section.category === "BEFORE"),
    ).toMatchObject({
      evidenceCount: 1,
      mediaCount: 1,
      uploadedMediaCount: 1,
      importantCount: 1,
      missingCaptionCount: 0,
    });
    expect(
      detail?.evidenceSections.find((section) => section.category === "WORK"),
    ).toMatchObject({
      evidenceCount: 1,
      mediaCount: 1,
      uploadedMediaCount: 0,
      missingCaptionCount: 1,
    });
    expect(detail?.reports.map((report) => report.id)).toEqual([reportId]);
  });

  it("returns null for project and report IDs outside the loaded workspace", () => {
    const workspace = createWorkspaceData();

    expect(
      getProjectDetailFromWorkspaceData(workspace, otherProjectId),
    ).toBeNull();
    expect(
      getReportDetailFromWorkspaceData(
        workspace,
        "66666666-6666-4666-8666-666666666666",
      ),
    ).toBeNull();
  });

  it("builds report detail from included report sections only", () => {
    const workspace = createWorkspaceData();
    const detail = getReportDetailFromWorkspaceData(workspace, reportId);

    expect(detail).toMatchObject({
      id: reportId,
      title: "Maple Proof Packet",
      project: { id: projectId },
      totals: {
        evidenceCount: 2,
        mediaCount: 2,
        uploadedMediaCount: 1,
        annotationCount: 1,
        missingCaptionCount: 1,
        importantCount: 1,
      },
      readiness: {
        ready: false,
        missing: expect.arrayContaining(["After evidence", "Captions"]),
      },
    });
    expect(detail?.sections.map((section) => section.category)).toEqual([
      "BEFORE",
      "WORK",
      "AFTER",
    ]);
  });
});

function createWorkspaceData(): WorkspaceData {
  const projects = [createProject({ id: projectId })];
  const media = [
    createMediaAsset({
      id: "77777777-7777-4777-8777-777777777777",
      evidenceItemId: beforeEvidenceId,
      hasUploadedOriginal: true,
      caption: "Front room before work",
    }),
    createMediaAsset({
      id: "88888888-8888-4888-8888-888888888888",
      evidenceItemId: workEvidenceId,
      hasUploadedOriginal: false,
      caption: null,
    }),
  ];
  const annotations = [
    createAnnotation({
      id: "99999999-9999-4999-8999-999999999999",
      evidenceItemId: beforeEvidenceId,
      body: "Existing wall damage noted.",
    }),
  ];
  const documents = [
    {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      projectId,
      evidenceItemId: beforeEvidenceId,
      title: "Signed work authorization",
      notes: "Imported PDF",
      createdAt: at("2026-08-17T11:10:00.000Z"),
      updatedAt: at("2026-08-17T11:10:00.000Z"),
    },
  ];
  const beforeMedia = media[0];
  const workMedia = media[1];

  if (!beforeMedia || !workMedia) {
    throw new Error("Expected media fixtures to be initialized.");
  }

  const evidence = [
    createEvidenceItem({
      id: beforeEvidenceId,
      category: "BEFORE",
      title: "Before photos",
      caption: "Room before turnover",
      isImportant: true,
      media: [beforeMedia],
      annotations,
      documents,
    }),
    createEvidenceItem({
      id: workEvidenceId,
      category: "WORK",
      title: "Paint repair",
      caption: null,
      isImportant: false,
      media: [workMedia],
      annotations: [],
      documents: [],
    }),
  ];
  const reports = [createReport()];

  return {
    status: "ready",
    message: "Workspace data loaded from Neon.",
    organizationName: "RVA Maintenance",
    organizationRole: "admin",
    projects,
    reports,
    evidence,
    media,
    annotations,
    documents,
    syncReceiptCount: 4,
    rejectedSyncReceiptCount: 0,
    reportExportCount: 1,
    reportShareLinkCount: 1,
    auditEventCount: 2,
    recentAuditEvents: [],
    diagnosticsWarning: null,
    betaReadiness: getBetaReadinessSummary({
      tenantReady: true,
      privateStorageReady: true,
      revenueCatWebhookReady: false,
      emailDeliveryReady: false,
      errorReportingReady: false,
      legalUrlsReady: false,
      projectCount: projects.length,
      evidenceCount: evidence.length,
      mediaAssetCount: media.length,
      uploadedMediaAssetCount: media.filter((item) => item.hasUploadedOriginal)
        .length,
      reportDraftCount: reports.length,
      archivedReportPdfCount: 1,
      syncReceiptCount: 4,
      rejectedSyncReceiptCount: 0,
      auditEventCount: 2,
      shareLinkCount: 1,
      missingCaptionCount: 1,
    }),
  };
}

function createProject(input: { id: string }): WorkspaceProject {
  return {
    id: input.id,
    name: "Maple Turnover",
    customerCompany: "RVA Property",
    siteAddress: "12 Maple Ave",
    workOrderReference: "WO-123",
    scheduledDate: "2026-08-17",
    notes: "Office review needed.",
    status: "active",
    createdAt: at("2026-08-17T10:00:00.000Z"),
    updatedAt: at("2026-08-17T12:00:00.000Z"),
    evidenceCount: 2,
    mediaCount: 2,
    uploadedMediaCount: 1,
    importantEvidenceCount: 1,
    missingCaptionCount: 1,
    documentCount: 1,
    reportDraftCount: 1,
  };
}

function createReport(): WorkspaceReport {
  return {
    id: reportId,
    projectId,
    projectName: "Maple Turnover",
    title: "Maple Proof Packet",
    notes: "Send after manager review.",
    sectionsJson: [
      { category: "BEFORE", label: "Before", included: true, sortOrder: 0 },
      { category: "WORK", label: "Work", included: true, sortOrder: 1 },
      { category: "AFTER", label: "After", included: true, sortOrder: 2 },
      {
        category: "DOCUMENT",
        label: "Documents",
        included: false,
        sortOrder: 3,
      },
      { category: "OTHER", label: "Other", included: false, sortOrder: 4 },
    ],
    status: "draft",
    generatedAt: null,
    updatedAt: at("2026-08-17T12:05:00.000Z"),
    hasGeneratedPdf: false,
    generatedPdfObjectKey: null,
  };
}

function createEvidenceItem(
  input: Pick<
    WorkspaceEvidenceItem,
    | "id"
    | "category"
    | "title"
    | "caption"
    | "isImportant"
    | "media"
    | "annotations"
    | "documents"
  >,
): WorkspaceEvidenceItem {
  return {
    id: input.id,
    projectId,
    category: input.category,
    title: input.title,
    caption: input.caption,
    notes: null,
    isImportant: input.isImportant,
    sortOrder: 0,
    captureTimestamp: at("2026-08-17T11:00:00.000Z"),
    createdAt: at("2026-08-17T11:00:00.000Z"),
    updatedAt: at("2026-08-17T11:00:00.000Z"),
    media: input.media,
    annotations: input.annotations,
    documents: input.documents,
    mediaCount: input.media.length,
    uploadedMediaCount: input.media.filter((item) => item.hasUploadedOriginal)
      .length,
    annotationCount: input.annotations.length,
    documentCount: input.documents.length,
    missingCaption:
      !input.caption?.trim() &&
      !input.media.some((item) => item.caption?.trim()),
  };
}

function createMediaAsset(
  input: Pick<
    WorkspaceMediaAsset,
    "id" | "evidenceItemId" | "hasUploadedOriginal" | "caption"
  >,
): WorkspaceMediaAsset {
  return {
    id: input.id,
    projectId,
    projectName: "Maple Turnover",
    evidenceItemId: input.evidenceItemId,
    evidenceTitle: null,
    evidenceCaption: null,
    evidenceCategory: "BEFORE",
    mediaType: "IMAGE",
    mimeType: "image/jpeg",
    sizeBytes: 2048,
    sha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    caption: input.caption,
    notes: null,
    captureTimestamp: at("2026-08-17T11:00:00.000Z"),
    uploadedAt: input.hasUploadedOriginal
      ? at("2026-08-17T12:00:00.000Z")
      : null,
    hasUploadedOriginal: input.hasUploadedOriginal,
  };
}

function createAnnotation(
  input: Pick<WorkspaceAnnotation, "id" | "evidenceItemId" | "body">,
): WorkspaceAnnotation {
  return {
    id: input.id,
    projectId,
    evidenceItemId: input.evidenceItemId,
    mediaAssetId: null,
    body: input.body,
    createdAt: at("2026-08-17T11:05:00.000Z"),
  };
}

function at(value: string): Date {
  return new Date(value);
}
