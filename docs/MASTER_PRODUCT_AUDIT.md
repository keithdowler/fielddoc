# Master Product Audit

Audit date: 2026-08-16

Remediation update: 2026-08-16

## 1. Executive Summary

FieldDoc/Proof Packet has a real engineering foundation: pnpm monorepo, Expo mobile app, Next.js/Vercel web app, shared domain package, local SQLite persistence, local media copying with SHA-256 metadata, local report draft/PDF generation, Clerk-backed web auth, Neon schema, and a first server sync upload path.

It is not yet commercially ready. The biggest gap is not code quality; the quality gates pass. The gap is product proof. The original intent is a field worker producing a professional, chronological, tamper-evident Proof Packet in about two minutes. Recent remediation moved the product closer by embedding local image originals into generated PDFs, adding a fast field-capture panel with sticky stages and batch photo import, replacing web placeholder pages with tenant-scoped Neon-backed views, adding EAS/App Store readiness scaffolding, applying canonical sync metadata, and adding authenticated private media signing routes. Remaining blockers are native mobile auth, mobile binary media upload, document scanning/OCR, cloud report/share links, pull sync, privacy/account workflows, and monetization.

Recommendation: CONDITIONAL GO for continued founder-led dogfooding and technical sprints. NO-GO for paid beta, App Store launch, or broader outside-user validation until the Proof Packet output, capture speed, account conversion, cloud media/share path, and basic monetization gates are fixed.

## 2. Overall Product Score

Overall score: 49/100

This is a credible pre-beta foundation, not a production SaaS product yet.

## 3. Category Scores

| Category                  | Score | Notes                                                                                                                                                                                              |
| ------------------------- | ----: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core Workflow             |  6/10 | Mobile can create projects, add evidence metadata, attach media, create report drafts, and generate local PDFs. Web review/download workflow is not real.                                          |
| Capture UX                |  5/10 | Fast field-capture panel and batch photo import now exist. Retake loops, important marking, scan mode, and richer outdoor capture ergonomics remain.                                               |
| Offline Reliability       |  8/10 | SQLite-backed local persistence and outbox are real and tested.                                                                                                                                    |
| Evidence Integrity        |  7/10 | Original files are copied locally and hashed. Signed private media URL preparation and storage-object metadata exist; mobile binary upload and object verification are missing.                    |
| Proof Packet Quality      |  6/10 | Local PDF generation now embeds available image originals. Document pages, richer layout, cloud report versions, and visual QA remain.                                                             |
| Sync Reliability          |  5/10 | Upload endpoint, idempotent mutation receipt, canonical apply, and media signing contracts exist. Pull, conflict resolution, mobile token acquisition, and binary media upload are missing.        |
| Security/Tenant Isolation |  6/10 | Clerk auth, membership resolution, org-scoped writes, workspace reads, media signing authorization, and env validation exist. Live tenant isolation tests and audit events are missing.            |
| Monetization Readiness    |  1/10 | RevenueCat is only an ADR/env placeholder. No paywall, entitlements, restore purchases, webhooks, or subscription UX.                                                                              |
| Commercial Value          |  5/10 | The concept is strong, but the current artifact is not yet clearly better than organized photos plus a manual PDF.                                                                                 |
| Production Readiness      |  6/10 | CI/build/test foundation is good. EAS profiles, build numbers, and privacy/terms env placeholders now exist. Account deletion, observability, support flows, and production ops remain incomplete. |

## 4. Product Strengths

- The target problem is narrow and commercially plausible: small field-service businesses need proof of condition, completion, and dispute defense.
- Offline-first mobile architecture is directionally correct for job sites.
- Local SQLite repositories avoid raw SQL in the UI and provide tested persistence.
- Original media is copied into app storage and hashed before metadata is recorded.
- The domain package owns shared models and Proof Packet assembly, avoiding duplicated app-specific models.
- The sync path has a good initial shape: client-generated IDs, durable mutation receipt, duplicate handling, and server canonical records.
- Public product name is mostly configurable, with FieldDoc kept mainly as internal package/app identifiers.

## 5. P0 Critical Findings

No immediate P0 code defect was found during this audit. The repo builds and tests pass.

Commercially, however, there are beta/App Store blocking P1 issues below. Treat them as "do not launch broadly" blockers.

## 6. P1 High Findings

### P1-1: Proof Packet output does not yet prove the product promise

Remediation update: local image originals are now embedded into generated Proof Packet PDFs when the local file can be read. This is still high priority because scanned document pages, visual QA, branding, and cloud report versions are not complete.

Evidence:

- `packages/domain/src/index.ts` supports `embeddedMedia` and renders image figures in packet entries.
- `apps/mobile/src/infrastructure/reporting/local-pdf-renderer.ts` converts local image originals into base64 data URIs before Expo Print generation.

Customer consequence: the output is not yet compelling enough to replace the customer's messy photo folder or manual report.

### P1-2: Native document scanning and OCR are missing

The schema supports `DOCUMENT_SCAN`, but the mobile app only uses Expo ImagePicker and DocumentPicker. There are no native iOS VisionKit files, no EAS config, and no OCR pipeline.

Evidence:

- `apps/mobile/src/infrastructure/media/local-media.ts` implements camera photo, photo library, and file import.
- `apps/mobile/app.json` includes `expo-document-picker`, not a native VisionKit document scanner.
- No `eas.json`, Swift, Objective-C, or Kotlin native module files were present in the repo.

Customer consequence: the app cannot yet handle signed work orders, invoices, receipts, or service documents the way the original intent requires.

### P1-3: Capture flow is functional but too slow for outdoor field work

Remediation update: the capture screen now has a fast Field Capture card with before/work/after counters, sticky stage controls, quick caption, camera capture, batch photo import, and next-stage control. It is better, but still missing a true camera loop, retake path, and important/star evidence.

Evidence:

- `apps/mobile/src/app/capture/index.tsx` includes Field Capture controls and still retains detailed metadata editing below.
- `apps/mobile/src/infrastructure/media/local-media.ts` supports multi-select photo library import.

Customer consequence: a technician capturing 20+ photos may abandon captions/categories and fall back to the camera roll.

### P1-4: Web workspace needs detail/download workflows

Remediation update: the authenticated web workspace now reads tenant-scoped Neon data for dashboard, projects, reports, and organization readiness. It is no longer placeholder-only, but generated PDF download, branding management, team settings, and share links remain incomplete.

Evidence:

- `apps/web/app/app/workspace-data.ts` resolves the active Clerk organization to the internal tenant and reads synced workspace data.
- `apps/web/app/app/projects/page.tsx`, `apps/web/app/app/reports/page.tsx`, and `apps/web/app/app/settings/page.tsx` render real data/setup states.

Customer consequence: after sync, an office user can see workspace data but still cannot review full project detail, manage branding, download cloud reports, or administer the workspace.

### P1-5: Mobile account conversion and authenticated sync are not wired

Web auth uses Clerk, but mobile sync receives a token provider that returns `null`, so the Settings sync button cannot authenticate.

Evidence:

- `apps/mobile/src/app/settings/index.tsx` uses `getAccessToken() { return null; }`.
- `apps/mobile/src/infrastructure/sync/mobile-outbox-sync.ts` returns `auth_required` when no token is available.

Customer consequence: a user can create valuable local evidence but cannot yet reliably connect it to an account and cloud history.

### P1-6: Cloud media signing exists, but mobile upload and share links are absent

Media metadata can sync, signed upload/download preparation routes exist, and canonical media rows preserve storage fields. Original bytes still stay local until mobile performs binary upload and the server verifies completion. Share links and generated report object keys are still missing.

Evidence:

- `.env.example` documents R2 placeholders; production values must be configured outside git.
- `apps/web/app/api/media/uploads/prepare/route.ts` prepares signed private upload URLs.
- `apps/web/app/api/media/uploads/complete/route.ts` records upload completion metadata.
- `apps/web/app/api/media/downloads/prepare/route.ts` prepares signed private download URLs.
- `apps/mobile/src/infrastructure/local-store/media-assets.ts` can mark media uploaded locally and enqueue the update.
- `apps/web/app/api/sync/mutations/neon-canonical-repository.ts` still sets `generatedPdfObjectKey: null` for report drafts.

Customer consequence: reports and evidence are not durable across devices, teams, or web access.

### P1-7: Monetization is not implemented

RevenueCat is documented as an ADR and env placeholder, but the mobile package has no RevenueCat dependency and no paywall/entitlement checks.

Evidence:

- `.env.example` includes `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` and `REVENUECAT_WEBHOOK_SECRET`.
- `apps/mobile/package.json` has no RevenueCat SDK dependency.

Customer consequence: the product cannot enforce trial, paid plans, usage limits, restore purchases, or subscription status.

## 7. P2 Medium Findings

### P2-1: Server model lacks several production entities

Current Neon schema includes organizations, users, memberships, core records, received mutations, and sync conflicts. It does not yet include templates, report runs, report versions, share links, subscriptions, entitlements, audit events, deletion requests, or storage upload records.

Evidence:

- `packages/database/src/schema.ts` ends with `received_local_mutations` and `sync_conflicts`.

### P2-2: Sync is upload-first only

The upload response returns `pullCursor: null`. There is no server-to-mobile pull, no canonical change feed, no stale-version conflict preservation, and no cross-device merge UX yet.

Evidence:

- `apps/web/app/api/sync/mutations/sync-service.ts` sets `pullCursor: null`.

### P2-3: Tenant isolation is not proven end-to-end

The code scopes canonical writes by `organizationId`, which is good. But there are no live Neon tests or read APIs proving User A cannot read/write User B's projects, reports, media, or shares.

Evidence:

- `apps/web/app/api/sync/mutations/sync-service.ts` requires membership before recording mutations.
- `apps/web/app/api/sync/mutations/neon-canonical-repository.ts` scopes deletes by `organizationId`.

### P2-4: Privacy/account controls are placeholders

Settings lists Privacy, Export My Data, Delete Account, and Diagnostics, but all rows still show `Placeholder`.

Evidence:

- `apps/mobile/src/app/settings/index.tsx` renders these controls as placeholders.

### P2-5: Observability is planned but absent

PostHog and Sentry are placeholders only. There is no event taxonomy, error reporting setup, privacy-safe analytics implementation, or production incident monitoring.

Evidence:

- `.env.example` has `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, and `SENTRY_DSN`, but no runtime integration was found.

### P2-6: App Store readiness is incomplete

Remediation update: EAS build profiles, build numbers, Android package/version code, and privacy/terms env placeholders now exist. RevenueCat production setup, account deletion, restore purchases, Sign in with Apple strategy, legal URLs, and review notes remain blockers.

Evidence:

- `apps/mobile/app.json` contains production identifiers and initial build numbers.
- `apps/mobile/eas.json` defines development, preview, and production profiles.

## 8. P3 Low Findings

- Some README and route text still says "placeholder" from earlier sprints.
- `FieldDoc` remains in internal package names, scheme, bundle identifier, database name, and API identifiers. That is acceptable for internal identifiers, but public surfaces should keep using configurable product naming.
- Report rendering hardcodes `productName: "Proof Packet"` in the mobile local renderer instead of reading the public product-name config.

## 9. Missing Core Capabilities

- Native document scanner.
- OCR for scanned documents and imported documents.
- Rapid/batch photo capture workflow.
- Important/starred evidence.
- Retake/replace flow that preserves immutable originals correctly.
- Embedded image/document pages in generated Proof Packet.
- Branding templates and report themes.
- Mobile original-media binary upload to private storage.
- Cloud report generation/versioning.
- Share links with access control and expiration.
- Web project/report library.
- Mobile auth and account conversion.
- Pull sync and conflict UX.
- RevenueCat subscription gating.
- Account deletion and export.
- Production analytics/observability.

## 10. Placeholder/Fake Implementations Found

- Web projects, reports, and settings now render data-backed workspace views, but lack download/share/branding administration.
- Mobile settings account/privacy/subscription/export/delete diagnostics controls are placeholders.
- RevenueCat, PostHog, Sentry, and Resend are env placeholders only. R2 is documented/configured as a private signing target, but production credentials and bucket policy must be supplied outside git.
- Mobile sync token provider intentionally returns `null`.
- Proof Packet PDF embeds local image originals when available; scanned document rendering remains missing.
- Customer, Site, and Document canonical sync application is still not implemented.

No fake production API acknowledgements were found. The sync endpoint rejects unsupported entities or missing configuration instead of pretending success.

## 11. Security Findings

- Positive: env schema validation exists, `.env.example` contains documented placeholders only, and secrets are not committed.
- Positive: Clerk protects web app routes and account provisioning.
- Positive: sync mutation upload requires bearer auth and active organization membership.
- Gap: no live tenant-isolation test against Neon.
- Gap: no live tenant-isolation test against media signing or future share links.
- Gap: no audit events table for evidence/report/share/admin actions.
- Gap: no production upload validation for size, MIME, content hash, malware scanning, or object key authorization.

## 12. Privacy Findings

- Positive: privacy docs correctly classify job-site media, documents, captions, report PDFs, and local report history as sensitive.
- Gap: mobile Privacy, Export My Data, and Delete Account are placeholders.
- Gap: no data-retention policy enforcement.
- Gap: no privacy-safe analytics implementation.
- Gap: no App Store privacy manifest or privacy URL strategy yet.

## 13. Unit-Economic Risks

- Report generation cost is currently low because it is local, but cloud storage/generation costs are not modeled.
- Original media storage can become expensive if full-resolution photos and PDFs are uploaded without compression, thumbnails, lifecycle rules, or plan limits.
- If the app requires too much manual captioning, onboarding/support cost will rise and paid conversion will suffer.
- Without RevenueCat entitlements and usage limits, there is no enforcement path for free trial vs paid usage.

## 14. App Store Blockers

- EAS production build config exists, but it has not been exercised for store submission.
- No production version/build-number strategy.
- No account deletion flow.
- No restore purchases.
- No RevenueCat production setup.
- No subscription disclosure/paywall.
- No privacy policy URL and terms URL configuration.
- No Sign in with Apple decision/implementation for account auth.
- No screenshot/review-account checklist.
- No native scanner entitlement/review path if VisionKit is added later.

## 15. Market-Value Assessment

| Question                          | Current Score | Target Score | Notes                                                                         |
| --------------------------------- | ------------: | -----------: | ----------------------------------------------------------------------------- |
| Pain is frequent and expensive    |             8 |            8 | Real problem in maintenance/restoration/property service.                     |
| Willingness to pay monthly        |             5 |            8 | Needs proof artifact, cloud history, and monetization path.                   |
| Saves admin time                  |             5 |            8 | Local report helps, but capture/report quality still too manual.              |
| Reduces disputes/invoice friction |             6 |            9 | Strong promise, incomplete output.                                            |
| First-session value               |             6 |            9 | Mobile can make a local PDF, but mobile auth/upload/share loop missing.       |
| Visibly better than photos        |             6 |            9 | Report now embeds available image evidence; document pages and polish remain. |
| Faster than generic alternatives  |             5 |            9 | Capture loop needs speed sprint.                                              |
| Report is viral/shareable         |             3 |            8 | No cloud share links or branded professional artifact yet.                    |
| Reason to return every job        |             6 |            8 | Offline project history exists.                                               |
| Single-user to team path          |             4 |            8 | Org model exists, team workflows absent.                                      |
| Lock-in via history/templates     |             5 |            8 | Local history exists, templates/cloud history absent.                         |
| Narrow marketability              |             8 |            8 | Positioning is strong.                                                        |

## 16. Features We Should NOT Build Yet

- CRM.
- Scheduling.
- Invoicing.
- Estimating.
- Accounting/QuickBooks.
- Customer portals.
- Complex RBAC.
- Broad AI narrative generation.
- Advanced OCR search.
- Large vertical template library.

Do not add these before at least 20 activated outside users, 10 users with multiple real Proof Packets, and 5 users willing to pay.

## 17. Recommended Next 10 Actions

1. Wire native mobile auth/token acquisition to Clerk.
2. Upload original media bytes from mobile through prepared signed private URLs.
3. Add important/star evidence and make it visible in readiness and report output.
4. Add retake/replace while preserving immutable original records.
5. Add web project detail and report detail/download views backed by Neon.
6. Add secure share links for generated reports with access control and expiration.
7. Implement native document scanning and document page rendering in Proof Packets.
8. Add pull sync, local reconciliation, and conflict preservation.
9. Implement RevenueCat entitlements, paywall, restore purchases, and webhook handling.
10. Finish production readiness: legal URLs, account deletion, App Review package, Sentry, privacy-safe analytics.

## 18. Recommendation

GO / CONDITIONAL GO / NO-GO recommendation: CONDITIONAL GO for internal dogfooding and continued focused development. NO-GO for App Store launch, paid beta, or broad customer validation.

The product is pointed in the right direction. The next work should be fewer infrastructure sprints and more proof-value sprints: make one real job's packet look excellent, make capture fast enough to use outdoors, then connect that output to account/cloud/share/paid access.
