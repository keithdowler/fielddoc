# Security

## Authentication And Authorization

Clerk is the planned authentication provider. Server-side authorization is mandatory for every business resource. Organization and user ownership must be explicit on persisted resources.

## Tenant Isolation

Tenant isolation is enforced server-side. UI filtering is not authorization.

## Uploads

Clients will upload media directly to private object storage with short-lived signed URLs. The server issues upload intent metadata and validates ownership before signing.

## Secrets

Secrets belong in Vercel, Expo/EAS, or local uncommitted environment files. `.env.example` contains placeholders only.

## Logging

Structured logs must avoid customer names, addresses, captions, OCR content, filenames, photos, and location coordinates unless a future security review explicitly permits narrow operational use.
