# Release Screen Inventory

## Mobile

| Screen   | Status     | Release Notes                                                                                                                                                                             |
| -------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home     | Beta-ready | Shows next action, current job, start job, attention queue, recent jobs, reports, and unsynced status.                                                                                    |
| Projects | Beta-ready | Supports local create, edit, archive, delete, search, sort, sections, evidence summary, and report history.                                                                               |
| Capture  | Beta-ready | Supports staged capture, quick captions, photo library, camera, document scan, file import, metadata edits, document review summaries, annotations, replacement, and soft delete/restore. |
| Reports  | Beta-ready | Supports local draft, readiness checklist, section ordering, PDF generation, open/share, PDF state, and report history.                                                                   |
| Settings | Beta-ready | Supports auth, subscription refresh/restore, backup center, metadata/media/PDF upload, pull sync, conflict review, branding, export, and local delete.                                    |

## Web

| Screen                         | Status     | Release Notes                                                                            |
| ------------------------------ | ---------- | ---------------------------------------------------------------------------------------- |
| `/`                            | Beta-ready | Public entry and sign-in direction.                                                      |
| `/login`                       | Beta-ready | Clerk-backed sign-in.                                                                    |
| `/app`                         | Beta-ready | Workspace dashboard, readiness score, attention queue, backed-up jobs.                   |
| `/app/projects`                | Beta-ready | Cloud project list and health indicators.                                                |
| `/app/projects/[projectId]`    | Beta-ready | Project evidence sections, document safety summaries, media and report context.          |
| `/app/reports`                 | Beta-ready | Report list and archive/share context.                                                   |
| `/app/reports/[reportDraftId]` | Beta-ready | Report evidence, delivery readiness, document safety, links, and audit context.          |
| `/app/settings`                | Beta-ready | Tenant, storage, subscription, email, error-reporting, diagnostics, and audit readiness. |

## Non-Screen Surfaces

- Local PDF renderer
- Mobile outbox sync
- Mobile pull sync
- Media upload
- Report PDF upload
- Server sync APIs
- Server report export/share APIs
- Neon migrations
- Cloudflare R2 private object storage
- RevenueCat entitlement state
