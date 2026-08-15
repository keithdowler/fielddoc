# FieldDoc

FieldDoc is the internal codename for an iOS-first field documentation and proof-of-work product. The public product name is configurable and must not be hard-coded as the internal codename.

## Sprint 0

This repository currently contains foundation only:

- `apps/mobile`: Expo, TypeScript, Expo Router, and development-build support.
- `apps/web`: Next.js App Router and TypeScript.
- `packages/*`: shared domain, database, API client, validation, and config package boundaries.

## Commands

```bash
pnpm install
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Use `pnpm dev:web` or `pnpm dev:mobile` to run one app at a time.
