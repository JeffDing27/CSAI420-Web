# FINAL COMPLETION CHECKLIST

## Stage 2: Repository and Service Layers
- [ ] PushTokenRepository implemented for KV, Prisma, Dual
- [ ] VoiceTestRepository, CustomerReferenceRepository verified in provider-factory
- [ ] All routes migrated to use Service layer instead of direct KV
- [ ] AWS Lambda handlers use shared services

## Stage 3: Prisma Data Safety
- [ ] Create `src/utils/json-normalize.ts` to handle Prisma Json inputs safely
- [ ] Replace `as any` in RagRepository and RapidStepTestRepository with normalized json

## Stage 4: Finish All Backend Routes
- [ ] Implement `POST /api/push-tokens` (save/retrieve/update/deactivate)
- [ ] Verify `POST /consent` endpoints
- [ ] Ensure all `dev.stedi.me` references are removed from `CS420-AI-Mobile`

## Stage 5: Dual-Write Verification
- [ ] Create `scripts/verify-dual-writes.ts`
- [ ] Test dual-write identicality across all entities

## Stage 6: Migration Tooling
- [ ] Verify `scripts/migrate-kv-to-supabase.ts` (dry run capability, no secrets exposed)

## Stage 7: Postgres Outbox Queue
- [ ] Verify OutboxRepository
- [ ] Verify `POST /api/internal/process-outbox`
- [ ] Route SMS and Push delivery through outbox

## Stage 8: AWS Course Compatibility
- [ ] Verify `template.yaml` and handlers are preserved and call services
- [ ] Run `sam validate`

## Stage 9: Twilio IVR
- [ ] Fix `scripts/test-ivr.ts`
- [ ] Verify `POST /api/voice-auth` logic

## Stage 10: SMS Consent
- [ ] Implement `POST /api/sms-hook`
- [ ] Route via OutboxEvent

## Stage 11: RAG and Memory
- [ ] Ensure ChatSession and ChatMessage use Prisma in dual mode
- [ ] Verify LangChain/LangGraph agent memory saves successfully

## Stage 12: Push Notifications
- [ ] Store PushToken in Supabase
- [ ] Remove `dev.stedi.me` patch logic from mobile app

## Stage 13: Mobile Product
- [ ] Verify Navigation and UI for all screens (Balance Test, Results, Settings, AI Registration, Voice, Push Notifications)

## Stage 14: Moderator Dashboard
- [ ] Ensure `status` updates use Prisma correctly
- [ ] Verify assignment and responses

## Stage 15-20: Final Verification and Cutover
- [ ] Run complete E2E simulated tests
- [ ] Temporarily run Supabase-only smoke test
- [ ] Cutover to Supabase
- [ ] Remove KV runtime logic
- [ ] Pass all formatting, linting, building, and test tasks

## Stage 21-22: Documentation and Commits
- [ ] Update all guides in `docs/final-suite/`
- [ ] Create local commits
