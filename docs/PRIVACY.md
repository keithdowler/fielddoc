# Privacy

FieldDoc handles sensitive job-site, customer, document, and location data.

Analytics services may receive normalized product behavior only. Never send customer names, addresses, captions, OCR content, filenames, document content, photos, or GPS coordinates to analytics.

Location metadata is optional and must require explicit permission. If collected, it belongs with evidence metadata and must be treated as sensitive.

Original media is private by default. Sharing should occur through explicit user action and time/permission-scoped access patterns.

Sprint 3 stores original media files locally on the device before any cloud upload exists. These files may contain sensitive job-site, customer, address, document, and device-captured information. Do not log local URIs, filenames, captions, file contents, image contents, or hashes to analytics.

Sprint 4 captions, notes, and annotations may contain customer names, site details, damage descriptions, or other sensitive field notes. Treat them as private content; do not send them to analytics or logs.

Sprint 5 report draft titles, notes, and section choices may reveal customer/site context and project status. Treat draft composition as private local business data until explicit sync and export controls exist.

Sprint 6 packet previews combine project metadata, captions, annotations, and media metadata into a customer-facing structure. Treat the assembled preview as sensitive even though it is not persisted separately or exported yet.

Sprint 7 generated PDFs are private local files that may contain customer, site, caption, annotation, and evidence metadata. Do not log generated PDF URIs or expose them through analytics. Sharing must remain an explicit later user action.

Sprint 8 introduces explicit user-triggered local sharing. The app must not automatically share, upload, or analyze a PDF. Once a user shares through the native sheet, handling depends on the selected destination app and is outside FieldDoc local storage controls.

Sprint 9 local report history can reveal project names, report titles, generated timestamps, and whether a PDF exists on the device. Treat it as private local business data. It must not be uploaded, logged, or sent to analytics until explicit synchronization and privacy controls exist.

Sprint 10 sync contracts are sensitive because mutation payloads may include the same private project, customer, site, evidence, caption, annotation, document, and report metadata stored locally. Contract tests may use synthetic sample values only. Production implementations must avoid request-body logging and must enforce organization ownership before storing or returning synced records.

Sprint 11 stores mutation envelopes in Neon only after server-side authentication and organization membership checks. These rows may contain private customer and evidence metadata in `payload_json`; treat them as tenant data subject to the same privacy restrictions as canonical records. Duplicate and rejected responses must avoid echoing payload contents.

Sprint 23 adds audit events for operational accountability. Audit rows are tenant data and should contain stable identifiers, event names, counts, timestamps, and non-secret object keys only. They must not include captions, notes, customer addresses, raw mutation payloads, signed URLs, bearer tokens, local file URIs, image bytes, document contents, or Clerk secret values.

Sprint 24 stores RevenueCat webhook payloads and entitlement status in Neon for
billing auditability. These payloads may include provider user IDs, product
IDs, entitlement IDs, store/environment values, and transaction identifiers.
They must not be sent to analytics or exposed to other tenants. Mobile uses
public RevenueCat keys only; server-side webhook secrets and app-store billing
credentials are not client data.

Sprint 25 adds local privacy controls. Export My Data creates a JSON archive of
local metadata tables only; it does not bundle original media files or generated
PDFs. Delete Local Device Data clears local metadata tables, sync state, queued
mutations, evidence-original files, and generated PDFs from the current device.
It is not a cloud account deletion workflow and must not be represented as one
until server-side account export/deletion, retention, and authorization policy
are implemented.

Sprint 26 adds local report branding and document appendix handling. Branding
values can contain company names, staff names, and customer-facing footer text,
so they are included in local metadata export and cleared by Delete Local Device
Data. Imported document files remain sensitive originals; proof packets may show
document MIME type, size, captions, notes, and SHA-256 metadata, but must not log
document contents or local document URIs.
