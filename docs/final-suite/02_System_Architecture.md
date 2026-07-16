# 2. System Architecture

## Architecture Diagram
The system is composed of three main components:
1. **Frontend (Next.js):** The web dashboard and moderator interface.
2. **Mobile App (React Native):** User-facing app for fall risk tests and chat registration.
3. **Backend API (Next.js App Router):** Serverless API endpoints for AI routing.

## External Services
- **Vercel KV:** In-memory caching, clinician access tracking, chat sessions, and escalations.
- **AWS SQS:** Message queuing for the human review escalation workflow.
- **Twilio:** SMS notifications and Voice IVR.
- **OpenAI / LangChain:** Large Language Models and stateful graph agents (LangGraph).
