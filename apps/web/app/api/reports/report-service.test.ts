import { describe, expect, it } from "vitest";

import {
  createPublicReportShareRedirectHandler,
  createReportPdfDownloadPrepareHandler,
  createReportPdfUploadCompleteHandler,
  createReportPdfUploadPrepareHandler,
  createReportShareLinkCreateHandler,
  hashShareToken,
} from "./report-service";
import type {
  ReportArchiveRepository,
  StoredReportExport,
} from "./neon-report-repository";
import type { PrivateObjectStorage } from "../media/private-object-storage";
import type {
  SyncAuthPrincipal,
  SyncMutationAuthVerifier,
} from "../sync/mutations/sync-service";

const organizationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const reportDraftId = "33333333-3333-4333-8333-333333333333";
const reportExportId = "44444444-4444-4444-8444-444444444444";
const shareLinkId = "55555555-5555-4555-8555-555555555555";
const sha256 =
  "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08";
const expectedReportObjectKey =
  "organizations/11111111-1111-4111-8111-111111111111/reports/33333333-3333-4333-8333-333333333333/exports/9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08.pdf";

describe("report service", () => {
  it("prepares organization-scoped private PDF uploads", async () => {
    const response = await createReportPdfUploadPrepareHandler(
      createDependencies(),
    )(
      jsonRequest("/api/reports/uploads/prepare", {
        reportDraftId,
        mimeType: "application/pdf",
        sizeBytes: 4096,
        sha256,
        generatedAt: "2026-08-17T15:00:00.000Z",
        fileExtension: "pdf",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      reportDraftId,
      storageObjectKey: expectedReportObjectKey,
      uploadUrl: expect.stringContaining("https://uploads.example.test/"),
      requiredHeaders: {
        "Content-Type": "application/pdf",
        "x-amz-meta-sha256": sha256,
      },
      expiresAt: "2026-08-17T15:10:00.000Z",
    });
  });

  it("records report exports only after private object verification", async () => {
    const repository = createRepository();
    const response = await createReportPdfUploadCompleteHandler(
      createDependencies({ repository }),
    )(
      jsonRequest("/api/reports/uploads/complete", {
        reportDraftId,
        storageObjectKey: expectedReportObjectKey,
        sha256,
        sizeBytes: 4096,
        generatedAt: "2026-08-17T15:00:00.000Z",
        uploadedAt: "2026-08-17T15:02:00.000Z",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "recorded",
      reportDraftId,
      reportExportId,
    });
    expect(repository.lastRecordedExport).toMatchObject({
      organizationId,
      reportDraftId,
      storageObjectKey: expectedReportObjectKey,
      sha256,
    });
  });

  it("refuses report export completion when object integrity fails", async () => {
    const repository = createRepository();
    const response = await createReportPdfUploadCompleteHandler(
      createDependencies({
        repository,
        storage: createStorage({
          verification: {
            ok: false,
            code: "MEDIA_OBJECT_HASH_MISMATCH",
            message: "Uploaded report bytes do not match.",
          },
        }),
      }),
    )(
      jsonRequest("/api/reports/uploads/complete", {
        reportDraftId,
        storageObjectKey: expectedReportObjectKey,
        sha256,
        sizeBytes: 4096,
        generatedAt: "2026-08-17T15:00:00.000Z",
        uploadedAt: "2026-08-17T15:02:00.000Z",
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "MEDIA_OBJECT_HASH_MISMATCH" },
    });
    expect(repository.lastRecordedExport).toBeUndefined();
  });

  it("prepares private report downloads after export archival", async () => {
    const response = await createReportPdfDownloadPrepareHandler(
      createDependencies(),
    )(jsonRequest("/api/reports/downloads/prepare", { reportDraftId }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      reportDraftId,
      reportExportId,
      storageObjectKey: expectedReportObjectKey,
      downloadUrl: expect.stringContaining("https://downloads.example.test/"),
      expiresAt: "2026-08-17T15:05:00.000Z",
    });
  });

  it("creates expiring share links without exposing object storage keys", async () => {
    const repository = createRepository();
    const response = await createReportShareLinkCreateHandler(
      createDependencies({
        repository,
        tokenFactory: () => "share_token_12345678901234567890",
      }),
    )(
      jsonRequest("/api/reports/share-links", {
        reportDraftId,
        expiresAt: "2026-08-24T15:00:00.000Z",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      reportDraftId,
      reportExportId,
      shareLinkId,
      shareUrl:
        "https://example.test/share/reports/share_token_12345678901234567890",
      expiresAt: "2026-08-24T15:00:00.000Z",
    });
    expect(repository.lastShareLink?.tokenHash).toBe(
      hashShareToken("share_token_12345678901234567890"),
    );
  });

  it("redirects valid public share links to short-lived private URLs", async () => {
    const repository = createRepository();
    const response = await createPublicReportShareRedirectHandler({
      createRepository: () => repository,
      createStorage: () => createStorage(),
      now: () => new Date("2026-08-17T15:00:00.000Z"),
    })("share_token_12345678901234567890");

    expect(response.status).toBe(302);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("location")).toContain(
      "https://downloads.example.test/",
    );
    expect(repository.lastShareLinkAccess).toEqual({
      shareLinkId,
      accessedAt: new Date("2026-08-17T15:00:00.000Z"),
    });
  });
});

function jsonRequest(path: string, body: unknown): Request {
  return new Request(`https://example.test${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer token",
    },
    body: JSON.stringify(body),
  });
}

function createDependencies(
  input: {
    repository?: ReturnType<typeof createRepository>;
    storage?: PrivateObjectStorage;
    tokenFactory?: () => string;
  } = {},
) {
  return {
    createAuthVerifier: () => createAuthVerifier(),
    createRepository: () => input.repository ?? createRepository(),
    createStorage: () => input.storage ?? createStorage(),
    tokenFactory: input.tokenFactory,
    now: () => new Date("2026-08-17T15:00:00.000Z"),
  };
}

function createAuthVerifier(): SyncMutationAuthVerifier {
  const principal: SyncAuthPrincipal = {
    externalAuthId: "user_external",
    organizationId: "org_external",
    organizationRole: "org:admin",
  };

  return {
    verify: async () => ({ ok: true, principal }),
  };
}

function createRepository() {
  const exportRow: StoredReportExport = {
    id: reportExportId,
    reportDraftId,
    storageObjectKey: expectedReportObjectKey,
    mimeType: "application/pdf",
    sizeBytes: 4096,
    sha256,
    generatedAt: new Date("2026-08-17T15:00:00.000Z"),
    uploadedAt: new Date("2026-08-17T15:02:00.000Z"),
  };
  const repository: ReportArchiveRepository & {
    lastRecordedExport?: Parameters<
      ReportArchiveRepository["recordReportExport"]
    >[0];
    lastShareLink?: Parameters<ReportArchiveRepository["createShareLink"]>[0];
    lastShareLinkAccess?: {
      shareLinkId: string;
      accessedAt: Date;
    };
  } = {
    resolveMembership: async () => ({
      organizationId,
      userId,
      role: "admin",
    }),
    getReportDraft: async () => ({
      id: reportDraftId,
      projectId: "66666666-6666-4666-8666-666666666666",
      generatedPdfObjectKey: null,
    }),
    recordReportExport: async (input) => {
      repository.lastRecordedExport = input;
      return exportRow;
    },
    getLatestReportExport: async () => exportRow,
    createShareLink: async (input) => {
      repository.lastShareLink = input;
      return {
        id: shareLinkId,
        expiresAt: new Date(input.expiresAt),
      };
    },
    getShareLinkByTokenHash: async () => ({
      id: shareLinkId,
      reportExport: exportRow,
      expiresAt: new Date("2026-08-24T15:00:00.000Z"),
      revokedAt: null,
    }),
    recordShareLinkAccess: async (id, accessedAt) => {
      repository.lastShareLinkAccess = { shareLinkId: id, accessedAt };
    },
  };

  return repository;
}

function createStorage(
  input: {
    verification?: Awaited<ReturnType<PrivateObjectStorage["verifyObject"]>>;
  } = {},
): PrivateObjectStorage {
  return {
    createPresignedUrl: (input) =>
      input.method === "PUT"
        ? `https://uploads.example.test/${input.objectKey}`
        : `https://downloads.example.test/${input.objectKey}`,
    verifyObject: async () =>
      input.verification ?? {
        ok: true,
        sizeBytes: 4096,
        contentType: "application/pdf",
        sha256,
        metadataSha256: sha256,
      },
  };
}
