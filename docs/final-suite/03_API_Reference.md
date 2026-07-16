# 3. API Reference

## Endpoints
- `POST /escalate-question`: Creates a new question escalation.
- `POST /user/chat-assisted`: Finalizes the interactive registration.
- `POST /chat/continue-session`: Conversational AI endpoint for data gathering.
- `GET /escalations`: Retrieves all active escalations for moderators.
- `PATCH /escalations/[id]`: Updates the status of an escalation.
- `POST /api/voice/*`: Webhooks for Twilio TwiML Voice responses.
