# STEDI Device Emulator

This emulator replaces the physical STEDI device during development by running one simulated device per Docker container.

## What it does

- Persists per-container device configuration.
- Starts and stops a 3-second heartbeat loop with `stedi-sim on` and `stedi-sim off`.
- Sends randomized `rapidsteptest` payloads through the base URL configured in `emulator/.env` with `stedi-sim send-steps`.
- Exposes status through the app routes added in this repo: `POST /sensorUpdates` and `GET /devices/updates/recent`.

## Base URL configuration

The emulator loads `emulator/.env` automatically. Set `STEDI_SIM_TARGET_BASE_URL` there to choose which app instance receives heartbeats and step submissions.

Default local development value:

```bash
STEDI_SIM_TARGET_BASE_URL=http://localhost:3000
```

When the emulator runs inside Docker, `localhost` and `127.0.0.1` are automatically remapped to `host.docker.internal`, so the same default works against a Next.js server running on your macOS host.

If you prefer to make the Docker target explicit, change it to:

```bash
STEDI_SIM_TARGET_BASE_URL=http://host.docker.internal:3000
```

If your Docker runtime uses a different host alias, set this too:

```bash
STEDI_SIM_HOST_ALIAS=host.docker.internal
```

## Build

```bash
docker build -f emulator/Dockerfile -t stedi-sim .
```

## Run one instance

```bash
docker run -d --name stedi-sim-007 stedi-sim
docker exec -it stedi-sim-007 stedi-sim set-device-id 007
docker exec -it stedi-sim-007 stedi-sim set customer user@test.com
docker exec -it stedi-sim-007 stedi-sim set session-token your-session-token
docker exec -it stedi-sim-007 stedi-sim on
docker exec -it stedi-sim-007 stedi-sim status
docker exec -it stedi-sim-007 stedi-sim send-steps
docker exec -it stedi-sim-007 stedi-sim off
```

## Run multiple instances

```bash
docker run -d --name stedi-sim-007 stedi-sim
docker run -d --name stedi-sim-008 stedi-sim

docker exec -it stedi-sim-007 stedi-sim set-device-id 007
docker exec -it stedi-sim-007 stedi-sim set customer user007@test.com
docker exec -it stedi-sim-007 stedi-sim set session-token token-007
docker exec -it stedi-sim-007 stedi-sim on

docker exec -it stedi-sim-008 stedi-sim set-device-id 008
docker exec -it stedi-sim-008 stedi-sim set customer user008@test.com
docker exec -it stedi-sim-008 stedi-sim set session-token token-008
docker exec -it stedi-sim-008 stedi-sim off
```

Only the powered-on container will continue posting heartbeats every 3 seconds.

## Supported commands

```bash
stedi-sim set-device-id <deviceId>
stedi-sim set customer <email>
stedi-sim set session-token <token>
stedi-sim set target-base-url <url>
stedi-sim on
stedi-sim off
stedi-sim status
stedi-sim send-steps
```

## Notes

- `send-steps` requires `deviceId`, `customer`, and `sessionToken`.
- `targetBaseUrl` defaults from `emulator/.env`, and `stedi-sim set target-base-url <url>` still lets you override it per instance.
- Inside Docker, loopback targets such as `http://localhost:3000` are automatically rewritten to the host alias so the container can reach a dev server running on the host.
- Heartbeats are app-local for development status tracking; `rapidsteptest` still forwards upstream for scoring.
- State is stored inside the container at `/app/emulator/.stedi-sim/state.json` by default.
