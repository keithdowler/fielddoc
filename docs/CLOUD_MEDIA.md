# Cloud Media Foundation

FieldDoc stores immutable original evidence locally first, then syncs metadata to
the canonical Neon tenant model. Cloud media upload is a separate authenticated
path so large files do not travel through the metadata outbox.

## Implemented

- Mobile SQLite tracks `storage_object_key` and `uploaded_at` for each
  `media_assets` row.
- Marking a media asset uploaded writes a durable `MediaAsset` update mutation
  into the local outbox.
- Canonical sync preserves `storageObjectKey` and `uploadedAt` instead of
  resetting media storage metadata.
- Web API routes prepare short-lived signed private object storage URLs:
  - `POST /api/media/uploads/prepare`
  - `POST /api/media/uploads/complete`
  - `POST /api/media/downloads/prepare`
- Routes require Clerk bearer authentication and an internal Neon organization
  membership before any signed URL is issued.
- Object keys are tenant scoped:
  `organizations/{organizationId}/evidence/{evidenceItemId}/originals/{mediaAssetId}-{sha256}.{ext}`.
- Mobile has a tested upload queue that prepares a signed URL, uploads the
  local original binary, completes the upload, and records `storageObjectKey`
  locally.
- Mobile wraps the app in Clerk Expo auth, stores session tokens through the
  Expo secure token cache, and uses the active session token for metadata sync
  and media upload actions.
- Upload completion validates the canonical media record's tenant object-key
  shape, SHA-256, and size before recording uploaded state.

## Required Production Environment

- `DATABASE_URL`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_JWT_KEY` when configured for Clerk JWT verification
- `CLERK_AUTHORIZED_PARTIES` when restricting mobile/web token audiences
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`

The R2 bucket must remain private. Do not enable public bucket access for
evidence originals.

## Still Pending

- Live signed-in device upload verification against production R2 credentials.
- Background upload retry policy with Wi-Fi/battery controls.
- Server-side object existence and MIME verification after upload completion.
- Report PDF cloud archival through the same private storage boundary.
