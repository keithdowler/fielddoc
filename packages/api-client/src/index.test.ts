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
});
