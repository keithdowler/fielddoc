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
