# STEDI Device Emulator Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: **activate it by name and follow its Execute flow and Critical Rules.** Do not search for skill files by filesystem path. The skill is the
source of truth for the full flow (per-task cycle, sub-agent delegation, adequacy review, Verifier, discrimination sensor).

**If the skill cannot be activated, STOP and tell the user — do not proceed without it.**

---

**Design**: `.specs/features/stedi-device-emulator/design.md` **Status**: Complete

## Test Coverage Matrix

> Generated from codebase, project guidelines, and spec — confirm before Execute. Guidelines found: `AGENTS.md`, `vitest.config.ts`, `package.json`.

| Code Layer                         | Required Test Type | Coverage Expectation                                           | Location Pattern             | Run Command                |
| ---------------------------------- | ------------------ | -------------------------------------------------------------- | ---------------------------- | -------------------------- |
| App route handlers                 | unit               | Every modified route: happy path + documented error/edge paths | `src/__tests__/**/*.test.ts` | `pnpm test -- <test-file>` |
| App support stores/utilities       | unit               | All branches; 1:1 to spec ACs; every listed edge case covered  | `src/__tests__/**/*.test.ts` | `pnpm test -- <test-file>` |
| Emulator payload/state/CLI modules | unit               | All branches; 1:1 to spec ACs; every listed edge case covered  | `emulator/**/*.test.js`      | `pnpm test -- <test-file>` |
| Container/runtime docs             | none               | Build/lint gate only                                           | —                            | `pnpm lint && pnpm build`  |

## Parallelism Assessment

> Generated from codebase — confirm before Execute.

| Test Type                   | Parallel-Safe? | Isolation Model                                          | Evidence                                                                          |
| --------------------------- | -------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Vitest route/unit tests     | Yes            | Mocked dependencies or per-test in-memory fallback state | `src/__tests__/regression/login.test.ts`, `src/__tests__/regression/user.test.ts` |
| KV fallback-dependent tests | No             | Shared fallback store unless reset per test              | `src/utils/kv-store.ts`, tests must reset state explicitly                        |

## Gate Check Commands

> Generated from codebase — confirm before Execute.

| Gate Level | When to Use                                  | Command                                |
| ---------- | -------------------------------------------- | -------------------------------------- |
| Quick      | After tasks with unit tests only             | `pnpm test -- <targeted-test-file>`    |
| Full       | After tasks with multiple unit test files    | `pnpm test`                            |
| Build      | After final integration or config-only tasks | `pnpm lint && pnpm build && pnpm test` |

---

## Execution Plan

### Phase 1: App Integration (Sequential)

T1 → T2

### Phase 2: Emulator Runtime (Sequential)

T2 → T3 → T4 → T5

### Phase 3: Integration & Validation (Sequential)

T5 → T6

---

## Task Breakdown

### T1: Restore rapid-step upstream forwarding

**What**: Replace the local-only `rapidsteptest` route with upstream forwarding and add a regression test. **Where**: `src/app/rapidsteptest/route.ts`,
`src/__tests__/regression/rapidsteptest-route.test.ts` **Depends on**: None **Reuses**: `src/utils/pass-through.ts`, `src/__tests__/regression/login.test.ts` **Requirement**: EMU-05

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] `POST /rapidsteptest` calls `forwardRequest(request, "/rapidsteptest")`
- [ ] Route test proves status 200 and body `Saved` on upstream success
- [ ] Route test proves upstream failure status/body are preserved through the route helper call

**Tests**: unit **Gate**: quick

**Status**: Complete

---

### T2: Add recent-device heartbeat routes

**What**: Add local heartbeat persistence plus `POST /sensorUpdates` and `GET /devices/updates/recent` routes with route/store tests. **Where**: `src/app/sensorUpdates/route.ts`,
`src/app/devices/updates/recent/route.ts`, `src/utils/device-status-store.ts`, `src/__tests__/regression/device-status-routes.test.ts` **Depends on**: T1 **Reuses**: `src/utils/kv-store.ts`
**Requirement**: EMU-01, EMU-02, EMU-06

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Heartbeat POST stores device ID, customer, powered-on flag, and timestamp
- [ ] Recent-device GET filters by time window and defaults safely on bad input
- [ ] Tests cover happy path, invalid input/default window, and expired heartbeat exclusion

**Tests**: unit **Gate**: full

**Status**: Complete

---

### T3: Add rapid-step payload generator

**What**: Implement the randomized rapid-step payload builder from the provided fixture with invariant tests. **Where**: `emulator/src/rapid-step-payload.js`, `emulator/rapid-step-payload.test.js`
**Depends on**: T2 **Reuses**: User-provided fixture shape **Requirement**: EMU-03, EMU-04

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Generator preserves customer and device ID
- [ ] Generator preserves timing and total-step invariants
- [ ] Tests prove repeated generations vary values within positive bounds

**Tests**: unit **Gate**: quick

**Status**: Complete

---

### T4: Add emulator state store and daemon

**What**: Implement per-container state persistence and a single heartbeat loop controller. **Where**: `emulator/src/state.js`, `emulator/src/daemon.js`, `emulator/daemon.test.js` **Depends on**: T3
**Reuses**: None **Requirement**: EMU-01, EMU-02

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] State persists config fields required by the CLI
- [ ] Daemon starts at most one heartbeat loop when powered on repeatedly
- [ ] Daemon stops heartbeats immediately when powered off

**Tests**: unit **Gate**: quick

**Status**: Complete

---

### T5: Add emulator CLI and HTTP client

**What**: Implement `stedi-sim` commands for config, power control, status, and `send-steps` using the daemon/state modules. **Where**: `emulator/src/cli.js`, `emulator/src/client.js`,
`emulator/cli.test.js` **Depends on**: T4 **Reuses**: T3 payload generator and T4 state/daemon modules **Requirement**: EMU-01, EMU-02, EMU-03, EMU-04

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] CLI supports `set-device-id`, `set customer`, `set-session-token`, `on`, `off`, `status`, and `send-steps`
- [ ] `send-steps` refuses to run when required config is missing
- [ ] Tests cover command parsing and missing-config failures

**Tests**: unit **Gate**: full

**Status**: Complete

---

### T6: Add Docker runtime and emulator docs

**What**: Finalize the Docker image, container entrypoint, and usage documentation for multi-instance development. **Where**: `emulator/Dockerfile`, `emulator/entrypoint.sh`, `emulator/README.md`
**Depends on**: T5 **Reuses**: T4 daemon and T5 CLI **Requirement**: EMU-01, EMU-03

**Tools**:

- MCP: NONE
- Skill: `tlc-spec-driven`

**Done when**:

- [ ] Container starts the daemon automatically
- [ ] `docker exec` usage is documented for two instances
- [ ] Final build/test gate passes

**Tests**: none **Gate**: build

**Status**: Complete

---

## Parallel Execution Map

Phase 1 (Sequential): T1 → T2

Phase 2 (Sequential): T2 → T3 → T4 → T5

Phase 3 (Sequential): T5 → T6
