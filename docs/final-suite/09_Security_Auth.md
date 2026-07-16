# 9. Security & Authentication

## Session Tokens
The STEDI platform utilizes custom token headers (`suresteps.session.token`). All protected endpoints validate the presence of this token before executing logic. 

## Data Privacy
- Escalation data containing PII (Phone numbers) is only accessible by authenticated moderators.
- Twilio interactions are transient; speech results are processed and discarded, minimizing sensitive data footprint.
