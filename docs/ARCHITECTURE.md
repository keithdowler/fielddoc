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

Sprint 7 uses Expo Print as the first local PDF renderer because it is compatible with the current Expo application and lets field workers generate an offline file without adding a server dependency. The renderer consumes sanitized HTML from the shared domain package and stores the output PDF in app-owned local document storage. Local image embedding is intentionally deferred because iOS HTML printing does not reliably support local asset URLs; future image-heavy PDF output should use explicit derivative generation or a server renderer after sync.
