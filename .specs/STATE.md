# Project State

## Decisions

- AD-001 active: For the STEDI device emulator feature, device heartbeat status is tracked by this app's own endpoints rather than forwarded to the undocumented upstream `sensorUpdates` contract.
  Reason: the user needs web-visible on/off status during development, while `rapidsteptest` still needs upstream forwarding for score calculation.

## Handoff

- No prior in-flight work recorded.
