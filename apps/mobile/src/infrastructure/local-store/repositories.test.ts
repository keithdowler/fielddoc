import { describe, expect, it } from "vitest";

import { createNodeSqliteDatabase } from "./node-sqlite-database.test-helper";
import { createLocalRepositories } from "./repositories";
import { localDatabaseVersion } from "./schema";

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

describe("SQLite local repositories", () => {
  it("migrates from an empty database", async () => {
    await withRepositories(async ({ database }) => {
      const row = await database.getFirst<{ version: number }>(
        "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1",
      );

      expect(row?.version).toBe(localDatabaseVersion);
    });
  });

  it("persists projects and supports search and ordering", async () => {
    await withRepositories(async ({ projects }) => {
      const first = await projects.create({
        name: "Unit 12 Turnover",
        customerCompany: "Rivergate",
      });
      await projects.create({ name: "HVAC filter", siteAddress: "Warehouse" });

      expect(
        (await projects.list({ query: "river" })).map((project) => project.id),
      ).toEqual([first.id]);
      expect(
        (await projects.list({ sortBy: "name", sortDirection: "asc" })).map(
          (project) => project.name,
        ),
      ).toEqual(["HVAC filter", "Unit 12 Turnover"]);
    });
  });

  it("soft deletes projects and generates mutations", async () => {
    await withRepositories(async ({ projects, mutations }) => {
      const project = await projects.create({ name: "Soft delete me" });
      await projects.delete(project.id);

      expect(await projects.getById(project.id)).toBeNull();
      expect(await mutations.countPending()).toBe(2);
      expect(
        (await mutations.listPending()).map((mutation) => mutation.operation),
      ).toEqual(["CREATE", "DELETE"]);
    });
  });

  it("archives projects without deleting their record", async () => {
    await withRepositories(async ({ projects }) => {
      const project = await projects.create({ name: "Archive me" });
      await projects.archive(project.id);

      expect(await projects.list()).toEqual([]);
      expect((await projects.list({ includeArchived: true }))[0]?.status).toBe(
        "archived",
      );
    });
  });

  it("stores evidence metadata in project order and summarizes report readiness", async () => {
    await withRepositories(async ({ projects, evidence }) => {
      const project = await projects.create({ name: "Evidence project" });
      const after = await evidence.create({
        projectId: project.id,
        category: "AFTER",
        title: "Done",
        caption: "Finished work",
      });
      const before = await evidence.create({
        projectId: project.id,
        category: "BEFORE",
        title: "Before",
      });

      expect(
        (await evidence.listByProject(project.id)).map((item) => item.id),
      ).toEqual([before.id, after.id]);
      expect(await evidence.summarizeProject(project.id)).toMatchObject({
        beforeCount: 1,
        afterCount: 1,
        missingCaptionCount: 1,
      });
    });
  });

  it("deduplicates mutations by mutation id", async () => {
    await withRepositories(async ({ mutations }) => {
      await mutations.enqueue({
        mutationId: "same-mutation",
        entityType: "Project",
        entityId: "project-1",
        operation: "UPDATE",
        payloadRef: "v1",
        payloadJson: "{}",
        createdAt: "2026-08-12T20:00:00.000Z",
      });
      await mutations.enqueue({
        mutationId: "same-mutation",
        entityType: "Project",
        entityId: "project-1",
        operation: "UPDATE",
        payloadRef: "v1",
        payloadJson: '{"ignored":true}',
        createdAt: "2026-08-12T20:00:01.000Z",
      });

      expect(await mutations.countPending()).toBe(1);
      expect((await mutations.listPending())[0]?.payloadJson).toBe("{}");
    });
  });
});
