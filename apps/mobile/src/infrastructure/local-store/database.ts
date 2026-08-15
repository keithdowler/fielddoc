export type SqlValue = string | number | null;

export type LocalDatabase = {
  exec(sql: string): Promise<void>;
  run(sql: string, params?: readonly SqlValue[]): Promise<void>;
  getFirst<T>(sql: string, params?: readonly SqlValue[]): Promise<T | null>;
  getAll<T>(sql: string, params?: readonly SqlValue[]): Promise<T[]>;
  transaction<T>(task: (database: LocalDatabase) => Promise<T>): Promise<T>;
};
