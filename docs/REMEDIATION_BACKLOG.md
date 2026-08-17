# Remediation Backlog

Audit date: 2026-08-16

Last groomed: 2026-08-17 after cloud report archive sprint

Priority legend: P0 critical, P1 high, P2 medium, P3 low.

Category legend: CORE VALUE, RELIABILITY, TRUST/SECURITY, MONETIZATION,
RETENTION, PRODUCTION, GROWTH, NICE-TO-HAVE.

## Closed Since Audit

These items should not keep reappearing as open backlog unless a narrower
follow-up is listed below.

| Area                   | Closed Remediation                                                                                                             | Remaining Follow-Up                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Proof Packet output    | Local Proof Packet PDFs embed available local image originals with captions/metadata.                                          | Document page rendering, visual QA, cloud report versions.                      |
| Capture speed          | Mobile Capture has sticky before/work/after stage controls, quick captioning, next-stage control, and batch photo import.      | Camera loop, retake/replace, scanner mode.                                      |
| Web workspace          | Authenticated web dashboard/projects/reports/settings now read tenant-scoped Neon data instead of placeholder-only content.    | Project detail, report downloads, branding management, share links.             |
| App build readiness    | EAS profiles, initial iOS/Android identifiers, build numbers, and privacy/terms env placeholders exist.                        | Real App Store review package, account deletion, restore purchases, legal URLs. |
| Canonical sync apply   | Project, EvidenceItem, MediaAsset, Annotation, and ReportDraft mutations apply to canonical Neon tables after auth.            | Customer/Site/Document canonical application, pull sync, conflict detection.    |
| Cloud media foundation | Web can prepare authenticated signed private upload/download URLs; media upload state syncs through local and canonical rows.  | Live R2/device verification, object-existence verification.                     |
| Important evidence     | Evidence can be marked important locally, synced canonically, counted in readiness, shown in web lists, and rendered in PDFs.  | Visual polish and filtering for important-only review.                          |
| Media upload queue     | Mobile has a tested queue for prepare URL, binary PUT, complete upload, and local upload-state reconciliation.                 | Background retry controls and user-configurable upload constraints.             |
| Mobile cloud auth      | Expo app has Clerk native sign-in, secure token cache, Settings sign-in/out UI, and real token providers for sync/upload.      | Production/preview env hardening and App Store credential validation.           |
| Live cloud media loop  | Signed-in simulator/device metadata sync, R2 original upload, web original count, and private download were manually verified. | Background retry controls and larger-file performance verification.             |
| Media integrity        | Upload completion verifies private object existence, size, type, optional metadata hash, and downloaded byte SHA-256.          | Async quarantine/verification workflow if large uploads need it.                |
| Web review loop        | Tenant-scoped project/report detail pages show evidence sections, annotations, readiness, and private original download links. | Branded report management and delivery pages.                                   |
| Report archive         | Generated PDFs upload to private storage as verified report exports with authenticated downloads and expiring share links.     | Branded delivery pages and full audit-event rows.                               |

## Active P1 Backlog

| Priority | Category       | Item                                                                                        | Complexity | Blocks Beta | Blocks App Store | Blocks Monetization |
| -------- | -------------- | ------------------------------------------------------------------------------------------- | ---------- | ----------- | ---------------- | ------------------- |
| P1       | CORE VALUE     | Add retake/replace flow that preserves immutable originals and records replacement metadata | M          | Yes         | No               | Yes                 |
| P1       | CORE VALUE     | Add native document scanning path for signed/job documents                                  | L          | Yes         | Yes              | No                  |
| P1       | CORE VALUE     | Render scanned/imported document pages or previews into Proof Packet PDFs                   | M          | Yes         | Yes              | Yes                 |
| P1       | RELIABILITY    | Add server pull sync and local reconciliation                                               | L          | Yes         | No               | Yes                 |
| P1       | TRUST/SECURITY | Add tenant-isolation tests for sync, workspace reads, and media signing                     | M          | Yes         | Yes              | Yes                 |
| P1       | MONETIZATION   | Implement RevenueCat SDK, entitlement checks, paywall, restore purchases, and webhook       | L          | No          | Yes              | Yes                 |

## Active P2 Backlog

| Priority | Category       | Item                                                                                             | Complexity | Blocks Beta | Blocks App Store | Blocks Monetization |
| -------- | -------------- | ------------------------------------------------------------------------------------------------ | ---------- | ----------- | ---------------- | ------------------- |
| P2       | TRUST/SECURITY | Add malware-scan integration point or explicit quarantine placeholder for uploaded docs          | M          | No          | Yes              | No                  |
| P2       | TRUST/SECURITY | Add full audit event rows for report generation, share, delete, sync, account, and admin actions | M          | No          | No               | No                  |
| P2       | PRIVACY        | Implement Export My Data and Delete Account flows                                                | M          | No          | Yes              | No                  |
| P2       | RELIABILITY    | Implement conflict detection using server versions and preserve conflicting edits                | L          | No          | No               | No                  |
| P2       | CORE VALUE     | Add report branding controls for company name, logo, colors, and footer text                     | M          | No          | No               | Yes                 |
| P2       | RELIABILITY    | Generate thumbnail/preview derivatives for web and reports                                       | M          | No          | No               | No                  |
| P2       | CORE VALUE     | Add OCR extraction for scanned/imported documents                                                | L          | No          | No               | No                  |
| P2       | PRODUCTION     | Exercise EAS production build, review notes, screenshots, privacy manifest, legal URLs           | M          | No          | Yes              | No                  |
| P2       | PRODUCTION     | Add Sentry and privacy-safe analytics event taxonomy                                             | S          | No          | No               | No                  |
| P2       | RETENTION      | Add activation metrics for project created, evidence captured, packet generated, synced          | S          | No          | No               | No                  |
| P2       | CORE VALUE     | Add template model for vertical report sections without building a large template pack           | M          | No          | No               | No                  |

## P3 Cleanup

| Priority | Category     | Item                                                            | Complexity |
| -------- | ------------ | --------------------------------------------------------------- | ---------- |
| P3       | NICE-TO-HAVE | Replace remaining public hardcoded Proof Packet text as needed  | S          |
| P3       | NICE-TO-HAVE | Clean older placeholder wording in README/docs/routes           | XS         |
| P3       | NICE-TO-HAVE | Add small copy polish pass for web empty states and setup hints | XS         |

## Recommended Next Sprint

Build server pull sync and local reconciliation next.

### Why

The core mobile-to-cloud evidence and report archive paths now work in one
direction. The largest remaining reliability gap is that devices can upload but
cannot yet pull canonical server changes, reconcile remote updates, or preserve
conflicting local edits after another device changes the same project.

### Scope

1. Add a pull cursor response shape for canonical project, evidence, media,
   annotation, document, and report draft changes.
2. Add local application of pulled canonical metadata into SQLite.
3. Preserve local conflicting edits instead of overwriting them silently.
4. Expose Settings diagnostics for last pull cursor, pulled row counts, and
   conflict count.
5. Add tenant-isolation and conflict tests around the sync read side.

### Explicitly Out Of Scope

- RevenueCat.
- OCR.
- Native scanner.
- Report branding editor.

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
