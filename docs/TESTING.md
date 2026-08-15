# Testing

## Sprint 0 Test Layers

- Lint: `pnpm lint`
- TypeScript: `pnpm typecheck`
- Unit tests: `pnpm test`
- Web production build: `pnpm --filter @fielddoc/web build`

## CI

GitHub Actions runs install, lint, typecheck, tests, and web build. Mobile validation is intentionally limited to lint/typecheck/unit-test compatible checks for now so CI does not require App Store credentials, signing assets, simulators, or native build secrets.

## Future Coverage

Future sprints should add focused tests for sync idempotency, conflict handling, evidence metadata validation, storage signing, authorization, and Proof Packet generation.

## Sprint 2 Local Persistence Tests

Sprint 2 adds repository-level SQLite tests that run against an in-memory Node SQLite database using the same repository implementations as the Expo SQLite adapter. Coverage includes empty database migration, project persistence, search and sort ordering, soft delete, archive behavior, evidence ordering, report summary counts, mutation generation, and duplicate mutation safety.
