# App Review Notes Draft

Last updated: 2026-08-20

Do not paste this into App Store Connect unchanged until the TODO fields are
filled and the account deletion/export flow is verified.

## Reviewer Summary

Proof Packet is offline-first field documentation software. It lets a field
operator create a job, capture or import evidence, organize evidence into
before/work/after/document sections, generate a local Proof Packet PDF, and sync
metadata and original files to a private workspace when the user signs in.

The app is designed for contractors, property managers, inspectors, and service
teams that need defensible visual documentation of work performed.

## Demo Account

TODO before submission:

- Provide a demo account email.
- Provide the password or sign-in method accepted by App Review.
- Ensure the demo account belongs to a test organization.
- Ensure the demo account has an active subscription entitlement or provide
  subscription test instructions below.

Suggested format:

```text
Demo account:
Email: app-review@example.com
Password: [provided in App Store Connect only]
Organization: Proof Packet Demo
Subscription: Active test entitlement for fielddoc_pro
```

## Main Review Path

1. Open the app.
2. Sign in with the demo account.
3. Open Settings and confirm Cloud Account is connected.
4. Confirm Subscription is active.
5. Go to Projects.
6. Create a new job with a job name, customer, site, work order, scheduled date,
   and notes.
7. Go to Capture.
8. Add or import sample evidence.
9. Add a caption and notes.
10. Go to Reports.
11. Generate a Proof Packet PDF.
12. Return to Settings.
13. Tap Upload All Pending Changes.
14. Open the web dashboard, if requested, and review synced project/report data.

## Offline Behavior

The app is designed to work without network connectivity. Users can create jobs,
capture evidence metadata, add captions, and generate local proof packets while
offline. Cloud sync, private object upload, subscription refresh, and web review
require network connectivity.

## Subscription Behavior

Cloud sync, private media archive, report upload, and shared report delivery are
subscription-gated. The app uses RevenueCat to read subscription entitlement
state.

Canonical entitlement:

```text
fielddoc_pro
```

TODO before submission:

- Confirm App Store subscription products are mapped to this entitlement in
  RevenueCat.
- Confirm sandbox purchase and restore work in the submitted build.
- Include any required reviewer subscription notes or sandbox instructions.

## Account Deletion

TODO before submission:

Provide the exact in-app path once implemented and verified.

Required behavior:

- User can find how to delete the account or request account deletion.
- The app explains what happens to organization records, audit records,
  uploaded originals, generated reports, and share links.
- The behavior matches the privacy policy.

Do not submit for App Review until this section is real.

## Data Export

TODO before submission:

Provide the exact in-app path once implemented and verified.

Required behavior:

- User can export or request export of cloud-stored data.
- The app explains whether the export includes metadata, originals, report PDFs,
  and audit records.

## Privacy And Data Handling

The app can store sensitive customer field documentation, including:

- job names,
- customer/company names,
- site/address metadata,
- work order references,
- notes and captions,
- photos,
- imported documents,
- generated report PDFs,
- account identifiers,
- subscription status,
- operational audit events.

The app should not send customer names, addresses, notes, captions, local file
URIs, signed URLs, original media bytes, or document contents to analytics or
error reporting providers.

## Permissions

The app requests access needed for field evidence capture and import:

- Camera: used to capture job-site evidence photos.
- Photo library: used to import existing evidence.
- Documents/files: used to import supporting documents.

Permission prompts should match the actual user action that needs the
permission.

## Web Dashboard

The companion web app is available at:

```text
https://fielddoc-web.vercel.app/app
```

Reviewer use of the web app is optional unless a review question requires
workspace verification. The web app uses the same Clerk account and organization
model as mobile.

## Legal URLs

Current production legal URLs:

```text
Privacy Policy: https://fielddoc-web.vercel.app/privacy
Terms of Service: https://fielddoc-web.vercel.app/terms
```

TODO before submission:

- Confirm these are the final legal URLs or replace with custom-domain URLs.
- Confirm legal content has been reviewed.

## Known Limits For Review Build

TODO before submission:

Remove anything that is no longer true.

- The app is local-first. Uploads are explicit and may require the user to tap
  Upload All Pending Changes.
- Some beta report templates may be intentionally simple.
- Imported documents must be represented clearly in the Proof Packet before
  App Review.

## Support Contact

TODO before submission:

```text
Support email: [final support email]
Support URL: [final support URL]
```

## Reviewer Safety Notes

Please use only demo evidence. Do not upload personal documents, sensitive
addresses, or private customer images during review.

If the review account appears unsigned, unsubscribed, or unprovisioned, contact
the support email listed above and include the App Review account email and
timestamp.
