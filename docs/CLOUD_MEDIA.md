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
- Mobile Settings includes an ordered Upload All Pending Changes action that
  uploads metadata first, then uploads original binaries only after metadata is
  accepted or already current.
- Mobile wraps the app in Clerk Expo auth, stores session tokens through the
  Expo secure token cache, and uses the active session token for metadata sync
  and media upload actions.
- Upload completion validates the canonical media record's tenant object-key
  shape, SHA-256, and size before recording uploaded state.
- Upload preparation signs required `Content-Type` and `x-amz-meta-sha256`
  headers into the private object-storage URL so the client upload request must
  match the media metadata contract.
- Upload completion verifies the private object exists before marking it
  uploaded. The server checks object size, content type, optional stored
  SHA-256 metadata, and the downloaded byte SHA-256 against canonical media
  metadata.
- Authenticated web users can download uploaded originals through
  `/app/media/{mediaAssetId}/download`, which resolves Clerk organization
  membership and redirects to a short-lived private storage URL.

## Manual Verification Flow

1. Sign into the mobile simulator and make sure
   `EXPO_PUBLIC_FIELDDOC_API_BASE_URL` points at the deployed web app.
2. Create or select a project.
3. Capture or import one image in Capture.
4. Open Settings and tap Upload All Pending Changes.
5. Confirm the result reports metadata accepted and originals uploaded.
6. If upload completion fails, confirm the Settings result includes the server
   rejection reason so storage/header/hash issues can be diagnosed.
7. Open the web app, select the same Clerk organization, and visit Projects.
8. Confirm the project media count shows uploaded originals.
9. Use Download original from the Uploaded originals section and verify a
   temporary private-storage URL opens the original file.

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

- Background upload retry policy with Wi-Fi/battery controls.
- Async/streaming verification path for very large files if synchronous byte
  hashing becomes too slow for completion requests.
- Report PDF cloud archival through the same private storage boundary.
