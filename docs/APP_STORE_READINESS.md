# App Store Readiness

Sprint remediation date: 2026-08-16

This project now has reproducible EAS build profiles in `apps/mobile/eas.json` and production mobile identifiers in `apps/mobile/app.json`.

## Current State

- iOS bundle identifier: `com.fielddoc.mobile`
- iOS build number: `1`
- Android package: `com.fielddoc.mobile`
- Android version code: `1`
- Development build profile: internal simulator/client build
- Preview build profile: internal distribution
- Production build profile: auto-incrementing build numbers

## Required Before App Review

- Final public product name.
- Final icon and splash assets.
- Privacy Policy URL in `NEXT_PUBLIC_PRIVACY_POLICY_URL` and `EXPO_PUBLIC_PRIVACY_POLICY_URL`.
  The web app ships a first-party `/privacy` page; point production variables
  at the deployed absolute URL before App Store submission.
- Terms URL in `NEXT_PUBLIC_TERMS_URL` and `EXPO_PUBLIC_TERMS_URL`.
  The web app ships a first-party `/terms` page; point production variables at
  the deployed absolute URL before App Store submission.
- Account deletion flow.
- RevenueCat products, entitlements, production mobile API keys, and webhook
  secret.
- Sandbox purchase/restore validation for `fielddoc_pro`.
- Subscription disclosure copy if subscriptions are offered.
- Sign in with Apple decision if mobile account creation uses third-party/social auth.
- App Review demo account or review notes if authenticated features are gated.
- Screenshot checklist using real non-sensitive demo jobs.

## Not Yet Ready

The app should not be submitted for public App Store review until account
deletion exists, subscription products and restoration are validated against
RevenueCat/App Store sandbox, and privacy/terms URLs point to reviewed legal
documents.
