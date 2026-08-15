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
