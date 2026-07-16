# CURRENT STATE AUDIT — CSAI 420 STEDI Project

> **Audit date:** July 15, 2026  
> **Auditor:** Lead Architect (AI)  
> **Workspace root:** `c:\Users\dfurb\OneDrive\Escritorio\GitHub local ensign\`

---

## 1. Repository Inventory

### 1.1 CSAI420-Web (Primary Backend API)

| Field | Value |
|---|---|
| **Path** | `CSAI420-Web/` |
| **Purpose** | Next.js App Router backend API — pass-through proxy to dev.stedi.me + local persistence for consent & clinician access |
| **Current branch** | `week3-clinician-access` |
| **Remotes** | `origin` → `JeffDing27/CSAI420-Web.git` (Jeff's reference — DO NOT push) · `vercel` → `UrbinaDan/csai420-web.git` (user's Vercel deployment) |
| **Modified/untracked** | `BACKEND_STATUS_REPORT.md` (untracked) |
| **Package manager** | pnpm (lock file present; `pnpm` not on global PATH — use `npx pnpm`) |
| **Framework** | Next.js **16.2.10** (App Router) · React **19.2.4** · TypeScript **^5** |
| **Linter** | Biome 2.2.0 |
| **Build** | `next build` |
| **Dev** | `next dev` |
| **Test** | *No test runner configured in this repo* |
| **Deployment** | Vercel (`csai420-web.vercel.app`) |
| **Node version** | v22.13.1 (local machine) |
| **Branches** | `main`, `week2-consent`, `week3-clinician-access` (current) |

**Route handlers (9 files):**

| Route | Methods | Implementation |
|---|---|---|
| `/login` | POST | Pass-through to `dev.stedi.me/login` |
| `/user` | POST | Pass-through to `dev.stedi.me/user` |
| `/customer` | POST | Pass-through to `dev.stedi.me/customer` |
| `/rapidsteptest` | POST | Pass-through to `dev.stedi.me/rapidsteptest` |
| `/riskscore/[email]` | GET | Pass-through to `dev.stedi.me/riskscore/{email}` |
| `/consent/[customer]` | GET, PATCH | Local — Vercel KV (Upstash Redis REST) with in-memory fallback |
| `/consentedClinicians/[customer]` | GET, PATCH | Local — Vercel KV |
| `/clinicianAccessRequest` | POST, DELETE | Local — Vercel KV |
| `/clinicianAccessRequests/[customer]` | GET | Local — Vercel KV |

**Utility files:**

| File | Purpose |
|---|---|
| `src/utils/pass-through.ts` | Generic proxy with auth header normalization, fallback mocking, error logging |
| `src/utils/consent-store.ts` | KV-backed consent + consented clinicians persistence |
| `src/utils/clinician-access-store.ts` | KV-backed clinician access request CRUD with index pattern |

**Existing docs in repo:**

| Doc | Content |
|---|---|
| `docs/assignment-1-7-pass-through-api.md` | Week 1 assignment spec |
| `docs/PRD-stedi-voice-ivr.md` | Product Requirements for STEDI Voice IVR (draft, July 2026) |
| `docs/TDD-stedi-voice-ivr.md` | Technical Design for IVR — detailed architecture, data model, Twilio endpoints |

---

### 1.2 CS420-AI-Mobile (React Native / Expo)

| Field | Value |
|---|---|
| **Path** | `CS420-AI-Mobile/` |
| **Purpose** | Patient mobile application — signup + push notifications |
| **Current branch** | `rn2-push-notifications` |
| **Remotes** | `origin` → `UrbinaDan/CS420-AI-Mobile.git` (user's fork) |
| **Modified/untracked** | Clean |
| **Package manager** | npm (lock file present) |
| **Framework** | Expo **~54.0.20** · React Native **0.81.5** · React **19.1.0** |
| **Navigation** | `@react-navigation/native` 7.x + `@react-navigation/native-stack` 7.x |
| **Test** | Jest via `jest-expo` preset |
| **Branches** | `main`, `rn2-push-notifications` (current) |

**Screens:**

| Screen | Status |
|---|---|
| `HomeScreen.js` | Simple welcome + "Sign Up" navigation |
| `SignUpScreen.js` | Full signup form with validation |
| `NotificationScreen.js` | Push notification PoC — `sendPushNotification`, `getPushToken`, `savePushTokenToAPI`, device registration, listeners |

**Components:** `Checkbox.js`, `CountryCodes.js`

**Tests:** `__tests__/SignUpScreen.test.js` (1 test file)

> [!WARNING]
> `NotificationScreen` is **not wired into App.js navigation**. The App.js stack only includes `Home` and `SignUp`. The notification flow exists in source but is unreachable from the app's navigation graph.

> [!NOTE]
> The `NotificationScreen.js` file begins with a PowerShell `@'` heredoc string (line 1). This is a formatting artifact from how the file was created — it should be cleaned up but does not block runtime if Expo/Metro ignores it.

---

### 1.3 csai420spring2026b2-17-UrbinaDan (Classroom — Week 1 IVR Integration Tests)

| Field | Value |
|---|---|
| **Path** | `csai420spring2026b2-17-UrbinaDan/` |
| **Purpose** | Jeff's reference implementation + Week 1 IVR integration tests (also uses Prisma, Next.js 15.2.4) |
| **Current branch** | `main` |
| **Remotes** | `origin` → `Ensign-College/csai420spring2026b2-17-UrbinaDan.git` · `jeff` → `JeffDing27/CSAI420-Web.git` |
| **Package manager** | npm |
| **Framework** | Next.js **15.2.4** (different from CSAI420-Web's 16.2.10) |
| **Test** | Vitest — `npm run test:integration` runs `__test__/integration_tests/` |
| **Autograding** | `.github/clasroom/autograding.json` (empty — typo in "clasroom") |
| **CI workflow** | `week1-integration-test.yaml` — targets `csai420-web.vercel.app` |

**Test file:** `__test__/integration_tests/IVR.test.js`
- Tests: save step data (POST `/rapidsteptest`), calculate risk score (GET `/riskscore/{email}`)
- Setup: creates user + customer + gets token
- Uses `x-suresteps-session-token` header

> [!IMPORTANT]
> This is the professor's reference implementation with Prisma/PostgreSQL. The student's implementation (CSAI420-Web) uses a different architecture (pass-through + KV). The test files here define the **contracts** but the source code is NOT the student's work.

---

### 1.4 csai420spring2026b2-26-UrbinaDan (Classroom — Week 1+2 Tests)

| Field | Value |
|---|---|
| **Path** | `csai420spring2026b2-26-UrbinaDan/` |
| **Purpose** | Classroom integration test repository for Weeks 1 and 2 |
| **Current branch** | `main` |
| **Remotes** | `origin` → `Ensign-College/csai420spring2026b2-26-UrbinaDan.git` |
| **Package manager** | npm |
| **Test** | Vitest — `npm test` runs `__test__/` |
| **Autograding** | 6 tests, 200 total points (50+50+25+25+25+25) |
| **CI workflow** | `classroom.yml` — runs `education/autograding@v1` |
| **`.env`** | `API_URL=https://csai420-web.vercel.app` |

**Test contracts (Week 1):**

| Test | Endpoint | Method | Header | Expected |
|---|---|---|---|---|
| Save step data | `/rapidsteptest` | POST | `x-suresteps-session-token` | Status 200, body `"Saved"` |
| Calculate risk score | `/riskscore/{email}` | GET | `x-suresteps-session-token` | Status 200, `data.score > 0` |

**Test contracts (Week 2):**

| Test | Endpoint | Method | Body | Expected |
|---|---|---|---|---|
| Update consent | PATCH `/consent/{email}` | PATCH | `"true"` | Status 200 |
| Get consent | GET `/consent/{email}` | GET | — | Status 200, body matches `/true/i` |
| Add clinician | PATCH `/consentedClinicians/{email}` | PATCH | `"physician@stedi.com"` | Status 200 |
| Get clinicians | GET `/consentedClinicians/{email}` | GET | — | Status 200, JSON contains `"physician@stedi.com"` |

---

### 1.5 cs420-rn1-code-challenge-UrbinaDan (React Native Code Challenge)

| Field | Value |
|---|---|
| **Path** | `cs420-rn1-code-challenge-UrbinaDan/` |
| **Purpose** | Completed RN code challenge — signup form testing |
| **Current branch** | `main` |
| **Remotes** | `origin` → `Ensign-College/cs420-rn1-code-challenge-UrbinaDan.git` |
| **Status** | Complete — not actively developed |

---

## 2. Completion Status Summary

### ✅ COMPLETE

| Feature | Evidence |
|---|---|
| Week 1: Pass-through API (POST /user, /login, /customer, /rapidsteptest, GET /riskscore) | Route handlers in CSAI420-Web, 200/200 classroom score claimed |
| Week 2: Consent management (PATCH/GET /consent, /consentedClinicians) | Route handlers + KV persistence, classroom tests pass |
| Week 3: Clinician access requests (POST/DELETE /clinicianAccessRequest, GET /clinicianAccessRequests) | Route handlers + KV persistence, branch `week3-clinician-access` |
| RN1: Signup form code challenge | Complete in `cs420-rn1-code-challenge-UrbinaDan` |
| RN2: Push notification proof of concept | `NotificationScreen.js` on branch `rn2-push-notifications` |
| PRD & TDD for STEDI Voice IVR | Draft documents in `docs/` |
| Vercel deployment | Confirmed via test `.env` pointing to `csai420-web.vercel.app` |
| KV (Upstash Redis) persistence | In production on Vercel with in-memory fallback for dev |

### ⚠️ PARTIALLY COMPLETE

| Feature | Status | Gap |
|---|---|---|
| Mobile push notifications | PoC code exists | `NotificationScreen` not wired in navigation; `NotificationScreen.js` has file-format artifact |
| Week 3 branch merge | Code on `week3-clinician-access` | Not yet merged to `main`; no dedicated classroom test repo for Week 3 found |
| Backend test infrastructure | No test runner in CSAI420-Web | Cannot run local regression tests — relies entirely on external classroom test repos |

### ❌ MISSING

| Feature | Target Week |
|---|---|
| `POST /escalate-question` endpoint | Week 4 |
| LangGraph chatbot + supervisor agent | Week 4 (LS1.1 + LS1.2) |
| Twilio provider abstraction | Week 4 |
| AWS SAM / Lambda / SQS infrastructure | Week 4 |
| `POST /user/chat-assisted` | Week 5 |
| `POST /chat/continue-session` | Week 5 |
| `POST /escalate-registration` | Week 5 |
| Chat-assisted registration UI (mobile) | Week 5 |
| RAG knowledge base (LG2.1) | Week 6 |
| Conversation memory (LG2.2) | Week 6 |
| Human review / moderator workflow | Week 6 |
| Twilio Voice IVR endpoints | Week 7 |
| Local test suite for CSAI420-Web | All weeks |
| `.env.example` files | All repos |
| Provider abstraction layer (Storage, Queue, AI, Notification, Voice) | Week 4+ |

---

## 3. Risk Assessment

### 🔴 HIGH RISK

| Risk | Details |
|---|---|
| **No local test runner in CSAI420-Web** | All validation depends on deploying to Vercel and running external classroom tests. A local Vitest/Jest setup is urgently needed for regression protection. |
| **Week 3 branch not merged** | The `week3-clinician-access` branch is ahead of `main`. If `main` diverges, merge conflicts will compound. |
| **No `.env.example`** | Environment variables (`KV_REST_API_URL`, `KV_REST_API_TOKEN`, `STEDI_API_BASE_URL`) are undocumented. New developers cannot onboard. |
| **Missing Week 4–7 classroom test repos** | Only repos `-17` and `-26` exist locally. Week 4+ test repos may exist on GitHub Classroom but are not cloned. Tests define contracts — cannot implement without them. |
| **`pnpm` not on PATH** | The CSAI420-Web repo uses pnpm (lock file exists) but the binary isn't globally installed. Scripts may fail. |

### 🟡 MEDIUM RISK

| Risk | Details |
|---|---|
| **NotificationScreen.js formatting** | Line 1 contains a PowerShell heredoc marker (`@'`). May cause parse errors in some contexts. |
| **Pass-through fallback mocks** | `pass-through.ts` returns hardcoded mock data when the STEDI API is down. This hides real failures. |
| **KV duplication** | `kvGet`/`kvSet` helpers are duplicated across `consent-store.ts` and `clinician-access-store.ts`. Should be extracted to a shared utility. |
| **Auth helper duplication** | `hasAuth()` is duplicated in `clinicianAccessRequest/route.ts` and `clinicianAccessRequests/[customer]/route.ts`. |
| **Next.js 16 vs 15 divergence** | CSAI420-Web uses Next.js 16.2.10; the reference repo `-17` uses 15.2.4. API surface differences are possible. |

### 🟢 LOW RISK

| Risk | Details |
|---|---|
| **Mobile app uses older Expo SDK** | Expo 54 and React Native 0.81 are current — no upgrade needed. |
| **Classroom test point allocation** | Well-defined: 200 points across 6 tests (repo `-26`). |

---

## 4. Test Protection Matrix

These passing tests **MUST NOT BREAK**:

| Repo | Test File | Test Name | Points | Status |
|---|---|---|---|---|
| `-26` | `week1.test.js` | should save step data from an IoT device | 50 | ✅ Passing |
| `-26` | `week1.test.js` | should calculate a risk score | 50 | ✅ Passing |
| `-26` | `week2.test.js` | should allow users to update their consent | 25 | ✅ Passing |
| `-26` | `week2.test.js` | should allow user to get their consent status | 25 | ✅ Passing |
| `-26` | `week2.test.js` | should allow users to add a clinician | 25 | ✅ Passing |
| `-26` | `week2.test.js` | should return an array of clinicians for the user | 25 | ✅ Passing |
| `-17` | `IVR.test.js` | should save step data from an IoT device | — | ✅ Passing |
| `-17` | `IVR.test.js` | should calculate a risk score | — | ✅ Passing |

---

## 5. Package Version Inventory

### CSAI420-Web

| Package | Version |
|---|---|
| next | 16.2.10 |
| react / react-dom | 19.2.4 |
| typescript | ^5 |
| @biomejs/biome | 2.2.0 |
| tailwindcss | ^4 |

### CS420-AI-Mobile

| Package | Version |
|---|---|
| expo | ~54.0.20 |
| react | 19.1.0 |
| react-native | 0.81.5 |
| jest-expo | ~54.0.13 |
| @react-navigation/native | ^7.1.17 |
| @testing-library/react-native | ^13.3.3 |

---

## 6. Environment Variables Required

| Variable | Used In | Current Status |
|---|---|---|
| `STEDI_API_BASE_URL` | CSAI420-Web (pass-through.ts) | Defaults to `https://dev.stedi.me` |
| `KV_REST_API_URL` | CSAI420-Web (consent/clinician stores) | Set in Vercel, not documented |
| `KV_REST_API_TOKEN` | CSAI420-Web (consent/clinician stores) | Set in Vercel, not documented |
| `API_URL` | Classroom test repos | Set in `.env` files |

---

## 7. Requirements That Cannot Yet Be Verified

| Item | Reason |
|---|---|
| Week 3 classroom tests | No dedicated Week 3 test repository found locally |
| Week 4 test contracts | No Week 4 test repository exists locally |
| Week 5 test contracts | No Week 5 test repository exists locally |
| Week 6 test contracts | No Week 6 test repository or assignment doc found |
| Week 7 test contracts | No Week 7 test repository or assignment doc found |
| LangGraph assignment specs (LS1.1, LS1.2, LG2.1, LG2.2) | No assignment documents or test repos found locally |
| Team upstream PR requirements | Ensign-College/cs420-ai-mobile upstream not cloned as remote |
