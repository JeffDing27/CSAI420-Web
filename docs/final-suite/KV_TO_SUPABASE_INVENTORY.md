# KV to Supabase Inventory

This document tracks all identified KV/Upstash storage usage across `CSAI420-Web` and maps them to the future Supabase PostgreSQL schema.

## 1. User Records
- **KV Key Pattern**: `user:<normalizedEmail>`
- **Source File**: `src/app/user/route.ts`, `src/app/login/route.ts`
- **Value Shape**: User object (firstName, lastName, phone, email, password, salt)
- **Sensitive Fields**: `password`, `salt` (to be replaced by `passwordHash`, `passwordSalt`)
- **Write Route**: `POST /user`
- **Read Route**: `POST /login`
- **Delete Route**: None currently implemented
- **Expected Prisma Model**: `User`
- **Migration Transformation**: Map fields, separate passwords, normalize email and phone.
- **Duplicate Policy**: Keep first, skip duplicates, report conflicts safely.

## 2. Escalations
- **KV Key Pattern**: `escalation:<escalationId>`
- **Source File**: `src/utils/escalation-store.ts`
- **Value Shape**: `Escalation` object (escalationId, phoneNumber, originalQuestion, etc.)
- **Sensitive Fields**: None highly sensitive, PII in `phoneNumber`
- **Write Route**: `POST /escalate-question`, `POST /escalate-registration`
- **Read Route**: `GET /escalations/[id]`
- **Delete Route**: N/A
- **Expected Prisma Model**: `Escalation`
- **Migration Transformation**: Direct field mapping.
- **Duplicate Policy**: Update on conflict.

## 3. Escalation Index
- **KV Key Pattern**: `escalationIndex`
- **Source File**: `src/utils/escalation-store.ts`
- **Value Shape**: `string[]` array of escalationIds
- **Expected Prisma Model**: N/A (Relational query on `Escalation` replaces this)

## 4. Consents
- **KV Key Pattern**: `consent:<normalizedCustomerEmail>`
- **Source File**: `src/utils/consent-store.ts`
- **Value Shape**: String `"true"` or `"false"`
- **Sensitive Fields**: None
- **Write Route**: `POST /consent/[customer]`
- **Read Route**: `GET /consent/[customer]`
- **Expected Prisma Model**: `Consent`
- **Migration Transformation**: Create `Consent` record with status derived from boolean.
- **Duplicate Policy**: Update on conflict.

## 5. Consented Clinicians
- **KV Key Pattern**: `clinicians:<normalizedCustomerEmail>`
- **Source File**: `src/utils/consent-store.ts`
- **Value Shape**: Array of `ClinicianConsent` objects
- **Sensitive Fields**: None
- **Write Route**: `POST /consentedClinicians/[customer]`
- **Read Route**: `GET /consentedClinicians/[customer]`
- **Expected Prisma Model**: `ConsentedClinician`
- **Migration Transformation**: Map each array item to a row.
- **Duplicate Policy**: Update on conflict.

## 6. Clinician Access Requests
- **KV Key Pattern**: `clinicianAccessRequest:<normalizedEmail>:<normalizedClinician>`
- **Source File**: `src/utils/clinician-access-store.ts`
- **Value Shape**: `ClinicianAccessRequest` object
- **Sensitive Fields**: None
- **Write Route**: `POST /clinicianAccessRequests/[customer]`
- **Read Route**: `GET /clinicianAccessRequests/[customer]`
- **Delete Route**: `DELETE /clinicianAccessRequests/[customer]`
- **Expected Prisma Model**: `ClinicianAccessRequest`
- **Migration Transformation**: Direct field mapping.
- **Duplicate Policy**: Update on conflict.

## 7. Clinician Access Request Index
- **KV Key Pattern**: `clinicianAccessRequestIndex:<normalizedEmail>`
- **Source File**: `src/utils/clinician-access-store.ts`
- **Value Shape**: `string[]` array of normalized clinicians
- **Expected Prisma Model**: N/A (Relational query replaces this)

## 8. Chat Sessions
- **KV Key Pattern**: `chat:<sessionId>`
- **Source File**: `src/utils/chat-session-store.ts`
- **Value Shape**: `ChatSession` object
- **Expected Prisma Model**: `ChatSession`
- **Migration Transformation**: Map context to JSON, map steps.
- **Duplicate Policy**: Update on conflict.

---
*Note: Rapid Step Tests, Push Tokens, and other models currently hitting external APIs will be brought into Supabase as requested.*
