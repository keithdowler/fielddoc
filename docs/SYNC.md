# Synchronization

Sprint 14 establishes canonical metadata application for the core mobile
entities. Sprint 15 adds authenticated signed media URL preparation. Sprint 16
adds a mobile media upload queue and important-evidence sync state. Later
remediation adds native Clerk mobile auth, verified media/report uploads, and a
cloud pull path for canonical metadata.

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
- Supported canonical metadata mutations are applied to Neon/Postgres before the mutation is returned as accepted.
- Replayed mutation IDs are returned as duplicates through the response contract.
- Non-uploadable, unsupported, invalid, or failed canonical mutations are rejected per mutation instead of failing the whole upload.

This still avoids fake acknowledgements. The server returns accepted mutation IDs only after the mutation envelope is durably stored in Neon and the supported canonical metadata change is applied.

Mobile can download canonical metadata from:

`POST /api/sync/pull`

Requests must include bearer authorization and a JSON body containing:

- `clientId`
- `deviceId`
- `cursor`, nullable
- optional `limit`

The response returns tenant-scoped project, evidence, media, annotation,
document, and report draft records plus a cursor and `hasMore` flag. The current
cursor is an ISO timestamp. A future high-volume sync sprint should replace it
with a stable tuple cursor so rows that share the same update timestamp cannot
be skipped under heavy concurrent writes.

## Current Persistence Flow

The current sync intake:

1. Verify the bearer token with Clerk.
2. Resolve the Clerk user and active Clerk organization through server-side user and organization bridge records.
3. Insert each uploadable mutation into `received_local_mutations` by `mutation_id`.
4. Apply supported mutations to canonical server metadata tables.
5. Mark receipt rows `rejected` when canonical application fails.
6. Treat duplicate `mutation_id` inserts as idempotent duplicates.
7. Return accepted, duplicate, and rejected mutation classifications.

The current pull flow:

1. Verify the bearer token with Clerk.
2. Resolve the Clerk user and active Clerk organization through server-side user and organization bridge records.
3. Read canonical rows updated after the client's cursor from tenant-scoped Neon/Postgres tables.
4. Return only canonical metadata, never object-storage bytes or permanent public URLs.
5. Apply pulled rows locally in dependency order: project, evidence, media, annotation, document, report draft.
6. Preserve any row that has pending, failed, or already-conflicted local edits when the server version has a different `updatedAt`.
7. Record preserved conflicts in local SQLite `local_sync_conflicts` for later review tooling.

## Canonical Application Scope

Sprint 14 applies these entity types:

- `Project`
- `EvidenceItem`
- `MediaAsset`
- `Annotation`
- `ReportDraft`

Sprint 30 also applies:

- `Document`

Supported operations are create/update upserts plus soft-delete state changes.
Project archive mutations update canonical project status and archive timestamp.

These entity types remain rejected as unsupported until mobile workflows exist:

- `Customer`
- `Site`

Media asset sync applies metadata plus cloud upload state. `storage_object_key`
and `uploaded_at` remain null until mobile uploads the original through a signed
private storage URL and records completion. Evidence sync includes
`isImportant`, which controls important evidence highlighting in readiness,
reports, and web project lists. Document sync applies linked media asset ID,
file name, MIME type, byte size, SHA-256, page count, source type, and
soft-delete state so web and pulled mobile records can retain document proof
quality without storing binary document bodies in Postgres.

## Future Sync Processor

Later sprints should:

1. Upgrade pull cursors from timestamp-only to stable `(updatedAt, id)` tuples.
2. Add server version checks and populate server-side `sync_conflicts` for write conflicts.
3. Add user-facing conflict review and resolution tools.
4. Mark local entity rows synchronized immediately after accepted upload receipts when no pull is required.

Original media binary upload and signed URL issuance remain separate from metadata mutation upload.

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

Sprint 13 remains mobile receipt-upload only. Sprint 14 adds server canonical
metadata application. Sprint 15 adds signed media URL preparation. Sprint 16
adds mobile media upload orchestration behind the existing token-provider
boundary. Later remediation connects native mobile auth and pull reconciliation.

## Cloud Media Foundation

Sprint 15 adds:

- `POST /api/media/uploads/prepare`
- `POST /api/media/uploads/complete`
- `POST /api/media/downloads/prepare`

These routes require Clerk bearer authorization and server-side organization
membership. Object keys are generated from the internal organization ID,
evidence item ID, media asset ID, and SHA-256. The routes return short-lived
private object-storage URLs, not permanent public links.

Mobile SQLite now tracks `storage_object_key` and `uploaded_at` on
`media_assets`. Marking a media asset uploaded writes a durable `MediaAsset`
update mutation into the local outbox so canonical sync can preserve the upload
state.

## Mobile Media Upload Queue

Sprint 16 adds a mobile queue that:

1. Finds local media assets without `storageObjectKey`.
2. Requests `/api/media/uploads/prepare`.
3. Uploads the original local file with a binary `PUT`.
4. Calls `/api/media/uploads/complete`.
5. Calls `media.markUploaded` to record private object storage state locally and
   enqueue a sync mutation.

The queue is ready for native auth integration, but the Settings screen still
uses a token provider that returns `null` until Clerk Expo sign-in is added.

## Mobile Pull Reconciliation

Sprint 22 adds an authenticated read side for sync:

- Web exposes `POST /api/sync/pull`.
- The route uses the same Clerk bearer-token and active-organization membership
  checks as mutation upload.
- Neon/Postgres returns canonical records updated after the client's cursor.
- Mobile stores the cursor and last pull diagnostics in `sync_client_state`.
- Mobile applies canonical metadata to SQLite through infrastructure
  repositories only.
- Local pending/failed/conflicted rows with newer or different local edits are
  not overwritten. They are marked `CONFLICT` and recorded in
  `local_sync_conflicts`.

This is metadata reconciliation only. Pulling cloud originals down to device
storage, visual conflict resolution, and background automatic sync remain later
work.
