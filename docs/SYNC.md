# Synchronization

Sprint 10 establishes the synchronization foundation. It does not turn on production synchronization.

## Current Contract

Mobile local mutations will be uploaded to:

`POST /api/sync/mutations`

Requests must include bearer authorization and a JSON body containing:

- `clientId`
- `deviceId`
- `sentAt`
- up to 100 local mutations

Each mutation includes the durable local mutation ID, entity type, entity ID, operation, payload reference, JSON payload, local creation timestamp, attempt count, and sync state.

## Current Endpoint Behavior

The endpoint is intentionally contract-only:

- Missing bearer authorization returns `401 UNAUTHORIZED`.
- Invalid JSON returns `400 INVALID_JSON`.
- Invalid mutation payloads return `400 INVALID_SYNC_MUTATION_UPLOAD`.
- Missing Clerk server configuration returns `501 SYNC_AUTH_NOT_CONFIGURED`.
- Missing Neon configuration returns `503 SYNC_PERSISTENCE_NOT_CONFIGURED`.
- If both are configured, the route still returns `501 SYNC_PERSISTENCE_NOT_IMPLEMENTED` until a later sprint adds repository-backed writes.

This avoids fake acknowledgements. The server must not mark local outbox mutations as accepted until they are durably stored and applied or safely classified as duplicates, rejects, or conflicts.

## Future Persistence Flow

The future sync processor should:

1. Verify the bearer token with Clerk.
2. Resolve the user and active organization membership server-side.
3. Start a Neon/Postgres transaction.
4. Insert each mutation into `received_local_mutations` by `mutation_id`.
5. Treat duplicate `mutation_id` inserts as idempotent duplicates.
6. Apply canonical record changes with server version checks.
7. Preserve conflicting client payloads in `sync_conflicts`.
8. Return accepted, duplicate, rejected, and conflict results.

Original media upload and signed URL issuance remain separate from metadata mutation upload.
