import { describe, expect, it } from "vitest";

import { createNodeSqliteDatabase } from "@/infrastructure/local-store/node-sqlite-database.test-helper";
import { createLocalRepositories } from "@/infrastructure/local-store/repositories";
import {
  clearLocalDeviceDatabase,
  countDeletedRows,
  createLocalPrivacyExport,
} from "./local-privacy-core";

describe("local privacy controls", () => {
  it("exports local metadata without deleting device data", async () => {
    const database = await createNodeSqliteDatabase();

    try {
      const repositories = await createLocalRepositories(database);
      const project = await repositories.projects.create({
        name: "Privacy export",
        customerCompany: "Example Co",
      });
      const evidence = await repositories.evidence.create({
        projectId: project.id,
        category: "BEFORE",
        caption: "Front door before work",
      });
      await repositories.media.create({
        evidenceItemId: evidence.id,
        localUri: "file:///fielddoc/evidence-originals/front.jpg",
        mediaType: "IMAGE",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        sha256:
          "88d4266fd4e6338d13b845fcf289579d209c897823b9217da3e1619360f03158",
        sourceType: "CAMERA_PHOTO",
      });

      const archive = await createLocalPrivacyExport({
        database,
        exportedAt: "2026-08-17T18:00:00.000Z",
      });

      expect(archive.exportedAt).toBe("2026-08-17T18:00:00.000Z");
      expect(archive.tables.projects).toHaveLength(1);
      expect(archive.tables.evidence_items).toHaveLength(1);
      expect(archive.tables.media_assets).toHaveLength(1);
      expect(archive.tables.local_mutations).toHaveLength(3);
      expect(await repositories.projects.list()).toHaveLength(1);
    } finally {
      database.close();
    }
  });

  it("clears local device tables while preserving schema migrations", async () => {
    const database = await createNodeSqliteDatabase();

    try {
      const repositories = await createLocalRepositories(database);
      const project = await repositories.projects.create({
        name: "Delete locally",
      });
      const evidence = await repositories.evidence.create({
        projectId: project.id,
        category: "AFTER",
      });
      await repositories.media.create({
        evidenceItemId: evidence.id,
        localUri: "file:///fielddoc/evidence-originals/after.jpg",
        mediaType: "IMAGE",
        mimeType: "image/jpeg",
        sizeBytes: 2048,
        sha256:
          "e5e9fa1ba31ecd1ae84f75caaa474f3a663f05f4b00000f718b1dcf89f415860",
        sourceType: "PHOTO_LIBRARY",
      });

      const result = await clearLocalDeviceDatabase(database);
      const migrationCount = await database.getFirst<{ count: number }>(
        "SELECT COUNT(*) AS count FROM schema_migrations",
      );

      expect(countDeletedRows(result)).toBeGreaterThanOrEqual(6);
      expect(await repositories.projects.list()).toEqual([]);
      expect(await repositories.mutations.listPending()).toEqual([]);
      expect(migrationCount?.count).toBeGreaterThan(0);
    } finally {
      database.close();
    }
  });
});
