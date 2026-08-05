# STEDI Device Emulator Specification

## Problem Statement

Development currently depends on a physical STEDI device. The team needs a Dockerized emulator that can run multiple isolated instances, simulate device online/offline state, and submit randomized
rapid step tests through the deployed app so downstream scoring can be exercised without hardware.

## Goals

- [ ] Enable multiple emulator containers to operate independently with distinct device and customer settings.
- [ ] Allow developers to turn a device on or off and observe recent device activity from web-facing app endpoints.
- [ ] Allow developers to submit randomized `rapidsteptest` payloads that preserve score-calculation invariants.

## Out of Scope

| Feature                            | Reason                                                                  |
| ---------------------------------- | ----------------------------------------------------------------------- |
| New frontend dashboard UI          | The request is for emulator and API support, not a new screen.          |
| Full raw sensor waveform emulation | V1 only needs online/offline heartbeats and on-demand step submissions. |
| Automatic STEDI login flow         | The user chose manual session token entry through the CLI.              |

---

## Assumptions & Open Questions

| Assumption / decision        | Chosen default                                                                           | Rationale                                                                                               | Confirmed? |
| ---------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------- |
| Heartbeat persistence        | Store recent device heartbeat state in this app via KV/in-memory fallback                | The upstream heartbeat request shape is undocumented, but the app still needs web-visible device status | y          |
| Step submission target       | Forward emulator step submissions through `https://stedi-voice.vercel.app/rapidsteptest` | The user explicitly chose the deployed app as the default target                                        | y          |
| Auth source                  | CLI stores a manual session token per emulator instance                                  | The user explicitly chose manual token entry                                                            | y          |
| Multi-instance control model | Developers operate each instance via `docker exec` inside the target container           | Matches the requested workflow                                                                          | y          |
| Heartbeat interval           | 3 seconds while the emulator is powered on                                               | Explicit user requirement                                                                               | y          |

**Open questions:** none — all current ambiguities are resolved or logged above.

---

## User Stories

### P1: Operate an emulator instance ⭐ MVP

**User Story**: As a developer, I want to configure and power a simulated device on or off inside a container so that I can test device availability without hardware.

**Why P1**: Without independent instance configuration and on/off control, the emulator does not replace the device for development.

**Acceptance Criteria**:

1. WHEN a developer sets a device ID, customer email, and session token through the CLI THEN the emulator SHALL persist that configuration for the current container instance.
2. WHEN a developer runs `stedi-sim on` THEN the emulator SHALL mark the device powered on and send heartbeats every 3 seconds until powered off.
3. WHEN a developer runs `stedi-sim off` THEN the emulator SHALL stop sending heartbeats and report the device as powered off.

**Independent Test**: Configure one container, turn it on, verify recent device activity appears, then turn it off and verify the recent activity expires.

---

### P1: Submit a randomized rapid step test ⭐ MVP

**User Story**: As a developer, I want the emulator to submit realistic randomized rapid step tests so that the real score-calculation flow can be exercised without a physical device.

**Why P1**: Score calculation is the core reason to emulate the device.

**Acceptance Criteria**:

1. WHEN a developer runs `stedi-sim send-steps` with required configuration present THEN the emulator SHALL submit a `rapidsteptest` request through the deployed app.
2. WHEN the request body is generated THEN the emulator SHALL preserve `startTime < stopTime`, `testTime = stopTime - startTime`, and `totalSteps = stepPoints.length`.
3. WHEN the payload is randomized THEN the emulator SHALL keep the configured `customer` and `deviceId` while varying timings and step values within realistic positive bounds.
4. WHEN required configuration is missing THEN the emulator SHALL fail with a clear CLI error and SHALL NOT send the request.

**Independent Test**: Configure one container and verify repeated `send-steps` invocations produce successful submissions with differing randomized values.

---

### P1: Expose app-side device integration ⭐ MVP

**User Story**: As a developer, I want app endpoints that receive emulator heartbeats and forward rapid step tests correctly so that existing web and API flows can interact with the emulator.

**Why P1**: The emulator is only useful if the app can receive the simulated device signals and still reach upstream scoring.

**Acceptance Criteria**:

1. WHEN the app receives `POST /rapidsteptest` THEN it SHALL forward the request upstream and preserve the upstream success behavior expected by existing tests.
2. WHEN the app receives `POST /sensorUpdates` from the emulator THEN it SHALL record recent device activity keyed by device ID.
3. WHEN the app receives `GET /devices/updates/recent?seconds=N` THEN it SHALL return device activity limited to the requested time window.
4. WHEN recent-device queries omit `seconds` or provide an invalid value THEN the app SHALL use a safe default window.

**Independent Test**: Route-handler tests prove forwarding and recent-device lookups using mocked helpers and in-memory fallback state.

---

## Edge Cases

- WHEN two containers use different device IDs THEN the system SHALL keep their state isolated.
- WHEN `stedi-sim on` is run repeatedly THEN the emulator SHALL keep a single heartbeat loop active.
- WHEN a device has not sent a heartbeat within the requested recent window THEN the app SHALL exclude it from the recent-device response.
- WHEN the upstream `rapidsteptest` call fails THEN the CLI SHALL surface the failure status and response body.

## Requirement Traceability

| Requirement ID | Story                                   | Phase    | Status   |
| -------------- | --------------------------------------- | -------- | -------- |
| EMU-01         | P1: Operate an emulator instance        | Verified | Complete |
| EMU-02         | P1: Operate an emulator instance        | Verified | Complete |
| EMU-03         | P1: Submit a randomized rapid step test | Verified | Complete |
| EMU-04         | P1: Submit a randomized rapid step test | Verified | Complete |
| EMU-05         | P1: Expose app-side device integration  | Verified | Complete |
| EMU-06         | P1: Expose app-side device integration  | Verified | Complete |

**Coverage:** 6 total, 6 verified, 0 pending.

## Success Criteria

- [ ] Two emulator containers can be configured independently and do not overwrite each other's state.
- [ ] A powered-on emulator instance produces visible recent-device activity through app endpoints within 3 seconds.
- [ ] `send-steps` submits a successful randomized payload through the deployed app and preserves scoring invariants.
