# Agent Instructions

FieldDoc is an internal codename only. The public-facing product name must remain configurable.

## Product Boundary

Build an iOS-first field documentation and proof-of-work application for small property-maintenance and field-service contractors. The core workflow is project creation, before/work-in-progress/after evidence capture, supporting document scan, annotation/captioning, chronological PDF Proof Packet generation, sharing, and retained project history.

Do not turn this product into a generic scanner, CRM, accounting system, invoicing system, construction project management suite, insurance claims platform, e-signature platform, chatbot, or social network.

## Architecture Principles

1. Offline first. Mobile uses durable local SQLite as the working store.
2. Server authoritative after synchronization, with client UUIDs, idempotent mutation IDs, and non-destructive conflict handling.
3. Original media is immutable. Derivatives are separate records/assets.
4. Every server business resource has explicit organization/user ownership.
5. Original media metadata records support organized, chronological, tamper-evident exports. Do not claim legal admissibility.
6. Analytics receives normalized product behavior only, never customer names, addresses, captions, OCR text, filenames, document content, photos, or GPS coordinates.
7. Do not introduce AI inference into the core MVP.
8. Prefer managed services for auth, billing, queues/workflows, email, analytics, OCR, and storage.
9. Use strict TypeScript, runtime validation, structured logging, centralized errors, accessible UI, deterministic migrations, automated tests, explicit env validation, and clear package boundaries.
10. No giant rewrites. Inspect current code and preserve working behavior before changing anything.

## Sprint Execution Rules

For every sprint:

FIRST:

1. Read `AGENTS.md`.
2. Read `docs/PRODUCT.md`.
3. Read `docs/ARCHITECTURE.md`.
4. Inspect the actual repository.
5. Run the existing test/lint/typecheck suite.
6. Report any pre-existing failures before changing code.

THEN:

1. Create a concise implementation plan.
2. Implement only the requested sprint.
3. Do not implement later-sprint functionality unless technically required.

Before finishing:

1. Run formatting.
2. Run lint.
3. Run typecheck.
4. Run unit tests.
5. Run relevant integration tests.
6. Run production build where feasible.
7. Do not bypass failing tests.
8. Do not delete tests just to make a build pass.
9. Do not push or merge anything unless explicitly instructed.

End every sprint with:

1. What changed
2. Important architecture decisions
3. Files added/modified
4. Database migrations
5. Environment variables added
6. Automated tests executed/results
7. Exact manual verification steps
8. Known limitations
9. Anything to configure externally
10. Recommended next sprint
