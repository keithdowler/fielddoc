import * as SQLite from "expo-sqlite";

import type { LocalDatabase, SqlValue } from "./database";

type ExpoSQLiteDatabase = Awaited<ReturnType<typeof SQLite.openDatabaseAsync>>;

export class ExpoLocalDatabase implements LocalDatabase {
  constructor(private readonly database: ExpoSQLiteDatabase) {}

  exec(sql: string): Promise<void> {
    return this.database.execAsync(sql);
  }

  async run(sql: string, params: readonly SqlValue[] = []): Promise<void> {
    await this.database.runAsync(sql, [...params]);
  }

  getFirst<T>(
    sql: string,
    params: readonly SqlValue[] = [],
  ): Promise<T | null> {
    return this.database.getFirstAsync<T>(sql, [...params]);
  }

  getAll<T>(sql: string, params: readonly SqlValue[] = []): Promise<T[]> {
    return this.database.getAllAsync<T>(sql, [...params]);
  }

  async transaction<T>(
    task: (database: LocalDatabase) => Promise<T>,
  ): Promise<T> {
    let result: T | undefined;

    await this.database.withExclusiveTransactionAsync(async (tx) => {
      result = await task(new ExpoLocalDatabase(tx));
    });

    return result as T;
  }
}

export async function openFieldDocDatabase(): Promise<LocalDatabase> {
  const database = await SQLite.openDatabaseAsync("fielddoc.db");
  return new ExpoLocalDatabase(database);
}
