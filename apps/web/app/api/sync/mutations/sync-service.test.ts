import { describe, expect, it } from "vitest";

import {
  createSyncMutationPostHandler,
  type RecordReceivedMutationInput,
  type SyncAuthPrincipal,
  type SyncAuthResult,
  type SyncMutationPersistence,
} from "./sync-service";

const principal: SyncAuthPrincipal = {
  externalAuthId: "user_123",
  organizationId: "9b48b114-8efc-4c69-8dcc-e0c1a1d2ad8c",
  organizationRole: "org:admin",
};

const membership = {
  organizationId: principal.organizationId,
  userId: "ba2ac61a-68df-4b46-9191-55ef29e27fd2",
  role: "admin",
};

const validMutation = {
  mutationId: "project:3f205a6f-3f5f-4f85-baba-f1dac348273a:create:v1",
  entityType: "Project" as const,
  entityId: "3f205a6f-3f5f-4f85-baba-f1dac348273a",
  operation: "CREATE" as const,
  payloadRef: "2026-08-15T14:59:00.000Z",
  payloadJson: { name: "Unit 12 turnover" },
  createdAt: "2026-08-15T14:59:00.000Z",
  attemptCount: 0,
  syncState: "PENDING" as const,
};

const validUpload = {
  clientId: "ios-app",
  deviceId: "simulator-17-pro",
  sentAt: "2026-08-15T15:00:00.000Z",
  mutations: [validMutation],
};

describe("createSyncMutationPostHandler", () => {
  it("records accepted mutations after auth and membership checks", async () => {
    const writes: RecordReceivedMutationInput[] = [];
    const handler = createTestHandler({
      persistence: {
        resolveMembership: async () => membership,
        recordReceivedMutation: async (input) => {
          writes.push(input);
          return { status: "accepted" };
        },
      },
    });

    const response = await handler(createRequest(validUpload));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      serverTime: "2026-08-15T15:01:00.000Z",
      acceptedMutationIds: [validMutation.mutationId],
      duplicateMutationIds: [],
      rejectedMutations: [],
      pullCursor: null,
    });
    expect(writes[0]).toMatchObject({
      deviceId: "simulator-17-pro",
      membership,
      mutation: validMutation,
    });
  });

  it("classifies duplicate mutation ids without treating them as errors", async () => {
    const seenMutationIds = new Set<string>();
    const persistence: SyncMutationPersistence = {
      resolveMembership: async () => membership,
      recordReceivedMutation: async ({ mutation }) => {
        if (seenMutationIds.has(mutation.mutationId)) {
          return { status: "duplicate" };
        }

        seenMutationIds.add(mutation.mutationId);
        return { status: "accepted" };
      },
    };
    const handler = createTestHandler({ persistence });

    await handler(createRequest(validUpload));
    const duplicateResponse = await handler(createRequest(validUpload));
    const duplicateBody = await duplicateResponse.json();

    expect(duplicateResponse.status).toBe(200);
    expect(duplicateBody.acceptedMutationIds).toEqual([]);
    expect(duplicateBody.duplicateMutationIds).toEqual([
      validMutation.mutationId,
    ]);
  });

  it("rejects mutations that are not pending or retryable", async () => {
    const handler = createTestHandler();
    const response = await handler(
      createRequest({
        ...validUpload,
        mutations: [{ ...validMutation, syncState: "SYNCED" }],
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.acceptedMutationIds).toEqual([]);
    expect(body.rejectedMutations).toEqual([
      {
        mutationId: validMutation.mutationId,
        code: "MUTATION_NOT_UPLOADABLE",
        message:
          "Only pending or failed local mutations can be uploaded to sync.",
      },
    ]);
  });

  it("requires active organization context from auth", async () => {
    const handler = createTestHandler({
      auth: {
        ok: false,
        code: "ORGANIZATION_REQUIRED",
        message: "An active organization is required to upload mutations.",
        status: 403,
      },
    });

    const response = await handler(createRequest(validUpload));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("ORGANIZATION_REQUIRED");
  });

  it("requires server-side organization membership", async () => {
    const handler = createTestHandler({
      persistence: {
        resolveMembership: async () => null,
        recordReceivedMutation: async () => ({ status: "accepted" }),
      },
    });

    const response = await handler(createRequest(validUpload));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("ORGANIZATION_MEMBERSHIP_REQUIRED");
  });
});

function createTestHandler(
  options: {
    auth?: SyncAuthResult;
    persistence?: SyncMutationPersistence;
  } = {},
) {
  return createSyncMutationPostHandler({
    createAuthVerifier: () => ({
      verify: async () => options.auth ?? { ok: true, principal },
    }),
    createPersistence: () =>
      options.persistence ?? {
        resolveMembership: async () => membership,
        recordReceivedMutation: async () => ({ status: "accepted" }),
      },
    now: () => new Date("2026-08-15T15:01:00.000Z"),
  });
}

function createRequest(body: unknown): Request {
  return new Request("https://example.test/api/sync/mutations", {
    method: "POST",
    headers: {
      Authorization: "Bearer token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}
