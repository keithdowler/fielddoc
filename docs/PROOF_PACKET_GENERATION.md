# Proof Packet Generation

Sprint 7 introduced local offline PDF generation on mobile. Later sprints add
cloud report archiving, private share links, visual scanned-document pages, and
imported-original document delivery. This document separates what exists now
from future rendering work.

## Current Local Assembly

The mobile app assembles a `ProofPacketPreview` from local SQLite-backed repositories:

- project metadata
- saved report draft title, notes, and section configuration
- active evidence items
- active media asset metadata
- active annotations

The assembled preview is derived state. It is not stored as a separate table and can be rebuilt from local records.

## Current Local PDF Rendering

Mobile renders a local PDF by passing the assembled packet preview through the shared domain HTML renderer and the Expo Print adapter. The generated file is moved into app-owned document storage under `proof-packets/`, and the report draft records `generated_pdf_uri` and `generated_at`.

The current PDF includes structured project metadata, section order, evidence
rows, captions, annotations, media counts, MIME types, file sizes, SHA-256
metadata, available local image originals, imported document metadata, and
local report branding fields. Supporting documents attached to included
evidence render as appendix cards classified as visual, imported original,
metadata-only, or incomplete. Multi-page camera document scans render as visual
pages with per-page SHA-256 references. Imported PDFs and other non-image files
are preserved as hash-backed original evidence with source, MIME type, file
size, and SHA-256 metadata. They are available for delivery review, but their
pages are not yet rasterized into the local PDF.

## Current Local Open And Share

Sprint 8 adds native local file actions for generated PDFs:

- verify the generated PDF URI exists on device
- block open/share when unsaved draft changes make output stale
- open the local file through the platform when possible
- fall back to the native share sheet if a direct viewer is unavailable
- share through the native sheet only after explicit user action

These actions do not upload the file, create a public link, record delivery, or synchronize export state.

## Current Cloud Report Delivery

Generated report PDFs can be uploaded to private object storage after metadata
sync succeeds. The server verifies the stored object before recording a report
export. Authenticated web users can download archived PDFs, and external share
links open a branded public landing page that shows report metadata, integrity
details, expiration, and a download action. The download action redirects to a
short-lived private storage URL and never exposes a durable bucket URL.

## Current Local Report Archive

Sprint 9 adds a local report archive derived from saved report drafts. The Reports tab lists local drafts and generated PDFs across projects, while the Projects tab shows local report history for the selected project.

Loading an archive item restores that draft into the report composer so it can be inspected, opened if a generated PDF still exists, or regenerated through the existing local PDF flow. The archive does not create server export records, preserve every generated PDF version, or upload files.

## Future PDF Inputs

A richer renderer should consume the same ordered packet model plus renderer-specific assets:

- immutable original media metadata
- generated thumbnails or PDF-ready derivatives
- normalized timestamps
- captions and annotations
- report logos and cloud-managed branding settings
- export metadata such as generated-at timestamp and app version

## Rendering Boundary

PDF generation lives behind an explicit rendering interface. The first implementation is local through Expo Print. Cloud generation through Vercel Workflows remains the planned durable path after sync exists.

The renderer must not mutate original files. Any transformed images, thumbnails, OCR text, or report-ready pages are derivative assets.

## Out Of Scope Until A Later Sprint

- server-side generation
- workflow orchestration
- advanced customer delivery tracking beyond public share-link access counts
- legal-admissibility claims
- native document edge detection, page cleanup, imported PDF rasterization, and OCR
