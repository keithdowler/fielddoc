import { describe, expect, it } from "vitest";

import { createWebReportDownloadRedirectHandler } from "./report-download-route";
import type {
  ReportArchiveRepository,
  StoredReportExport,
} from "../../api/reports/neon-report-repository";
import type { PrivateObjectStorage } from "../../api/media/private-object-storage";
import type { AuditEventInput } from "../../api/audit/audit-log";

const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const reportDraftId = "33333333-3333-4333-8333-333333333333";
const reportExportId = "44444444-4444-4444-8444-444444444444";
const reportObjectKey =
  "organizations/org/reports/report/exports/proof-packet.pdf";

describe("createWebReportDownloadRedirectHandler", () => {
  it("requires an authenticated web user and active organization", async () => {
    const unauthenticated = await createWebReportDownloadRedirectHandler({
      getAuthContext: async () => ({ userId: null, orgId: null }),
      createRepository,
      createStorage,
    })(reportDraftId);

    expect(unauthenticated.status).toBe(401);

    const missingOrg = await createWebReportDownloadRedirectHandler({
      getAuthContext: async () => ({ userId: "user_external", orgId: null }),
      createRepository,
      createStorage,
    })(reportDraftId);

    expect(missingOrg.status).toBe(403);
  });

  it("redirects to a short-lived private report URL and records audit", async () => {
    const auditEvents: AuditEventInput[] = [];
    const response = await createWebReportDownloadRedirectHandler({
      getAuthContext: async () => ({
        userId: "user_external",
        orgId: "org_external",
      }),
      createRepository,
      createStorage,
      createAuditWriter: () => ({
        record: async (event) => {
          auditEvents.push(event);
        },
      }),
      now: () => new Date("2026-08-17T15:00:00.000Z"),
    })(
      reportDraftId,
      new Request("https://example.test/app/reports/download", {
        headers: { "x-request-id": "req-report" },
      }),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("location")).toBe(
      "https://downloads.example.test/organizations/org/reports/report/exports/proof-packet.pdf?expires=300",
    );
    expect(auditEvents).toContainEqual(
      expect.objectContaining({
        organizationId,
        actorUserId: userId,
        actorExternalId: "user_external",
        eventType: "web_report_download_redirect",
        entityType: "ReportExport",
        entityId: reportExportId,
        requestId: "req-report",
      }),
    );
  });

  it("does not redirect report exports outside the signed-in organization", async () => {
    const response = await createWebReportDownloadRedirectHandler({
      getAuthContext: async () => ({
        userId: "user_external",
        orgId: "org_external",
      }),
      createRepository: () => createRepository({ membership: null }),
      createStorage,
    })(reportDraftId);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "ORGANIZATION_MEMBERSHIP_REQUIRED" },
    });
  });
});

function createRepository(
  input: {
    membership?: {
      organizationId: string;
      userId: string;
      role: string;
    } | null;
    reportExport?: StoredReportExport | null;
  } = {},
): ReportArchiveRepository {
  return {
    resolveMembership: async () =>
      input.membership === undefined
        ? { organizationId, userId, role: "admin" }
        : input.membership,
    getReportDraft: async () => null,
    recordReportExport: async () => createReportExport(),
    getLatestReportExport: async () =>
      input.reportExport === undefined
        ? createReportExport()
        : input.reportExport,
    createShareLink: async () => ({
      id: "55555555-5555-4555-8555-555555555555",
      expiresAt: new Date("2026-08-24T15:00:00.000Z"),
    }),
    getShareLinkByTokenHash: async () => null,
    recordShareLinkAccess: async () => undefined,
  };
}

function createReportExport(): StoredReportExport {
  return {
    id: reportExportId,
    reportDraftId,
    storageObjectKey: reportObjectKey,
    mimeType: "application/pdf",
    sizeBytes: 4096,
    sha256: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    generatedAt: new Date("2026-08-17T14:00:00.000Z"),
    uploadedAt: new Date("2026-08-17T14:05:00.000Z"),
  };
}

function createStorage(): PrivateObjectStorage {
  return {
    createPresignedUrl: (input) =>
      `https://downloads.example.test/${input.objectKey}?expires=${input.expiresInSeconds}`,
    verifyObject: async () => ({
      ok: true,
      sizeBytes: 4096,
      contentType: "application/pdf",
      sha256:
        "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      metadataSha256:
        "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    }),
  };
}
