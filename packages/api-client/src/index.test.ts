import { describe, expect, it } from "vitest";

import { createFieldDocApiClient, FieldDocApiError } from "./index";

const validUpload = {
  clientId: "ios-app",
  deviceId: "simulator-17-pro",
  sentAt: "2026-08-15T15:00:00.000Z",
  mutations: [
    {
      mutationId: "project:3f205a6f-3f5f-4f85-baba-f1dac348273a:create:v1",
      entityType: "Project" as const,
      entityId: "3f205a6f-3f5f-4f85-baba-f1dac348273a",
      operation: "CREATE" as const,
      payloadRef: "2026-08-15T14:59:00.000Z",
      payloadJson: { name: "Unit 12 turnover" },
      createdAt: "2026-08-15T14:59:00.000Z",
      attemptCount: 0,
      syncState: "PENDING" as const,
    },
  ],
};

const validMutationId = validUpload.mutations[0]?.mutationId ?? "";

describe("createFieldDocApiClient", () => {
  it("posts validated local mutations to the sync route", async () => {
    const requests: Request[] = [];
    const client = createFieldDocApiClient({
      baseUrl: "https://example.test",
      accessToken: "token",
      fetchImpl: async (request) => {
        requests.push(request);
        return Response.json({
          serverTime: "2026-08-15T15:00:01.000Z",
          acceptedMutationIds: ["mutation-1"],
          duplicateMutationIds: [],
          rejectedMutations: [],
          pullCursor: null,
        });
      },
    });

    const response = await client.uploadLocalMutations(validUpload);

    expect(requests[0]?.url).toBe("https://example.test/api/sync/mutations");
    expect(requests[0]?.headers.get("authorization")).toBe("Bearer token");
    expect(response.acceptedMutationIds).toEqual(["mutation-1"]);
  });

  it("parses duplicate and rejected mutation classifications", async () => {
    const client = createFieldDocApiClient({
      baseUrl: "https://example.test",
      fetchImpl: async () =>
        Response.json({
          serverTime: "2026-08-15T15:00:01.000Z",
          acceptedMutationIds: [],
          duplicateMutationIds: [validMutationId],
          rejectedMutations: [
            {
              mutationId: "mutation-rejected",
              code: "MUTATION_NOT_UPLOADABLE",
              message:
                "Only pending or failed local mutations can be uploaded.",
            },
          ],
          pullCursor: null,
        }),
    });

    const response = await client.uploadLocalMutations(validUpload);

    expect(response.duplicateMutationIds).toEqual([validMutationId]);
    expect(response.rejectedMutations).toEqual([
      {
        mutationId: "mutation-rejected",
        code: "MUTATION_NOT_UPLOADABLE",
        message: "Only pending or failed local mutations can be uploaded.",
      },
    ]);
  });

  it("pulls canonical sync changes through the sync pull route", async () => {
    const requests: Request[] = [];
    const client = createFieldDocApiClient({
      baseUrl: "https://example.test",
      accessToken: "token",
      fetchImpl: async (request) => {
        requests.push(request);
        return Response.json({
          serverTime: "2026-08-17T15:00:00.000Z",
          cursor: "2026-08-17T14:59:59.000Z",
          hasMore: false,
          changes: {
            projects: [
              {
                id: "11111111-1111-4111-8111-111111111111",
                customerId: null,
                siteId: null,
                name: "Synced project",
                customerCompany: null,
                siteAddress: null,
                workOrderReference: null,
                scheduledDate: null,
                notes: null,
                status: "active",
                archivedAt: null,
                createdAt: "2026-08-17T14:00:00.000Z",
                updatedAt: "2026-08-17T14:59:59.000Z",
                deletedAt: null,
                serverVersion: 2,
              },
            ],
            evidenceItems: [],
            mediaAssets: [],
            annotations: [],
            documents: [],
            reportDrafts: [],
          },
        });
      },
    });

    const response = await client.pullSyncChanges({
      clientId: "fielddoc-mobile",
      deviceId: "device-1",
      cursor: null,
      limit: 250,
    });

    expect(requests[0]?.url).toBe("https://example.test/api/sync/pull");
    expect(requests[0]?.headers.get("authorization")).toBe("Bearer token");
    expect(response.changes.projects[0]?.name).toBe("Synced project");
  });

  it("throws typed API errors for rejected sync uploads", async () => {
    const client = createFieldDocApiClient({
      baseUrl: "https://example.test",
      fetchImpl: async () =>
        Response.json(
          {
            error: {
              code: "SYNC_PERSISTENCE_NOT_CONFIGURED",
              message: "Neon Postgres is not configured.",
            },
          },
          { status: 503 },
        ),
    });

    await expect(
      client.uploadLocalMutations(validUpload),
    ).rejects.toMatchObject({
      name: "FieldDocApiError",
      status: 503,
      code: "SYNC_PERSISTENCE_NOT_CONFIGURED",
    } satisfies Partial<FieldDocApiError>);
  });

  it("prepares media uploads through the media API", async () => {
    const requests: Request[] = [];
    const client = createFieldDocApiClient({
      baseUrl: "https://example.test",
      accessToken: "token",
      fetchImpl: async (request) => {
        requests.push(request);
        return Response.json({
          mediaAssetId: "33333333-3333-4333-8333-333333333333",
          storageObjectKey:
            "organizations/org/evidence/item/originals/media.jpg",
          uploadUrl: "https://uploads.example.test/media.jpg",
          requiredHeaders: {},
          expiresAt: "2026-08-16T14:10:00.000Z",
        });
      },
    });

    const response = await client.prepareMediaUpload({
      mediaAssetId: "33333333-3333-4333-8333-333333333333",
      evidenceItemId: "44444444-4444-4444-8444-444444444444",
      mimeType: "image/jpeg",
      sizeBytes: 1024,
      sha256:
        "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      fileExtension: "jpg",
    });

    expect(requests[0]?.url).toBe(
      "https://example.test/api/media/uploads/prepare",
    );
    expect(requests[0]?.headers.get("authorization")).toBe("Bearer token");
    expect(response.storageObjectKey).toContain("/originals/");
  });

  it("records media upload completion through the media API", async () => {
    const requests: Request[] = [];
    const client = createFieldDocApiClient({
      baseUrl: "https://example.test",
      fetchImpl: async (request) => {
        requests.push(request);
        return Response.json({
          mediaAssetId: "33333333-3333-4333-8333-333333333333",
          storageObjectKey:
            "organizations/org/evidence/item/originals/media.jpg",
          uploadedAt: "2026-08-16T14:02:00.000Z",
          status: "recorded",
        });
      },
    });

    const response = await client.completeMediaUpload({
      mediaAssetId: "33333333-3333-4333-8333-333333333333",
      storageObjectKey: "organizations/org/evidence/item/originals/media.jpg",
      sha256:
        "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      sizeBytes: 1024,
      uploadedAt: "2026-08-16T14:02:00.000Z",
    });

    expect(requests[0]?.url).toBe(
      "https://example.test/api/media/uploads/complete",
    );
    expect(response.status).toBe("recorded");
  });

  it("prepares report PDF uploads through the report API", async () => {
    const requests: Request[] = [];
    const client = createFieldDocApiClient({
      baseUrl: "https://example.test",
      accessToken: "token",
      fetchImpl: async (request) => {
        requests.push(request);
        return Response.json({
          reportDraftId: "33333333-3333-4333-8333-333333333333",
          storageObjectKey:
            "organizations/org/reports/report/exports/report.pdf",
          uploadUrl: "https://uploads.example.test/report.pdf",
          requiredHeaders: {},
          expiresAt: "2026-08-17T15:10:00.000Z",
        });
      },
    });

    const response = await client.prepareReportPdfUpload({
      reportDraftId: "33333333-3333-4333-8333-333333333333",
      mimeType: "application/pdf",
      sizeBytes: 4096,
      sha256:
        "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      generatedAt: "2026-08-17T15:00:00.000Z",
      fileExtension: "pdf",
    });

    expect(requests[0]?.url).toBe(
      "https://example.test/api/reports/uploads/prepare",
    );
    expect(requests[0]?.headers.get("authorization")).toBe("Bearer token");
    expect(response.storageObjectKey).toContain("/reports/");
  });

  it("records report PDF upload completion through the report API", async () => {
    const requests: Request[] = [];
    const client = createFieldDocApiClient({
      baseUrl: "https://example.test",
      fetchImpl: async (request) => {
        requests.push(request);
        return Response.json({
          reportDraftId: "33333333-3333-4333-8333-333333333333",
          reportExportId: "44444444-4444-4444-8444-444444444444",
          storageObjectKey:
            "organizations/org/reports/report/exports/report.pdf",
          uploadedAt: "2026-08-17T15:02:00.000Z",
          status: "recorded",
        });
      },
    });

    const response = await client.completeReportPdfUpload({
      reportDraftId: "33333333-3333-4333-8333-333333333333",
      storageObjectKey: "organizations/org/reports/report/exports/report.pdf",
      sha256:
        "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      sizeBytes: 4096,
      generatedAt: "2026-08-17T15:00:00.000Z",
      uploadedAt: "2026-08-17T15:02:00.000Z",
    });

    expect(requests[0]?.url).toBe(
      "https://example.test/api/reports/uploads/complete",
    );
    expect(response.reportExportId).toBe(
      "44444444-4444-4444-8444-444444444444",
    );
  });

  it("prepares report PDF downloads through the report API", async () => {
    const requests: Request[] = [];
    const client = createFieldDocApiClient({
      baseUrl: "https://example.test",
      fetchImpl: async (request) => {
        requests.push(request);
        return Response.json({
          reportDraftId: "33333333-3333-4333-8333-333333333333",
          reportExportId: "44444444-4444-4444-8444-444444444444",
          storageObjectKey:
            "organizations/org/reports/report/exports/report.pdf",
          downloadUrl: "https://downloads.example.test/report.pdf",
          expiresAt: "2026-08-17T15:05:00.000Z",
        });
      },
    });

    const response = await client.prepareReportPdfDownload({
      reportDraftId: "33333333-3333-4333-8333-333333333333",
    });

    expect(requests[0]?.url).toBe(
      "https://example.test/api/reports/downloads/prepare",
    );
    expect(response.downloadUrl).toBe(
      "https://downloads.example.test/report.pdf",
    );
  });

  it("creates report share links through the report API", async () => {
    const requests: Request[] = [];
    const client = createFieldDocApiClient({
      baseUrl: "https://example.test",
      fetchImpl: async (request) => {
        requests.push(request);
        return Response.json({
          reportDraftId: "33333333-3333-4333-8333-333333333333",
          reportExportId: "44444444-4444-4444-8444-444444444444",
          shareLinkId: "55555555-5555-4555-8555-555555555555",
          shareUrl:
            "https://example.test/share/reports/share_token_12345678901234567890",
          expiresAt: "2026-08-24T15:00:00.000Z",
        });
      },
    });

    const response = await client.createReportShareLink({
      reportDraftId: "33333333-3333-4333-8333-333333333333",
    });

    expect(requests[0]?.url).toBe(
      "https://example.test/api/reports/share-links",
    );
    expect(response.shareUrl).toContain("/share/reports/");
  });
});
