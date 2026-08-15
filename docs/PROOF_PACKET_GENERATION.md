# Proof Packet Generation

Sprint 7 introduces local offline PDF generation on mobile. This document separates what exists now from the future cloud/share path.

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

The current PDF includes structured project metadata, section order, evidence rows, captions, annotations, media counts, MIME types, file sizes, and SHA-256 prefixes. It does not embed local image files yet.

## Future PDF Inputs

A richer renderer should consume the same ordered packet model plus renderer-specific assets:

- immutable original media metadata
- generated thumbnails or PDF-ready derivatives
- normalized timestamps
- captions and annotations
- report branding settings
- export metadata such as generated-at timestamp and app version

## Rendering Boundary

PDF generation lives behind an explicit rendering interface. The first implementation is local through Expo Print. Cloud generation through Vercel Workflows remains the planned durable path after sync exists.

The renderer must not mutate original files. Any transformed images, thumbnails, OCR text, or report-ready pages are derivative assets.

## Out Of Scope Until A Later Sprint

- share sheets
- upload or signed URL flows
- server-side generation
- workflow orchestration
- customer delivery tracking
- legal-admissibility claims
