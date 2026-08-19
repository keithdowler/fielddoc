# Remediation Backlog

Audit date: 2026-08-16

Last groomed: 2026-08-18 after beta readiness and operations sprint

Priority legend: P0 critical, P1 high, P2 medium, P3 low.

Category legend: CORE VALUE, RELIABILITY, TRUST/SECURITY, MONETIZATION,
RETENTION, PRODUCTION, GROWTH, NICE-TO-HAVE.

## Closed Since Audit

These items should not keep reappearing as open backlog unless a narrower
follow-up is listed below.

| Area                   | Closed Remediation                                                                                                                                                 | Remaining Follow-Up                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Proof Packet output    | Local Proof Packet PDFs embed available local image originals with captions/metadata and include imported document metadata appendix cards.                        | Document page rendering, visual QA, cloud report versions.                      |
| Capture speed          | Mobile Capture has sticky before/work/after stage controls, quick captioning, next-stage control, and batch photo import.                                          | Camera loop, retake/replace, scanner mode.                                      |
| Web workspace          | Authenticated web dashboard/projects/reports/settings now read tenant-scoped Neon data instead of placeholder-only content.                                        | Project detail, report downloads, branding management, share links.             |
| App build readiness    | EAS profiles, initial iOS/Android identifiers, build numbers, and privacy/terms env placeholders exist.                                                            | Real App Store review package, account deletion, restore purchases, legal URLs. |
| Canonical sync apply   | Project, EvidenceItem, MediaAsset, Annotation, and ReportDraft mutations apply to canonical Neon tables after auth.                                                | Customer/Site/Document canonical application, pull sync, conflict detection.    |
| Cloud media foundation | Web can prepare authenticated signed private upload/download URLs; media upload state syncs through local and canonical rows.                                      | Live R2/device verification, object-existence verification.                     |
| Important evidence     | Evidence can be marked important locally, synced canonically, counted in readiness, shown in web lists, and rendered in PDFs.                                      | Visual polish and filtering for important-only review.                          |
| Media upload queue     | Mobile has a tested queue for prepare URL, binary PUT, complete upload, and local upload-state reconciliation.                                                     | Background retry controls and user-configurable upload constraints.             |
| Mobile cloud auth      | Expo app has Clerk native sign-in, secure token cache, Settings sign-in/out UI, and real token providers for sync/upload.                                          | Production/preview env hardening and App Store credential validation.           |
| Live cloud media loop  | Signed-in simulator/device metadata sync, R2 original upload, web original count, and private download were manually verified.                                     | Background retry controls and larger-file performance verification.             |
| Media integrity        | Upload completion verifies private object existence, size, type, optional metadata hash, and downloaded byte SHA-256.                                              | Async quarantine/verification workflow if large uploads need it.                |
| Web review loop        | Tenant-scoped project/report detail pages show evidence sections, annotations, readiness, and private original download links.                                     | Branded report management and delivery pages.                                   |
| Report archive         | Generated PDFs upload to private storage as verified report exports with authenticated downloads and expiring share links.                                         | Branded delivery pages and full audit-event rows.                               |
| Pull reconciliation    | Authenticated mobile pull sync downloads tenant-scoped canonical metadata, stores cursors, and preserves local conflicts.                                          | Stable tuple cursors, conflict review UI, automatic background sync.            |
| Audit trail            | Server writes tenant-scoped audit events for account provisioning, sync, media/report uploads/downloads, and share links.                                          | Denied-access/failure audit policy, retention tooling, admin event search.      |
| Monetization base      | RevenueCat SDK wiring, subscription diagnostics, restore purchases, webhook receipts, and `fielddoc_pro` cloud gates exist.                                        | App Store products, sandbox purchase validation, and paywall polish.            |
| Evidence replacement   | Mobile can retake/replace an active media asset while preserving the previous original row and queueing delete/create mutations.                                   | Visual replacement history polish and server-side replacement review filters.   |
| Local privacy controls | Mobile can export local metadata to JSON and clear local projects, evidence metadata, originals, generated PDFs, sync state, and queued mutations from the device. | Full cloud account export/deletion workflow and retention policy automation.    |
| Local report branding  | Mobile Settings can save local company name, prepared-by, footer text, and accent color, and local PDFs render those values without cloud APIs.                    | Logo upload, tenant-managed cloud branding, and web branding controls.          |
| Setup visibility       | Web Settings shows exact missing production environment variable names and the repo includes a remote provider setup hit list.                                     | User must still configure RevenueCat, Resend, Sentry, legal URLs, and stores.   |
| Beta readiness         | Shared domain readiness summary now scores tenant, storage, field evidence, report archive, sync receipts, audit, legal, billing, email, and observability setup.  | Field evidence volume, Resend, Sentry, legal URLs, and App Store submission.    |
| Operations visibility  | Web dashboard/settings now show readiness stage, score, blockers, warnings, and attention queues; mobile Settings has a Sync Center for the normal upload path.    | Background sync, conflict review UI, admin filtering, and provider runbooks.    |

## Active P1 Backlog

| Priority | Category     | Item                                                                                        | Complexity | Blocks Beta | Blocks App Store | Blocks Monetization |
| -------- | ------------ | ------------------------------------------------------------------------------------------- | ---------- | ----------- | ---------------- | ------------------- |
| P1       | CORE VALUE   | Render imported multi-page document pages or previews into Proof Packet PDFs                | M          | Yes         | Yes              | Yes                 |
| P1       | MONETIZATION | Configure App Store products, RevenueCat offerings, sandbox purchase test, and paywall copy | M          | No          | Yes              | Yes                 |

## Active P2 Backlog

| Priority | Category       | Item                                                                                    | Complexity | Blocks Beta | Blocks App Store | Blocks Monetization |
| -------- | -------------- | --------------------------------------------------------------------------------------- | ---------- | ----------- | ---------------- | ------------------- |
| P2       | CORE VALUE     | Upgrade camera-based document scan MVP to native crop/edge-detection multi-page flow    | M          | No          | No               | No                  |
| P2       | TRUST/SECURITY | Add malware-scan integration point or explicit quarantine placeholder for uploaded docs | M          | No          | Yes              | No                  |
| P2       | TRUST/SECURITY | Add denied-access/failure audit policy, retention controls, and admin audit search      | M          | No          | No               | No                  |
| P2       | PRIVACY        | Implement full cloud Export My Data and Delete Account flows                            | M          | No          | Yes              | No                  |
| P2       | RELIABILITY    | Add user-facing conflict review and resolution after preserved pull conflicts           | M          | No          | No               | No                  |
| P2       | CORE VALUE     | Add tenant-managed logo, cloud report branding, and web branding controls               | M          | No          | No               | Yes                 |
| P2       | RELIABILITY    | Generate thumbnail/preview derivatives for web and reports                              | M          | No          | No               | No                  |
| P2       | CORE VALUE     | Add OCR extraction for scanned/imported documents                                       | L          | No          | No               | No                  |
| P2       | PRODUCTION     | Exercise EAS production build, review notes, screenshots, privacy manifest, legal URLs  | M          | No          | Yes              | No                  |
| P2       | PRODUCTION     | Add Sentry and privacy-safe analytics event taxonomy                                    | S          | No          | No               | No                  |
| P2       | RETENTION      | Add activation metrics for project created, evidence captured, packet generated, synced | S          | No          | No               | No                  |
| P2       | CORE VALUE     | Add template model for vertical report sections without building a large template pack  | M          | No          | No               | No                  |
| P2       | PRODUCTION     | Configure Resend, Sentry, privacy URL, and terms URL in Vercel                          | S          | No          | Yes              | No                  |

## P3 Cleanup

| Priority | Category     | Item                                                            | Complexity |
| -------- | ------------ | --------------------------------------------------------------- | ---------- |
| P3       | NICE-TO-HAVE | Replace remaining public hardcoded Proof Packet text as needed  | S          |
| P3       | NICE-TO-HAVE | Clean older placeholder wording in README/docs/routes           | XS         |
| P3       | NICE-TO-HAVE | Add small copy polish pass for web empty states and setup hints | XS         |

## Recommended Next Sprint

Build document preview/rendering, native scanning, and customer delivery polish
next.

### Why

The core evidence/report loop now syncs metadata, uploads verified private
media/PDF assets, pulls canonical data back to mobile, leaves an audit trail for
high-value actions, has RevenueCat entitlement enforcement, and can reference
imported documents in local Proof Packets. The largest remaining core-value
blocker is rendering signed documents visually and capturing paper documents
without leaving the app.

### Scope

1. Add native document scanning path for paper signed/job documents.
2. Generate safe document-page previews and PDF rendering support.
3. Preserve immutable originals and derivatives with clear source metadata.
4. Add document-focused tests across SQLite, report assembly, and PDF output.
5. Keep OCR and advanced document search out of scope until the document loop is
   stable.

### Explicitly Out Of Scope

- OCR.
- Cloud branding editor.

## Deferred Until Validation

Do not build these before field usage proves the core loop:

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
