# STEDI IVR implementation

The IVR entry point is `POST /api/voice-auth`. Twilio sends the call SID,
speech results, and keypad digits as form-encoded webhook fields.

## Implemented call flow

1. Capture the caller's spoken first and last name and ask for confirmation.
2. Capture date of birth by keypad in `MMDDYYYY` format.
3. Match the normalized name and DOB to a local user, with a three-attempt limit.
4. Read the safety and device setup checklist.
5. Confirm sensor readiness and ask for the dominant foot.
6. Count 30 sensor steps for set one.
7. Enforce a three-minute rest.
8. Count 30 sensor steps for set two.
9. Save the rapid-step test and announce the score returned by the existing
   risk-score service.
10. Remind the caller to unplug and safely store the device.

During an active set, keypad controls are `1` to repeat instructions, `2` to
pause, `3` to restart the current set, and `0` to stop.

## Sensor webhook

The device integration posts JSON to `POST /api/voice/sensor`:

```json
{
  "callSid": "CA123",
  "event": "step",
  "steps": 1
}
```

`steps` is an increment from 1 through 30. To report connectivity without a
step, send `{"callSid":"CA123","event":"connected"}`. In production, set
`IVR_SENSOR_WEBHOOK_SECRET` and send it in the `x-ivr-sensor-secret` header.

## Configuration

- `IVR_SENSOR_WEBHOOK_SECRET`: authenticates sensor events in production.
- `IVR_VALIDATE_TWILIO_SIGNATURE=true`: enables Twilio webhook validation.
- `TWILIO_AUTH_TOKEN`: required when Twilio signature validation is enabled.
- `TWILIO_WEBHOOK_URL`: optional public webhook URL used for signature checks.
- `IVR_REST_SECONDS`: defaults to `180`; lower values are useful in tests.
- `USE_MOCK_TEST_DEVICE=true`: accepts Test User / `01011990` locally.
- `IVR_TEST_SCORE`: optional score returned only in test/mock mode.

Apply the Prisma migration before using the expanded flow against a database.
The local simulator is `scripts/test-ivr.ts`.
