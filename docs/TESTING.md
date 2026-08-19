# Testing

## Sprint 0 Test Layers

- Lint: `pnpm lint`
- TypeScript: `pnpm typecheck`
- Unit tests: `pnpm test`
- Web production build: `pnpm --filter @fielddoc/web build`

## CI

GitHub Actions runs install, lint, typecheck, tests, and web build. Mobile validation is intentionally limited to lint/typecheck/unit-test compatible checks for now so CI does not require App Store credentials, signing assets, simulators, or native build secrets.

## Future Coverage

Future sprints should add focused tests for sync idempotency, conflict handling, evidence metadata validation, mobile binary upload retry behavior, object verification, authorization, and Proof Packet generation.

## Sprint 2 Local Persistence Tests

Sprint 2 adds repository-level SQLite tests that run against an in-memory Node SQLite database using the same repository implementations as the Expo SQLite adapter. Coverage includes empty database migration, project persistence, search and sort ordering, soft delete, archive behavior, evidence ordering, report summary counts, mutation generation, and duplicate mutation safety.

## Sprint 3 Media Tests

Sprint 3 extends repository coverage to local media asset metadata, media outbox mutations, media soft delete, media counts by evidence item, and report summary media counts. Pure helper tests cover media type inference, extension selection, and digest byte serialization.

Native picker flows are manually verified because camera, photo library, document picker, and app document storage depend on simulator/device capabilities.

Sprint 31 adds domain coverage for multi-page scanned document proof
classification and repository coverage for one document linked to multiple
visual page originals. Manual coverage should verify Scan Document captures
multiple pages into one evidence item, each page remains visible in Evidence
Detail, and the generated Proof Packet labels document pages with page hashes.

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

## Sprint 14 Canonical Sync Application Tests

Sprint 14 adds unit coverage for canonical mutation dispatch, Project create application, Project archive state changes, unsupported entity rejection, invalid payload rejection, and sync-service propagation of canonical application rejections.

The Neon/Drizzle adapter is covered by strict TypeScript and production build checks. Live Neon integration testing remains future work because it needs controlled branch credentials, seeded Clerk tenant bridges, and migration lifecycle automation.

## Sprint 15 Cloud Media Tests

Sprint 15 adds unit coverage for private object-key generation, short-lived R2/S3-compatible signed URLs, media upload preparation auth enforcement, upload completion metadata recording, download preparation, API-client media route methods, SQLite media upload-state migration, and local upload-state outbox mutation generation.

Manual coverage should verify production R2 credentials and bucket policy in Vercel, then use a signed upload URL from an authenticated request to upload a real object. A later native-auth/mobile-upload sprint must verify device binary upload, retry behavior, object existence checks, and local `storageObjectKey` reconciliation.

## Sprint 16 Important Evidence And Mobile Media Upload Tests

Sprint 16 adds unit coverage for important evidence migration, local
persistence, summary counts, outbox update generation, Proof Packet preview and
HTML rendering, mobile media upload queue auth/config states, signed upload
preparation, binary upload invocation, completion recording, local
`storageObjectKey` reconciliation, and failed-upload retry visibility.

Manual coverage should verify the Capture important toggle, report readiness
count, generated PDF badge, Settings native Clerk sign-in state, metadata sync,
and live original-media upload from a signed-in simulator/device.

## Sprint 18 Ordered Cloud Upload And Web Download Tests

Sprint 18 adds unit coverage for the mobile Upload All Pending Changes
orchestrator. Tests verify metadata uploads before media binaries, local media
is marked uploaded after prepare/binary/complete succeeds, and media upload is
skipped when metadata sync has rejected rows.

The web download route has unit coverage for signed-in Clerk session
requirements, active organization requirements, organization membership
enforcement, not-yet-uploaded media handling, and redirecting to a no-store
short-lived private object URL.

Manual coverage should capture/import a real image on the simulator, tap Upload
All Pending Changes, refresh the web Projects page, and use Download original
from the Uploaded originals section.

## Sprint 19 Media Integrity Tests

Sprint 19 adds unit coverage for signed upload headers, object verification
through private storage `HEAD` and `GET`, size/type/hash rejection, upload
completion rejection before local uploaded-state recording, and mobile
user-facing upload failure details.

Manual coverage should repeat the live signed-in upload flow with a real image,
then confirm the web download still opens the uploaded original. Storage
policies should be validated by confirming uploaded originals are not publicly
readable without a signed URL.

## Sprint 20 Web Review Loop Tests

Sprint 20 adds unit coverage for tenant workspace detail read models. Tests
verify project detail assembly by evidence section, uploaded-original
attachment, report detail assembly from included sections, and null returns for
project/report IDs outside the loaded workspace.

Manual coverage should sign into the web app, open Projects, drill into a
project detail page, inspect Before/Work/After/Documents/Other sections, open a
private original download, then open the related report detail page from Reports
or the project detail report list.

## Sprint 21 Report Archive Tests

Sprint 21 adds unit coverage for tenant-scoped report PDF object keys,
authenticated report upload preparation, verified report upload completion,
private report download preparation, opaque expiring report share links, public
share-link redirects, API-client report archive methods, SQLite generated-PDF
upload state, mobile report PDF upload orchestration, and the ordered mobile
cloud sync flow across metadata, original media, and report PDFs.

Manual coverage should generate a PDF on mobile, tap Upload All Pending Changes,
confirm the report PDF upload count succeeds, refresh web Reports, download the
PDF from the authenticated web route, create a share link through the API route
or a later UI, and confirm the share URL redirects to a short-lived private
storage URL.

## Sprint 22 Pull Reconciliation Tests

Sprint 22 adds unit coverage for the sync pull API client method, authenticated
pull route behavior, server-side membership enforcement, local SQLite pull
application, local conflict preservation, pull cursor diagnostics, and mobile
pull orchestration auth/config states.

Manual coverage should sign into mobile, upload pending changes, tap Download
Cloud Changes in Settings, confirm no changes are waiting, then sign into a
fresh simulator/device and tap Download Cloud Changes to confirm canonical
project metadata appears locally. Conflict review remains future UI work; tests
verify conflicting local rows are preserved and marked `CONFLICT`.

## Sprint 23 Audit And Tenant-Isolation Tests

Sprint 23 adds unit coverage for audit-event creation across media upload,
report share-link creation/access, sync mutation upload, sync pull, and
authenticated media/report download redirects. Redirect tests assert private
temporary URLs continue to use `Cache-Control: no-store`.

Tenant-isolation coverage now explicitly verifies authenticated media/report
routes deny missing organization context, missing server-side membership, and
resources outside the active organization. Live audit-event insertion remains a
Neon integration concern because it requires production credentials and applied
migrations.

## Sprint 24 RevenueCat Entitlement Tests

Sprint 24 adds unit coverage for shared entitlement gating, public mobile
RevenueCat configuration parsing, mobile subscription state copy, RevenueCat
webhook payload validation, webhook authorization failure, idempotent duplicate
receipt handling, and applying active/inactive entitlement state from provider
events.

Manual coverage should configure RevenueCat public mobile keys, rebuild the
development client after installing `react-native-purchases`, sign into mobile,
confirm Settings shows subscription state, tap Refresh and Restore, and verify
cloud upload controls remain disabled until RevenueCat reports `fielddoc_pro`
active. Current sandbox coverage may also use `FieldDocPro` or `FieldDoc Pro`
while RevenueCat naming restrictions are being resolved. Server coverage requires
applying migration
`0006_revenuecat_entitlements.sql`, setting `REVENUECAT_WEBHOOK_SECRET`, adding
the webhook URL in RevenueCat, and sending a signed test event.

## Sprint 25 Evidence Replacement And Local Privacy Tests

Sprint 25 adds repository coverage for retake/replace behavior. The tests assert
that the replaced media asset is soft-deleted, immutable original metadata
remains intact, the replacement records `originalAssetId` and
`derivativeType: "REPLACEMENT"`, and local outbox delete/create mutations are
queued.

Local privacy tests cover metadata-only JSON export and local device database
clearing while preserving schema migrations. Manual coverage should export local
data from Settings, confirm the native share sheet opens with a JSON archive,
then use Delete Local Device Data on a simulator seeded with disposable data and
confirm projects/evidence disappear after navigating away and back.

## Sprint 26 Document Appendix And Branding Tests

Sprint 26 adds domain coverage for local report branding normalization and
Proof Packet HTML rendering with branded header/footer content plus document
appendix metadata. Repository tests cover the local settings migration, local
report branding persistence, malformed setting fallback, and the rule that
branding is local-only and does not enqueue sync mutations.

Manual coverage should import a PDF/file from Capture, confirm it is categorized
as Document evidence, save local report branding in Settings, generate a Proof
Packet, and inspect the generated PDF for company/prepared-by/footer text plus
document MIME/size/SHA metadata.

## Sprint 27 Production Readiness Tests

Sprint 27 adds config-package coverage for production readiness diagnostics.
Tests verify that readiness checks report exact missing environment variable
names without exposing configured secret values. The web Settings page consumes
the shared readiness model so Vercel production gaps are visible in the app.

Manual coverage should redeploy the web app after provider setup changes, sign
in, open `/app/settings`, and confirm each readiness row changes from Not
configured to Ready as the matching environment variables are added.

## Sprint 28 Beta Readiness And Operations Tests

Sprint 28 adds shared domain coverage for beta-readiness stages, setup blockers,
provider warnings, and production-candidate scoring. The web app consumes the
same readiness summary in Dashboard and Settings, while Projects and Reports add
queue metrics for missing captions, pending originals, and unarchived reports.

Manual coverage should sign into the deployed web app, open `/app`, `/app/projects`,
`/app/reports`, and `/app/settings`, then confirm the readiness score, blockers,
warnings, and queue counts match the latest synced mobile data. On mobile,
Settings should show Sync Center as ready only after Clerk sign-in and an active
RevenueCat entitlement.

## Sprint 33 Universal Usability Tests

Sprint 33 adds shared domain coverage for a plain-language report checklist that
marks customer-facing report steps as complete, needs attention, or blocked.
Manual coverage should verify mobile dynamic text at larger accessibility sizes,
one-handed reachability of primary buttons, visible Settings backup/subscription
states, the Reports "What Needs Attention" checklist, and keyboard focus
visibility on the deployed web workspace.

## Sprint 29 Document Metadata And Canonical Sync Tests

Sprint 29 adds local repository coverage for document metadata, soft delete, and
outbox mutation generation. Sync application tests now verify `Document`
mutations are accepted and passed to canonical persistence instead of being
rejected as unsupported. Workspace-data tests include document rows so web
project/report totals cover document counts.

Manual coverage should create a project on mobile, tap Scan Document, capture a
paper page, then import a PDF/file. Confirm both appear under Document evidence,
upload pending changes from Settings, open the deployed web project detail, and
verify document counts and document metadata appear alongside media downloads.

## Sprint 32 Imported-Original Delivery Tests

Sprint 32 adds shared domain coverage for imported PDFs and other non-image
documents as `external_original` proof entries. Tests verify that imported
originals are counted separately from visual scanned pages and metadata-only
documents, that report delivery readiness treats them as complete but warns they
are not visually embedded, and that Proof Packet HTML includes immutable file
metadata without duplicate generic document cards.

Web workspace tests cover visual, external-original, and metadata-only document
counts in project/report read models. Report service tests cover the no-auth
public share landing view and assert that the page exposes report integrity
metadata and a local download path without leaking private object-storage URLs.

Manual coverage should import multiple files from mobile Capture, including a
PDF and an image. Confirm the Capture detail page labels the PDF as an imported
original, generate a Proof Packet, and verify the report readiness warning is
clear. Upload the report PDF, create/open a share link, confirm
`/share/reports/{token}` renders the branded delivery page, and use its download
button to retrieve the private archived PDF.
