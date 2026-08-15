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

## Binary Storage

Postgres stores metadata and object keys. Original images, scans, and generated PDF files are stored in private object storage.
