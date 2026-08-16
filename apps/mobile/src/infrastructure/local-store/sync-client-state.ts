import type { LocalDatabase } from "./database";
import { createLocalId } from "./id";

const deviceIdKey = "device_id";

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
}
