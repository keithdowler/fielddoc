import { migrateLocalDatabase } from "./schema";
import type { LocalDatabase } from "./database";
import { SqliteAnnotationRepository } from "./annotations";
import { SqliteEvidenceRepository } from "./evidence";
import { SqliteLocalMutationRepository } from "./mutations";
import { SqliteMediaAssetRepository } from "./media-assets";
import { SqliteProjectRepository } from "./projects";
import { SqliteReportDraftRepository } from "./report-drafts";

export type LocalRepositories = {
  database: LocalDatabase;
  projects: SqliteProjectRepository;
  evidence: SqliteEvidenceRepository;
  media: SqliteMediaAssetRepository;
  annotations: SqliteAnnotationRepository;
  reportDrafts: SqliteReportDraftRepository;
  mutations: SqliteLocalMutationRepository;
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
    reportDrafts: new SqliteReportDraftRepository(database),
    mutations: new SqliteLocalMutationRepository(database),
  };
}

export function getLocalRepositories(): Promise<LocalRepositories> {
  repositoriesPromise ??= import("./expo-database").then(
    ({ openFieldDocDatabase }) =>
      openFieldDocDatabase().then(createLocalRepositories),
  );
  return repositoriesPromise;
}
