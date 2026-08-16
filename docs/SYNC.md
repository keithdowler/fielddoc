# Synchronization

Sprint 11 establishes authenticated mutation receipt. It does not turn on full production synchronization or canonical entity application.

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

The endpoint now validates and records upload attempts when Clerk and Neon are configured:

- Missing bearer authorization returns `401 UNAUTHORIZED`.
- Invalid JSON returns `400 INVALID_JSON`.
- Invalid mutation payloads return `400 INVALID_SYNC_MUTATION_UPLOAD`.
- Missing Clerk server configuration returns `501 SYNC_AUTH_NOT_CONFIGURED`.
- Missing Neon configuration returns `503 SYNC_PERSISTENCE_NOT_CONFIGURED`.
- Unverified bearer tokens return `401 UNAUTHORIZED`.
- Authenticated requests without an active organization return `403 ORGANIZATION_REQUIRED`.
- Authenticated users without server-side membership in the active organization return `403 ORGANIZATION_MEMBERSHIP_REQUIRED`.
- Uploadable local mutations in `PENDING` or `FAILED` state are inserted into `received_local_mutations`.
- Replayed mutation IDs are returned as duplicates through the response contract.
- Non-uploadable local mutation states are rejected per mutation instead of failing the whole upload.

This still avoids fake acknowledgements. The server returns accepted mutation IDs only after the mutation envelope is durably stored in Neon. The endpoint does not yet apply canonical project/evidence/report changes or produce pull results.

## Current Persistence Flow

The Sprint 11 sync intake:

1. Verify the bearer token with Clerk.
2. Resolve the Clerk user and active Clerk organization through server-side user and organization bridge records.
3. Insert each uploadable mutation into `received_local_mutations` by `mutation_id`.
4. Treat duplicate `mutation_id` inserts as idempotent duplicates.
5. Return accepted, duplicate, and rejected mutation classifications.

## Future Sync Processor

Later sprints should:

1. Apply canonical record changes with server version checks.
2. Preserve conflicting client payloads in `sync_conflicts`.
3. Return pull cursors and server canonical record changes.
4. Mark mobile outbox rows as synchronized only after the server response is reconciled locally.

Original media upload and signed URL issuance remain separate from metadata mutation upload.

## Account Provisioning

Sprint 12 adds:

`POST /api/account/provision`

This route requires a signed-in Clerk user and active Clerk organization. It upserts:

- `organizations.external_auth_id` from Clerk `org_...`
- `users.external_auth_id` from Clerk `user_...`
- `organization_members` for the active user/organization

Provisioning makes the later sync receipt route able to resolve membership without manual SQL. It does not upload local mobile mutations by itself.
