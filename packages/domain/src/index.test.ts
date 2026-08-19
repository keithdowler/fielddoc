import { describe, expect, it } from "vitest";

import {
  assembleProofPacketPreview,
  defaultReportBranding,
  evidenceCategories,
  getBetaReadinessSummary,
  getIncludedReportSections,
  getCloudFeatureGate,
  getFieldDocNextActions,
  getFirstRunChecklist,
  getPrimaryFieldDocNextAction,
  getProofPacketDocumentEntry,
  getReportDeliveryReadiness,
  getReportDraftReadiness,
  getReportReadiness,
  getReportUsabilityChecklist,
  hasActiveFieldDocProEntitlement,
  normalizeReportBranding,
  normalizeReportSections,
  reportBrandingAccentColors,
  projectStatuses,
  renderProofPacketHtml,
  toProjectSummary,
  validateProjectForm,
  type Annotation,
  type Document,
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

  it("gates paid cloud features on a current RevenueCat entitlement", () => {
    expect(
      hasActiveFieldDocProEntitlement([
        {
          entitlementId: "fielddoc_pro",
          status: "active",
          productId: "fielddoc_pro_monthly",
          expiresAt: "2026-09-01T00:00:00.000Z",
          lastCheckedAt: "2026-08-17T00:00:00.000Z",
        },
      ]),
    ).toBe(true);

    expect(
      hasActiveFieldDocProEntitlement(
        [
          {
            entitlementId: "fielddoc_pro",
            status: "active",
            productId: "fielddoc_pro_monthly",
            expiresAt: "2026-08-01T00:00:00.000Z",
            lastCheckedAt: "2026-08-17T00:00:00.000Z",
          },
        ],
        "2026-08-17T00:00:00.000Z",
      ),
    ).toBe(false);

    expect(
      getCloudFeatureGate({
        isSignedIn: true,
        entitlementConfigured: true,
        entitlements: [],
      }),
    ).toMatchObject({ allowed: false });
  });

  it("accepts current RevenueCat entitlement aliases for fielddoc_pro", () => {
    for (const entitlementId of ["FieldDocPro", "FieldDoc Pro"]) {
      expect(
        hasActiveFieldDocProEntitlement(
          [
            {
              entitlementId,
              status: "active",
              productId: "fielddoc_pro_monthly",
              expiresAt: "2026-09-01T00:00:00.000Z",
              lastCheckedAt: "2026-08-17T00:00:00.000Z",
            },
          ],
          "2026-08-17T00:00:00.000Z",
        ),
      ).toBe(true);
    }
  });

  it("builds a plain-language report checklist for broad usability", () => {
    const checklist = getReportUsabilityChecklist({
      projectSelected: true,
      beforeCount: 1,
      workCount: 0,
      afterCount: 1,
      documentCount: 1,
      missingCaptionCount: 2,
      hasGeneratedPdf: false,
      reportPdfUploaded: false,
      mediaCount: 3,
      uploadedMediaCount: 1,
      subscriptionActive: false,
      privateStorageReady: true,
    });

    expect(checklist.map((item) => [item.id, item.status])).toEqual([
      ["project", "complete"],
      ["before", "complete"],
      ["work", "action_needed"],
      ["after", "complete"],
      ["documents", "complete"],
      ["document_review", "complete"],
      ["captions", "action_needed"],
      ["generate_pdf", "action_needed"],
      ["subscription", "blocked"],
      ["backup_originals", "action_needed"],
      ["upload_pdf", "action_needed"],
    ]);
    expect(checklist.find((item) => item.id === "captions")).toMatchObject({
      detail: "2 items need a plain-language caption.",
      actionLabel: "Review captions",
    });
    expect(
      checklist.find((item) => item.id === "backup_originals"),
    ).toMatchObject({
      detail: "2 original files are still only on this device.",
      actionLabel: "Back up now",
    });
  });

  it("marks report checklist delivery tasks complete when backup is done", () => {
    const checklist = getReportUsabilityChecklist({
      projectSelected: true,
      beforeCount: 1,
      workCount: 1,
      afterCount: 1,
      documentCount: 0,
      missingCaptionCount: 0,
      hasGeneratedPdf: true,
      reportPdfUploaded: true,
      mediaCount: 3,
      uploadedMediaCount: 3,
      subscriptionActive: true,
      privateStorageReady: true,
    });

    expect(checklist.filter((item) => item.status === "blocked")).toEqual([]);
    expect(checklist.find((item) => item.id === "subscription")).toMatchObject({
      status: "complete",
      actionLabel: null,
    });
    expect(checklist.find((item) => item.id === "upload_pdf")).toMatchObject({
      status: "complete",
      actionLabel: null,
    });
  });

  it("recommends a first job before capture or report work", () => {
    const action = getPrimaryFieldDocNextAction({
      projectCount: 0,
      hasSelectedProject: false,
      beforeCount: 0,
      workCount: 0,
      afterCount: 0,
      documentCount: 0,
      missingCaptionCount: 0,
      hasReportDraft: false,
      hasGeneratedPdf: false,
      pendingLocalChangeCount: 0,
    });

    expect(action).toMatchObject({
      id: "create_job",
      status: "action_needed",
      destination: "projects",
      actionLabel: "Create job",
    });
  });

  it("guides a partially documented job toward missing evidence", () => {
    const actions = getFieldDocNextActions({
      projectCount: 1,
      hasSelectedProject: true,
      beforeCount: 1,
      workCount: 0,
      afterCount: 0,
      documentCount: 0,
      missingCaptionCount: 0,
      hasReportDraft: false,
      hasGeneratedPdf: false,
      pendingLocalChangeCount: 3,
    });

    expect(
      actions.find((action) => action.id === "capture_before"),
    ).toMatchObject({
      status: "complete",
    });
    expect(
      actions.find((action) => action.id === "capture_work"),
    ).toMatchObject({
      status: "action_needed",
      label: "Show the work",
    });
    expect(
      getPrimaryFieldDocNextAction({
        projectCount: 1,
        hasSelectedProject: true,
        beforeCount: 1,
        workCount: 0,
        afterCount: 0,
        documentCount: 0,
        missingCaptionCount: 0,
        hasReportDraft: false,
        hasGeneratedPdf: false,
        pendingLocalChangeCount: 3,
      }).id,
    ).toBe("capture_work");
  });

  it("keeps cloud backup blocked until account and subscription are ready", () => {
    const actions = getFieldDocNextActions({
      projectCount: 1,
      hasSelectedProject: true,
      beforeCount: 1,
      workCount: 1,
      afterCount: 1,
      documentCount: 1,
      missingCaptionCount: 0,
      hasReportDraft: true,
      hasGeneratedPdf: true,
      pendingLocalChangeCount: 2,
      pendingOriginalFileCount: 1,
      pendingReportPdfCount: 1,
      isSignedIn: true,
      subscriptionActive: false,
      privateStorageReady: true,
    });

    expect(
      actions.find((action) => action.id === "confirm_subscription"),
    ).toMatchObject({
      status: "action_needed",
    });
    expect(actions.find((action) => action.id === "back_up")).toMatchObject({
      status: "blocked",
      actionLabel: null,
    });
  });

  it("produces a simple first-run checklist", () => {
    const checklist = getFirstRunChecklist({
      projectCount: 1,
      beforeCount: 1,
      workCount: 0,
      afterCount: 0,
      hasGeneratedPdf: false,
      pendingLocalChangeCount: 4,
    });

    expect(checklist.map((item) => [item.id, item.status])).toEqual([
      ["first_job", "complete"],
      ["first_evidence", "complete"],
      ["first_report", "action_needed"],
      ["first_backup", "action_needed"],
    ]);
  });

  it("blocks original backup checklist items when private storage is unavailable", () => {
    const checklist = getReportUsabilityChecklist({
      projectSelected: true,
      beforeCount: 1,
      workCount: 1,
      afterCount: 1,
      documentCount: 1,
      missingCaptionCount: 0,
      hasGeneratedPdf: true,
      reportPdfUploaded: false,
      mediaCount: 2,
      uploadedMediaCount: 0,
      subscriptionActive: true,
      privateStorageReady: false,
    });

    expect(
      checklist.find((item) => item.id === "backup_originals"),
    ).toMatchObject({
      status: "blocked",
      detail: "Private storage is not configured yet.",
    });
  });

  it("summarizes setup blockers before beta readiness", () => {
    const summary = getBetaReadinessSummary({
      tenantReady: false,
      privateStorageReady: false,
      revenueCatWebhookReady: false,
      emailDeliveryReady: false,
      errorReportingReady: false,
      legalUrlsReady: false,
      projectCount: 0,
      evidenceCount: 0,
      mediaAssetCount: 0,
      uploadedMediaAssetCount: 0,
      reportDraftCount: 0,
      archivedReportPdfCount: 0,
      syncReceiptCount: 0,
      rejectedSyncReceiptCount: 0,
      auditEventCount: 0,
      shareLinkCount: 0,
      missingCaptionCount: 0,
    });

    expect(summary.stage).toBe("setup_required");
    expect(summary.headline).toBe("Setup required");
    expect(summary.blockers.map((risk) => risk.id)).toEqual([
      "tenant",
      "private_storage",
    ]);
    expect(summary.nextActions).toContain("Provision tenant");
  });

  it("promotes synced field evidence and archived reports to beta candidate", () => {
    const summary = getBetaReadinessSummary({
      tenantReady: true,
      privateStorageReady: true,
      revenueCatWebhookReady: false,
      emailDeliveryReady: false,
      errorReportingReady: false,
      legalUrlsReady: false,
      projectCount: 2,
      evidenceCount: 12,
      mediaAssetCount: 6,
      uploadedMediaAssetCount: 6,
      reportDraftCount: 1,
      archivedReportPdfCount: 1,
      syncReceiptCount: 18,
      rejectedSyncReceiptCount: 0,
      auditEventCount: 4,
      shareLinkCount: 1,
      missingCaptionCount: 0,
    });

    expect(summary.stage).toBe("beta_candidate");
    expect(summary.blockers).toEqual([]);
    expect(summary.warnings.map((risk) => risk.id)).toEqual([
      "revenuecat_webhook",
      "email_delivery",
      "error_reporting",
      "legal_urls",
    ]);
  });

  it("treats fully configured readiness as a production candidate", () => {
    const summary = getBetaReadinessSummary({
      tenantReady: true,
      privateStorageReady: true,
      revenueCatWebhookReady: true,
      emailDeliveryReady: true,
      errorReportingReady: true,
      legalUrlsReady: true,
      projectCount: 3,
      evidenceCount: 20,
      mediaAssetCount: 10,
      uploadedMediaAssetCount: 10,
      reportDraftCount: 2,
      archivedReportPdfCount: 2,
      syncReceiptCount: 30,
      rejectedSyncReceiptCount: 0,
      auditEventCount: 8,
      shareLinkCount: 2,
      missingCaptionCount: 0,
    });

    expect(summary.score).toBe(100);
    expect(summary.stage).toBe("production_candidate");
    expect(summary.nextActions).toEqual([
      "Run one real field packet through mobile, cloud sync, and web review.",
    ]);
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

  it("normalizes local proof packet branding without requiring cloud state", () => {
    expect(
      normalizeReportBranding(
        {
          companyName: "  Rivergate Restoration  ",
          preparedBy: "  Keith  ",
          footerText: "",
          accentColor: "#not-real",
        },
        {
          existing: {
            ...defaultReportBranding,
            footerText: "Existing footer",
            accentColor: reportBrandingAccentColors[1],
          },
          now: "2026-08-17T16:00:00.000Z",
        },
      ),
    ).toEqual({
      companyName: "Rivergate Restoration",
      preparedBy: "Keith",
      footerText: null,
      accentColor: reportBrandingAccentColors[1],
      updatedAt: "2026-08-17T16:00:00.000Z",
    });
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
      generatedPdfStorageObjectKey: null,
      generatedPdfSha256: null,
      generatedPdfSizeBytes: null,
      generatedPdfUploadedAt: null,
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
      isImportant: true,
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
      isImportant: true,
    });
    expect(preview.totals).toEqual({
      sections: 3,
      evidenceItems: 3,
      mediaAssets: 1,
      annotations: 1,
      documents: 0,
      visualDocuments: 0,
      externalOriginalDocuments: 0,
      metadataOnlyDocuments: 0,
      blockedDocuments: 0,
      missingCaptions: 1,
    });
    expect(preview.ready).toBe(false);
    expect(preview.missing).toEqual(["Captions"]);

    const html = renderProofPacketHtml(preview, {
      generatedAt: "2026-08-15T15:00:00.000Z",
      productName: "Proof Packet",
      embeddedMedia: {
        [workMedia.id]: {
          dataUri: "data:image/jpeg;base64,abc123",
          altText: "Protected work surface",
        },
      },
    });

    expect(html).toContain("Unit 12 Proof Packet");
    expect(html).toContain("Generated locally 2026-08-15 15:00:00 UTC");
    expect(html).toContain('src="data:image/jpeg;base64,abc123"');
    expect(html).toContain('alt="Protected work surface"');
    expect(html).toContain("Surface protected before work.");
    expect(html).toContain("SHA-256 00");
    expect(html).toContain("Caption needed");
    expect(html).toContain("Important evidence");
    expect(html).not.toContain("metadata-only");
  });

  it("renders branding and document metadata in proof packet HTML", () => {
    const project: Project = {
      id: "project-docs",
      customerId: null,
      siteId: null,
      name: "Document closeout",
      customerCompany: "Rivergate",
      siteAddress: "12 Main Street",
      workOrderReference: null,
      scheduledDate: null,
      notes: null,
      status: "draft",
      createdAt: "2026-08-17T14:00:00.000Z",
      updatedAt: "2026-08-17T14:00:00.000Z",
      archivedAt: null,
      deletedAt: null,
      syncState: "PENDING",
    };
    const documentEvidence = createEvidence({
      id: "evidence-doc",
      projectId: project.id,
      category: "DOCUMENT",
      title: "Permit packet",
      caption: "Signed permit",
      captureTimestamp: "2026-08-17T14:10:00.000Z",
      sortOrder: 0,
    });
    const documentMedia = createMediaAsset({
      id: "media-doc",
      evidenceItemId: documentEvidence.id,
      caption: "Permit PDF",
      captureTimestamp: "2026-08-17T14:10:00.000Z",
      mediaType: "DOCUMENT",
      mimeType: "application/pdf",
      sha256:
        "11507a0e2f5e69d5c15a8e65b7ef464041602a06120573cd9f8021c3d1f2f4e7",
    });
    const document = createDocument({
      id: "document-doc",
      projectId: project.id,
      evidenceItemId: documentEvidence.id,
      mediaAssetId: documentMedia.id,
      title: "Permit PDF",
      fileName: "permit.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      sha256:
        "11507a0e2f5e69d5c15a8e65b7ef464041602a06120573cd9f8021c3d1f2f4e7",
    });
    const draft: ReportDraft = {
      id: "draft-docs",
      projectId: project.id,
      title: "Document closeout packet",
      notes: null,
      sectionsJson: JSON.stringify([
        {
          category: "DOCUMENT",
          label: "Document appendix",
          included: true,
          sortOrder: 0,
        },
      ]),
      status: "draft",
      generatedPdfUri: null,
      generatedPdfStorageObjectKey: null,
      generatedPdfSha256: null,
      generatedPdfSizeBytes: null,
      generatedPdfUploadedAt: null,
      generatedAt: null,
      createdAt: "2026-08-17T14:00:00.000Z",
      updatedAt: "2026-08-17T14:00:00.000Z",
      deletedAt: null,
      syncState: "PENDING",
    };

    const preview = assembleProofPacketPreview({
      project,
      draft,
      evidenceItems: [documentEvidence],
      mediaAssetsByEvidenceId: { [documentEvidence.id]: [documentMedia] },
      annotationsByEvidenceId: {},
      documentsByEvidenceId: { [documentEvidence.id]: [document] },
    });

    const html = renderProofPacketHtml(preview, {
      generatedAt: "2026-08-17T15:00:00.000Z",
      branding: {
        companyName: "Rivergate Restoration",
        preparedBy: "Keith Dowler",
        footerText: "Generated for customer review.",
        accentColor: reportBrandingAccentColors[2],
        updatedAt: "2026-08-17T14:00:00.000Z",
      },
    });

    expect(html).toContain("Rivergate Restoration");
    expect(html).toContain("Prepared by");
    expect(html).toContain("Keith Dowler");
    expect(html).toContain("Document appendix");
    expect(html).toContain("Imported PDF original");
    expect(html).toContain("imported originals preserved for external review");
    expect(html).toContain("application/pdf");
    expect(html).toContain(
      "11507a0e2f5e69d5c15a8e65b7ef464041602a06120573cd9f8021c3d1f2f4e7",
    );
    expect(html).toContain("Generated for customer review.");
    expect(html).toContain(reportBrandingAccentColors[2]);
  });

  it("classifies visual and incomplete document previews", () => {
    const visualMedia = createMediaAsset({
      id: "media-visual-doc",
      evidenceItemId: "evidence-doc",
      caption: "Authorization image",
      captureTimestamp: "2026-08-17T14:10:00.000Z",
      sha256:
        "315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3",
    });
    const visualDocument = createDocument({
      id: "document-visual",
      projectId: "project-docs",
      evidenceItemId: "evidence-doc",
      mediaAssetId: visualMedia.id,
      title: "Authorization image",
      fileName: "authorization.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 2048,
      sha256: visualMedia.sha256,
    });
    const incompleteDocument = createDocument({
      id: "document-incomplete",
      projectId: "project-docs",
      evidenceItemId: "evidence-doc",
      mediaAssetId: null,
      title: "Missing file metadata",
    });

    expect(
      getProofPacketDocumentEntry(visualDocument, [visualMedia]),
    ).toMatchObject({
      previewKind: "visual",
      reviewStatus: "delivery_ready",
      deliverySafe: true,
      visualMediaAssetId: visualMedia.id,
      visualMediaAssetIds: [visualMedia.id],
      visualPageCount: 1,
    });
    expect(
      getProofPacketDocumentEntry(incompleteDocument, [visualMedia]),
    ).toMatchObject({
      previewKind: "incomplete",
      reviewStatus: "metadata_incomplete",
      deliverySafe: false,
      missingMetadata: ["file name", "mime type", "file size", "SHA-256"],
    });
  });

  it("classifies multi-page scanned documents as visual proof", () => {
    const firstPage = createMediaAsset({
      id: "media-doc-page-1",
      evidenceItemId: "evidence-doc-pages",
      caption: "Authorization page 1",
      captureTimestamp: "2026-08-17T14:10:00.000Z",
      sourceType: "DOCUMENT_SCAN",
      sha256:
        "315f5bdb76d078c43b8ac0064e4a0164612b1fce77c869345bfc94c75894edd3",
    });
    const secondPage = createMediaAsset({
      id: "media-doc-page-2",
      evidenceItemId: "evidence-doc-pages",
      caption: "Authorization page 2",
      captureTimestamp: "2026-08-17T14:11:00.000Z",
      sourceType: "DOCUMENT_SCAN",
      sha256:
        "486ea46224d1bb4fb680f34f7c9ad96a8f24ec88be73ea8e5a6c65260e9cb8a7",
    });
    const document = createDocument({
      id: "document-pages",
      projectId: "project-docs",
      evidenceItemId: "evidence-doc-pages",
      mediaAssetId: firstPage.id,
      title: "Two-page authorization",
      fileName: "two-page-authorization.scanned-pages",
      mimeType: "image/jpeg",
      pageCount: 2,
      sizeBytes: firstPage.sizeBytes + secondPage.sizeBytes,
      sourceType: "DOCUMENT_SCAN",
    });

    expect(
      getProofPacketDocumentEntry(document, [secondPage, firstPage]),
    ).toMatchObject({
      previewKind: "visual",
      visualMediaAssetId: firstPage.id,
      visualMediaAssetIds: [firstPage.id, secondPage.id],
      visualPageCount: 2,
      missingMetadata: [],
      label: "Visual document pages",
    });
  });

  it("classifies imported PDFs as external originals with immutable metadata", () => {
    const importedPdf = createDocument({
      id: "document-imported-pdf",
      projectId: "project-docs",
      evidenceItemId: "evidence-imported-pdf",
      mediaAssetId: "media-imported-pdf",
      title: "Signed authorization PDF",
      fileName: "signed-authorization.pdf",
      mimeType: "application/pdf",
      sizeBytes: 4096,
      sha256:
        "a4ebf8f18c8bd184221f6404d2dd9d77be4a27b29ecab2ae0e4ef5f7a1f42f3e",
      sourceType: "FILE_IMPORT",
    });

    expect(getProofPacketDocumentEntry(importedPdf, [])).toMatchObject({
      previewKind: "external_original",
      fileProfile: "imported_pdf",
      reviewStatus: "external_review_required",
      deliverySafe: true,
      visualPageCount: 0,
      missingMetadata: [],
      label: "Imported PDF original",
      proofSummary:
        "Original file hash, size, MIME type, and source are preserved for delivery review.",
      recommendedAction:
        "Open the original PDF from private storage for full visual review until PDF page previews are available.",
    });
  });

  it("blocks unsupported supporting documents from delivery", () => {
    const scriptDocument = createDocument({
      id: "document-script",
      projectId: "project-docs",
      evidenceItemId: "evidence-script",
      mediaAssetId: null,
      title: "Uploaded script",
      fileName: "invoice.html",
      mimeType: "text/html",
      sizeBytes: 1024,
      sha256:
        "a4ebf8f18c8bd184221f6404d2dd9d77be4a27b29ecab2ae0e4ef5f7a1f42f3e",
      sourceType: "FILE_IMPORT",
    });

    expect(getProofPacketDocumentEntry(scriptDocument, [])).toMatchObject({
      previewKind: "incomplete",
      reviewStatus: "blocked_unsupported",
      deliverySafe: false,
      label: "Blocked document type",
      recommendedAction:
        "Replace it with a PDF, image, or office document, or review the original manually before delivery.",
    });

    expect(
      getReportDeliveryReadiness({
        reportReady: true,
        hasGeneratedPdf: true,
        reportPdfUploaded: true,
        mediaCount: 0,
        uploadedMediaCount: 0,
        missingCaptionCount: 0,
        documentCount: 1,
        visualDocumentCount: 0,
        blockedDocumentCount: 1,
      }).blockers,
    ).toContain("Remove or replace 1 blocked supporting document.");
  });

  it("explains report delivery readiness with blockers and warnings", () => {
    expect(
      getReportDeliveryReadiness({
        reportReady: true,
        hasGeneratedPdf: true,
        reportPdfUploaded: true,
        mediaCount: 3,
        uploadedMediaCount: 3,
        missingCaptionCount: 0,
        documentCount: 1,
        visualDocumentCount: 0,
        externalOriginalDocumentCount: 0,
        metadataOnlyDocumentCount: 1,
        privateStorageReady: true,
        subscriptionActive: true,
        shareLinkCount: 0,
      }),
    ).toMatchObject({
      ready: true,
      status: "ready_to_share",
      warnings: [
        "1 supporting document is metadata-only in the packet.",
        "No customer share link has been issued yet.",
      ],
    });

    expect(
      getReportDeliveryReadiness({
        reportReady: false,
        hasGeneratedPdf: false,
        reportPdfUploaded: false,
        mediaCount: 2,
        uploadedMediaCount: 1,
        missingCaptionCount: 2,
      }),
    ).toMatchObject({
      ready: false,
      status: "needs_captions",
      blockers: expect.arrayContaining([
        "Finish required captions and included evidence.",
        "2 captions still need review.",
        "Generate the Proof Packet PDF.",
        "Upload 1 original media file.",
      ]),
    });
  });

  it("treats imported originals as complete delivery evidence with warnings", () => {
    expect(
      getReportDeliveryReadiness({
        reportReady: true,
        hasGeneratedPdf: true,
        reportPdfUploaded: true,
        mediaCount: 1,
        uploadedMediaCount: 1,
        missingCaptionCount: 0,
        documentCount: 1,
        visualDocumentCount: 0,
        externalOriginalDocumentCount: 1,
        metadataOnlyDocumentCount: 0,
        privateStorageReady: true,
        subscriptionActive: true,
        shareLinkCount: 1,
      }),
    ).toMatchObject({
      ready: true,
      status: "ready_to_share",
      warnings: [
        "1 imported document is available as original files but not visually embedded.",
      ],
    });
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
  > &
    Partial<Pick<EvidenceItem, "isImportant">>,
): EvidenceItem {
  return {
    ...input,
    notes: null,
    isImportant: input.isImportant ?? false,
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
  > &
    Partial<
      Pick<MediaAsset, "mediaType" | "mimeType" | "sha256" | "sourceType">
    >,
): MediaAsset {
  const mediaType = input.mediaType ?? "IMAGE";
  const mimeType = input.mimeType ?? "image/jpeg";

  return {
    ...input,
    localUri: `file:///fielddoc/${input.id}.${mediaType === "DOCUMENT" ? "pdf" : "jpg"}`,
    storageObjectKey: null,
    mediaType,
    mimeType,
    sizeBytes: 1024,
    sha256: input.sha256 ?? "00",
    width: 800,
    height: 600,
    notes: null,
    sourceType: input.sourceType ?? "CAMERA_PHOTO",
    originalAssetId: null,
    derivativeType: null,
    uploadedAt: null,
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

function createDocument(
  input: Pick<Document, "id" | "projectId" | "evidenceItemId" | "title"> &
    Partial<
      Pick<
        Document,
        | "mediaAssetId"
        | "fileName"
        | "mimeType"
        | "sizeBytes"
        | "sha256"
        | "notes"
        | "pageCount"
        | "sourceType"
      >
    >,
): Document {
  return {
    id: input.id,
    projectId: input.projectId,
    evidenceItemId: input.evidenceItemId,
    mediaAssetId: input.mediaAssetId ?? null,
    title: input.title,
    notes: input.notes ?? null,
    fileName: input.fileName ?? null,
    mimeType: input.mimeType ?? null,
    sizeBytes: input.sizeBytes ?? null,
    sha256: input.sha256 ?? null,
    pageCount: input.pageCount ?? null,
    sourceType: input.sourceType ?? "DOCUMENT_SCAN",
    createdAt: "2026-08-17T14:10:00.000Z",
    updatedAt: "2026-08-17T14:10:00.000Z",
    deletedAt: null,
    syncState: "PENDING",
  };
}
