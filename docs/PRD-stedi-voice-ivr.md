# Product Requirements Document: STEDI Voice (IVR)


|                  |                                                             |
| ---------------- | ----------------------------------------------------------- |
| **Product**      | STEDI Voice — Hands-Free Balance & Mobility Testing via IVR |
| **Status**       | Draft                                                       |
| **Source**       | PRFAQ 1.4 — IVR Prototype                                   |
| **Last updated** | July 2, 2026                                                |


---

## 1. Overview

STEDI Voice is a hands-free automated phone assistant (IVR) that allows users to complete their balance and mobility exercise by calling a designated phone number. The system authenticates the caller, verbally guides them through the balance test, collects sensor data from their IoT device, processes it through the existing cloud API, and announces the resulting balance index score — all within a single phone call, with no smartphone app required.

## 2. Problem Statement

Many STEDI users struggle with mobile app interactions due to physical limitations, technical difficulties, or personal preference. The current flow requires users to:

1. Authenticate via SMS,
2. Navigate a mobile app, and
3. Manually initiate the exercise.

This creates significant friction, particularly for elderly users and those who prefer or require hands-free interaction. The app dependency limits both accessibility and adoption.

## 3. Goals & Objectives

- **Accessibility:** Eliminate reliance on smartphone apps, making balance testing inclusive for users with physical or technical limitations.
- **Convenience:** Enable users to complete the full exercise hands-free using only a phone call.
- **Scalability:** Reduce dependence on the mobile app by leveraging widely available voice/telephony technology.
- **Parity:** Produce balance index scores consistent with results from the mobile app flow.

### Non-Goals (Out of Scope)

- Replacing or deprecating the mobile app.
- Supporting exercises other than the balance and mobility test.
- Smart-speaker integrations (Alexa, Google Home) — future consideration.
- Multilingual support in the initial prototype.
- Voice-recognition (speaker identification) based authentication.

## 4. Target Users

- **Primary:** Elderly users and users with physical limitations who find smartphone interactions difficult.
- **Secondary:** Users experiencing technical difficulties with the app (device compatibility, connectivity, updates).
- **Tertiary:** Users who simply prefer hands-free, voice-first interactions.

## 5. User Journey

1. **Call initiation:** The user calls the designated customer service phone number and is greeted by an automated voice assistant.
2. **Authentication:** The IVR verifies the user's identity via SMS-based two-factor authentication (2FA), supplemented by asking for the patient's name and date of birth.
3. **Guided exercise:** The IVR delivers step-by-step verbal instructions for the balance test while sensor data is collected from the user's IoT device.
4. **Data transmission & analysis:** Collected step data is transmitted to the cloud API for real-time analysis.
5. **Score announcement:** The IVR retrieves the balance index score from the cloud API and announces it to the user, providing personalized feedback based on the score where appropriate.

## 6. Functional Requirements

### FR-1: Call Handling

- FR-1.1: The system shall answer inbound calls to a designated phone number with an automated voice greeting.
- FR-1.2: The system shall guide callers through the session using clear, paced verbal prompts suitable for elderly users.
- FR-1.3: The system shall gracefully handle call drops, allowing users to call back and resume or restart.

### FR-2: Authentication

- FR-2.1: The system shall authenticate callers via SMS-based 2FA (one-time code read back or entered via keypad).
- FR-2.2: In addition to 2FA, the system shall ask the caller for the patient's name and date of birth to verify identity.
- FR-2.3: Authentication shall complete entirely within the voice call — no graphical interface required.
- FR-2.4: The system shall limit failed authentication attempts and fail securely.

### FR-3: Guided Exercise

- FR-3.1: The IVR shall deliver step-by-step verbal instructions for completing the balance test.
- FR-3.2: The IVR shall trigger sensor data collection on the user's IoT device without requiring the mobile app.
- FR-3.3: Before starting the exercise, the IVR shall verify the phone-to-sensor connection — either by asking the user to verbally confirm that the phone in use is connected to the IoT device, or by automatically detecting and validating that the connection is valid.
- FR-3.4: The IVR shall confirm to the user that data collection has started and completed.

### FR-4: Data Processing & Scoring

- FR-4.1: Collected step/sensor data shall be transmitted to the cloud API for real-time analysis via the event-driven pipeline.
- FR-4.2: The IVR shall retrieve the balance index score from the cloud API and announce it during the same call.
- FR-4.3: The IVR shall provide personalized verbal feedback based on the score.
- FR-4.4: If scoring fails or times out, the IVR shall inform the user and offer a retry or follow-up path.

## 7. Technical Architecture

The project introduces an **event-driven architecture** in which services communicate asynchronously. Specific technologies and vendors will be decided later; the system consists of the following components:


| Component        | Responsibility                                                              |
| ---------------- | --------------------------------------------------------------------------- |
| IVR System       | Accept calls, authenticate users, deliver voice-guided instructions         |
| Event Processing | Capture step data and forward it to the cloud API                           |
| Cloud API        | Process balance data and return the mobility score                          |
| IoT Integration  | Allow the IVR flow to trigger sensor data collection without the mobile app |
| Messaging Queue  | Handle real-time sensor data processing between services                    |


## 8. Non-Functional Requirements

- **Latency:** Score must be announced in real time during the call; minimize end-to-end time from exercise completion to score announcement.
- **Reliability:** Communication between the IoT device and the IVR-triggered event must be dependable; the pipeline must tolerate transient failures.
- **Accuracy:** IVR-based test results must be consistent with mobile app results for the same exercise.
- **Security:** Caller identity must be verified before any exercise or data access; sensor and health-related data must be transmitted and stored securely.
- **Usability:** Voice prompts must be intelligible and appropriately paced for elderly and accessibility-focused users, with no visual interface assumed.

## 9. Success Metrics


| Metric          | Definition                                                                        |
| --------------- | --------------------------------------------------------------------------------- |
| User adoption   | Percentage of existing users switching to (or additionally using) the IVR channel |
| Completion rate | Number/percentage of users successfully completing the test via IVR end-to-end    |
| Latency         | Average time from call initiation to score announcement                           |
| Accuracy        | Consistency of IVR-based test results versus mobile app results                   |


## 10. Risks & Challenges


| Risk                                                                | Impact                                 | Mitigation direction                                                                       |
| ------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------ |
| Unreliable communication between IoT device and IVR-triggered event | Test cannot complete; user frustration | Connection retries, pre-call device pairing checks, fallback connectivity path             |
| Authentication friction over voice with no graphical interface      | Users abandon before starting          | SMS 2FA plus simple verbal verification (patient name and date of birth); keep prompts short and forgiving |
| Latency in the event pipeline delays score announcement             | Users wait on the line or hang up      | Real-time pipeline design; verbal "please hold" states; timeout with callback/SMS fallback |
| Score inconsistency between IVR and app channels                    | Erodes trust in results                | Accuracy validation against app results during beta                                        |


## 11. Milestones / Next Steps

1. **Stack selection:** Evaluate and choose the telephony, messaging, and event-processing technologies.
2. **Prototype development:** Implement an initial IVR system on the chosen platform.
3. **Event-driven pipeline:** Integrate a messaging queue to handle real-time sensor data processing.
4. **Beta testing:** Deploy to a small user group and gather feedback on completion rate, latency, and prompt usability.

## 12. Open Questions

None at this time. Resolved decisions:

- Of the two authentication options considered (SMS 2FA or voice recognition), SMS 2FA was chosen (FR-2.1); voice recognition is out of scope (see Non-Goals).
- In addition to 2FA, the caller is asked for the patient's name and date of birth (FR-2.2), addressing privacy requirements for delivering health-related scores over the voice channel.

