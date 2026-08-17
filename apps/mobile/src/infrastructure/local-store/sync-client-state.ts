import type { LocalDatabase } from "./database";
import { createLocalId } from "./id";

const deviceIdKey = "device_id";
const pullCursorKey = "pull_cursor";
const lastPullAtKey = "last_pull_at";
const lastPullPulledCountKey = "last_pull_pulled_count";
const lastPullAppliedCountKey = "last_pull_applied_count";
const lastPullConflictCountKey = "last_pull_conflict_count";

type SyncClientStateRow = {
  value: string;
};

export class SqliteSyncClientStateRepository {
  constructor(private readonly database: LocalDatabase) {}

  async getOrCreateDeviceId(): Promise<string> {
    const existing = await this.database.getFirst<SyncClientStateRow>(
      "SELECT value FROM sync_client_state WHERE key = ?",
      [deviceIdKey],
    );

    if (existing) return existing.value;

    const deviceId = createLocalId("device");
    await this.database.run(
      "INSERT INTO sync_client_state (key, value, updated_at) VALUES (?, ?, ?)",
      [deviceIdKey, deviceId, new Date().toISOString()],
    );

    return deviceId;
  }

  async getPullCursor(): Promise<string | null> {
    return this.getValue(pullCursorKey);
  }

  async recordPullResult(input: {
    cursor: string | null;
    pulledAt: string;
    pulledCount: number;
    appliedCount: number;
    conflictCount: number;
  }): Promise<void> {
    await this.database.transaction(async (tx) => {
      await setValue(tx, pullCursorKey, input.cursor ?? "", input.pulledAt);
      await setValue(tx, lastPullAtKey, input.pulledAt, input.pulledAt);
      await setValue(
        tx,
        lastPullPulledCountKey,
        String(input.pulledCount),
        input.pulledAt,
      );
      await setValue(
        tx,
        lastPullAppliedCountKey,
        String(input.appliedCount),
        input.pulledAt,
      );
      await setValue(
        tx,
        lastPullConflictCountKey,
        String(input.conflictCount),
        input.pulledAt,
      );
    });
  }

  async getPullDiagnostics(): Promise<{
    cursor: string | null;
    lastPulledAt: string | null;
    pulledCount: number;
    appliedCount: number;
    conflictCount: number;
  }> {
    const [cursor, lastPulledAt, pulledCount, appliedCount, conflictCount] =
      await Promise.all([
        this.getValue(pullCursorKey),
        this.getValue(lastPullAtKey),
        this.getValue(lastPullPulledCountKey),
        this.getValue(lastPullAppliedCountKey),
        this.getValue(lastPullConflictCountKey),
      ]);

    return {
      cursor,
      lastPulledAt,
      pulledCount: Number(pulledCount ?? 0),
      appliedCount: Number(appliedCount ?? 0),
      conflictCount: Number(conflictCount ?? 0),
    };
  }

  private async getValue(key: string): Promise<string | null> {
    const existing = await this.database.getFirst<SyncClientStateRow>(
      "SELECT value FROM sync_client_state WHERE key = ?",
      [key],
    );

    return existing?.value || null;
  }
}

async function setValue(
  database: LocalDatabase,
  key: string,
  value: string,
  updatedAt: string,
): Promise<void> {
  await database.run(
    `
      INSERT INTO sync_client_state (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
    [key, value, updatedAt],
  );
}
