This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Mobility Coach Chat API

This API provides context-aware AI coaching regarding exercise and mobility.

### `POST /api/mobility-chat`

#### Authentication
The endpoint requires an authenticated session. Supply your session token in the `x-suresteps-session-token` header (or `Authorization: Bearer <token>`).

#### Request Format
```json
{
  "message": "How can I safely practice standing from a chair?",
  "sessionId": "optional-client-session-id"
}
```

#### Response Format
```json
{
  "sessionId": "the-session-id",
  "message": "AI coach response or safety warning here",
  "safetyLevel": "normal"
}
```
`safetyLevel` can be `"normal"`, `"caution"`, or `"urgent"`.

#### Configuration
- `OPENAI_ENABLED`: Set to `"true"` to enable actual AI responses. Otherwise, a local fallback is used.
- `OPENAI_API_KEY`: Required when `OPENAI_ENABLED` is true.
- `OPENAI_MODEL`: Optional. Defaults to `"gpt-4o-mini"`.

#### Safety Limitations
The mobility coach will automatically intercept messages indicating severe distress (chest pain, falls, etc.) or caution (dizziness, pain) and provide standard safe responses without querying the AI model. It does not replace a healthcare professional.
