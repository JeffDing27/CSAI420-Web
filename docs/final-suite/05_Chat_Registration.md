# 5. Chat-Assisted Registration Flow

## Purpose
To simplify the sign-up process for senior users who may find complex web forms difficult to navigate.

## Flow
1. User clicks "Need Help?" on the mobile app sign-up screen.
2. A new `sessionId` is generated.
3. The AI prompts the user for their first name, last name, email, password, phone, and DOB sequentially.
4. If the user expresses confusion, the system can call `POST /escalate-registration` to bring in a human.
5. Upon confirmation, the backend submits the payload to the STEDI user creation API.
