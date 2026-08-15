# Testing

## Sprint 0 Test Layers

- Lint: `pnpm lint`
- TypeScript: `pnpm typecheck`
- Unit tests: `pnpm test`
- Web production build: `pnpm --filter @fielddoc/web build`

## CI

GitHub Actions runs install, lint, typecheck, tests, and web build. Mobile validation is intentionally limited to lint/typecheck/unit-test compatible checks for now so CI does not require App Store credentials, signing assets, simulators, or native build secrets.

## Future Coverage

Future sprints should add focused tests for sync idempotency, conflict handling, evidence metadata validation, storage signing, authorization, and Proof Packet generation.

## Sprint 2 Local Persistence Tests

Sprint 2 adds repository-level SQLite tests that run against an in-memory Node SQLite database using the same repository implementations as the Expo SQLite adapter. Coverage includes empty database migration, project persistence, search and sort ordering, soft delete, archive behavior, evidence ordering, report summary counts, mutation generation, and duplicate mutation safety.

## Sprint 3 Media Tests

Sprint 3 extends repository coverage to local media asset metadata, media outbox mutations, media soft delete, media counts by evidence item, and report summary media counts. Pure helper tests cover media type inference, extension selection, and digest byte serialization.

Native picker flows are manually verified because camera, photo library, document picker, and app document storage depend on simulator/device capabilities.

## Sprint 4 Caption And Annotation Tests

Sprint 4 adds repository tests for the media caption migration, media caption/notes updates, media restore, annotation creation, annotation soft delete, annotation restore, and generated outbox mutations. Manual coverage should verify the Capture evidence detail panel, image previews, media caption form, annotation form, and delete/restore controls on simulator or development build.

## Sprint 5 Report Draft Tests

Sprint 5 adds domain tests for report section normalization, included-section selection, and draft readiness. Repository tests cover the report draft composition migration, saving a local draft, updating the existing project draft, soft delete, and durable outbox mutation generation.

Manual coverage should verify the mobile Reports tab: project selection, readiness banners, draft title/notes editing, section include/exclude controls, section reordering, preview ordering, and local persistence after app reload.

## Sprint 6 Packet Assembly Tests

Sprint 6 adds domain tests for deterministic Proof Packet preview assembly: section order, evidence chronology, media-caption fallback, annotation counts, totals, and readiness. Repository tests cover batch reads for active media assets and annotations by evidence IDs.

Manual coverage should verify that the Reports tab shows a saved packet preview after saving a draft, updates after evidence metadata changes, hides soft-deleted media and annotations, and still shows the explicit PDF-export-not-built message.

## Sprint 7 Local PDF Tests

Sprint 7 adds domain coverage for sanitized Proof Packet HTML output and repository coverage for generated PDF draft metadata. Repository tests cover the v5 migration, marking a draft with a generated local PDF URI, and invalidating stale generated output when a draft is edited.

Native PDF rendering through Expo Print must be manually verified on simulator or device because Vitest does not execute native Expo print modules.
