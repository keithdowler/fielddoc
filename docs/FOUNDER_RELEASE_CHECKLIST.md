# Founder Release Checklist

Last updated: 2026-08-20

This checklist replaces broad numbered sprints as the release control document.
It is intentionally operational: every item says who owns it, where to do it,
what value is needed, how to verify it, and what it blocks.

# RELEASE DASHBOARD

CURRENT RELEASE STATUS: READY FOR CLOSED BETA

NOT READY for public App Store release.

Reason: the core local-first product, cloud auth, Neon, private object storage,
RevenueCat client check, RevenueCat webhook readiness, Resend readiness, Sentry
readiness, and legal URLs are now connected. The remaining release risks are
mostly App Store/TestFlight, real-device evidence, account lifecycle, and final
report-quality hardening.

Current readiness score observed in production web Settings: 92 of 100.

Critical blockers: 6

Founder actions remaining: 18
Codex actions remaining: 10
External configuration actions: 8
Real-device tests remaining: 8
Apple/App Store actions remaining: 7
Legal/privacy actions remaining: 5

Critical blockers before TestFlight or App Review:

1. Apple Developer and App Store Connect records must be confirmed.
2. A production or TestFlight iOS build must be generated and installed.
3. App Store subscription products must be tested through Apple sandbox.
4. Account deletion and cloud data export must be App Review-safe.
5. Imported document/PDF handling must be acceptable for real proof packets.
6. Real-device offline, sync, media upload, report archive, and share link tests
   must pass with non-sensitive demo evidence.

NEXT ACTION:

Complete STEP 7: confirm Apple Developer Program access and create or verify the
App Store Connect app record for bundle identifier `com.fielddoc.mobile`.

## Verification Run

Executed in a clean working tree on 2026-08-20:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm format:check
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

Result: PASS.

Observed coverage from the test command: 31 test files passed and 170 tests
passed. The build completed the Next.js production build and the mobile package
typecheck.

## Master Checklist

## PHASE 0 - REPOSITORY HEALTH

[ ] STEP 1 - Verify repository can install, lint, typecheck, test, and build

OWNER:
Codex

WHERE:
Local repo at
`/Users/keithdowler/Documents/Codex/2026-08-12/files-mentioned-by-the-user-you/work/fielddoc`

ACTION:
Run the release verification commands listed above.

VALUES NEEDED:
None.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Run the full FieldDoc release verification gate and report
all failures before changing code."

VERIFY:
All commands exit 0.

BLOCKS:
Every release build and App Store submission.

STATUS:
DONE

NOTES:
Passed on 2026-08-20.

[ ] STEP 2 - Run a final secret scan before public release

OWNER:
Codex

WHERE:
Local repo and GitHub default branch.

ACTION:
Search committed files for likely API keys, private tokens, `.env` files,
signed URLs, R2 credentials, Clerk secret keys, RevenueCat secret keys, Resend
keys, Sentry auth tokens, and database URLs.

VALUES NEEDED:
None. Do not paste secrets into chat.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Run a release secret scan on the FieldDoc repo. Do not print
secret values. Tell me only file paths, variable names, and remediation steps."

VERIFY:
Only placeholder files such as `.env.example` contain variable names. No real
secrets are committed.

BLOCKS:
Public GitHub confidence, contractor onboarding, and App Store review hygiene.

STATUS:
TODO

NOTES:
The repo uses documented placeholders. This is still a required pre-release
scan.

[ ] STEP 3 - Freeze broad sprint work

OWNER:
Founder

WHERE:
This checklist.

ACTION:
Stop asking for broad numbered sprints unless a checklist item explicitly
requires product work. Use this document as the release queue.

VALUES NEEDED:
None.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Work only on Founder Release Checklist items. Do not invent
a new broad sprint."

VERIFY:
New work maps to one or more step numbers in this checklist.

BLOCKS:
Focus, launch predictability, and founder sanity.

STATUS:
TODO

NOTES:
This is the release plan now.

## PHASE 1 - PRODUCTION BRAND IDENTITY

[ ] STEP 4 - Confirm final public product name

OWNER:
Founder

WHERE:
Founder decision, App Store Connect, Vercel environment variables, Expo config.

ACTION:
Choose the shipping customer-facing name. Current app display name is
`Proof Packet`; internal repo and bundle still use FieldDoc identifiers.

VALUES NEEDED:
Final app name.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Update the FieldDoc repo so the customer-facing product name
is [NAME] everywhere users see it, while preserving internal package names where
renaming would create release risk."

VERIFY:
Mobile app, web app, legal pages, PDF output, email sender copy, and App Store
metadata use the same customer-facing name.

BLOCKS:
Screenshots, App Store metadata, legal review, and customer onboarding.

STATUS:
TODO

NOTES:
Do not rename package scopes or database tables during the release freeze unless
there is a real customer-visible issue.

[ ] STEP 5 - Confirm support identity

OWNER:
Founder

WHERE:
Email provider, App Store Connect support URL/email, web legal pages, mobile
Settings.

ACTION:
Choose support email, support URL, legal company name, and customer-facing
sender name.

VALUES NEEDED:
Support email, support URL, legal company name, sender display name.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Wire the confirmed support email, support URL, and legal
company name into FieldDoc web, mobile, legal pages, and App Review notes."

VERIFY:
Support information is reachable without login and appears consistently.

BLOCKS:
App Store metadata and customer support readiness.

STATUS:
TODO

NOTES:
Use a real mailbox before inviting external testers.

## PHASE 2 - BUSINESS / APPLE DEVELOPER SETUP

[ ] STEP 6 - Confirm Apple Developer Program enrollment

OWNER:
Founder / Apple

WHERE:
Apple Developer account.

ACTION:
Confirm the Apple Developer Program membership is active and that you can access
Certificates, Identifiers, Profiles, and App Store Connect.

VALUES NEEDED:
Apple Team ID / App ID prefix, Apple account role.

CODEX CAN HELP:
No
If Yes:
N/A

VERIFY:
Apple portal shows active membership and App Store Connect access.

BLOCKS:
EAS production build, TestFlight, subscriptions, and App Review.

STATUS:
TODO

NOTES:
If you are not enrolled, this is the highest priority manual action.

[ ] STEP 7 - Create or verify App Store Connect app record

OWNER:
Founder / Apple

WHERE:
App Store Connect.

ACTION:
Create the iOS app record or verify it already exists.

VALUES NEEDED:
Bundle identifier `com.fielddoc.mobile`, final app name, SKU, primary language.

CODEX CAN HELP:
No
If Yes:
N/A

VERIFY:
App Store Connect shows an app record for the bundle ID.

BLOCKS:
TestFlight, App Store subscriptions, screenshots, privacy nutrition labels, and
review submission.

STATUS:
TODO

NOTES:
If the final production bundle ID changes, Codex must update
`apps/mobile/app.json` before production builds.

[ ] STEP 8 - Complete App Store agreements, tax, and banking

OWNER:
Founder / Apple

WHERE:
App Store Connect, Business tab.

ACTION:
Complete paid apps agreement, tax forms, and banking so subscriptions can be
sold.

VALUES NEEDED:
Business legal and banking information.

CODEX CAN HELP:
No
If Yes:
N/A

VERIFY:
App Store Connect allows creation and sale of auto-renewable subscriptions.

BLOCKS:
Paid public release.

STATUS:
TODO

NOTES:
Closed beta can proceed without paid sales, but App Review monetization cannot.

[ ] STEP 9 - Configure iOS app privacy answers

OWNER:
Founder / Legal Review / Apple

WHERE:
App Store Connect, App Privacy.

ACTION:
Answer privacy questions for account identifiers, job/customer/site metadata,
photos, documents, diagnostics, purchase data, and any analytics enabled.

VALUES NEEDED:
Final privacy policy URL and confirmation of analytics/error reporting scope.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Draft App Store privacy answers for FieldDoc based on the
current codebase and docs. Flag anything that needs legal review."

VERIFY:
App Privacy section is complete and matches the actual app behavior.

BLOCKS:
App Review.

STATUS:
TODO

NOTES:
Do not understate photo/document collection. Originals are customer evidence.

[ ] STEP 10 - Create App Store screenshots and metadata

OWNER:
Founder / Codex / Apple

WHERE:
App Store Connect and `docs/APP_STORE_SCREENSHOT_PLAN.md`.

ACTION:
Capture screenshots from a real or simulator release candidate using
non-sensitive demo job data. Write subtitle, promotional text, description,
keywords, support URL, marketing URL, and privacy URL.

VALUES NEEDED:
Final product name, demo dataset, support URL, legal URLs.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Generate final App Store metadata and screenshot capture
script from the FieldDoc screenshot plan. Use non-sensitive demo job data only."

VERIFY:
All required screenshot sizes and metadata fields are complete in App Store
Connect.

BLOCKS:
App Review.

STATUS:
TODO

NOTES:
Screenshots must show the actual product flow, not marketing filler.

## PHASE 3 - PRODUCTION ACCOUNTS AND SERVICES

[ ] STEP 11 - Verify Vercel production deployment

OWNER:
Founder / External Service

WHERE:
Vercel project `fielddoc-web`.

ACTION:
Confirm the GitHub repository is connected and production deploys from `main`.

VALUES NEEDED:
None if already connected.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Inspect the repo and tell me whether the web app is ready
for Vercel production deployment. Do not print secrets."

VERIFY:
`https://fielddoc-web.vercel.app/app/settings` loads after sign-in.

BLOCKS:
Cloud sync, share links, provider checks, and web review.

STATUS:
DONE

NOTES:
Production web settings were observed live.

[ ] STEP 12 - Verify Neon production database and migrations

OWNER:
Founder / External Service

WHERE:
Neon SQL editor and Vercel `DATABASE_URL`.

ACTION:
Confirm production database has all migration tables, including audit events,
report exports, share links, RevenueCat entitlement tables, and document
metadata.

VALUES NEEDED:
`DATABASE_URL` in Vercel only.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Generate a Neon SQL verification query for the current
FieldDoc database schema. Do not ask me for the database password."

VERIFY:
Web Settings shows Neon database Ready and production web flows can read
workspace data.

BLOCKS:
Cloud metadata, audit trail, reports, sync, and readiness score.

STATUS:
DONE

NOTES:
Production Settings showed Neon database Ready.

[ ] STEP 13 - Verify private object storage

OWNER:
Founder / External Service

WHERE:
Cloudflare R2 and Vercel environment variables.

ACTION:
Confirm private R2 bucket exists, public access is disabled, and Vercel has
`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and
`R2_BUCKET_NAME`.

VALUES NEEDED:
R2 account ID, bucket name, access key ID, secret access key.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Verify FieldDoc private object storage readiness from code
and tell me exactly what manual R2 checks remain."

VERIFY:
Web Settings shows Private object storage Ready. A mobile upload creates a
private object and a web download uses a short-lived signed URL.

BLOCKS:
Original evidence upload, report PDF archive, share links.

STATUS:
DONE

NOTES:
Production Settings showed Private object storage Ready.

[ ] STEP 14 - Verify Clerk web and mobile auth

OWNER:
Founder / External Service

WHERE:
Clerk dashboard, Vercel, mobile `.env.local` or EAS secrets.

ACTION:
Confirm web sign-in, organization selection, mobile sign-in, and mobile token
use all work.

VALUES NEEDED:
Clerk publishable keys, Clerk secret key, Clerk authorized parties if enforced.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Audit FieldDoc Clerk web and mobile auth configuration and
list any App Store review risks."

VERIFY:
Web and mobile both show the signed-in user and active organization.

BLOCKS:
Cloud sync, media upload, report upload, subscription identity.

STATUS:
DONE

NOTES:
Mobile screenshots showed a connected Clerk user and production web was
authenticated.

[ ] STEP 15 - Verify RevenueCat client and webhook readiness

OWNER:
Founder / External Service

WHERE:
RevenueCat dashboard, Vercel, mobile env, App Store Connect.

ACTION:
Confirm mobile SDK key is configured, the active entitlement is recognized on
device, and the RevenueCat webhook secret is configured in Vercel.

VALUES NEEDED:
`EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`,
`EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`, `REVENUECAT_WEBHOOK_SECRET`, canonical
entitlement identifier `fielddoc_pro` or configured compatible alias during
testing.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Audit FieldDoc RevenueCat integration and tell me whether
production App Store purchase testing is still required."

VERIFY:
Mobile Settings shows Subscription active, web Settings shows RevenueCat
webhook Ready, and a webhook test writes to Neon.

BLOCKS:
Paid cloud gates and App Review subscription confidence.

STATUS:
DONE

NOTES:
Production App Store sandbox purchase testing is still separate and remains
STEP 27.

[ ] STEP 16 - Verify Resend email delivery readiness

OWNER:
Founder / External Service

WHERE:
Resend dashboard, DNS, Vercel production environment, web Settings.

ACTION:
Confirm `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are configured and the web
Settings Send test succeeds.

VALUES NEEDED:
Resend API key and verified from-address.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Verify the FieldDoc Resend email readiness path and explain
what remains before sending customer report links."

VERIFY:
Web Settings shows Email delivery Ready and `ops_email_delivery_test` appears
in recent audit activity.

BLOCKS:
Customer report delivery emails and account lifecycle emails.

STATUS:
DONE

NOTES:
Provider readiness is green. Customer-facing email templates can still be
polished later.

[ ] STEP 17 - Verify Sentry error reporting readiness

OWNER:
Founder / External Service

WHERE:
Sentry dashboard, Vercel production environment, web Settings.

ACTION:
Confirm `SENTRY_DSN` is configured and the web Settings Send test succeeds.

VALUES NEEDED:
Sentry DSN.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Verify FieldDoc Sentry readiness and add privacy-safe mobile
crash reporting if it is not already present."

VERIFY:
`/api/ops/error-reporting/test` returns `status: "sent"` and web Settings shows
Error reporting Ready.

BLOCKS:
Broad beta support readiness.

STATUS:
DONE

NOTES:
Mobile native Sentry crash capture is not fully proven and remains STEP 34.

## PHASE 4 - SECRETS AND ENVIRONMENT VARIABLES

[ ] STEP 18 - Lock production web environment variables

OWNER:
Founder / External Service

WHERE:
Vercel Project Settings, Environment Variables, Production.

ACTION:
Confirm production values are set for Clerk, Neon, R2, RevenueCat webhook,
Resend, Sentry, privacy URL, and terms URL. Confirm preview/development values
do not point at production secrets unless intended.

VALUES NEEDED:
Provider-specific values stored in Vercel, not Git.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Compare FieldDoc `.env.example` to the production readiness
code and give me a Vercel env var checklist. Do not ask me to paste secret
values."

VERIFY:
Web Settings shows all provider readiness checks Ready.

BLOCKS:
Stable production deployments.

STATUS:
TODO

NOTES:
The live screenshots show ready. This step is the formal final check.

### Production Environment Variable Inventory

| Name                                              | Service         | Public or secret  | Runtime    | Where to obtain it                 | Where to configure it | Rotation considerations                    |
| ------------------------------------------------- | --------------- | ----------------- | ---------- | ---------------------------------- | --------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_PRODUCT_NAME`                        | FieldDoc config | Public            | Web        | Founder brand decision             | Vercel Production     | Change only with brand release.            |
| `EXPO_PUBLIC_PRODUCT_NAME`                        | FieldDoc config | Public            | Mobile     | Founder brand decision             | EAS/mobile env        | Requires rebuild.                          |
| `NEXT_PUBLIC_PRIVACY_POLICY_URL`                  | Legal           | Public            | Web        | Final hosted privacy URL           | Vercel Production     | Update if legal URL changes.               |
| `NEXT_PUBLIC_TERMS_URL`                           | Legal           | Public            | Web        | Final hosted terms URL             | Vercel Production     | Update if legal URL changes.               |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL`                  | Legal           | Public            | Mobile     | Final hosted privacy URL           | EAS/mobile env        | Requires rebuild.                          |
| `EXPO_PUBLIC_TERMS_URL`                           | Legal           | Public            | Mobile     | Final hosted terms URL             | EAS/mobile env        | Requires rebuild.                          |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`               | Clerk           | Public            | Web        | Clerk production instance API keys | Vercel Production     | Rotate with Clerk publishable key.         |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`               | Clerk           | Public            | Mobile     | Clerk native/mobile API keys       | EAS/mobile env        | Requires rebuild.                          |
| `CLERK_SECRET_KEY`                                | Clerk           | Secret            | Server     | Clerk production instance API keys | Vercel Production     | Rotate immediately if exposed.             |
| `CLERK_JWT_KEY`                                   | Clerk           | Secret            | Server     | Clerk JWT template or dashboard    | Vercel Production     | Rotate if JWT verification setup changes.  |
| `CLERK_AUTHORIZED_PARTIES`                        | Clerk           | Config            | Server     | Web/mobile trusted origins         | Vercel Production     | Review when domains or app schemes change. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`                   | Clerk           | Public            | Web        | Clerk or app route                 | Vercel Production     | Keep aligned with app routes.              |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`                   | Clerk           | Public            | Web        | Clerk or app route                 | Vercel Production     | Keep aligned with app routes.              |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Clerk           | Public            | Web        | App route                          | Vercel Production     | Keep relative or allowed absolute URL.     |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Clerk           | Public            | Web        | App route                          | Vercel Production     | Keep relative or allowed absolute URL.     |
| `DATABASE_URL`                                    | Neon            | Secret            | Server     | Neon connection details            | Vercel Production     | Rotate after staff/provider changes.       |
| `EXPO_PUBLIC_FIELDDOC_API_BASE_URL`               | Vercel web API  | Public            | Mobile     | Production web URL                 | EAS/mobile env        | Requires rebuild if changed.               |
| `R2_ACCOUNT_ID`                                   | Cloudflare R2   | Secret-ish config | Server     | Cloudflare account                 | Vercel Production     | Rotate only if account changes.            |
| `R2_ACCESS_KEY_ID`                                | Cloudflare R2   | Secret            | Server     | R2 API token                       | Vercel Production     | Rotate if exposed or staff changes.        |
| `R2_SECRET_ACCESS_KEY`                            | Cloudflare R2   | Secret            | Server     | R2 API token                       | Vercel Production     | Rotate immediately if exposed.             |
| `R2_BUCKET_NAME`                                  | Cloudflare R2   | Config            | Server     | R2 bucket page                     | Vercel Production     | Change only with migration plan.           |
| `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`              | RevenueCat      | Public SDK key    | Mobile     | RevenueCat app API keys            | EAS/mobile env        | Requires rebuild; safe public key.         |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`          | RevenueCat      | Public SDK key    | Mobile     | RevenueCat app API keys            | EAS/mobile env        | Requires rebuild; safe public key.         |
| `REVENUECAT_WEBHOOK_SECRET`                       | RevenueCat      | Secret            | Server     | RevenueCat webhook settings        | Vercel Production     | Rotate webhook secret if exposed.          |
| `NEXT_PUBLIC_POSTHOG_KEY`                         | PostHog         | Public            | Web        | PostHog project settings           | Vercel Production     | Optional until analytics enabled.          |
| `NEXT_PUBLIC_POSTHOG_HOST`                        | PostHog         | Public            | Web        | PostHog project settings           | Vercel Production     | Optional until analytics enabled.          |
| `SENTRY_DSN`                                      | Sentry          | Public-ish DSN    | Server/Web | Sentry project settings            | Vercel Production     | Rotate if noisy or abused.                 |
| `RESEND_API_KEY`                                  | Resend          | Secret            | Server     | Resend API keys                    | Vercel Production     | Rotate if exposed or staff changes.        |
| `RESEND_FROM_EMAIL`                               | Resend          | Config            | Server     | Verified Resend domain             | Vercel Production     | Change with support/sender policy.         |

Dangerous handling rules:

- Never put `DATABASE_URL`, `CLERK_SECRET_KEY`, `R2_SECRET_ACCESS_KEY`,
  `RESEND_API_KEY`, or `REVENUECAT_WEBHOOK_SECRET` into Expo public variables.
- Never paste production secret values into Codex chat, GitHub, screenshots, or
  docs.
- Public Expo variables are bundled into the app and must be treated as visible
  to users.

[ ] STEP 19 - Lock mobile build environment variables

OWNER:
Founder / External Service

WHERE:
EAS secrets, Expo environment, or local `.env.local` for development builds.

ACTION:
Confirm mobile release builds receive only public-safe mobile values:
`EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`,
`EXPO_PUBLIC_FIELDDOC_API_BASE_URL`,
`EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`,
`EXPO_PUBLIC_PRIVACY_POLICY_URL`, and `EXPO_PUBLIC_TERMS_URL`.

VALUES NEEDED:
Mobile public keys and public URLs. No server secrets.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Audit FieldDoc mobile environment variable usage and tell
me which values must be configured in EAS before a TestFlight build."

VERIFY:
A fresh installed mobile build signs in, checks subscription state, and syncs
against production web.

BLOCKS:
TestFlight and real-device validation.

STATUS:
TODO

NOTES:
Never put `CLERK_SECRET_KEY`, `DATABASE_URL`, R2 secret keys, Resend keys, or
Sentry auth tokens in mobile public env.

## PHASE 7 - APPLE NATIVE CONFIGURATION

[ ] STEP 20 - Create a production iOS build

OWNER:
Founder / Codex / Apple

WHERE:
Local terminal with Apple/EAS access or EAS dashboard.

ACTION:
Build a production or internal distribution iOS release candidate.

VALUES NEEDED:
Apple Developer credentials, EAS project access, mobile public env values.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Guide me through a FieldDoc EAS iOS production build from
the current repo. Stop before any paid or destructive action."

VERIFY:
EAS produces a signed iOS build artifact or uploads to TestFlight.

BLOCKS:
Real-device closed beta and App Review.

STATUS:
TODO

NOTES:
A simulator development build is useful, but it is not the same as TestFlight.

[ ] STEP 21 - Upload build to TestFlight

OWNER:
Founder / Apple

WHERE:
EAS Submit or App Store Connect.

ACTION:
Upload the signed iOS build and wait for Apple processing.

VALUES NEEDED:
Apple app record, bundle ID, build number, App Store Connect access.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Prepare the exact EAS submit command and App Store Connect
checks for the current FieldDoc iOS build."

VERIFY:
App Store Connect TestFlight shows the build as processed.

BLOCKS:
Internal and external iOS beta.

STATUS:
TODO

NOTES:
If Apple processing rejects the build, fix the rejection before inviting users.

[ ] STEP 22 - Invite internal TestFlight users

OWNER:
Founder / Apple

WHERE:
App Store Connect, TestFlight, Internal Testing.

ACTION:
Invite yourself and any trusted internal tester.

VALUES NEEDED:
Tester Apple IDs.

CODEX CAN HELP:
No
If Yes:
N/A

VERIFY:
Internal tester can install the build from TestFlight.

BLOCKS:
Real-device validation.

STATUS:
TODO

NOTES:
Use internal testing before external beta review.

## PHASE 8 - SUBSCRIPTIONS / REVENUECAT

[ ] STEP 23 - Create App Store subscription products

OWNER:
Founder / Apple

WHERE:
App Store Connect, Subscriptions.

ACTION:
Create monthly and yearly products for the app and map them into RevenueCat.

VALUES NEEDED:
Product IDs, prices, subscription group name, final paywall copy.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Draft the exact App Store subscription product names,
descriptions, and RevenueCat mapping for FieldDoc. Use `fielddoc_pro` as the
canonical entitlement."

VERIFY:
RevenueCat offering includes the App Store products and entitlement.

BLOCKS:
Paid App Review and production monetization.

STATUS:
TODO

NOTES:
Granted test entitlements are useful for development but do not replace Apple
sandbox purchase testing.

[ ] STEP 24 - Validate sandbox purchase

OWNER:
Founder / Apple / External Service

WHERE:
TestFlight or sandbox build, App Store sandbox tester, RevenueCat dashboard.

ACTION:
Purchase the subscription through Apple sandbox, restore purchases, cancel or
expire it, and confirm app state changes.

VALUES NEEDED:
Sandbox Apple ID, App Store subscription products, RevenueCat offering.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Give me a step-by-step sandbox subscription test matrix for
FieldDoc and tell me what screenshots to capture."

VERIFY:
Mobile Settings changes between Subscription active and Subscription required
based on sandbox entitlement state.

BLOCKS:
App Review confidence for paid gates.

STATUS:
TODO

NOTES:
Test Store API keys are for development only and are not App Review proof.

[ ] STEP 25 - Validate RevenueCat webhook events

OWNER:
Founder / External Service

WHERE:
RevenueCat dashboard, Vercel logs, Neon, web Settings.

ACTION:
Send or trigger signed RevenueCat webhook events for entitlement grant, renewal,
expiration, cancellation, and billing issue.

VALUES NEEDED:
RevenueCat webhook secret already stored in Vercel.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Generate a RevenueCat webhook validation checklist for the
current FieldDoc endpoint and expected Neon rows."

VERIFY:
Webhook events are accepted once, duplicates are ignored, and entitlement state
is queryable server-side.

BLOCKS:
Server-trusted paid gates.

STATUS:
TODO

NOTES:
The readiness check is green. Event semantics still need release validation.

## PHASE 12 - REAL-DEVICE FUNCTIONAL TEST

[ ] STEP 26 - Run fresh-install iPhone smoke test

OWNER:
Founder

WHERE:
Physical iPhone through TestFlight.

ACTION:
Install the latest build fresh, sign in, create a job, capture a photo, import a
document, generate a Proof Packet, and open Settings.

VALUES NEEDED:
TestFlight build, test account, non-sensitive demo site.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Create a one-page real-device smoke test script for
FieldDoc TestFlight with expected results and failure notes."

VERIFY:
No crash, no blocked buttons, no unreadable screens, no required flow hidden
behind dev-only setup.

BLOCKS:
Closed beta.

STATUS:
TODO

NOTES:
Use a real iPhone before inviting anyone else.

[ ] STEP 27 - Run offline persistence test

OWNER:
Founder

WHERE:
Physical iPhone.

ACTION:
Turn on Airplane Mode. Create a job. Add before/work/after evidence. Kill the
app. Restart the phone. Reopen the app.

VALUES NEEDED:
None.

CODEX CAN HELP:
No
If Yes:
N/A

VERIFY:
The job, evidence metadata, captions, notes, and generated local report remain
intact.

BLOCKS:
Core product promise.

STATUS:
TODO

NOTES:
Offline-first is the product. This test matters more than most dashboards.

[ ] STEP 28 - Run sync upload test

OWNER:
Founder

WHERE:
Mobile app and production web app.

ACTION:
Reconnect network. Tap Upload All Pending Changes. Open production web and
confirm project, evidence, originals, report archive, and audit events appear.

VALUES NEEDED:
Signed-in mobile user, active organization, subscription active, API base URL.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Help me diagnose a FieldDoc mobile upload result. I will
paste only non-secret status text and counts."

VERIFY:
Mobile reports accepted metadata and uploaded originals/reports. Web shows the
same project.

BLOCKS:
Closed beta.

STATUS:
TODO

NOTES:
Do not delete local data when diagnosing sync.

[ ] STEP 29 - Run two-device conflict test

OWNER:
Founder / Codex

WHERE:
Two mobile sessions or simulator plus device.

ACTION:
Edit the same project or evidence caption from two devices before syncing.
Confirm the conflict is preserved or surfaced rather than silently overwriting
evidence.

VALUES NEEDED:
Two signed-in sessions.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Design and run a FieldDoc conflict-preservation test using
two local clients. Fix code if conflicting edits are silently discarded."

VERIFY:
Conflicting edits are retained as auditable state or visible conflict records.

BLOCKS:
Larger beta teams.

STATUS:
TODO

NOTES:
Client-generated IDs and idempotency exist. User-visible conflict handling may
still need polish.

[ ] STEP 30 - Run accessibility field test

OWNER:
Founder

WHERE:
Physical iPhone, outdoor lighting, Dynamic Type, VoiceOver.

ACTION:
Use largest text size, dark mode, bright sunlight, and VoiceOver on the core
workflow: create job, capture evidence, add caption, generate report, sync.

VALUES NEEDED:
None.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Audit FieldDoc mobile screens for Dynamic Type, VoiceOver,
touch target, and outdoor contrast issues. Fix any failing screens."

VERIFY:
Core actions remain reachable, readable, and understandable.

BLOCKS:
Usability for all ages and field conditions.

STATUS:
TODO

NOTES:
This is a beta quality gate, not a nice-to-have.

## PHASE 17 - ACCOUNT DELETION / EXPORT TEST

[ ] STEP 31 - Implement and verify cloud account deletion

OWNER:
Codex / Founder / Legal Review

WHERE:
Mobile Settings, web API, Clerk, Neon, R2.

ACTION:
Provide a clear account deletion or delete-request path that satisfies App
Review when users can create accounts. It must explain what is deleted,
retained, or legally/audit-retained.

VALUES NEEDED:
Legal retention decision for audit records and report shares.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Implement App Review-safe cloud account deletion/request
flow for FieldDoc. Preserve necessary audit records without keeping customer
evidence longer than promised."

VERIFY:
User can find the delete-account path. Server behavior is documented and tested.

BLOCKS:
App Review.

STATUS:
TODO

NOTES:
Local device deletion is not enough if cloud account creation exists.

[ ] STEP 32 - Implement and verify cloud data export

OWNER:
Codex / Founder / Legal Review

WHERE:
Mobile Settings, web API, Neon, R2.

ACTION:
Provide export for cloud-stored project metadata, reports, and uploaded
originals, or a clear request workflow.

VALUES NEEDED:
Export format decision and legal retention decision.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Implement a FieldDoc cloud data export or export-request
flow that covers metadata, report PDFs, and uploaded originals."

VERIFY:
A signed-in user can request or receive their data without exposing another
tenant.

BLOCKS:
Privacy readiness and enterprise trust.

STATUS:
TODO

NOTES:
This can ship as a request workflow before full self-serve export if clearly
documented.

[ ] STEP 33 - Final legal review

OWNER:
Founder / Legal Review

WHERE:
`/privacy`, `/terms`, App Store privacy answers, support policies.

ACTION:
Review privacy policy, terms, subscription disclosures, account deletion,
retention language, and evidence handling.

VALUES NEEDED:
Legal entity, support email, final app name, provider list.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Compare FieldDoc privacy/terms pages to the current app
behavior and flag inconsistencies for legal review. Do not provide legal
advice."

VERIFY:
Founder accepts legal risk or counsel approves.

BLOCKS:
App Review and public release.

STATUS:
TODO

NOTES:
Codex can draft and compare; counsel or founder owns approval.

## PHASE 9 - EMAIL / ANALYTICS / MONITORING

[ ] STEP 34 - Add mobile privacy-safe crash reporting

OWNER:
Codex

WHERE:
Mobile app, Sentry mobile project, Expo/EAS.

ACTION:
Wire mobile Sentry or an equivalent privacy-safe crash reporter. Redact customer
names, addresses, notes, captions, local file paths, signed URLs, and object
bytes.

VALUES NEEDED:
Mobile Sentry DSN or chosen provider DSN.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Add privacy-safe mobile crash reporting to FieldDoc. Do not
send customer content, local URIs, captions, addresses, signed URLs, or file
bytes."

VERIFY:
A test crash or test event appears in the mobile Sentry project without
sensitive content.

BLOCKS:
Broad beta support.

STATUS:
TODO

NOTES:
Web Sentry is ready. Native mobile capture is still a release hardening item.

[ ] STEP 35 - Decide analytics policy

OWNER:
Founder / Legal Review / Codex

WHERE:
Product metrics plan, privacy policy, environment variables.

ACTION:
Decide whether to enable PostHog or defer analytics. If enabled, collect only
privacy-safe operational events.

VALUES NEEDED:
PostHog key and host if enabled.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Implement privacy-safe FieldDoc product analytics for only
activation metrics. Do not capture customer names, sites, notes, captions,
filenames, image content, document content, or GPS."

VERIFY:
Events are useful for activation and contain no customer evidence.

BLOCKS:
Growth learning, not closed beta.

STATUS:
OPTIONAL

NOTES:
Do not delay closed beta solely for analytics.

[ ] STEP 36 - Create support diagnostics bundle

OWNER:
Codex

WHERE:
Mobile Settings and docs.

ACTION:
Add a user-visible diagnostics export that includes app version, build number,
sync counts, provider readiness states, and recent non-sensitive error codes.

VALUES NEEDED:
None.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Implement a privacy-safe FieldDoc mobile diagnostics export
for support. Exclude customer evidence, captions, notes, addresses, file paths,
signed URLs, and object bytes."

VERIFY:
Founder can produce a support bundle from mobile without exposing evidence.

BLOCKS:
Beta support efficiency.

STATUS:
TODO

NOTES:
This is high leverage once external testers arrive.

## PHASE 16 - PROOF PACKET QUALITY TEST

[ ] STEP 37 - Validate final Proof Packet with real demo data

OWNER:
Founder

WHERE:
Mobile app, generated PDF, web report archive/share link.

ACTION:
Create a realistic demo job with before/work/after evidence, captions,
supporting document, important evidence, generated report PDF, and share link.

VALUES NEEDED:
Non-sensitive demo evidence.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Review this generated Proof Packet PDF against FieldDoc
release standards. Identify layout, missing evidence, caption, and trust issues."

VERIFY:
The PDF is clear enough to send to a customer or inspector.

BLOCKS:
Public beta positioning.

STATUS:
TODO

NOTES:
The app is only as convincing as its generated packet.

[ ] STEP 38 - Improve imported document/PDF rendering

OWNER:
Codex

WHERE:
Mobile report generation and proof packet renderer.

ACTION:
Ensure imported documents and PDFs are represented usefully in generated Proof
Packets. At minimum, show clear document metadata and attachment references. If
feasible, render PDF page thumbnails or included pages.

VALUES NEEDED:
Example imported PDF and target output expectation.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Fix FieldDoc Proof Packet generation so imported PDFs and
documents appear in a useful customer-facing way. Use the attached sample PDF as
the acceptance fixture."

VERIFY:
A generated Proof Packet containing an imported PDF is understandable without
opening the source app.

BLOCKS:
High-quality beta proof packets.

STATUS:
TODO

NOTES:
This was previously identified as a P1 remediation item.

[ ] STEP 39 - Finish evidence captions before delivery

OWNER:
Founder

WHERE:
Mobile project evidence screens and web readiness page.

ACTION:
Review all demo/beta evidence and add useful captions before generating or
sharing reports.

VALUES NEEDED:
Job context.

CODEX CAN HELP:
No
If Yes:
N/A

VERIFY:
Readiness page no longer warns about missing captions for the delivery dataset.

BLOCKS:
Customer-quality report output.

STATUS:
TODO

NOTES:
This is one of the remaining live readiness warnings.

[ ] STEP 40 - Upload remaining originals

OWNER:
Founder

WHERE:
Mobile Settings, web Settings.

ACTION:
Run Upload All Pending Changes after generating a final demo Proof Packet.

VALUES NEEDED:
Network connection, signed-in account, subscription active.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Help me interpret FieldDoc Upload All Pending Changes output
without exposing secrets or customer evidence."

VERIFY:
Readiness page no longer warns that immutable originals are device-local for
the dataset being reviewed.

BLOCKS:
Cloud report archive and share confidence.

STATUS:
TODO

NOTES:
This is the other remaining live readiness warning.

## PHASE 13 - SECURITY / PRIVACY TEST

[ ] STEP 41 - Run tenant isolation tests

OWNER:
Codex

WHERE:
Web API tests and manual production smoke test.

ACTION:
Attempt cross-organization reads and writes for projects, evidence, media,
reports, share links, and downloads.

VALUES NEEDED:
Two test organizations and users.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Run and expand FieldDoc tenant isolation tests for sync,
media, reports, downloads, and share links. Fix any cross-tenant access."

VERIFY:
Cross-tenant access is rejected or returns not found.

BLOCKS:
External beta.

STATUS:
TODO

NOTES:
This is a critical SaaS security check.

[ ] STEP 42 - Run object storage abuse tests

OWNER:
Codex

WHERE:
Web API tests, R2, Vercel functions.

ACTION:
Test wrong content type, wrong SHA-256, wrong size, stale signed URL, tenant key
mismatch, duplicate upload completion, and direct public bucket access.

VALUES NEEDED:
None beyond test fixtures.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Add FieldDoc object storage abuse tests for signed upload
and download routes and fix any missing validation."

VERIFY:
Invalid uploads are rejected and public bucket access remains disabled.

BLOCKS:
External beta.

STATUS:
TODO

NOTES:
The current implementation already verifies tenant key shape, size, content
type, and SHA-256. Keep proving it.

[ ] STEP 43 - Run webhook abuse tests

OWNER:
Codex

WHERE:
RevenueCat webhook route tests.

ACTION:
Test missing signature, wrong secret, replayed event, duplicate event, malformed
payload, unknown user, and unknown entitlement.

VALUES NEEDED:
Webhook secret in test environment.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Expand FieldDoc RevenueCat webhook abuse tests for auth,
idempotency, malformed payloads, unknown users, and entitlement mapping."

VERIFY:
Only valid signed events alter entitlement state.

BLOCKS:
Paid public release.

STATUS:
TODO

NOTES:
This protects server-trusted subscription gates.

## PHASE 20 - BETA USER TEST

[ ] STEP 44 - Recruit 5 closed beta testers

OWNER:
Founder

WHERE:
Personal network, contractors, field operators, trusted companies.

ACTION:
Invite five people who can create real field evidence without legal or customer
risk.

VALUES NEEDED:
Names, emails, device type, role, expected use case.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Draft a concise closed beta invite and feedback form for
Proof Packet. Make it suitable for contractors and property managers."

VERIFY:
At least five testers agree to install TestFlight and complete one proof packet.

BLOCKS:
Field validation.

STATUS:
TODO

NOTES:
Start tiny. Watch every failure.

[ ] STEP 45 - Define closed beta success criteria

OWNER:
Founder

WHERE:
Release notes and feedback tracker.

ACTION:
Define what must be true after closed beta: jobs created, packets generated,
sync success rate, no data loss, no critical accessibility failures, no severe
confusion.

VALUES NEEDED:
Target beta size and desired confidence threshold.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Create a closed beta success scorecard for FieldDoc with
activation, reliability, usability, and trust criteria."

VERIFY:
The scorecard can be answered with beta data and tester interviews.

BLOCKS:
External beta and public launch.

STATUS:
TODO

NOTES:
Do not optimize for vanity metrics.

[ ] STEP 46 - Prepare beta support loop

OWNER:
Founder / Codex

WHERE:
Support inbox, feedback form, diagnostics bundle, issue tracker.

ACTION:
Create a simple support process for bug reports, stuck sync, missing media, PDF
quality issues, and subscription problems.

VALUES NEEDED:
Support email, feedback form URL, issue triage owner.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Create a FieldDoc beta support runbook and tester feedback
form questions. Keep it practical."

VERIFY:
Every beta tester knows where to send feedback and what information to include.

BLOCKS:
Closed beta quality.

STATUS:
TODO

NOTES:
Support process beats a perfect dashboard at this stage.

## PHASE 22 - APP STORE SUBMISSION

[ ] STEP 47 - Finalize App Review notes

OWNER:
Founder / Codex

WHERE:
`docs/APP_REVIEW_NOTES_DRAFT.md` and App Store Connect Review Notes.

ACTION:
Update the draft with final demo account, reviewer steps, subscription behavior,
account deletion path, privacy/legal URLs, and known limitation disclosures.

VALUES NEEDED:
Demo account or sign-in approach, legal URLs, support contact, final build
behavior.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Finalize FieldDoc App Review notes from the current build.
Include reviewer steps, subscription test instructions, account deletion, and
privacy notes."

VERIFY:
Reviewer can complete the main app flow without contacting you.

BLOCKS:
App Review.

STATUS:
TODO

NOTES:
The draft file exists but must be updated after final build behavior is known.

[ ] STEP 48 - Submit App Review only after go/no-go gate

OWNER:
Founder / Apple

WHERE:
App Store Connect.

ACTION:
Submit the app only after this checklist says App Review blockers are closed.

VALUES NEEDED:
Final build, screenshots, metadata, privacy answers, subscription review
details, review notes.

CODEX CAN HELP:
No
If Yes:
N/A

VERIFY:
App Store Connect submission is accepted for review.

BLOCKS:
Public App Store release.

STATUS:
TODO

NOTES:
Do not rush this while account deletion/export or subscription testing is
unclear.

## PHASE 23 AND 24 - PUBLIC RELEASE AND FIRST 72 HOURS

[ ] STEP 49 - Create release-day rollback and support plan

OWNER:
Founder / Codex

WHERE:
Operations runbook, Vercel, App Store Connect, support inbox.

ACTION:
Define what to do if sync fails, uploads fail, subscriptions fail, reports look
wrong, or Sentry shows crashes.

VALUES NEEDED:
Support owner, emergency contact, rollback thresholds.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Create FieldDoc release-day rollback and first-72-hours
support plan based on current architecture."

VERIFY:
Founder has a one-page plan for triage and communication.

BLOCKS:
Public launch.

STATUS:
TODO

NOTES:
Small beta releases still need operational discipline.

[ ] STEP 50 - Run first 72-hour monitoring

OWNER:
Founder

WHERE:
Sentry, Vercel logs, Neon, RevenueCat, Resend, support inbox.

ACTION:
Check crash reports, failed syncs, rejected receipts, failed uploads, purchase
errors, email failures, support messages, and report quality issues twice daily.

VALUES NEEDED:
Provider dashboard access.

CODEX CAN HELP:
Yes
If Yes:
Give exact prompt: "Analyze FieldDoc first-72-hour beta signals. I will provide
counts and sanitized errors only."

VERIFY:
No unresolved data-loss, security, billing, or blocking usability issues.

BLOCKS:
Wider beta and public release.

STATUS:
TODO

NOTES:
If the first 72 hours are boring, that is excellent.

## PHASE 5 - DATABASE AND STORAGE PRODUCTION SETUP

Neon production setup:

1. Open Neon.
2. Select the FieldDoc production project.
3. Select the production branch and database.
4. Confirm the Vercel `DATABASE_URL` points at that production branch.
5. Confirm migrations `0001` through `0007` have been applied.
6. Run this verification query in Neon:

```sql
select
  to_regclass('public.organizations') as organizations,
  to_regclass('public.projects') as projects,
  to_regclass('public.evidence_items') as evidence_items,
  to_regclass('public.media_assets') as media_assets,
  to_regclass('public.report_exports') as report_exports,
  to_regclass('public.report_share_links') as report_share_links,
  to_regclass('public.audit_events') as audit_events,
  to_regclass('public.subscription_entitlements') as subscription_entitlements;
```

Expected result:

- Every column returns a table name, not blank.
- Web Settings shows Neon database Ready.
- Web Projects and Reports load after sign-in.

Cloudflare R2 production setup:

1. Open Cloudflare.
2. Go to R2 Object Storage.
3. Select the production bucket.
4. Confirm Public Access is Disabled.
5. Confirm lifecycle/retention policy matches the privacy policy.
6. Confirm Vercel has `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
   `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME`.
7. Upload one test object only through the app or a signed URL.
8. Confirm anonymous direct object access fails.
9. Confirm authenticated web download works through the app.
10. Delete the test object if it was not created by the app.

## PHASE 6 - AUTHENTICATION

Clerk checklist:

1. Use a production Clerk instance for public release.
2. Configure production web origin:
   `https://fielddoc-web.vercel.app` or the final custom domain.
3. Configure mobile deep link scheme: `fielddoc`.
4. Confirm allowed redirects for sign-in, sign-up, and mobile callbacks.
5. Confirm organization support is enabled.
6. Confirm users can sign out.
7. Confirm expired sessions show a clear re-authentication path.
8. Confirm no development auth bypass exists.
9. Confirm mobile signs in and receives a usable bearer token.
10. Confirm web provisioning creates or finds the Neon organization.

Sign in with Apple:

- If Google or another third-party identity provider is available in the iOS app,
  Sign in with Apple is likely required for App Review.
- If the iOS app uses only email/password or email code authentication, confirm
  whether Sign in with Apple is required with Apple guidance before submission.
- If required, configure the Apple capability, Clerk Apple provider, redirect
  URI, bundle ID, service ID if needed, and TestFlight real-device flow before
  App Review.

## PHASE 10 - WEB PRODUCTION DEPLOYMENT

Web smoke test after every production deploy:

1. Open `https://fielddoc-web.vercel.app/`.
2. Open `/privacy`.
3. Open `/terms`.
4. Sign in at `/sign-in`.
5. Open `/app`.
6. Select the active organization.
7. Open `/app/projects`.
8. Open `/app/reports`.
9. Open `/app/settings`.
10. Confirm Settings shows ready states for Web authentication, Neon database,
    Private object storage, RevenueCat webhook, Email delivery, Error reporting,
    and Legal URLs.
11. Click Email delivery Send test.
12. Click Error reporting Send test.
13. Confirm recent audit activity increments.

Release blocker:

- Any server error after sign-in blocks TestFlight expansion.

## PHASE 11 - IOS PRODUCTION BUILD

Exact build path:

1. Confirm Apple Developer access is active.
2. Confirm App Store Connect has the app record for `com.fielddoc.mobile`.
3. Confirm mobile env values are configured in EAS or the build environment.
4. From the repo root, run:

```bash
cd /Users/keithdowler/Documents/Codex/2026-08-12/files-mentioned-by-the-user-you/work/fielddoc/apps/mobile
npx eas-cli build --platform ios --profile production
```

5. If prompted, let EAS manage credentials unless you have a deliberate manual
   signing setup.
6. Save the EAS build URL.
7. After the build succeeds, upload or submit it to TestFlight.

Expected result:

- EAS build succeeds.
- Bundle identifier is `com.fielddoc.mobile`.
- Display name is the final public product name.
- Camera/photo/document permissions appear only when needed.

## PHASE 14 - SUBSCRIPTION TEST MATRIX

| Scenario                               | Expected behavior                                                 |
| -------------------------------------- | ----------------------------------------------------------------- |
| New signed-in user with no entitlement | Cloud sync and report archive are clearly gated.                  |
| Test entitlement granted in RevenueCat | Mobile Settings shows Subscription active.                        |
| Apple sandbox monthly purchase         | Entitlement becomes active and cloud actions unlock.              |
| Apple sandbox annual purchase          | Entitlement becomes active and cloud actions unlock.              |
| Failed purchase                        | App stays usable locally and shows a clear non-destructive error. |
| Restore purchase                       | Existing entitlement is restored on the same account.             |
| Reinstall app                          | Sign-in restores cloud account and entitlement state.             |
| Expired subscription                   | Local use remains available; paid cloud features lock.            |
| RevenueCat webhook duplicate           | Server records only one effective event.                          |
| Unknown entitlement                    | Server ignores it or records it without unlocking paid gates.     |

Release blocker:

- App Review should not proceed until Apple sandbox purchase and restore have
  been tested with the submitted build.

## PHASE 15 - OFFLINE / SYNC TEST

Dedicated offline test:

1. Fresh install the app.
2. Sign in while online.
3. Confirm subscription is active.
4. Enable Airplane Mode.
5. Create a new job.
6. Capture 6 Before photos.
7. Capture 10 Work photos.
8. Capture 6 After photos.
9. Import one supporting document.
10. Add captions to at least half of the evidence.
11. Generate a Proof Packet PDF.
12. Kill the app.
13. Restart the phone.
14. Reopen the app while still offline.
15. Confirm the job, evidence, captions, and report are still present.
16. Disable Airplane Mode.
17. Tap Upload All Pending Changes.
18. Open the web app.
19. Confirm the project appears once, not duplicated.
20. Confirm media originals and report PDFs upload.

Release-blocking failures:

- Local data disappears.
- Evidence duplicates during sync.
- Upload reports success but web data is missing.
- Generated PDF cannot be opened.

## PHASE 18 - APP STORE ASSETS AND METADATA

Screenshot set:

1. Home with a current job.
2. Create job form with professional field labels.
3. Capture screen with before/work/after evidence.
4. Project detail with sections.
5. Report readiness.
6. Generated Proof Packet preview or archive.
7. Settings with cloud account and subscription active.

Metadata fields:

- App name.
- Subtitle.
- Description.
- Keywords.
- Category.
- Support URL.
- Marketing URL if used.
- Privacy Policy URL.
- Terms URL.
- Copyright.
- Age rating.
- Review contact.
- Demo account.
- Subscription review information.
- Export compliance answers.
- Content rights confirmation.

Any uncertain legal or encryption answer is FOUNDER/LEGAL REVIEW REQUIRED.

## PHASE 19 - TESTFLIGHT

TestFlight sequence:

1. Upload the EAS production build.
2. Wait for Apple processing.
3. Add yourself as internal tester.
4. Install the build from TestFlight.
5. Run PHASE 12, PHASE 14, PHASE 15, and PHASE 16 tests.
6. Add 5 trusted internal or external testers.
7. Give testers a single job: create one real Proof Packet and send feedback.
8. Do not widen beta until no data-loss, auth, subscription, or report-opening
   issue remains.

## PHASE 21 - FINAL GO/NO-GO

| Gate                                     | Status now       | Required result                   |
| ---------------------------------------- | ---------------- | --------------------------------- |
| No P0 defects                            | NOT TESTED FINAL | PASS before TestFlight expansion. |
| No tenant isolation defect               | NOT TESTED FINAL | PASS before external beta.        |
| No evidence-loss defect                  | NOT TESTED FINAL | PASS before any beta.             |
| Offline workflow verified                | NOT TESTED FINAL | PASS on real iPhone.              |
| Sync verified                            | NOT TESTED FINAL | PASS on production backend.       |
| Proof Packet professional quality        | NOT TESTED FINAL | PASS with final demo dataset.     |
| Subscription purchase and restore        | NOT TESTED FINAL | PASS through Apple sandbox.       |
| Account deletion/export                  | NOT TESTED FINAL | PASS or documented request flow.  |
| Privacy/support URLs live                | PASS             | Keep verified before submission.  |
| App Store metadata complete              | TODO             | PASS before App Review.           |
| TestFlight smoke test                    | TODO             | PASS before external beta.        |
| Several real beta users complete reports | TODO             | PASS before public release.       |

## APP REVIEW READINESS

Do not submit to App Review until every item below is true:

- Production backend is live.
- Production database is live.
- Private storage is live.
- Web and mobile authentication work.
- Subscription purchase and restore work through Apple sandbox.
- Privacy policy is public and legally reviewed.
- Terms are public and legally reviewed.
- Support URL and support email work.
- Account deletion or delete-request flow is visible.
- Data export or export-request flow is visible.
- Restore Purchases is visible.
- App Review notes are complete.
- Permission descriptions match behavior.
- App metadata is complete.
- Screenshots are final.
- TestFlight build passes real-device smoke test.
- No debug-only UI is visible.
- No placeholder content appears in production flows.
- No broken links exist.
- No test pricing or test-store entitlement is presented as production.
- Final public name is used in customer-facing surfaces.

## Apple Privacy Disclosure Working Map

| Data category                  | Collected?                | Purpose                   | Linked to user? | Tracking? | Processor/source                          |
| ------------------------------ | ------------------------- | ------------------------- | --------------- | --------- | ----------------------------------------- |
| Account identifiers            | Yes                       | Auth, workspace ownership | Yes             | No        | Clerk, Neon                               |
| Customer/project/site metadata | Yes                       | Proof Packet records      | Yes             | No        | Neon, local SQLite                        |
| Photos and documents           | Yes                       | Evidence originals        | Yes             | No        | Local device, R2 when uploaded            |
| Captions and notes             | Yes                       | Report content            | Yes             | No        | Local SQLite, Neon                        |
| Subscription status            | Yes                       | Paid feature gates        | Yes             | No        | RevenueCat                                |
| Diagnostics/errors             | Yes                       | Support and stability     | Usually yes     | No        | Sentry, Vercel                            |
| Analytics events               | Optional                  | Activation metrics        | If enabled      | No        | PostHog if configured                     |
| GPS/location                   | Not intentionally used    | N/A                       | N/A             | No        | Do not claim collected unless implemented |
| OCR text                       | Not currently implemented | N/A                       | N/A             | No        | Deferred                                  |

FOUNDER/LEGAL REVIEW REQUIRED before App Store submission.

## Beta Questions

Ask no more than these ten:

1. What were you trying to document?
2. Where did you hesitate?
3. What felt slower than your current process?
4. Did you trust that your photos and documents were safe?
5. Did you generate a Proof Packet?
6. Did you send the Proof Packet to anyone?
7. What did they think?
8. Would you use this on your next job?
9. What would stop you from using it again?
10. What would you use instead if this disappeared tomorrow?

## Early Metrics After Launch

Priority metrics:

1. First project created.
2. First evidence captured.
3. First caption added.
4. First Proof Packet generated.
5. First Proof Packet shared or downloaded.
6. Second Proof Packet generated.
7. Subscription trial or entitlement active.
8. Paid conversion when production subscriptions are live.
9. D7 return.
10. Support tickets per active tester.

Do not prioritize download counts over completed reports.

## Cost Check

| Service       | What can grow unexpectedly           | Founder action                                           |
| ------------- | ------------------------------------ | -------------------------------------------------------- |
| Vercel        | Function usage, bandwidth, logs      | Set spend alerts and review usage weekly in beta.        |
| Neon          | Compute time, storage, branching     | Enable backups and review compute/storage weekly.        |
| Cloudflare R2 | Stored originals, Class A operations | Monitor storage and operation counts.                    |
| RevenueCat    | Paid plan requirements               | Confirm pricing and plan before public launch.           |
| Resend        | Email volume                         | Verify sending limits and bounce handling.               |
| Sentry        | Event volume                         | Set rate limits and alert thresholds.                    |
| PostHog       | Event volume                         | Keep disabled or minimal until event policy is approved. |
| Apple         | Developer fee and subscription fees  | Confirm account is active and paid.                      |

## Backup / Recovery

| Failure                 | What is protected                                               | What to do                                              |
| ----------------------- | --------------------------------------------------------------- | ------------------------------------------------------- |
| Device offline          | Local jobs, metadata, evidence references, generated local PDFs | Keep working locally; sync later.                       |
| Vercel outage           | Local app still works offline                                   | Do not delete local data; retry later.                  |
| Neon unavailable        | Local metadata remains on device                                | Hold outbox mutations and retry.                        |
| R2 unavailable          | Local originals remain on device                                | Retry upload later; do not mark originals uploaded.     |
| Clerk unavailable       | Signed-in cloud operations may fail                             | Continue local use if already loaded; retry auth later. |
| RevenueCat unavailable  | Subscription refresh may fail                                   | Do not delete data; keep local use available.           |
| Report generation fails | Source evidence remains local                                   | Fix report renderer; regenerate.                        |

Permanent evidence-loss risk:

- Deleting local device data before confirming cloud upload.
- Deleting R2 objects without a retention/deletion workflow.
- Broken migration or sync code that marks uploads complete before verification.

## Support Readiness

Minimum beta support requirements:

- Support email exists.
- Support inbox is monitored daily.
- Support URL works without login.
- Privacy contact works.
- Subscription support path is understood.
- Account deletion support path is understood.
- Bug report path exists.
- Founder knows how to collect sanitized sync/upload status without asking for
  customer evidence.

# THE SIMPLE VERSION

1. Do not start another broad sprint.
2. Confirm Apple Developer access.
3. Create the App Store Connect app record.
4. Lock Vercel production env vars.
5. Lock EAS/mobile env vars.
6. Build a production iOS build.
7. Upload it to TestFlight.
8. Install on a real iPhone.
9. Run offline create/capture/report test.
10. Run sync/upload/archive/share test.
11. Test App Store sandbox subscription purchase and restore.
12. Implement cloud account deletion or a compliant delete-request flow.
13. Implement cloud data export or a compliant export-request flow.
14. Validate one final demo Proof Packet.
15. Fix imported document/PDF representation if it makes reports look weak.
16. Capture App Store screenshots.
17. Fill App Store metadata and privacy answers.
18. Invite five closed beta testers.
19. Watch crashes, sync failures, subscription issues, and support requests.
20. Submit for App Review only after the beta proves the core loop.

# GIVE THESE TO CODEX

- "Run the full FieldDoc release verification gate and report all failures
  before changing code."
- "Run a release secret scan on the FieldDoc repo. Do not print secret values."
- "Implement App Review-safe cloud account deletion/request flow for FieldDoc."
- "Implement a FieldDoc cloud data export or export-request flow."
- "Fix FieldDoc Proof Packet generation so imported PDFs and documents appear in
  a useful customer-facing way."
- "Add privacy-safe mobile crash reporting to FieldDoc."
- "Run and expand FieldDoc tenant isolation tests for sync, media, reports,
  downloads, and share links."
- "Create a one-page real-device TestFlight smoke test script."
- "Finalize FieldDoc App Review notes from the current build."
- "Create FieldDoc release-day rollback and first-72-hours support plan."

# I MUST DO THESE MYSELF

- Apple Developer enrollment and access.
- App Store Connect app record.
- App Store agreements, tax, and banking.
- App Store subscription products and pricing.
- Legal approval of privacy policy, terms, and subscription disclosures.
- Final product name and support identity.
- Real iPhone TestFlight install.
- Real-world offline field test.
- App Store screenshots and final metadata approval.
- App Review submission.
- Closed beta tester recruitment.
- Customer support response during beta.

# DO NOT RELEASE UNTIL THESE ARE TRUE

- A fresh TestFlight build installs on a real iPhone.
- Offline job creation and evidence capture survives app kill and phone restart.
- Metadata sync succeeds after reconnecting.
- Original media uploads to private storage.
- Report PDFs archive to private storage.
- Share links work and do not expose public bucket URLs.
- Subscription purchase and restore are proven through Apple sandbox.
- RevenueCat webhook events are accepted only when valid and signed.
- Account deletion or delete request is visible and accurate.
- Data export or export request is visible and accurate.
- Legal URLs are public and match app behavior.
- App privacy answers match the app.
- No real secrets are committed.
- No cross-tenant reads or downloads are possible.
- A final Proof Packet looks good enough to send.
- A support process exists for stuck users.

# FINAL VERDICT

CURRENT STATUS:

READY FOR FOUNDER CONFIGURATION

FieldDoc / Proof Packet is ready for founder-led closed beta preparation, not
public App Store release.

THE NEXT THING KEITH SHOULD DO IS:

Confirm Apple Developer Program access and create or verify the App Store
Connect app record for bundle identifier `com.fielddoc.mobile`.
