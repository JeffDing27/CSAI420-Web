# Assignment 1.7 - STEDI Pass-Through API

This assignment is for CSAI 420 Week 1.

The goal is to create a simple Next.js pass-through API that forwards requests to the old STEDI development API.

Upstream API:
https://dev.stedi.me

Use pnpm.

Required public endpoints:
- POST /user
- POST /login
- POST /customer
- POST /rapidsteptest
- GET /riskscore/[email]

Because the assignment expects routes without /api, create route handlers directly under src/app:
- src/app/user/route.ts
- src/app/login/route.ts
- src/app/customer/route.ts
- src/app/rapidsteptest/route.ts
- src/app/riskscore/[email]/route.ts

Each endpoint should:
- Forward the request to the matching endpoint at https://dev.stedi.me
- Preserve the JSON body
- Preserve the suresteps.session.token header when present
- Return the upstream status code
- Return JSON if upstream returns JSON
- Return text if upstream returns text

Use process.env.STEDI_API_BASE_URL || "https://dev.stedi.me".

Do not put API_URL as https://dev.stedi.me. API_URL is for the deployed Vercel URL of this new API.
