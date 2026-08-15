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
