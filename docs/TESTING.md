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

## Sprint 8 Local PDF Action Tests

Sprint 8 adds pure unit tests for local PDF open/share availability rules: missing PDF, stale draft changes, unavailable share sheet, and ready local files. Native `Linking` and Expo Sharing calls must be manually verified on simulator or device because they rely on platform UI.

## Sprint 9 Local Report History Tests

Sprint 9 adds repository tests for report-history retrieval: direct draft lookup, generated-only history defaults, include-drafts history, project-name joins, generated/draft ordering, and project-specific filters.

Manual coverage should verify the Reports tab archive can load a saved local draft, generated PDFs appear as ready archive items, and the Projects tab shows report history for the selected project.

## Sprint 10 Sync Foundation Tests

Sprint 10 adds shared validation tests for sync mutation upload requests/responses, API-client tests for mutation upload requests and typed error handling, config tests for empty documented env placeholders, and route-handler tests for `/api/sync/mutations`.

Route tests verify authorization is required, malformed payloads are rejected, missing Clerk configuration is explicit, and missing Neon configuration is explicit. They do not verify database writes because persistence is intentionally not implemented in Sprint 10.

## Sprint 11 Sync Receipt Tests

Sprint 11 adds route and service tests for authenticated mutation receipt behavior. Tests cover accepted mutation responses, duplicate mutation classification, per-mutation rejection for non-uploadable local states, required active organization context, required server-side organization membership, and continued explicit errors for missing Clerk or Neon configuration.

The Neon adapter is covered through typed build checks and the Drizzle schema boundary. Live database integration tests remain future work because they require provisioned Neon credentials and migration state.

## Sprint 12 Web Auth Tests

Sprint 12 adds unit coverage for account-provisioning normalization and keeps route-level auth behavior behind Clerk's server runtime. Manual production verification should cover sign-in, organization selection, and `POST /api/account/provision` through the web workspace button.

## Sprint 13 Mobile Outbox Sync Tests

Sprint 13 adds mobile unit coverage for local sync migration, stable device ID creation, uploadable mutation filtering, receipt reconciliation, missing API configuration, missing auth token, accepted upload receipts, and rejected mutation handling.

Manual coverage should verify the Settings Cloud Sync panel reports missing configuration or auth-required state clearly. A later native-auth sprint must add device/manual verification for real Clerk token acquisition and live upload to production `/api/sync/mutations`.
