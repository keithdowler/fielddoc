import type {
  LocalMutation,
  LocalMutationInput,
  LocalMutationRepository,
  SyncState,
} from "@fielddoc/domain";

import type { LocalDatabase } from "./database";
import { createLocalId } from "./id";

type LocalMutationRow = {
  mutation_id: string;
  entity_type: LocalMutation["entityType"];
  entity_id: string;
  operation: LocalMutation["operation"];
  payload_ref: string;
  payload_json: string;
  created_at: string;
  attempt_count: number;
  sync_state: SyncState;
};

function mapMutation(row: LocalMutationRow): LocalMutation {
  return {
    mutationId: row.mutation_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    operation: row.operation,
    payloadRef: row.payload_ref,
    payloadJson: row.payload_json,
    createdAt: row.created_at,
    attemptCount: row.attempt_count,
    syncState: row.sync_state,
  };
}

export class SqliteLocalMutationRepository implements LocalMutationRepository {
  constructor(private readonly database: LocalDatabase) {}

  async enqueue(input: LocalMutationInput): Promise<LocalMutation> {
    const mutationId = input.mutationId ?? createLocalId("mutation");

    await this.database.run(
      `
        INSERT OR IGNORE INTO local_mutations (
          mutation_id,
          entity_type,
          entity_id,
          operation,
          payload_ref,
          payload_json,
          created_at,
          attempt_count,
          sync_state
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)
      `,
      [
        mutationId,
        input.entityType,
        input.entityId,
        input.operation,
        input.payloadRef,
        input.payloadJson,
        input.createdAt,
        input.syncState ?? "PENDING",
      ],
    );

    const row = await this.database.getFirst<LocalMutationRow>(
      "SELECT * FROM local_mutations WHERE mutation_id = ?",
      [mutationId],
    );

    if (!row) {
      throw new Error("Failed to enqueue local mutation.");
    }

    return mapMutation(row);
  }

  async listPending(): Promise<LocalMutation[]> {
    const rows = await this.database.getAll<LocalMutationRow>(
      `
        SELECT * FROM local_mutations
        WHERE sync_state IN ('LOCAL_ONLY', 'PENDING', 'FAILED')
        ORDER BY created_at ASC
      `,
    );

    return rows.map(mapMutation);
  }

  async countPending(): Promise<number> {
    const row = await this.database.getFirst<{ count: number }>(
      `
        SELECT COUNT(*) AS count
        FROM local_mutations
        WHERE sync_state IN ('LOCAL_ONLY', 'PENDING', 'FAILED')
      `,
    );

    return row?.count ?? 0;
  }
}
