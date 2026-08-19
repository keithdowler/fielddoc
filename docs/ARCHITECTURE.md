# Architecture

FieldDoc is a TypeScript monorepo with mobile, web, and shared package boundaries.

## Workspace Layout

- `apps/mobile`: Expo, React Native, TypeScript, Expo Router, development builds.
- `apps/web`: Next.js App Router, TypeScript, Vercel-ready web surface.
- `packages/domain`: shared business vocabulary and domain types.
- `packages/database`: database boundary for Drizzle and Neon/Postgres.
- `packages/api-client`: typed API client configuration boundary.
- `packages/validation`: runtime schemas shared by applications and services.
- `packages/config`: environment and product-name configuration.

Applications must import shared models from packages instead of redefining them independently.

## Runtime Shape

Mobile is offline-first. Local SQLite will become the durable working store for projects, evidence metadata, captions, document scans, and sync outbox entries. The server becomes authoritative after synchronization, using client-generated UUIDs and idempotent mutation identifiers.

Web and backend run on Next.js App Router and Vercel Functions. Durable asynchronous processing, such as Proof Packet generation, will use Vercel Workflows.

Server-side persistence targets Neon PostgreSQL through Drizzle ORM with deterministic migrations committed to source control. Binary media never belongs in Postgres; original media and derivatives belong in private S3-compatible object storage, with Cloudflare R2 as the default implementation.

## Evidence Model

Original photo and document assets are immutable. Derivatives such as thumbnails, enhanced images, annotated previews, OCR output, and PDF inclusion assets are separate records or objects.

Original evidence metadata records include UUID, project, evidence category, capture timestamp, client timestamp, upload timestamp, MIME type, size, SHA-256 checksum, source type, optional device metadata, optional explicit-permission location, and original storage key.

Exports may be described as organized, chronological, and tamper-evident. Do not claim legal admissibility.

## Offline And Future Sync Strategy

Sprint 2 makes the mobile app authoritative for local project and evidence metadata while offline. Expo SQLite stores projects, customers, sites, evidence items, media asset metadata, annotations, documents, report drafts, and durable local mutations.

Sprint 3 adds local original media capture/import on mobile. Camera photos, photo-library selections, and file imports are copied into app-owned document storage under `evidence-originals/`. SQLite stores only metadata: local URI, media type, MIME type, size, SHA-256 checksum, source type, dimensions when known, timestamps, and outbox mutations. Original files remain local and immutable; deleting a media asset soft-deletes the metadata record and leaves future cleanup policies explicit.

Document scanning, cloud upload, signed URLs, server synchronization, object storage writes, OCR, annotations, derivatives, and Proof Packet generation remain out of scope for Sprint 3.

Sprint 4 adds the first evidence detail and captioning layer. Mobile users can inspect attached originals, preview image evidence, edit per-media captions and notes, add non-destructive text annotations linked to either an evidence item or a selected media asset, and soft-delete or restore media/annotation metadata. Original file bytes are not modified by captioning, annotation, delete, or restore actions.

Local file cleanup is intentionally conservative: soft-deleting media hides metadata from active gallery/report counts but does not remove the app-owned original file. Physical cleanup requires a later policy that can distinguish unsynced, synced, restored, and conflict-preserved originals.

Sprint 5 adds local Proof Packet draft composition. Mobile users can choose a project, set a draft title and notes, include/exclude report sections, reorder those sections, inspect readiness counts, and preview the future packet structure. The saved draft is SQLite metadata only; it does not create a PDF, upload files, call cloud APIs, or start Vercel Workflows.

Sprint 6 adds deterministic local Proof Packet assembly for read-only preview. The mobile app reads the saved draft, project, evidence items, media metadata, and annotations from local repositories, then uses shared domain helpers to build an ordered packet model. This model is preview-only; it does not render a PDF, copy media into derivatives, upload data, or call server workflows.

Sprint 7 adds offline local PDF rendering on mobile. The domain package owns a sanitized HTML representation of the assembled packet, and mobile adapts it through `expo-print` behind a renderer interface. Generated PDFs are moved into app-owned document storage under `proof-packets/` and linked from the local report draft. The renderer is local-only: it does not share, upload, sync, or call server workflows.

Sprint 8 adds explicit local PDF open/share controls. Mobile verifies that the generated PDF still exists locally and that draft changes have not made it stale, then uses native device capabilities to open the file or present the platform share sheet. This is local file handoff only; there are still no cloud share links, uploads, sync records, or customer delivery tracking.

Sprint 10 adds the server synchronization foundation without activating production sync. The database package now defines the Neon/Postgres Drizzle schema and a source-controlled migration for organizations, users, memberships, canonical business records, received local mutations, and future conflict records. The validation package owns the local-mutation upload request/response contract. The web app exposes a Next.js route-handler boundary at `/api/sync/mutations`, but it refuses to fake persistence: requests require bearer authorization, malformed payloads are rejected, missing Clerk/Neon configuration is reported explicitly, and successful database writes remain out of scope.

Sprint 11 turns the sync route into authenticated mutation receipt. The route verifies Clerk session tokens, requires an active Clerk organization, resolves that organization membership against Neon/Postgres, and records uploadable local mutations in `received_local_mutations` through Drizzle. Duplicate `mutation_id` inserts are idempotent and returned as duplicates. Canonical entity application, conflict generation, pull cursors, media upload signing, and mobile outbox reconciliation remain future work.

Sprint 12 adds the first Clerk-backed web session surface. The web app uses ClerkProvider, protected App Router routes, Clerk-hosted sign-in/sign-up components, and a server-side account provisioning route that upserts the active Clerk organization/user into Neon. This replaces manual tenant-bridge SQL for normal setup, but it still does not synchronize mobile outbox rows or apply canonical entity changes.

Sprint 13 adds the mobile outbox upload foundation. Mobile reads uploadable SQLite mutations, uses a stable local device ID, calls the real `/api/sync/mutations` endpoint through the shared API client, and reconciles accepted/duplicate/rejected receipt classifications back into local mutation state. This does not embed a mobile bearer token in public Expo configuration and does not add native Clerk sign-in yet; an auth token provider must be connected before production mobile uploads can run.

Sprint 14 adds canonical server metadata application for the core mobile entities. After authenticated receipt insertion, the sync route validates and applies `Project`, `EvidenceItem`, `MediaAsset`, `Annotation`, and `ReportDraft` mutations to their Neon/Postgres canonical tables before returning accepted mutation IDs. Unsupported entity types and invalid canonical payloads are rejected per mutation. Sprint 15 adds authenticated signed media URL preparation. Mobile binary media upload, pull cursors, and conflict resolution remain future work.

Future server synchronization will use:

- Client-generated IDs for every locally-created entity.
- Idempotent mutation IDs for every local create, update, archive, and delete.
- Version/payload references on local mutations so retries are safe.
- Server canonical records after successful synchronization.
- Conflict records when multiple edits touch the same canonical resource.
- Preservation of conflicting edits instead of silently overwriting or discarding user data.
- Immutable original media assets; only metadata and derivative records can evolve.

The local outbox is intentionally durable but not synchronized in Sprint 2.

## ADRs

### ADR 0001: Expo Instead Of Separate Swift/Android Apps

Status: Accepted

Expo keeps the first production mobile surface iOS-first while preserving an Android path, shared TypeScript, OTA-friendly iteration, native-module support, and development builds. Separate Swift and Android applications would add staffing and delivery cost before product-market fit requires that split.

### ADR 0002: Next.js And Vercel

Status: Accepted

Next.js App Router on Vercel provides a managed web/backend surface with route handlers, server rendering, preview deployments, CI-friendly builds, and a direct path to Vercel Functions and Workflows.

### ADR 0003: Neon PostgreSQL

Status: Accepted

Neon provides managed Postgres with branching-friendly workflows and operational maturity. PostgreSQL is a good fit for tenant-owned business records, synchronization metadata, and auditable state transitions.

### ADR 0004: Drizzle ORM

Status: Accepted

Drizzle keeps database access typed, explicit, and migration-oriented without hiding SQL semantics. Migrations must be deterministic and committed.

### ADR 0005: Local SQLite

Status: Accepted

Expo SQLite is the mobile working store because field workers must capture and organize evidence without connectivity. SQLite will hold structured local state and sync outbox entries, not binary originals.

### ADR 0006: Private Object Storage

Status: Accepted

Originals and derivatives use private S3-compatible object storage. Cloudflare R2 is the default implementation. Clients upload through short-lived signed URLs, and Postgres stores metadata and object keys only.

### ADR 0007: RevenueCat

Status: Accepted

RevenueCat owns native subscription state for the mobile app so the product does not build payment infrastructure or platform receipt validation from scratch.

### ADR 0008: Vercel Workflows

Status: Accepted

Proof Packet generation and related asynchronous processing need durable execution. Vercel Workflows avoids a bespoke queue or worker platform during the MVP.

### ADR 0009: Immutable Original Evidence

Status: Accepted

Original media assets are immutable after capture/upload. Every enhancement, annotation, OCR result, thumbnail, or PDF-ready representation is a derivative, preserving integrity and keeping user edits non-destructive.

### ADR 0010: Local App-Owned Original Copies

Status: Accepted

Captured and imported originals are copied into the mobile app's document storage before metadata is recorded. This avoids depending on temporary picker/cache URIs or external photo-library permissions after capture. Sprint 3 computes SHA-256 from the stored local file and records a durable `MediaAsset` row plus an outbox mutation. Future sync will upload the stored original through a signed private-storage URL without changing the original bytes.

### ADR 0011: Metadata-Only Captioning And Annotations

Status: Accepted

Sprint 4 treats captions, notes, and text annotations as mutable metadata records. They never rewrite original media files and never produce derivative images. This preserves original evidence immutability while allowing field workers to add practical context offline. Future graphical annotation or enhanced-preview work must create derivative records/assets rather than changing originals.

### ADR 0012: Local Report Draft Composition Before Generation

Status: Accepted

Sprint 5 stores Proof Packet draft composition as local structured metadata before any PDF renderer or server workflow exists. This lets the product validate field-worker report organization, evidence readiness, and offline persistence without creating fake production APIs. Future generation can read the same draft sections, attach canonical evidence records after sync, and run through Vercel Workflows when cloud processing is introduced.

### ADR 0013: Shared Packet Assembly Before PDF Rendering

Status: Accepted

Sprint 6 introduces a shared domain-level Proof Packet preview model before choosing a PDF rendering implementation. The packet assembler orders sections, evidence, media metadata, and annotations deterministically from local records so mobile preview and future PDF generation can agree on structure. Rendering remains a later concern and must preserve immutable originals by reading media metadata and derivative assets rather than mutating source files.

### ADR 0014: Expo Print For First Offline PDF Renderer

Status: Accepted

Sprint 7 uses Expo Print as the first local PDF renderer because it is compatible with the current Expo application and lets field workers generate an offline file without adding a server dependency. The renderer consumes sanitized HTML from the shared domain package and stores the output PDF in app-owned local document storage. Later remediation embeds available local image originals by converting them to data URIs before printing. Scanned documents, non-image previews, and richer cloud/server rendering remain future work.

### ADR 0015: Native Share Sheet Before Cloud Sharing

Status: Accepted

Sprint 8 uses local native device flows for opening and sharing generated PDFs before building cloud delivery. This lets a field worker hand off a locally generated Proof Packet while preserving the offline-first MVP boundary. The app checks file existence and stale draft state before enabling actions. Cloud share links, upload receipts, delivery audit trails, and synchronized report-export records remain future work.

### ADR 0016: Derived Local Report History

Status: Accepted

Sprint 9 exposes report history as a derived read model over local `report_drafts` joined to local projects. No new history table is introduced yet because local report drafts already contain the draft title, lifecycle status, generated PDF URI, generation timestamp, and sync state needed for an offline archive. The mobile UI can load a historical draft from the archive for inspection or regeneration through the existing report-generation flow. Server export history, immutable generated-output versioning, delivery audit trails, and cloud share links remain future synchronized features.

Sprint remediation on 2026-08-16 upgrades local PDF generation from metadata-only media references to embedded local image originals. The mobile renderer reads each available local image original, converts it to a data URI for Expo Print, and passes the result into the shared domain HTML renderer. The original evidence file is not modified. Non-image documents, scanned document pages, cloud report versions, and share-link delivery remain future work.

Sprint 29 adds document records as a first-class local repository and canonical
sync target. Imported files and camera-based document scans create `DOCUMENT`
evidence plus linked document metadata, while immutable media originals remain
separate `media_assets`. The scanner path intentionally starts as a camera
capture MVP instead of a custom edge-detection scanner so field users can record
signed paperwork immediately. OCR, native edge detection, page cleanup, and
quarantine scanning remain future work.

### ADR 0031: Multi-Page Document Proof Over Existing Native Capture

Status: Accepted

Sprint 31 groups sequential camera document captures into one `DOCUMENT`
evidence item, one document metadata record, and multiple immutable image media
assets. This avoids introducing a new native scanner dependency before beta
while still supporting multi-page signed paperwork, visual Proof Packet pages,
per-page SHA-256 metadata, offline persistence, and later private upload. The
document row records page count and aggregate file metadata where available;
each scanned page remains independently hashed as an original media asset.

### ADR 0017: Contract-Only Sync Endpoint Before Persistence

Status: Superseded By ADR 0018

Sprint 10 introduces the sync API as a contract-only route before implementing authenticated persistence. This keeps mobile outbox work decoupled from Clerk organization membership resolution, Neon connection management, transaction semantics, and conflict handling. The endpoint validates authorization shape and payloads, then returns explicit not-configured or not-implemented errors instead of acknowledging mutations that were not durably stored. Later sprints must replace this boundary with a repository-backed transaction that writes `received_local_mutations`, applies canonical record changes idempotently, and returns accepted, duplicate, rejected, and conflict results.

### ADR 0018: Authenticated Mutation Receipt Before Canonical Sync

Status: Accepted

Sprint 11 records local mutation envelopes durably before attempting canonical server reconciliation. The sync route verifies Clerk bearer tokens, requires active organization context, resolves server-side organization membership, and writes each uploadable mutation to Neon/Postgres using Drizzle. This gives mobile a real idempotent server receipt boundary without pretending that project, evidence, report, or media records have already been applied. Future sync processors can consume `received_local_mutations`, perform version checks, populate canonical tables, preserve conflicts, and return pull cursors.

### ADR 0019: Clerk Web Session Before Mobile Sync

Status: Accepted

Sprint 12 wires Clerk into the web application before mobile sync reconciliation. This gives the production deployment a real login path, organization switching, and a server-side provisioning endpoint that maps Clerk users and organizations to FieldDoc's internal UUID tenant model. Mobile sync remains separate because the mobile app still needs token acquisition, outbox upload scheduling, retry policy, and local reconciliation semantics.

Sprint remediation on 2026-08-16 adds tenant-scoped web workspace reads. Authenticated web routes resolve the active Clerk organization to the internal Neon tenant, then read project, evidence, media, report draft, and sync receipt metadata for dashboard, project list, report list, and readiness settings. These are read-only views; generated PDF downloads, share links, branding administration, and team workflows are still intentionally deferred.

### ADR 0020: Mobile Outbox Receipt Before Native Auth UI

Status: Accepted

Sprint 13 implements mobile outbox upload and receipt reconciliation behind an explicit token-provider interface before adding native Clerk sign-in. This lets the offline SQLite layer, shared API client, idempotent upload contract, and local mutation state transitions be tested without committing an unsafe public bearer token or forcing an incompatible native auth SDK. Native mobile auth should connect to the same token-provider boundary when the chosen Clerk Expo SDK path is compatible with the app's Expo version.

### ADR 0021: Canonical Metadata Application Before Media Upload

Status: Accepted

Sprint 14 applies synced metadata to canonical server tables before building original-media upload. This gets projects, evidence records, captions, annotations, media metadata, and report drafts under tenant-owned server persistence while preserving the architectural split that original media bytes belong in private object storage, not Postgres. The sync route returns accepted IDs only after supported canonical metadata application succeeds; rejected canonical payloads are preserved in the receipt ledger instead of being silently acknowledged.

### ADR 0022: Signed Private Object URLs Before Mobile Upload Orchestration

Status: Accepted

Sprint 15 adds authenticated media upload and download preparation routes before building mobile background upload orchestration. The web API verifies Clerk bearer tokens, resolves internal Neon organization membership, and issues short-lived signed private-object-storage URLs scoped by organization, evidence item, media asset, and SHA-256. Mobile SQLite now tracks `storageObjectKey` and `uploadedAt`, and canonical media sync preserves those fields. This keeps immutable originals out of Postgres and avoids public evidence URLs while leaving native sign-in UI, binary upload retry policy, and object-existence verification for later sprints.

### ADR 0023: Ordered Cloud Upload Before Background Sync

Status: Accepted

Sprint 18 adds a user-triggered Upload All Pending Changes action before
background sync. The mobile app uploads metadata first and uploads original
media only after metadata is accepted or already current, because signed media
upload preparation requires canonical evidence and media records in Neon. The
web app adds an authenticated original-download redirect under `/app` so a
signed-in organization member can verify uploaded originals without exposing
public bucket URLs. Background scheduling, object-existence verification,
content-type validation, and cloud PDF archival remain future work.

### ADR 0024: Synchronous Original Verification Before Uploaded State

Status: Accepted

Sprint 19 verifies private original media objects during upload completion
before the canonical media row is marked uploaded. The server checks the
tenant-scoped object key, canonical size, content type, optional storage
metadata SHA-256, and downloaded byte SHA-256. This keeps immutable evidence
trustworthy at the first cloud boundary and prevents a stale or corrupted
object from becoming the canonical uploaded original. If synchronous byte
verification becomes too slow for larger files, a future Vercel Workflow can
move the same checks to an asynchronous quarantine-to-accepted lifecycle.

### ADR 0025: Web Review Details Before Share Links

Status: Accepted

Sprint 20 adds tenant-scoped web project and report detail pages before
building external share links. The web app resolves the active Clerk
organization to the internal FieldDoc tenant, then renders project evidence
sections, annotations, uploaded originals, and report readiness from the
canonical Neon read model. Detail pages are read-only and reuse the existing
private media download redirect, so evidence originals remain non-public.
Cloud PDF archival, report version downloads, branded delivery pages, and
expiring share links remain future work.

### ADR 0026: Private Report Exports Before Branded Delivery Pages

Status: Accepted

Sprint 21 stores generated Proof Packet PDFs as private object-storage report
exports before building branded customer delivery pages. Mobile uploads report
metadata first, then generated PDFs through signed upload URLs, and the server
verifies object size, content type, metadata hash, and byte hash before
recording a canonical `report_exports` row. Authenticated web users download
the latest report export through a short-lived redirect, while external
delivery uses opaque, hashed, expiring share tokens that redirect to short-lived
private storage URLs and increment access counts. This keeps PDF artifacts out
of Postgres, avoids public bucket URLs, and gives FieldDoc a durable report
version boundary before adding custom branding, customer-facing landing pages,
or detailed audit-event streams.

### ADR 0027: Pull Reconciliation Before Automatic Background Sync

Status: Accepted

Sprint 22 adds explicit, user-triggered pull reconciliation before automatic
background sync. The web app exposes an authenticated `/api/sync/pull` route
that resolves Clerk user and organization membership, reads tenant-scoped
canonical metadata from Neon/Postgres, and returns project, evidence, media,
annotation, document, and report draft changes updated after the mobile
cursor. Mobile applies those records to SQLite through infrastructure
repositories only, stores cursor diagnostics in `sync_client_state`, and
preserves pending local edits by marking rows `CONFLICT` and writing
`local_sync_conflicts` entries. The first cursor is timestamp-based; high-volume
production sync should upgrade to a stable `(updatedAt, id)` tuple cursor and
add user-facing conflict resolution.

### ADR 0028: Audit Ledger Before Advanced Admin Workflows

Status: Accepted

Sprint 23 adds an append-only `audit_events` table and writes privacy-reviewed
audit events from account provisioning, sync upload/pull, media/report storage
preparation, authenticated download redirects, report share-link creation, and
public share-link access before building advanced admin dashboards or delivery
workflows. This gives production support a tenant-scoped trail for high-value
actions without treating logs as the source of truth. Canonical records,
received mutation receipts, report exports, and share-link rows remain the
authoritative business state; audit rows provide operational accountability.

### ADR 0029: RevenueCat Entitlements Before Paywall Polish

Status: Accepted

Sprint 24 adds RevenueCat as the subscription entitlement provider before
building a branded paywall or App Store product catalog UI. Mobile configures
the RevenueCat SDK with the signed-in Clerk user ID as the RevenueCat app user
ID, refreshes/restores customer info, and gates cloud sync, private original
uploads, and report PDF archive uploads on the `fielddoc_pro` entitlement. The
server accepts RevenueCat webhooks only with the configured bearer secret,
stores idempotent raw webhook receipts, and upserts canonical subscription
entitlement rows mapped back to the provisioned Clerk user. The mobile app does
not fake purchases or grant access when RevenueCat is missing; App Store
products, paywall copy, and sandbox purchase validation remain external setup
work.
