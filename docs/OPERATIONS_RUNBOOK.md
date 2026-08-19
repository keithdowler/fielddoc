# Operations Runbook

This runbook covers the current production-beta operating posture. FieldDoc is
still local-first: mobile capture works offline, and cloud movement is explicit.

## Daily Smoke Check

1. Open the web app at `https://fielddoc-web.vercel.app/app`.
2. Sign in with Clerk and select the FieldDoc organization.
3. Confirm Settings shows Tenant provisioned and Private object storage Ready.
4. Confirm the dashboard beta readiness panel has no setup blockers.
5. On mobile, confirm Settings shows Cloud account connected and Subscription
   active.
6. Capture or import one disposable evidence item.
7. Tap Run Full Sync.
8. Refresh web Projects and confirm counts changed.

## Cloud Upload Triage

If mobile reports nothing to upload:

- Check that the project, evidence, original media, or report PDF exists locally.
- If a previous upload succeeded, the local outbox may already be reconciled.
- Refresh the web app before assuming data is missing.

If mobile reports rejected metadata:

- Open web Settings and check Rejected receipts.
- Inspect the mutation entity type in API logs.
- Confirm the Neon schema includes the current migration set.
- Do not delete local data until the rejected receipt is understood.

If original media or PDFs do not upload:

- Confirm R2 environment variables are present in Vercel production.
- Confirm the R2 bucket is private.
- Confirm the mobile subscription gate is active.
- Retry Run Full Sync before changing code.

## Provider Checks

| Provider   | Production Check                                                    |
| ---------- | ------------------------------------------------------------------- |
| Clerk      | Web and native sign-in work; organizations are provisioned in Neon. |
| Neon       | Migrations are applied and recent sync/audit rows are visible.      |
| Cloudflare | R2 bucket exists, is private, and signed downloads work.            |
| RevenueCat | SDK key is loaded, entitlement is active, webhook secret is set.    |
| Resend     | Not yet configured; required before customer email delivery.        |
| Sentry     | Not yet configured; required before broad beta or App Store launch. |

## Do Not Do Yet

- Do not enable public bucket access.
- Do not send customer report links until email delivery and legal URLs are set.
- Do not treat RevenueCat test-store purchases as App Store approval evidence.
- Do not delete local device data when investigating sync discrepancies.
