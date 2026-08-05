# STEDI Device Emulator Validation

Date: 2026-07-23 Verifier: Independent Verifier Verdict: PASS

## Scope

- Spec: `.specs/features/stedi-device-emulator/spec.md`
- Design: `.specs/features/stedi-device-emulator/design.md`
- Tasks: `.specs/features/stedi-device-emulator/tasks.md`

## Executive Summary

The STEDI device emulator feature now passes repo-local verification.

Focused verification was re-run after the permanent test additions and scoped Biome cleanup. The feature-scoped Vitest suite passed with `6/6` files and `21/21` tests, and the scoped Biome check
passed on the full feature surface.

The previously noted permanent coverage gaps are now closed by committed tests for:

1. direct emulator client request behavior in `emulator/client.test.js`
2. omitted `seconds` fallback behavior in `src/__tests__/regression/device-status-routes.test.ts`
3. CLI non-2xx `send-steps` handling in `emulator/cli.test.js`

The earlier Docker build and in-container CLI smoke evidence still supports runtime viability, and nothing in the current diff suggests those earlier results were invalidated.

There is still one remaining gap: the earlier external probe to `https://stedi-voice.vercel.app/devices/updates/recent?seconds=15` returned `404`. Per current instructions, this is treated as a
deployment-state verification gap, not as evidence of a repo implementation defect unless later deployment evidence shows otherwise.

The unrelated `next build` blocker in `src/app/birthdateverify/[phone]/route.ts` remains outside this feature verdict.

## Acceptance Criteria Coverage

### P1: Operate an emulator instance

| Spec AC                                                                                                    | Result | Evidence                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `spec.md:47` Persist device ID, customer, and session token for the current container instance             | PASS   | State persistence is implemented in `emulator/src/state.js`, exercised through daemon and CLI flows, and covered by `emulator/daemon.test.js`. |
| `spec.md:48` `stedi-sim on` marks device powered on and sends heartbeats every 3 seconds until powered off | PASS   | The daemon heartbeat loop and repeated-`on` guard are covered in `emulator/daemon.test.js`, including the single-loop edge case.               |
| `spec.md:49` `stedi-sim off` stops heartbeats and reports powered off                                      | PASS   | Power-off behavior and loop teardown are covered in `emulator/daemon.test.js`.                                                                 |

### P1: Submit a randomized rapid step test

| Spec AC                                                                                                                    | Result | Evidence                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `spec.md:63` `send-steps` submits `rapidsteptest` through the deployed app when required config is present                 | PASS   | CLI success behavior is covered in `emulator/cli.test.js`, and direct client request behavior is now covered permanently in `emulator/client.test.js`. |
| `spec.md:64` Preserve `startTime < stopTime`, `testTime = stopTime - startTime`, and `totalSteps = stepPoints.length`      | PASS   | Payload invariants are covered in `emulator/rapid-step-payload.test.js`.                                                                               |
| `spec.md:65` Randomize timings and step values while preserving `customer` and `deviceId` within realistic positive bounds | PASS   | Randomization and identity preservation are covered in `emulator/rapid-step-payload.test.js`.                                                          |
| `spec.md:66` Missing config fails with clear CLI error and does not send request                                           | PASS   | Missing-config failure remains covered in `emulator/cli.test.js`.                                                                                      |
| Edge case: upstream `rapidsteptest` failure is surfaced by the CLI                                                         | PASS   | Permanent non-2xx handling is now covered in `emulator/cli.test.js`.                                                                                   |

### P1: Expose app-side device integration

| Spec AC                                                                                                    | Result | Evidence                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------- |
| `spec.md:80` `POST /rapidsteptest` forwards upstream and preserves expected success behavior               | PASS   | Forwarding behavior is covered in `src/__tests__/regression/rapidsteptest-route.test.ts`.                                         |
| `spec.md:81` `POST /sensorUpdates` records recent device activity keyed by device ID                       | PASS   | Storage and route behavior are covered in `src/__tests__/regression/device-status-routes.test.ts`.                                |
| `spec.md:82` `GET /devices/updates/recent?seconds=N` returns only devices inside the requested time window | PASS   | Window filtering remains covered in `src/__tests__/regression/device-status-routes.test.ts`.                                      |
| `spec.md:83` Missing or invalid `seconds` uses a safe default window                                       | PASS   | Invalid `seconds` and omitted `seconds` fallback are now both covered in `src/__tests__/regression/device-status-routes.test.ts`. |

## Commands Run In This Re-Check

| Command                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Result                                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `./node_modules/.bin/vitest run src/__tests__/regression/rapidsteptest-route.test.ts src/__tests__/regression/device-status-routes.test.ts emulator/rapid-step-payload.test.js emulator/daemon.test.js emulator/cli.test.js emulator/client.test.js`                                                                                                                                                                                                                                                                                            | PASS, `6` files and `21` tests passed. |
| `./node_modules/.bin/biome check src/__tests__/regression/rapidsteptest-route.test.ts src/__tests__/regression/device-status-routes.test.ts emulator/src emulator/cli.test.js emulator/client.test.js emulator/rapid-step-payload.test.js emulator/daemon.test.js emulator/package.json emulator/README.md src/app/rapidsteptest/route.ts src/app/sensorUpdates/route.ts src/app/devices/updates/recent/route.ts src/utils/device-status-store.ts .specs/features/stedi-device-emulator/spec.md .specs/features/stedi-device-emulator/tasks.md` | PASS.                                  |

## Retained Prior Evidence

| Evidence                                                                                                                                            | Status                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Docker image build for `emulator/Dockerfile`                                                                                                        | Previously passed; not re-run in this pass because the latest changes were test/lint-only. |
| In-container CLI smoke for `status`, `set-device-id`, `set customer`, `set session-token`, `on`, and final `status` showing `heartbeatActive: true` | Previously passed; retained.                                                               |
| External probe to `https://stedi-voice.vercel.app/devices/updates/recent?seconds=15`                                                                | Previously returned `404`; retained as a deployment-state verification gap.                |

## Remaining Gaps

1. Deployment-state gap: the public recent-device endpoint probe at `https://stedi-voice.vercel.app/devices/updates/recent?seconds=15` previously returned `404`, so public deployed visibility is still
   not verified from this repo pass.
2. Excluded unrelated blocker: `next build` remains blocked by `src/app/birthdateverify/[phone]/route.ts`, which is outside this feature scope.

## Final Assessment

Repo-local feature verification is complete and passes.

The STEDI device emulator feature should now be considered `PASS` for implementation and feature-scoped regression coverage in this repository. The only unresolved item is an external deployment-state
verification gap for the public `devices/updates/recent` endpoint.
