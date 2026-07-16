# 6. Voice IVR Flow

## Overview
Voice IVR provides an accessible interface for seniors to interact with STEDI without a screen.

## TwiML Webhooks
- `/api/voice/incoming`: Plays the welcome message and asks for a 10-digit phone number.
- `/api/voice/auth`: Validates the phone number format. If successful, prompts the user to speak their question.
- `/api/voice/ask`: Processes the `SpeechResult`. Detects keywords (like "pain" or "dizzy") to trigger immediate human escalation. Otherwise, provides a generic helpful response and loops back.
