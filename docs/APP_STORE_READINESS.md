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
- Terms URL in `NEXT_PUBLIC_TERMS_URL` and `EXPO_PUBLIC_TERMS_URL`.
- Account deletion flow.
- Restore purchases flow if subscriptions are offered.
- RevenueCat production API key and webhook secret.
- Subscription disclosure copy if subscriptions are offered.
- Sign in with Apple decision if mobile account creation uses third-party/social auth.
- App Review demo account or review notes if authenticated features are gated.
- Screenshot checklist using real non-sensitive demo jobs.

## Not Yet Ready

The app should not be submitted for public App Store review until the Proof Packet embeds visual evidence, account deletion exists, subscription/restoration behavior is implemented if monetization is enabled, and privacy/terms URLs point to reviewed legal documents.
