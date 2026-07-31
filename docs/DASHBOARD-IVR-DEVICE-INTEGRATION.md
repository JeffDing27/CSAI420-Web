# Dashboard, IVR, and Device Integration

This document outlines the current state of integration between the Patient Dashboard, the Guided IVR system, and the Authenticated Device flows.

## 1. Patient Dashboard Flow

- **Path:** `/dashboard`
- **Current State:** Renders static demonstration data for the patient (John Smith). It does not dynamically load the logged-in patient's risk scores or recent tests yet.
- **Authentication:** Currently mostly static. The `/user/profile` API uses standard Bearer token or custom `suresteps.session.token` headers to retrieve safe profile information, returning 401 when unauthenticated.

## 2. Authenticated Device Provisioning and Assignment Flow

- **APIs Involved:**
  - `POST /sensorUpdates`
  - `POST /rapidsteptest`
- **Authentication Mechanism:**
  - Uses `x-stedi-device-id` and `x-stedi-device-token` headers.
  - Authenticates the device using the `Device` and `DeviceAssignment` models.
- **Behavior:** The emulator behaves as a provisioned hardware device. It associates step data and RapidStep tests with the currently assigned patient via `userId` derived from the active `DeviceAssignment`.

## 3. Guided IVR Flow

- **APIs Involved:**
  - `POST /api/voice-auth`
  - `POST /api/voice/sensor`
- **Authentication Mechanism:**
  - Standard IVR webhooks are authenticated via Twilio Signature Validation (if `IVR_VALIDATE_TWILIO_SIGNATURE` is enabled).
  - The IVR Sensor API (`/api/voice/sensor`) is authenticated using a shared webhook secret via the `x-ivr-sensor-secret` header.
- **Behavior:**
  - Provides an automated voice interface to guide a user through name confirmation, DOB validation, safety instructions, and a two-set RapidStep test.
  - Maintains state via the `VoiceSession` model, keyed by the Twilio `CallSid`.

## 4. Current Database Models Involved

- **User:** Contains core profile info. Related to both `deviceAssignments` and `voiceSessions`.
- **Device & DeviceAssignment:** Manages device provisioning and patient assignment for the hardware emulator flow.
- **RapidStepTest:** Stores completed tests. Now capable of storing the `deviceRecordId` for devices.
- **VoiceSession:** Tracks the state machine for the active IVR call (`VoiceStage`).

## 5. Current Limitation

- **No Bridge Yet:** The hardware emulator is *not* currently connected to an active `VoiceSession` `CallSid`.
- The emulator authenticates independently as a hardware device. The IVR sensor webhook advances the VoiceSession independently by `CallSid`.

## 6. Recommended Future Bridge

To fully integrate these systems, a bridge must be implemented that associates an authenticated `Device` (and its active assignment) with an active `VoiceSession` `CallSid`. This might involve the patient typing a code on the phone or the system matching the active device assignment with the caller's phone number.

> [!WARNING]
> ## 7. Migration Warning
> The repository currently has two migration directories:
> - `prisma/migrations/20260728120000_expand_voice_ivr`
> - `prisma/migrations/20260730120000_init_device_domain`
>
> **Do not apply these two migrations to a shared, preview, or production database without reviewing the migration history.** Because they were developed in parallel, applying them to a database that already has one might cause issues due to timestamp ordering. A manual migration history review is required before deploying.

## Local Test Commands

- **Unit/Integration Tests:** `npx pnpm@10 exec vitest run`
- **Dashboard Tests:** `npx pnpm@10 exec vitest run src/__tests__/profile-route.test.ts`
- **IVR Simulator:** (Only run against a disposable local DB) `npx tsx scripts/test-ivr.ts`
