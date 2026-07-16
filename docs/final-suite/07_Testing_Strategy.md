# 7. Testing Strategy

## Local Testing
- **Framework:** `Vitest` with `jsdom`.
- **Scope:** API routes, state stores, and providers.
- **Run:** `npx pnpm vitest run`

## E2E / Classroom Verification
The system preserves the exact response formats (`201`, plain text success strings) from Weeks 1-3 to ensure compatibility with GitHub Classroom auto-graders. Mocks can be disabled via `.env` variables to run against real AWS/Twilio infrastructure when the classroom secrets are injected.
