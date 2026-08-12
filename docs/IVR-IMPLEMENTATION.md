# STEDI IVR implementation

The IVR entry point is `POST /api/voice-auth`. Twilio sends the call SID,
speech results, and keypad digits as form-encoded webhook fields.

## Implemented call flow

1. Ask the caller to enter the registered ten-digit phone number.
2. Ask the caller to enter the birth date in `MMDDYYYY` format.
3. Verify phone and birth date through legacy `/birthdateverify/{phone}`.
4. Resolve the matching STEDI account from the returned caller-scoped token.
5. Keep that token only for the active voice session.
6. Read the safety and device setup checklist.
7. Confirm sensor readiness and ask for the dominant foot.
8. Count 30 sensor steps for set one.
9. Enforce a three-minute rest.
10. Count 30 sensor steps for set two.
11. Submit the real device measurements to legacy `/rapidsteptest` with the
    caller's token, then fetch `/riskscore/{email}` with the same token.
12. Mirror the completed test and returned score to the local database.
13. Clear the caller-scoped token and remind the caller to store the device.

During an active set, keypad controls are `1` to repeat instructions, `2` to
pause, `3` to restart the current set, and `0` to stop.

## Sensor webhook

The device integration posts JSON to `POST /api/voice/sensor`:

```json
{
  "callSid": "CA123",
  "event": "step",
  "steps": 1,
  "deviceId": "007",
  "stepPoints": [172]
}
```

`steps` is an increment from 1 through 30. In production, `stepPoints` must
contain one positive millisecond measurement for every reported step; these
values and `deviceId` are forwarded unchanged to the legacy STEDI API. To
report connectivity without a step, send
`{"callSid":"CA123","event":"connected","deviceId":"007"}`. In production, set
`IVR_SENSOR_WEBHOOK_SECRET` and send it in the `x-ivr-sensor-secret` header.

## Configuration

- `IVR_SENSOR_WEBHOOK_SECRET`: authenticates sensor events in production.
- `IVR_VALIDATE_TWILIO_SIGNATURE=true` or
  `TWILIO_VALIDATE_SIGNATURES=true`: enables Twilio webhook validation.
- `TWILIO_AUTH_TOKEN`: required when Twilio signature validation is enabled.
- `TWILIO_WEBHOOK_URL`: optional public webhook URL used for signature checks.
- `IVR_REST_SECONDS`: defaults to `180`; lower values are useful in tests.
- `USE_MOCK_TEST_DEVICE` is ignored by the IVR authentication flow. Mock
  authentication is test-only; local, preview, and production calls always
  require phone and birthdate verification.
- `IVR_TEST_SCORE`: optional score returned only in test/mock mode.
- `STEDI_API_BASE_URL`: defaults to `https://dev.stedi.me`.

Apply the Prisma migrations before using the expanded flow against a database.
Production never uses `IVR_TEST_SCORE` or a database fallback for scoring: an
upstream authentication, submission, or score failure ends the call without
announcing a fabricated result.
The local simulator is `scripts/test-ivr.ts`.
