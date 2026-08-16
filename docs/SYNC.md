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

## Mobile Outbox Upload Foundation

Sprint 13 adds a mobile outbox upload service for local metadata mutations.

The mobile app can now:

- Read uploadable local mutations in durable SQLite order.
- Persist a stable local device ID in SQLite.
- Build a validated mutation upload request.
- Send it through the shared API client to `/api/sync/mutations`.
- Mark accepted and duplicate mutation receipts as `SYNCED`.
- Mark server-rejected or failed upload attempts as `FAILED`.
- Surface sync configuration/auth status in Settings.

The service requires:

- `EXPO_PUBLIC_FIELDDOC_API_BASE_URL` for the web/API deployment.
- A mobile auth token provider that can return a Clerk bearer token.

The app intentionally does not bundle a bearer token in `EXPO_PUBLIC_*`
configuration. Expo public variables are shipped in the mobile bundle and are
not safe for secrets. Until the native Clerk mobile token provider is connected,
the Settings sync panel reports that cloud sign-in is required instead of
pretending to sync.

This sprint remains receipt-only. The server still does not apply canonical
project/evidence/report records, upload media bytes, issue signed media URLs,
return pull changes, or resolve conflicts.
