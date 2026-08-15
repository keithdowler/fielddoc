import type { LocalDatabase, SqlValue } from "./database";

type NodeStatement = {
  run(...params: SqlValue[]): unknown;
  get(...params: SqlValue[]): unknown;
  all(...params: SqlValue[]): unknown[];
};

type NodeDatabase = {
  exec(sql: string): void;
  prepare(sql: string): NodeStatement;
  close(): void;
};

export class NodeSqliteLocalDatabase implements LocalDatabase {
  constructor(private readonly database: NodeDatabase) {}

  async exec(sql: string): Promise<void> {
    this.database.exec(sql);
  }

  async run(sql: string, params: readonly SqlValue[] = []): Promise<void> {
    this.database.prepare(sql).run(...params);
  }

  async getFirst<T>(
    sql: string,
    params: readonly SqlValue[] = [],
  ): Promise<T | null> {
    return (this.database.prepare(sql).get(...params) as T | undefined) ?? null;
  }

  async getAll<T>(sql: string, params: readonly SqlValue[] = []): Promise<T[]> {
    return this.database.prepare(sql).all(...params) as T[];
  }

  async transaction<T>(
    task: (database: LocalDatabase) => Promise<T>,
  ): Promise<T> {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const result = await task(this);
      this.database.exec("COMMIT");
      return result;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  close(): void {
    this.database.close();
  }
}

export async function createNodeSqliteDatabase(): Promise<NodeSqliteLocalDatabase> {
  // @ts-expect-error node:sqlite is newer than the pinned @types/node baseline.
  const { DatabaseSync } = await import("node:sqlite");
  return new NodeSqliteLocalDatabase(
    new DatabaseSync(":memory:") as NodeDatabase,
  );
}
