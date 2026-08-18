# Data Model

Sprint 0 documents the target model and creates package boundaries. It does not create production migrations yet.

## Core Entities

- Organization: tenant boundary for company data.
- User: authenticated actor associated with organizations.
- Customer: local customer/company record.
- Site: local job-site record.
- Project: field job or work order container with customer/site references and denormalized offline display fields.
- Evidence item: category, caption/title, notes, ordering, timestamps, soft-delete state, and sync state.
- Media asset: local URI, MIME type, dimensions, SHA-256, source type, original/derivative relationship, and sync state.
- Annotation: non-destructive evidence annotation metadata.
- Document: supporting document metadata.
- Report draft: local Proof Packet draft metadata.
- Local mutation: durable outbox entry awaiting future server synchronization.

## Server Ownership

Every server-side resource must carry explicit tenant ownership. Server authorization checks must use organization/user ownership and must not rely on UI filtering.

## Local Mobile Store

The local SQLite model will support project drafts, evidence metadata, captions, and outbox entries. Original binaries remain file/object assets, not SQLite rows.

Sprint 2 creates the mobile SQLite schema and local migrations for these records. Deletes are soft deletes using `deleted_at`; future sync can still observe and transmit deletion intent.

New local business records use UUID primary keys so offline-created records can be uploaded to the server sync contract without ID translation. Local mutation IDs and device IDs are separate idempotency/diagnostic identifiers.

Project evidence categories are `BEFORE`, `WORK`, `AFTER`, `DOCUMENT`, and `OTHER`.

Media source types are `CAMERA_PHOTO`, `PHOTO_LIBRARY`, `DOCUMENT_SCAN`, and `FILE_IMPORT`.

Sprint 3 begins populating `media_assets` from mobile capture/import flows. Each attached original records:

- local app-owned URI
- media type
- MIME type
- size in bytes
- SHA-256 checksum of the stored local file
- width and height when available
- editable caption and notes metadata
- capture/import timestamp
- source type
- nullable original asset ID from the platform picker
- nullable derivative type, which remains `null` for originals

The `DOCUMENT_SCAN` source type remains modeled but is not produced by Sprint 3.

Sprint 4 adds local captioning and annotation behavior:

- Media asset captions and notes are mutable metadata and do not change original bytes.
- Text annotations are separate records that may link to an evidence item or one media asset.
- Media and annotation removal is soft-delete metadata only.
- Restore clears `deleted_at` and records a future-sync outbox mutation.
- Active report/gallery counts ignore soft-deleted media.

Sprint 5 expands `report_drafts` into local composition metadata:

- `title`: editable local Proof Packet draft title.
- `notes`: optional internal report notes.
- `sections_json`: normalized ordered section configuration.
- `status`: draft lifecycle state for future generation.
- soft-delete and sync state fields consistent with other local entities.

Draft sections reference the shared evidence categories: `BEFORE`, `WORK`, `AFTER`, `DOCUMENT`, and `OTHER`. Section configuration controls report inclusion and ordering only; it does not duplicate evidence rows, mutate original media, or generate PDF output.

Sprint 6 adds a derived Proof Packet preview model. It is assembled in memory from existing local records:

- Project and saved report draft.
- Included draft sections in normalized order.
- Evidence items filtered by section category and ordered by capture timestamp.
- Active media assets grouped by evidence item.
- Active annotations grouped by evidence item.
- Totals for sections, evidence items, media assets, annotations, and missing captions.

The preview model is not persisted separately. It is safe to rebuild whenever local metadata changes.

## Binary Storage

Postgres stores metadata and object keys. Original images, scans, and generated PDF files are stored in private object storage.

On mobile before synchronization, original binaries are stored in app document storage rather than SQLite. SQLite stores durable metadata and outbox rows only.

Sprint 4 does not physically delete local original files when media metadata is soft-deleted. A later cleanup policy must protect unsynced and conflict-preserved originals before reclaiming storage.

Sprint 5 does not create binary report exports. Generated PDFs remain future private object-storage assets after a renderer and server workflow exist.

Sprint 6 still does not create binary report exports. It creates the deterministic metadata shape that a future renderer can consume.

Sprint 7 adds local PDF output metadata to report drafts:

- `generated_pdf_uri`: app-owned local URI for the latest generated PDF.
- `generated_at`: local generation timestamp.

Editing and saving a report draft invalidates the previous local PDF metadata by returning the draft to `draft` status and clearing generated PDF fields. Generating a local PDF marks the draft `ready` and records an outbox update. The PDF binary is stored in app document storage under `proof-packets/`, not SQLite.

Sprint 8 does not add persistent data. Open/share availability is derived from the current report draft, whether the local PDF file exists, platform sharing support, and whether the draft has unsaved changes.

Sprint 9 adds a derived local report-history model. It is read from existing `report_drafts` rows joined to active projects and returns:

- draft ID and project ID
- project name
- report title
- draft status
- generated PDF URI when one exists
- generated, created, and updated timestamps
- whether a generated PDF is available locally
- sync state

The derived history model does not add a new migration or duplicate report data. By default it returns generated PDFs only; mobile screens can include drafts for local inspection and regeneration.

Sprint 26 adds a local-only `local_settings` table for device preferences that
are not yet canonical server tenant records. The first setting stores report
branding:

- company name
- prepared-by name
- footer text
- report accent color
- local updated timestamp

These values are included in local metadata export and cleared by local device
deletion. They do not generate outbox mutations until a future cloud branding
model exists.

## Server Sync Foundation

Sprint 10 adds the first Neon/Postgres schema for future synchronization. Server records use client-generated UUIDs as primary keys so offline-created records can become canonical without ID translation. Every tenant-owned business table carries `organization_id`, server versioning, timestamps, and soft-delete metadata.

The first server migration creates:

- organizations, users, and organization memberships
- customers, sites, projects, evidence items, media assets, annotations, documents, and report drafts
- `received_local_mutations` for idempotent mutation ingestion
- `sync_conflicts` for future non-destructive conflict preservation

Original media bytes still do not belong in Postgres. `media_assets.storage_object_key` is nullable until private object-storage upload completes, and generated report PDFs use a future object key rather than a local mobile URI.

Sprint 11 starts using `received_local_mutations` as a durable server receipt ledger. Each row is keyed by client mutation ID, organization, user, device, entity type, entity ID, operation, payload reference, payload JSON, and the client creation timestamp. The endpoint inserts uploadable local mutations with server status `accepted`; duplicate primary-key inserts are classified as duplicate responses and are not treated as failures.

Sprint 11 also introduces `organizations.external_auth_id` so Clerk organization IDs such as `org_...` can map to FieldDoc's internal UUID tenant IDs. Business records keep internal UUID foreign keys; authentication lookups use the external auth ID bridge.

Canonical business tables remain unapplied in Sprint 11. `sync_conflicts` remains reserved for the future processor that compares client payload references and server versions before applying canonical changes.

Sprint 13 adds mobile receipt reconciliation for `received_local_mutations`. Accepted and duplicate server receipts mark local outbox rows `SYNCED`; rejected upload receipts and failed upload attempts leave rows retry-visible as `FAILED`. The server still does not apply canonical business table changes.

Sprint 14 applies supported metadata mutations to canonical server tables. Project, evidence item, media asset, annotation, and report draft create/update mutations are upserted by client-generated UUID. Delete mutations set canonical `deleted_at`/`updated_at` timestamps rather than removing rows. Project archive mutations set `status = 'archived'` and `archived_at`.

Sprint 15 adds cloud-media state to local and canonical media rows. `storage_object_key` and `uploaded_at` are populated only after an authenticated private object-storage upload is prepared, completed, and recorded. Generated local PDF URIs from mobile report drafts are not stored as server object keys.

Sprint 16 adds `is_important` to local and canonical evidence rows. Important
evidence is mutable metadata, not a derivative of the original media file, and
is represented in outbox mutations like other evidence metadata updates.

Sprint 21 adds cloud report archival metadata:

- Local `report_drafts` now track `generated_pdf_storage_object_key`,
  `generated_pdf_sha256`, `generated_pdf_size_bytes`, and
  `generated_pdf_uploaded_at` after the generated PDF has been uploaded and
  verified.
- Server `report_exports` records immutable generated PDF versions by
  organization, report draft, object key, MIME type, size, SHA-256,
  generated-at timestamp, and uploaded-at timestamp.
- Server `report_share_links` stores opaque share tokens only as SHA-256 hashes
  plus expiration, revocation, access count, and last-accessed timestamps.
- The canonical `report_drafts.generated_pdf_object_key` points at the latest
  verified private PDF export for workspace list/detail views.

Generated report PDF bytes remain outside Postgres in private object storage.
Share links are delivery metadata, not authorization bypasses for tenant
management APIs.

Sprint 23 adds `audit_events` as a server-side operational ledger:

- `organization_id`: nullable tenant scope for events where a tenant is known.
- `actor_user_id`: nullable internal user ID for authenticated actions.
- `actor_external_id`: nullable external auth provider user ID for diagnostics.
- `event_type`: stable machine-readable event name.
- `entity_type` and `entity_id`: optional target record reference.
- `metadata_json`: privacy-reviewed structured metadata such as counts, hashes,
  object keys, and expiration timestamps.
- `request_id`: optional Vercel/request correlation ID.
- `created_at`: server timestamp.

Audit events do not replace canonical business records, sync receipts, report
exports, or share-link rows. They are an append-only diagnostic layer for
security review and operational support.

Sprint 24 adds server-side monetization state:

- `revenuecat_webhook_events` stores idempotent raw RevenueCat webhook receipts
  by provider event ID, event type, RevenueCat app user ID, product ID,
  entitlement IDs, raw payload JSON, and receipt timestamp.
- `subscription_entitlements` stores the canonical provider/user entitlement
  state by provider, provider customer ID, entitlement ID, status, product ID,
  store/environment, original transaction ID, purchase/expiration/revocation
  timestamps, last event timestamp, and raw provider payload JSON.

RevenueCat `app_user_id` maps to the Clerk external user ID already stored in
`users.external_auth_id`. Entitlements may remain webhook-only when a provider
event arrives before the matching user has been provisioned into Neon; those
events are not discarded.
