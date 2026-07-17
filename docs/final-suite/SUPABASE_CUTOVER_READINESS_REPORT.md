# Supabase Cutover Readiness Report

This report evaluates the readiness of the STEDI product to transition from Dual-Write (KV + Supabase) to Supabase-only architecture.

## Requirements Status

- **Full entity-level dual-write verification:** PARTIALLY VERIFIED (Script covers only CustomerReference and PushToken)
- **Real KV-data comparison:** NOT TESTED (Real KV credentials missing)
- **Supabase-only smoke testing:** NOT TESTED
- **Runtime operation without KV credentials:** NOT TESTED
- **Mobile product completion:** PARTIALLY VERIFIED
- **Mobile tests and exports:** NOT TESTED
- **Clinician/provider portal:** PARTIALLY VERIFIED
- **Complete moderator workflow:** PARTIALLY VERIFIED
- **Full end-to-end product verification:** NOT TESTED
- **Final KV runtime removal:** NOT TESTED

## Action Items Before Cutover
1. Expand `scripts/verify-dual-writes.ts` to cover all implemented dual-write entities.
2. Complete Next.js provider portal with role-based access.
3. Complete Moderator portal workflows.
4. Complete all Mobile screens.
5. Verify Push-Token migration (ensure all hard-coded URLs are parameterized).
6. Complete RAG and Memory workflows using Supabase.
7. Complete Twilio and SMS workflows.
8. Complete Postgres Outbox verifications.
9. Run dual-mode end-to-end test.
10. Run temporary Supabase-only test.
