# Backend Status Report

## 1. Current Repo Structure
The repository is built using the **Next.js (App Router)** framework (version 16.2.10, React 19) and written in **TypeScript**.
The project structure follows Next.js App Router conventions:
- `src/app/`: Contains the directories for the API routes. Each folder maps to a specific API endpoint path, containing a `route.ts` file.
- `src/utils/`: Contains utility functions, notably:
  - `pass-through.ts`: Handles proxying API requests to the STEDI API backend.
  - `consent-store.ts`: Handles connection to Vercel KV for persistent storage.

## 2. Current Endpoints Definition
Routes are defined using Next.js Route Handlers. Each route is defined in a `route.ts` file inside its corresponding path directory (e.g., `src/app/user/route.ts` defines the `/user` endpoint).
Dynamic routes are handled using bracket syntax (e.g., `src/app/riskscore/[email]/route.ts` maps to `/riskscore/:email`).
Most routes use the `forwardRequest` function to proxy requests directly to the STEDI API rather than containing local business logic.

## 3. Current Database Setup
The repository employs a hybrid approach:
- **Pass-through / Proxy**: For most STEDI operations (users, login, risk score), there is no local database. The repo acts as a backend-for-frontend (BFF) proxy, simply forwarding requests to the STEDI Dev server.
- **Vercel KV (Redis)**: For Consent operations (`/consent` and `/consentedClinicians`), the app uses Vercel KV via a REST API. It includes an in-memory Map fallback for local development when Vercel KV environment variables are not present.

## 4. Environment Variables
- `STEDI_API_BASE_URL`: Base URL for the STEDI backend (defaults to `https://dev.stedi.me` if not set).
- `KV_REST_API_URL`: URL for Vercel KV (Redis).
- `KV_REST_API_TOKEN`: Authentication token for Vercel KV (Redis).

## 5. Deployment Notes
The repository deploys to Vercel as a standard Next.js application. Vercel automatically detects the Next.js App Router structure and handles building and provisioning the API routes as serverless functions. Environment variables must be configured in the Vercel project settings for the database (KV) and STEDI proxy to work in production.

## 6. Current Endpoints
The following required STEDI endpoints already exist:
**Week 1:**
- `POST /user`
- `POST /login`
- `POST /customer`
- `POST /rapidsteptest`
- `GET /riskscore/:email`

**Week 2:**
- `PATCH /consent/:customer`
- `GET /consent/:customer`
- `PATCH /consentedClinicians/:customer`
- `GET /consentedClinicians/:customer`

## 7. Missing Endpoints
The following required STEDI endpoints are missing from the repository:
**Week 3:**
- `POST /clinicianAccessRequest`
- `GET /clinicianAccessRequests/:customer`
- `DELETE /clinicianAccessRequest`

**Week 4:**
- `POST /escalate-question`

**Week 5:**
- `POST /user/chat-assisted`
- `POST /chat/continue-session`
- `POST /escalate-registration`

## 8. Risks
- **Data Persistence in Local Dev**: Local development without KV environment variables falls back to an in-memory Map. This means consent data is ephemeral and will be lost every time the Next.js dev server restarts.
- **Error Handling**: The pass-through utility blindly forwards upstream errors (with a specific workaround for 500 errors on `/customer`). If the STEDI dev server goes down, the endpoints will fail and return generic 500s.
- **Header Forwarding Issues**: The `pass-through.ts` file manually maps certain headers. If future endpoints require new custom headers, the pass-through logic will need to be updated.

## 9. Recommended Next Step
- **Implement Week 3 Endpoints**: Begin by implementing `POST /clinicianAccessRequest`, `GET /clinicianAccessRequests/:customer`, and `DELETE /clinicianAccessRequest`. 
  - If they should be forwarded to the STEDI API, they can easily be added using the `forwardRequest` wrapper.
  - If they require local database logic (similar to consent), they will need to be wired up with `Vercel KV` in `src/utils`.
