import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

export { and, eq, isNull, sql } from "drizzle-orm";

export function createNeonDatabase(databaseUrl: string) {
  return drizzle(neon(databaseUrl));
}
