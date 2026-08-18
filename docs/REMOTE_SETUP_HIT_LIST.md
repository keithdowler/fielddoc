# Remote Setup Hit List

Use this list when you are away from the development machine. Do not paste
secret values into chat, GitHub issues, screenshots, or docs. Store secrets in
the provider dashboard, Vercel environment variables, Expo/EAS secrets, or a
password manager.

## Already Expected To Be Working

- GitHub repository is connected and deploys to Vercel.
- Neon production database exists and migrations have been applied manually.
- Clerk web and mobile authentication are configured enough for sign-in.
- Cloudflare R2 bucket exists for private object storage.
- Vercel production has the core Clerk, Neon, and R2 environment variables.

## 1. RevenueCat

Goal: make paid cloud features enforceable before App Store review.

Create or verify:

- RevenueCat project/app for FieldDoc.
- Entitlement named `fielddoc_pro`.
  Current development builds also accept RevenueCat aliases `FieldDocPro` and
  `FieldDoc Pro` so provider naming restrictions do not block sandbox testing.
  Production catalog cleanup should converge on the canonical `fielddoc_pro`
  identifier when RevenueCat permits it.
- Monthly and yearly subscription products in the App Store / Play Console when
  store accounts are ready.
- RevenueCat offering that includes those products.
- Webhook URL:
  `https://fielddoc-web.vercel.app/api/revenuecat/webhook`
- Webhook secret stored in Vercel Production as `REVENUECAT_WEBHOOK_SECRET`.
- Public mobile SDK keys stored outside Git:
  `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` and
  `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`.

Do not block local product testing on real purchases. The app already treats
missing or inactive entitlements as a clear disabled cloud-gate state.

## 2. Email Delivery

Goal: prepare for sending report/share/account emails.

Create or verify:

- Resend account.
- Sending domain verified with DNS records.
- Production API key stored in Vercel as `RESEND_API_KEY`.
- A planned from-address such as `reports@yourdomain.com`.

The app does not yet send production email. This setup removes a blocker for the
next delivery sprint.

## 3. Error Reporting

Goal: capture production web/mobile failures before broad beta.

Create or verify:

- Sentry account.
- Project for the Next.js web app.
- Project for the Expo/React Native mobile app.
- Web DSN stored in Vercel as `SENTRY_DSN`.
- Mobile DSN saved for a future Expo/EAS secret once mobile Sentry is wired.

Do not add customer names, addresses, captions, notes, local file URIs, signed
URLs, or object bytes to error context.

## 4. Legal URLs

Goal: unblock App Store metadata and account flows.

Create public pages for:

- privacy policy
- terms of service

Then store the URLs:

- Vercel Production: `NEXT_PUBLIC_PRIVACY_POLICY_URL`
- Vercel Production: `NEXT_PUBLIC_TERMS_URL`
- Expo/EAS/mobile env: `EXPO_PUBLIC_PRIVACY_POLICY_URL`
- Expo/EAS/mobile env: `EXPO_PUBLIC_TERMS_URL`

## 5. Apple Developer

Goal: unblock real iOS distribution and App Store review.

Create or verify:

- Apple Developer Program enrollment.
- Team ID / App ID prefix.
- Bundle identifier `com.fielddoc.mobile` or the final production identifier.
- App Store Connect app record.
- Paid subscription products if RevenueCat production testing is next.

## 6. Android Developer

Goal: avoid iOS-only production planning.

Create or verify:

- Google Play Console account.
- Android package name matching the Expo config.
- Internal testing track.
- Subscription products if Android monetization is planned for beta.

## 7. Vercel Readiness Check

After every provider setup, redeploy `fielddoc-web` in Vercel and visit:

`https://fielddoc-web.vercel.app/app/settings`

That page should show which production systems are ready and list any missing
environment variable names without showing their values.

## Keep Deferred

Do not spend remote time on:

- CRM setup.
- invoicing/accounting integrations.
- large report template libraries.
- broad analytics dashboards.
- AI narrative generation.

Those are intentionally deferred until the field evidence and Proof Packet loop
has beta usage.
