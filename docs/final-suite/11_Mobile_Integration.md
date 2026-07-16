# 11. Mobile App Integration Guide

## Connecting to Backend
The mobile app relies on `fetch` calls to the local Next.js backend (or deployed API). 

## New Screens Added
- `MobilityCoachScreen`: Gathers unstructured queries from the user and their contact preference, then escalates.
- `ChatRegistrationScreen`: Implements a sequential conversational UI interacting with the `/chat/continue-session` endpoint.
