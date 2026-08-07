import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as mineGET } from '../app/devices/mine/route';
import { StediAuthService } from '../lib/service/stedi-auth.service';
import { DeviceService } from '../services/device.service';

vi.mock('../lib/service/stedi-auth.service', () => ({
  StediAuthService: {
    resolveAuthenticatedProfile: vi.fn(),
  }
}));

vi.mock('../services/device.service', () => ({
  DeviceService: {
    getActiveAssignmentsForProfile: vi.fn(),
  }
}));

describe('Authorization Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should isolate device assignments so one patient cannot see another patient's devices", async () => {
    const req = new Request('http://localhost/devices/mine', {
      headers: new Headers({
        authorization: "Bearer valid-token-patientA",
      }),
    });

    (StediAuthService.resolveAuthenticatedProfile as any).mockResolvedValue({
      profile: { id: "patientA_id", role: "PATIENT" },
    });

    (DeviceService.getActiveAssignmentsForProfile as any).mockImplementation((profileId: string) => {
      if (profileId === "patientA_id") {
        return Promise.resolve([
          {
            id: 'assignmentA',
            device: { deviceId: 'DEV-A' }
          }
        ]);
      }
      return Promise.resolve([]);
    });

    const res = await mineGET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.devices).toHaveLength(1);
    expect(data.devices[0].deviceId).toBe('DEV-A');

    // Ensure we passed patientA_id, isolating access from patientB
    expect(DeviceService.getActiveAssignmentsForProfile).toHaveBeenCalledWith("patientA_id");
  });
});
