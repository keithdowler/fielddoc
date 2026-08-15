import { migrateLocalDatabase } from "./schema";
import type { LocalDatabase } from "./database";
import { SqliteEvidenceRepository } from "./evidence";
import { SqliteLocalMutationRepository } from "./mutations";
import { SqliteProjectRepository } from "./projects";

export type LocalRepositories = {
  database: LocalDatabase;
  projects: SqliteProjectRepository;
  evidence: SqliteEvidenceRepository;
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
