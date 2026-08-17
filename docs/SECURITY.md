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

Sprint 12 protects `/app` and `/api/account/*` with Clerk middleware. Account provisioning writes only the signed-in user's active organization/user bridge rows and does not accept arbitrary organization IDs from the browser.

Sprint 13 adds mobile sync transport without storing a bearer token in Expo public configuration. The mobile upload service requires a runtime token provider and returns an explicit auth-required state when no token is available. `EXPO_PUBLIC_FIELDDOC_API_BASE_URL` is public configuration only and must never contain credentials.

Sprint 14 applies canonical metadata only after Clerk token verification and server-side organization membership resolution. Canonical writes use the internal organization ID from membership, not any organization value supplied by the client payload. Unsupported entity types and invalid payloads are rejected per mutation.

Sprint 15 signs media upload and download URLs only after Clerk bearer verification and server-side organization membership resolution. Object keys are generated server-side from the internal organization ID, evidence item ID, media asset ID, and SHA-256; clients do not choose tenant scope. Signed URLs are temporary transport credentials, not share links, and must not be persisted in user-visible records or logs.

Sprint 19 hardens original-media acceptance. Upload preparation signs required `Content-Type` and `x-amz-meta-sha256` headers into the private object URL, and upload completion verifies the object in private storage before marking it uploaded. The server checks tenant object-key shape, canonical size, content type, optional metadata SHA-256, and downloaded byte SHA-256. Verification failures return stable error codes and do not mark the media asset uploaded.

Sprint 17 adds Clerk Expo native sign-in and secure mobile session caching. The mobile app stores Clerk session tokens through the Clerk Expo token cache backed by Expo secure storage and passes tokens only at request time to metadata sync and media upload services. Clerk publishable keys and API base URLs are public configuration; Clerk secret keys, JWT keys, database URLs, and object storage credentials must remain server-only.

Sprint 23 adds a server-side audit event ledger for account provisioning, sync upload/pull, media upload/download preparation, report PDF upload/download preparation, authenticated download redirects, report share-link creation, and public share-link access. Audit events are tenant-scoped when a tenant is known and store stable entity identifiers plus privacy-reviewed metadata. Audit insert failures are isolated from user-facing success paths so a temporary logging outage does not break field work; monitoring and future workflows should surface and repair failures.

Sprint 24 adds RevenueCat entitlement enforcement. Mobile uses public
RevenueCat API keys only and identifies the customer with the signed-in Clerk
user ID. Server-side entitlement state is updated only from RevenueCat webhooks
that pass the configured bearer secret. Webhook receipts are idempotent and raw
payloads are retained for billing audit review. Cloud sync, private original
uploads, and report PDF uploads must not be treated as paid-feature accessible
unless `fielddoc_pro` is active.

Temporary signed media/report redirects remain `Cache-Control: no-store`. Signed URLs are transport credentials and must not be cached, logged, copied into audit metadata, or exposed as durable share links.

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

Signed upload and download URLs include credentials in query parameters. Do not log full URLs, request bodies containing object keys, R2 credentials, or generated signatures.

Mobile auth errors may include provider details. Surface short user-facing errors in the UI, but do not log bearer tokens, refresh tokens, Clerk session claims, or auth callback URLs.

Media integrity errors should be surfaced as short stable user-facing status messages. Do not log or display signed URLs, raw object bodies, full customer filenames, or storage credentials while diagnosing upload failures.

Audit events must avoid raw request bodies, bearer tokens, signed URLs, local file URIs, captions, notes, addresses, OCR text, image bytes, and Clerk secret material. Use stable IDs, counts, object keys, hashes, and short status codes only.

RevenueCat webhook secrets, App Store shared secrets, and provider dashboard
credentials must remain server-only. RevenueCat public mobile API keys are
publishable configuration, but they do not grant server authorization.
