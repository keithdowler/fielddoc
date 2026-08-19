# Product

FieldDoc is the internal codename for an iOS-first field documentation and proof-of-work application. The public-facing product name is configurable through environment variables and app configuration because final branding has not been selected.

## Initial Customer

Small property-maintenance and field-service companies, typically owner/operator through roughly 20 workers.

Examples include property maintenance, turnover contractors, restoration, roofing, HVAC, landscaping, cleaning, inspection, and handyman work.

## Core Promise

A field worker should be able to turn job-site evidence into a clean, professional Proof Packet in under two minutes after finishing capture.

## Universal Usability Standard

FieldDoc must be usable by mixed-age workforces, including people who are not comfortable with technical terms, people using the app outdoors, and people with reduced vision, dexterity, or working memory. Primary screens should use plain-language action labels, visible success/error states, large touch targets, dynamic text support, and "what needs attention" guidance before exposing diagnostic detail.

## Primary Workflow

1. Create a local job.
2. Capture before evidence.
3. Capture work-in-progress evidence.
4. Capture after evidence.
5. Scan supporting documents.
6. Annotate and caption evidence.
7. Generate a professional chronological PDF Proof Packet.
8. Share it with a customer or property manager.
9. Retain project history.

The data model still uses `Project` as the canonical entity name. The mobile UI
uses "job" for clarity because field users commonly understand a job as the
unit of work they are documenting.

## Non-Goals

FieldDoc is not a generic PDF scanner, CRM, accounting product, invoicing product, construction project management suite, insurance claims platform, electronic-signature platform, AI chatbot, or social network.

Sprint 0 creates repository foundation only. It intentionally does not implement product workflows.
