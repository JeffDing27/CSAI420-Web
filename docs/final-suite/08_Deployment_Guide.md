# 8. Deployment Guide

## Frontend & API
Deployed seamlessly to Vercel via GitHub integration. Ensure the following environment variables are set:
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `OPENAI_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`

## AWS Serverless components
1. Install AWS SAM CLI.
2. Run `sam build` in the project root.
3. Run `sam deploy --guided` to deploy the SQS queue and lambda processor.
