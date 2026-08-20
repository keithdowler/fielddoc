# Sprint 41 Release Candidate Hardening

## Goal

Convert the remaining email and error-reporting readiness checks from passive
environment-variable presence checks into operator-verifiable production rails.

## Implemented

- Added authenticated web provider test endpoints:
  - `POST /api/ops/email/test`
  - `POST /api/ops/error-reporting/test`
- Added Resend email delivery helper using the provider HTTP API without adding
  a new runtime dependency.
- Added Sentry envelope helper using the provider HTTP API without adding a new
  runtime dependency.
- Required a signed-in Clerk user, selected Clerk organization, provisioned Neon
  tenant, and matching internal membership before provider checks run.
- Recorded successful provider checks as tenant-scoped audit rows:
  - `ops_email_delivery_test`
  - `ops_error_reporting_test`
- Tightened email readiness to require both `RESEND_API_KEY` and
  `RESEND_FROM_EMAIL`.
- Added Settings page Send test actions for configured email/error-reporting
  providers.

## Not Implemented

- Mobile Sentry native crash capture.
- Resend customer-facing report email workflow.
- RevenueCat production App Store purchase verification.
- Imported PDF page rasterization.

## Operator Acceptance

1. Set `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `SENTRY_DSN` in Vercel
   Production.
2. Redeploy `fielddoc-web`.
3. Open `https://fielddoc-web.vercel.app/app/settings`.
4. Click Email delivery Send test and confirm a `status: "sent"` JSON response.
5. Return to Settings and confirm `ops_email_delivery_test` appears under recent
   audit activity.
6. Click Error reporting Send test and confirm a `status: "sent"` JSON response.
7. Return to Settings and confirm `ops_error_reporting_test` appears under
   recent audit activity.
