# Security

## Authentication And Authorization

Clerk is the planned authentication provider. Server-side authorization is mandatory for every business resource. Organization and user ownership must be explicit on persisted resources.

## Tenant Isolation

Tenant isolation is enforced server-side. UI filtering is not authorization.

## Uploads

Clients will upload media directly to private object storage with short-lived signed URLs. The server issues upload intent metadata and validates ownership before signing.

Sprint 3 does not upload media. Originals are copied into app-owned local storage and tracked by SQLite metadata. Future upload code must treat local URIs as sensitive, upload originals through scoped signed URLs, and preserve the SHA-256 recorded at local capture/import.

Sprint 4 delete and restore actions are metadata state transitions only. They must remain represented in the durable outbox so future synchronization can preserve user intent without prematurely removing original files that may not have uploaded yet.

Sprint 5 report draft saves and deletes are local metadata state transitions represented in the durable outbox. They must not trigger unsigned uploads, unauthenticated generation requests, or unreviewed file exports.

Sprint 6 packet assembly is read-only over local metadata. It must not create files outside app-owned storage, mutate original media, upload records, or call generation endpoints.

Sprint 7 local PDF generation writes only to app-owned document storage and records local draft metadata. It must not upload, share, sync, or expose generated files without an explicit later authorization and sharing design.

Sprint 8 local PDF opening and sharing must be explicit user actions. The app verifies that the local file exists and blocks stale generated output when draft changes are unsaved. Native share sheet destinations are user-selected and should not be treated as server-authorized delivery records.

Sprint 9 report history is a local derived view over private report drafts and project names. It must not be treated as an audit log, cloud export record, or delivery receipt until a server-authorized export-history model exists.

Sprint 10 adds a sync route boundary, but it does not verify Clerk tokens or write to Neon yet. The route must not acknowledge mutations as accepted until a later sprint adds server-side token verification, organization membership checks, transactional persistence, and idempotent replay handling.

Sprint 11 adds server-side Clerk verification and Neon mutation receipt. A request must carry a bearer session token, have an active Clerk organization, and resolve to a matching `organization_members` row before any mutation envelope is stored. The endpoint records mutation envelopes only; it does not return tenant data, sign media uploads, or apply canonical entity changes yet.

## Secrets

Secrets belong in Vercel, Expo/EAS, or local uncommitted environment files. `.env.example` contains placeholders only.

## Logging

Structured logs must avoid customer names, addresses, captions, OCR content, filenames, photos, and location coordinates unless a future security review explicitly permits narrow operational use.

Report draft titles, notes, and section composition are also private business data and should not be logged.

Assembled packet previews combine multiple sensitive fields and should not be logged or sent to analytics.

Generated PDF paths and file contents are sensitive and should not be logged.

Report-history rows include project names, draft titles, generated timestamps, and local file availability. They should not be logged or sent to analytics.

Sync mutation payloads can contain customer names, addresses, captions, notes, hashes, and local file metadata. Do not log request bodies, parsed payloads, bearer tokens, or validation issue values in production logs.

Rejected and duplicate sync responses should include mutation IDs and stable error codes, not payload contents.
