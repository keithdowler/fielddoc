import { describe, expect, it } from "vitest";
import type { FieldDocApiClient } from "@fielddoc/api-client";

import { createNodeSqliteDatabase } from "@/infrastructure/local-store/node-sqlite-database.test-helper";
import { createLocalRepositories } from "@/infrastructure/local-store/repositories";
import { runMobileOutboxSync } from "./mobile-outbox-sync";

async function withRepositories<T>(
  test: (
    repositories: Awaited<ReturnType<typeof createLocalRepositories>>,
  ) => Promise<T>,
): Promise<T> {
  const database = await createNodeSqliteDatabase();
  try {
    const repositories = await createLocalRepositories(database);
    return await test(repositories);
  } finally {
    database.close();
  }
}

describe("runMobileOutboxSync", () => {
  it("reports missing API configuration without changing local mutations", async () => {
    await withRepositories(async (repositories) => {
      await repositories.projects.create({ name: "Offline project" });

      const result = await runMobileOutboxSync({
        repositories,
        apiBaseUrl: null,
        tokenProvider: { getAccessToken: async () => "token" },
      });

      expect(result).toMatchObject({
        status: "not_configured",
        pendingCount: 1,
      });
      expect((await repositories.mutations.listPending())[0]).toMatchObject({
        syncState: "PENDING",
        attemptCount: 0,
      });
    });
  });

  it("requires an auth token before upload", async () => {
    await withRepositories(async (repositories) => {
      await repositories.projects.create({ name: "Needs auth" });

      const result = await runMobileOutboxSync({
        repositories,
        apiBaseUrl: "https://proof.example",
        tokenProvider: { getAccessToken: async () => null },
      });

      expect(result).toMatchObject({
        status: "auth_required",
        pendingCount: 1,
      });
    });
  });

  it("uploads pending mutations and marks accepted receipts as synced", async () => {
    await withRepositories(async (repositories) => {
      const project = await repositories.projects.create({
        name: "Syncable project",
      });
      const mutation = (await repositories.mutations.listUploadable())[0];
      const requests: Parameters<
        FieldDocApiClient["uploadLocalMutations"]
      >[0][] = [];
      const apiClient: FieldDocApiClient = {
        async uploadLocalMutations(input) {
          requests.push(input);

          return {
            serverTime: "2026-08-16T14:00:00.000Z",
            acceptedMutationIds: [mutation?.mutationId ?? ""],
            duplicateMutationIds: [],
            rejectedMutations: [],
            pullCursor: null,
          };
        },
        async prepareMediaUpload() {
          throw new Error("Not used by mobile outbox sync.");
        },
        async completeMediaUpload() {
          throw new Error("Not used by mobile outbox sync.");
        },
        async prepareMediaDownload() {
          throw new Error("Not used by mobile outbox sync.");
        },
      };

      const result = await runMobileOutboxSync({
        repositories,
        apiBaseUrl: "https://proof.example",
        apiClient,
        now: () => new Date("2026-08-16T13:59:00.000Z"),
        tokenProvider: { getAccessToken: async () => "token" },
      });

      expect(requests[0]).toMatchObject({
        clientId: "fielddoc-mobile",
        sentAt: "2026-08-16T13:59:00.000Z",
        mutations: [
          {
            entityId: project.id,
            entityType: "Project",
            operation: "CREATE",
          },
        ],
      });
      expect(requests[0]?.deviceId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
      );
      expect(result).toMatchObject({
        status: "success",
        acceptedCount: 1,
        pendingCount: 0,
      });
      expect(await repositories.mutations.listPending()).toEqual([]);
    });
  });

  it("keeps rejected mutations pending as failed", async () => {
    await withRepositories(async (repositories) => {
      await repositories.projects.create({ name: "Rejected project" });
      const mutation = (await repositories.mutations.listUploadable())[0];
      const apiClient: FieldDocApiClient = {
        async uploadLocalMutations() {
          return {
            serverTime: "2026-08-16T14:00:00.000Z",
            acceptedMutationIds: [],
            duplicateMutationIds: [],
            rejectedMutations: [
              {
                mutationId: mutation?.mutationId ?? "",
                code: "INVALID_ENTITY",
                message: "Entity cannot be applied yet.",
              },
            ],
            pullCursor: null,
          };
        },
        async prepareMediaUpload() {
          throw new Error("Not used by mobile outbox sync.");
        },
        async completeMediaUpload() {
          throw new Error("Not used by mobile outbox sync.");
        },
        async prepareMediaDownload() {
          throw new Error("Not used by mobile outbox sync.");
        },
      };

      const result = await runMobileOutboxSync({
        repositories,
        apiBaseUrl: "https://proof.example",
        apiClient,
        tokenProvider: { getAccessToken: async () => "token" },
      });

      expect(result).toMatchObject({
        status: "partial",
        rejectedCount: 1,
        pendingCount: 1,
      });
      expect((await repositories.mutations.listPending())[0]).toMatchObject({
        syncState: "FAILED",
        attemptCount: 1,
      });
    });
  });
});
