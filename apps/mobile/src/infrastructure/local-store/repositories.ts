import { migrateLocalDatabase } from "./schema";
import type { LocalDatabase } from "./database";
import { SqliteAnnotationRepository } from "./annotations";
import { SqliteDocumentRepository } from "./documents";
import { SqliteEvidenceRepository } from "./evidence";
import { SqliteLocalMutationRepository } from "./mutations";
import { SqliteMediaAssetRepository } from "./media-assets";
import { SqliteProjectRepository } from "./projects";
import { SqlitePullSyncRepository } from "./pull-sync";
import { SqliteReportDraftRepository } from "./report-drafts";
import { SqliteReportBrandingRepository } from "./report-branding";
import { SqliteSyncClientStateRepository } from "./sync-client-state";

export type LocalRepositories = {
  database: LocalDatabase;
  projects: SqliteProjectRepository;
  evidence: SqliteEvidenceRepository;
  media: SqliteMediaAssetRepository;
  annotations: SqliteAnnotationRepository;
  documents: SqliteDocumentRepository;
  reportDrafts: SqliteReportDraftRepository;
  reportBranding: SqliteReportBrandingRepository;
  mutations: SqliteLocalMutationRepository;
  syncClientState: SqliteSyncClientStateRepository;
  pullSync: SqlitePullSyncRepository;
};

let repositoriesPromise: Promise<LocalRepositories> | undefined;

export async function createLocalRepositories(
  database: LocalDatabase,
): Promise<LocalRepositories> {
  await migrateLocalDatabase(database);

  return {
    database,
    projects: new SqliteProjectRepository(database),
    evidence: new SqliteEvidenceRepository(database),
    media: new SqliteMediaAssetRepository(database),
    annotations: new SqliteAnnotationRepository(database),
    documents: new SqliteDocumentRepository(database),
    reportDrafts: new SqliteReportDraftRepository(database),
    reportBranding: new SqliteReportBrandingRepository(database),
    mutations: new SqliteLocalMutationRepository(database),
    syncClientState: new SqliteSyncClientStateRepository(database),
    pullSync: new SqlitePullSyncRepository(database),
  };
}

export function getLocalRepositories(): Promise<LocalRepositories> {
  repositoriesPromise ??= import("./expo-database").then(
    ({ openFieldDocDatabase }) =>
      openFieldDocDatabase().then(createLocalRepositories),
  );
  return repositoriesPromise;
}
