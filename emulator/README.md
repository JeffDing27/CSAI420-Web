# STEDI Device Emulator

This emulator replaces the physical STEDI device during development by running one simulated device per Docker container.

## What it does

- Persists per-container device configuration.
- Starts and stops a 3-second heartbeat loop with `stedi-sim on` and `stedi-sim off`.
- Sends randomized `rapidsteptest` payloads through the base URL configured in `emulator/.env` with `stedi-sim send-steps`.
- Authenticates requests directly using device credentials instead of patient session tokens.
- Exposes status through the app routes added in this repo: `POST /sensorUpdates` and `GET /devices/updates/recent`.

## Base URL configuration

The emulator loads `emulator/.env` automatically. Set `STEDI_SIM_TARGET_BASE_URL` there to choose which app instance receives heartbeats and step submissions.

Default local development value:

```bash
STEDI_SIM_TARGET_BASE_URL=http://localhost:3000
```

When the emulator runs inside Docker, `localhost` and `127.0.0.1` are automatically remapped to `host.docker.internal`, so the same default works against a Next.js server running on your macOS host.

## Device Provisioning Workflow

1. Start backend.
2. Configure `DEVICE_CLAIM_PEPPER`.
3. Configure `DEVICE_PROVISIONING_KEY` on the backend.
4. Configure matching `STEDI_SIM_PROVISIONING_KEY` only in the emulator development environment (e.g. `emulator/.env`).
5. Run `stedi-sim provision STEDI-007`.
6. Copy the displayed claim code.
7. Claim the device through `POST /devices/claim` using a patient session, or later through the Twilio IVR service.
8. Run `stedi-sim on`.
9. Run `stedi-sim send-steps`.
10. Confirm the data was stored under the assigned patient.

Note:
- The provisioning key is an administrative/development secret.
- The patient never receives the device token.
- The device does not need a mobile app after it has been assigned.

## Build

```bash
docker build -f emulator/Dockerfile -t stedi-sim .
```

## Run one instance

```bash
docker run -d --name stedi-sim-007 stedi-sim
docker exec -it stedi-sim-007 stedi-sim provision STEDI-007
# Save the printed claimCode
docker exec -it stedi-sim-007 stedi-sim on
docker exec -it stedi-sim-007 stedi-sim status
docker exec -it stedi-sim-007 stedi-sim send-steps
docker exec -it stedi-sim-007 stedi-sim off
```

## Supported commands

```bash
stedi-sim set-device-id <deviceId>
stedi-sim set device-token <token>
stedi-sim set target-base-url <url>
stedi-sim provision <deviceId>
stedi-sim on
stedi-sim off
stedi-sim status
stedi-sim send-steps
```

## Notes

- `send-steps` requires `deviceId` and `deviceToken`.
- `targetBaseUrl` defaults from `emulator/.env`, and `stedi-sim set target-base-url <url>` still lets you override it per instance.
- Inside Docker, loopback targets such as `http://localhost:3000` are automatically rewritten to the host alias so the container can reach a dev server running on the host.
- State is stored inside the container at `/app/emulator/.stedi-sim/state.json` by default.
