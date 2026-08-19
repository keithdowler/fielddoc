# Friction Log

## Resolved

| Area             | Friction                                                             | Resolution                                                                |
| ---------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Project creation | Too many optional fields appeared before the user had a job started. | Only job name is shown by default; customer/site details can be expanded. |
| Capture          | Photo and file actions were duplicated across sections.              | Fast Capture handles photos/scans; Supporting File handles file import.   |
| Capture          | Users had to type common captions repeatedly.                        | Added quick caption suggestions.                                          |
| Capture          | Success messages were technical.                                     | Save confirmation now says where evidence went and what to do next.       |
| Reports          | Unsafe supporting files looked like ordinary incomplete metadata.    | Added blocked document classification and readiness blockers.             |
| Sync             | Preserved conflicts were durable but hidden.                         | Added Conflict Review in Settings with mark-reviewed action.              |
| Web              | Report views did not surface blocked supporting documents.           | Added blocked document counts and safety summaries.                       |

## Still Open

| Area               | Friction                                                      | Suggested Fix                                                      |
| ------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------ |
| Imported PDFs      | PDF originals are preserved but not visually rendered inline. | Add server-side or local PDF thumbnail/page preview generation.    |
| Production support | Users cannot send diagnostics to support from the app.        | Add support bundle export and optional email handoff.              |
| Email delivery     | Share-link email delivery is not configured.                  | Connect production email provider and sender domain.               |
| Error reporting    | Runtime errors are not sent to a production error system.     | Add Sentry or equivalent before broad beta.                        |
| App Store          | Screenshots and privacy metadata are not complete.            | Use the screenshot plan and privacy docs to prepare store listing. |
