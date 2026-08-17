import { describe, expect, it } from "vitest";

import { createNodeSqliteDatabase } from "@/infrastructure/local-store/node-sqlite-database.test-helper";
import { createLocalRepositories } from "@/infrastructure/local-store/repositories";

import { runMobilePullSync } from "./mobile-pull-sync";

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

describe("runMobilePullSync", () => {
  it("requires API configuration before downloading", async () => {
    await withRepositories(async (repositories) => {
      const result = await runMobilePullSync({
        repositories,
        apiBaseUrl: null,
        tokenProvider: { getAccessToken: async () => "token" },
      });

      expect(result).toMatchObject({
        status: "not_configured",
        pulledCount: 0,
      });
    });
  });

  it("requires a cloud session before downloading", async () => {
    await withRepositories(async (repositories) => {
      const result = await runMobilePullSync({
        repositories,
        apiBaseUrl: "https://example.test",
        tokenProvider: { getAccessToken: async () => null },
      });

      expect(result).toMatchObject({
        status: "auth_required",
        pulledCount: 0,
      });
    });
  });

  it("downloads cloud changes, applies them locally, and stores cursor diagnostics", async () => {
    await withRepositories(async (repositories) => {
      const result = await runMobilePullSync({
        repositories,
        apiBaseUrl: "https://example.test",
        tokenProvider: { getAccessToken: async () => "token" },
        now: () => new Date("2026-08-17T16:00:00.000Z"),
        apiClient: {
          pullSyncChanges: async (input) => {
            expect(input.cursor).toBeNull();
            return {
              serverTime: "2026-08-17T15:59:00.000Z",
              cursor: "2026-08-17T15:58:00.000Z",
              hasMore: false,
              changes: {
                projects: [
                  {
                    id: "11111111-1111-4111-8111-111111111111",
                    customerId: null,
                    siteId: null,
                    name: "Pulled project",
                    customerCompany: null,
                    siteAddress: null,
                    workOrderReference: null,
                    scheduledDate: null,
                    notes: null,
                    status: "active",
                    archivedAt: null,
                    createdAt: "2026-08-17T15:00:00.000Z",
                    updatedAt: "2026-08-17T15:58:00.000Z",
                    deletedAt: null,
                    serverVersion: 1,
                  },
                ],
                evidenceItems: [],
                mediaAssets: [],
                annotations: [],
                documents: [],
                reportDrafts: [],
              },
            };
          },
        },
      });
      const diagnostics =
        await repositories.syncClientState.getPullDiagnostics();

      expect(result).toMatchObject({
        status: "success",
        pulledCount: 1,
        appliedCount: 1,
        cursor: "2026-08-17T15:58:00.000Z",
        lastPulledAt: "2026-08-17T16:00:00.000Z",
      });
      expect(diagnostics).toMatchObject({
        cursor: "2026-08-17T15:58:00.000Z",
        lastPulledAt: "2026-08-17T16:00:00.000Z",
        pulledCount: 1,
        appliedCount: 1,
        conflictCount: 0,
      });
      expect(
        await repositories.projects.list({ includeArchived: true }),
      ).toMatchObject([{ name: "Pulled project" }]);
    });
  });
});
