import type { LocalDatabase } from "./database";

export const localDatabaseVersion = 1;

export const localMigrations = [
  {
    version: 1,
    name: "initial_offline_store",
    sql: `
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_state TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sites (
        id TEXT PRIMARY KEY,
        customer_id TEXT REFERENCES customers(id),
        name TEXT,
        address TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_state TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        customer_id TEXT REFERENCES customers(id),
        site_id TEXT REFERENCES sites(id),
        name TEXT NOT NULL,
        customer_company TEXT,
        site_address TEXT,
        work_order_reference TEXT,
        scheduled_date TEXT,
        notes TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived_at TEXT,
        deleted_at TEXT,
        sync_state TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS evidence_items (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id),
        category TEXT NOT NULL,
        title TEXT,
        caption TEXT,
        notes TEXT,
        sort_order INTEGER NOT NULL,
        capture_timestamp TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_state TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS media_assets (
        id TEXT PRIMARY KEY,
        evidence_item_id TEXT NOT NULL REFERENCES evidence_items(id),
        local_uri TEXT NOT NULL,
        media_type TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        sha256 TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        capture_timestamp TEXT NOT NULL,
        source_type TEXT NOT NULL,
        original_asset_id TEXT,
        derivative_type TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_state TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS annotations (
        id TEXT PRIMARY KEY,
        evidence_item_id TEXT NOT NULL REFERENCES evidence_items(id),
        media_asset_id TEXT REFERENCES media_assets(id),
        body TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_state TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id),
        evidence_item_id TEXT REFERENCES evidence_items(id),
        title TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_state TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS report_drafts (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id),
        title TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT,
        sync_state TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS local_mutations (
        mutation_id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload_ref TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        attempt_count INTEGER NOT NULL DEFAULT 0,
        sync_state TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_projects_search
        ON projects(name, customer_company, site_address, updated_at);
      CREATE INDEX IF NOT EXISTS idx_projects_deleted_status
        ON projects(deleted_at, status);
      CREATE INDEX IF NOT EXISTS idx_evidence_project_order
        ON evidence_items(project_id, category, sort_order);
      CREATE INDEX IF NOT EXISTS idx_local_mutations_pending
        ON local_mutations(sync_state, created_at);
    `,
  },
] as const;

type MigrationRow = {
  version: number;
};

export async function migrateLocalDatabase(
  database: LocalDatabase,
): Promise<void> {
  await database.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const rows = await database.getAll<MigrationRow>(
    "SELECT version FROM schema_migrations ORDER BY version ASC",
  );
  const appliedVersions = new Set(rows.map((row) => row.version));

  for (const migration of localMigrations) {
    if (appliedVersions.has(migration.version)) continue;

    await database.transaction(async (tx) => {
      await tx.exec(migration.sql);
      await tx.run(
        "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)",
        [migration.version, migration.name, new Date().toISOString()],
      );
    });
  }
}
