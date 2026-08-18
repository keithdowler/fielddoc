import type { LocalDatabase } from "@/infrastructure/local-store/database";

const exportableTables = [
  "projects",
  "evidence_items",
  "media_assets",
  "annotations",
  "documents",
  "report_drafts",
  "local_mutations",
  "local_sync_conflicts",
  "sync_client_state",
  "local_settings",
] as const;

const deletionOrder = [
  "local_sync_conflicts",
  "sync_client_state",
  "local_settings",
  "local_mutations",
  "annotations",
  "documents",
  "media_assets",
  "evidence_items",
  "report_drafts",
  "projects",
  "sites",
  "customers",
] as const;

export type LocalPrivacyExport = {
  schemaVersion: 1;
  exportedAt: string;
  notice: string;
  tables: Record<(typeof exportableTables)[number], unknown[]>;
};

export type LocalPrivacyDeletionResult = {
  deletedRows: Record<(typeof deletionOrder)[number], number>;
};

type CountRow = {
  count: number;
};

export async function createLocalPrivacyExport(input: {
  database: LocalDatabase;
  exportedAt?: string;
}): Promise<LocalPrivacyExport> {
  const tables = {} as LocalPrivacyExport["tables"];

  for (const table of exportableTables) {
    tables[table] = await input.database.getAll(`SELECT * FROM ${table}`);
  }

  return {
    schemaVersion: 1,
    exportedAt: input.exportedAt ?? new Date().toISOString(),
    notice:
      "This archive contains local FieldDoc metadata only. Original media files and generated PDFs stay in app storage unless exported separately.",
    tables,
  };
}

export async function clearLocalDeviceDatabase(
  database: LocalDatabase,
): Promise<LocalPrivacyDeletionResult> {
  const deletedRows = {} as LocalPrivacyDeletionResult["deletedRows"];

  await database.transaction(async (tx) => {
    for (const table of deletionOrder) {
      const before = await tx.getFirst<CountRow>(
        `SELECT COUNT(*) AS count FROM ${table}`,
      );
      await tx.run(`DELETE FROM ${table}`);
      deletedRows[table] = before?.count ?? 0;
    }
  });

  return { deletedRows };
}

export function countDeletedRows(result: LocalPrivacyDeletionResult): number {
  return Object.values(result.deletedRows).reduce(
    (total, count) => total + count,
    0,
  );
}
