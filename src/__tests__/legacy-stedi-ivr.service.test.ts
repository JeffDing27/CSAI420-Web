import { VoiceStage } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as SensorUpdate } from "@/app/api/voice/sensor/route";
import { POST as VoiceAuth } from "@/app/api/voice-auth/route";
import {
  LegacyStediIvrService,
  normalizeLegacyPhone,
} from "@/services/legacy-stedi-ivr.service";
import { resetVoiceTestSessions, VoiceService } from "@/services/voice.service";

describe("Legacy STEDI IVR client", () => {
  beforeEach(() => {
    vi.stubEnv("STEDI_API_BASE_URL", "https://legacy.example.test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("normalizes Twilio caller IDs for the legacy API", () => {
    expect(normalizeLegacyPhone("+1 (801) 719-0908")).toBe("8017190908");
    expect(normalizeLegacyPhone("801-719-0908")).toBe("8017190908");
    expect(normalizeLegacyPhone("123")).toBeNull();
  });

  it("verifies phone and birth date using the documented legacy contract", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify("caller-token"), { status: 200 }),
      );
    const service = new LegacyStediIvrService();

    await expect(
      service.verifyBirthDate("8017190908", "08151990"),
    ).resolves.toBe("caller-token");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://legacy.example.test/birthdateverify/8017190908",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ dateOfBirth: "08151990" }),
      }),
    );
  });

  it("resolves the token account and forwards that token for scoring", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify("patient@example.com"), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            firstName: "Pat",
            lastName: "Ient",
            deviceNickName: "device-007",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ customerName: "Pat Ient" }), {
          status: 200,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ score: 72.5 }), { status: 200 }),
      );
    const service = new LegacyStediIvrService();

    await expect(
      service.resolveAccount("8017190908", "caller-token"),
    ).resolves.toEqual({
      email: "patient@example.com",
      patientName: "Pat Ient",
      phoneNumber: "8017190908",
      deviceId: "device-007",
    });
    await expect(
      service.getRiskScore("patient@example.com", "caller-token"),
    ).resolves.toBe(72.5);

    for (const call of fetchMock.mock.calls.slice(1)) {
      expect(new Headers(call[1]?.headers).get("suresteps.session.token")).toBe(
        "caller-token",
      );
    }
  });
});

describe("VoiceService legacy completion", () => {
  beforeEach(() => {
    resetVoiceTestSessions();
    vi.stubEnv("USE_MOCK_TEST_DEVICE", "false");
    vi.stubEnv("IVR_USE_LEGACY_API_IN_TESTS", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("submits and scores the authenticated account with the same token", async () => {
    const legacyStediService = {
      submitRapidStepTest: vi.fn().mockResolvedValue(undefined),
      getRiskScore: vi.fn().mockResolvedValue(81.25),
    };
    const rapidStepTestService = {
      submitTest: vi.fn().mockResolvedValue({ id: "local-test-id" }),
    };
    const service = new VoiceService();
    Object.assign(service, { legacyStediService, rapidStepTestService });
    await service.startSession("CA-legacy-completion");
    const session = await service.updateSession("CA-legacy-completion", {
      stage: VoiceStage.SCORING,
      userId: "local-user-id",
      profileId: "profile-id",
      patientEmail: "patient@example.com",
      patientName: "Pat Ient",
      phoneNumber: "8017190908",
      stediSessionToken: "caller-token",
      deviceId: "device-007",
      setOneSteps: 1,
      setTwoSteps: 1,
      setOneStepPoints: [450],
      setTwoStepPoints: [550],
      testStartedAt: new Date("2026-08-11T18:00:00.000Z"),
    });

    await expect(service.completeTest(session)).resolves.toBe(81.25);
    expect(legacyStediService.submitRapidStepTest).toHaveBeenCalledWith(
      "caller-token",
      {
        customer: "patient@example.com",
        startTime: new Date("2026-08-11T18:00:00.000Z").getTime(),
        stepPoints: [450, 550],
        stopTime: new Date("2026-08-11T18:00:00.000Z").getTime() + 1000,
        testTime: 1000,
        totalSteps: 2,
        deviceId: "device-007",
      },
    );
    expect(legacyStediService.getRiskScore).toHaveBeenCalledWith(
      "patient@example.com",
      "caller-token",
    );
    expect(rapidStepTestService.submitTest).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "local-user-id",
        profileId: "profile-id",
        testData: expect.objectContaining({ score: 81.25 }),
      }),
    );
    await expect(service.getSession("CA-legacy-completion")).resolves.toEqual(
      expect.objectContaining({
        stage: VoiceStage.COMPLETED,
        score: 81.25,
        stediSessionToken: null,
      }),
    );
  });
});

describe("Guided IVR legacy authentication", () => {
  const callSid = "CA-legacy-authentication";

  beforeEach(() => {
    resetVoiceTestSessions();
    vi.stubEnv("USE_MOCK_TEST_DEVICE", "false");
    vi.stubEnv("IVR_USE_LEGACY_API_IN_TESTS", "true");
    vi.spyOn(
      VoiceService.prototype,
      "authenticateLegacyBirthDate",
    ).mockResolvedValue({
      userId: "local-user-id",
      email: "patient@example.com",
      phone: "8017190908",
      patientName: "Pat Ient",
      profileId: "profile-id",
      customerReferenceId: "customer-reference-id",
      stediSessionToken: "birthdate-token",
      deviceId: "device-007",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  async function callVoice(params: Record<string, string>) {
    const response = await VoiceAuth(
      new Request("http://localhost/api/voice-auth", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ CallSid: callSid, ...params }),
      }),
    );
    return response.text();
  }

  it("verifies the entered phone and birth date before starting the test", async () => {
    expect(await callVoice({})).toContain("ten-digit phone number");
    expect(await callVoice({ Digits: "8017190908" })).toContain(
      "date of birth",
    );
    expect(await callVoice({ Digits: "08151990" })).toContain(
      "Your identity is verified",
    );
    expect(
      VoiceService.prototype.authenticateLegacyBirthDate,
    ).toHaveBeenCalledWith("8017190908", "08151990");
  });

  it("never enables the spoken-name mock flow in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("USE_MOCK_TEST_DEVICE", "true");
    vi.stubEnv("IVR_USE_LEGACY_API_IN_TESTS", "false");

    expect(new VoiceService().shouldUseLegacyApi()).toBe(true);
  });

  it("requires real device measurements for legacy score submission", async () => {
    const sensorCallSid = "CA-legacy-sensor";
    const service = new VoiceService();
    await service.startSession(sensorCallSid);
    await service.updateSession(sensorCallSid, {
      stage: VoiceStage.SET_ONE_IN_PROGRESS,
    });

    const missingPoints = await SensorUpdate(
      new Request("http://localhost/api/voice/sensor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          callSid: sensorCallSid,
          event: "step",
          steps: 1,
          deviceId: "device-007",
        }),
      }),
    );
    expect(missingPoints.status).toBe(400);

    const accepted = await SensorUpdate(
      new Request("http://localhost/api/voice/sensor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          callSid: sensorCallSid,
          event: "step",
          steps: 1,
          deviceId: "device-007",
          stepPoints: [172],
        }),
      }),
    );
    expect(accepted.status).toBe(200);
    await expect(service.getSession(sensorCallSid)).resolves.toEqual(
      expect.objectContaining({
        deviceId: "device-007",
        setOneSteps: 1,
        setOneStepPoints: [172],
      }),
    );
  });
});
