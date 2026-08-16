import PatientInformationCard from "@/components/PatientInformationCard";
import { prisma } from "@/lib/prisma";
import { DeviceService } from "@/services/device.service";
import { getPatientPortalUser } from "../portal-auth";
import { cookies } from "next/headers";

function calculateAge(birthDate: string) {
  const dob = new Date(birthDate);
  if (Number.isNaN(dob.getTime())) {
    return 0;
  }

  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthOffset = today.getMonth() - dob.getMonth();
  if (monthOffset < 0 || (monthOffset === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

type RemoteUserProfile = {
  birthDate?: string;
  phone?: string;
  deviceNickName?: string;
};

type RemoteRiskScore = {
  customer?: string;
  score?: number;
  riskDate?: string;
  birthYear?: number;
};

type StepHistoryItem = {
  startTime?: number | string;
  stopTime?: number | string;
  testTime?: number | string;
  totalSteps?: number | string;
};

function toTimestamp(value?: number | string): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return Number.NaN;
}

function formatDateTime(value?: number | string): string {
  const ts = toTimestamp(value);
  return Number.isFinite(ts) ? new Date(ts).toLocaleString() : "N/A";
}

async function getLatestStepHistoryTestsFromLocalApi(
  email?: string | null,
): Promise<StepHistoryItem[]> {
  if (!email) return [];

  try {
    const cookieStore = await cookies();
    const surestepsToken = cookieStore.get("suresteps.session.token")?.value;
    if (!surestepsToken) return [];

    const baseUrl = process.env.INTERNAL_API_BASE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/stephistory/${encodeURIComponent(email)}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        "suresteps.session.token": surestepsToken,
        "suresteps-session-token": surestepsToken,
        "x-suresteps-session-token": surestepsToken,
      },
      cache: "no-store",
    });

    if (!response.ok) return [];

    const data = (await response.json()) as unknown;
    if (!Array.isArray(data)) return [];

    return (data as StepHistoryItem[])
      .slice()
      .sort((a, b) => toTimestamp(b.stopTime) - toTimestamp(a.stopTime))
      .slice(0, 4);
  } catch {
    return [];
  }
}

async function getRemoteUserProfile(email?: string | null): Promise<RemoteUserProfile | null> {
  if (!email) return null;

  try {
    const cookieStore = await cookies();
    const surestepsToken = cookieStore.get("suresteps.session.token")?.value;
    if (!surestepsToken) return null;

    const baseUrl = process.env.INTERNAL_API_BASE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/user/${encodeURIComponent(email)}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        "suresteps.session.token": surestepsToken,
      },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const data = (await response.json()) as RemoteUserProfile;
    return data;
  } catch {
    return null;
  }
}

async function getRiskScoreFromLocalApi(email?: string | null): Promise<number | null> {
  if (!email) return null;

  try {
    const cookieStore = await cookies();
    const surestepsToken = cookieStore.get("suresteps.session.token")?.value;
    if (!surestepsToken) {
      console.log("[RiskScore] Missing suresteps.session.token");
      return null;
    }

    const baseUrl = process.env.INTERNAL_API_BASE_URL || "http://localhost:3000";
    const url = `${baseUrl}/riskscore/${encodeURIComponent(email)}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "suresteps.session.token": surestepsToken,
        "suresteps-session-token": surestepsToken,
        "x-suresteps-session-token": surestepsToken,
      },
      cache: "no-store",
    });

    const raw = await response.text();

    if (!response.ok) {
      console.log("[RiskScore] Non-OK response", response.status, raw);
      return null;
    }

    const data = JSON.parse(raw) as RemoteRiskScore;
    const parsed =
      typeof data?.score === "number"
        ? data.score
        : typeof data?.score === "string"
          ? Number(data.score)
          : null;

    if (parsed === null || Number.isNaN(parsed)) return null;
    return parsed;
  } catch (err) {
    console.log("[RiskScore] Fetch error", err);
    return null;
  }
}

async function getCustomerNameFromLocalCustomerApi(phone?: string | null): Promise<string | null> {
  if (!phone) return null;

  try {
    const cookieStore = await cookies();
    const surestepsToken = cookieStore.get("suresteps.session.token")?.value;
    if (!surestepsToken) return null;

    const baseUrl = process.env.INTERNAL_API_BASE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/customer/${encodeURIComponent(phone)}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        "suresteps.session.token": surestepsToken,
      },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { customerName?: string };
    return data.customerName?.trim() || null;
  } catch {
    return null;
  }
}

async function getStepHistoryCountFromLocalApi(email?: string | null): Promise<number | null> {
  if (!email) return null;

  try {
    const cookieStore = await cookies();
    const surestepsToken = cookieStore.get("suresteps.session.token")?.value;
    if (!surestepsToken) return null;

    const baseUrl = process.env.INTERNAL_API_BASE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/stephistory/${encodeURIComponent(email)}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        "suresteps.session.token": surestepsToken,
        "suresteps-session-token": surestepsToken,
        "x-suresteps-session-token": surestepsToken,
      },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const data = (await response.json()) as unknown;
    return Array.isArray(data) ? data.length : null;
  } catch {
    return null;
  }
}

async function getLatestStepHistoryDateFromLocalApi(email?: string | null): Promise<string | null> {
  if (!email) return null;

  try {
    const cookieStore = await cookies();
    const surestepsToken = cookieStore.get("suresteps.session.token")?.value;
    if (!surestepsToken) return null;

    const baseUrl = process.env.INTERNAL_API_BASE_URL || "http://localhost:3000";
    const response = await fetch(`${baseUrl}/stephistory/${encodeURIComponent(email)}`, {
      method: "GET",
      headers: {
        accept: "application/json",
        "suresteps.session.token": surestepsToken,
        "suresteps-session-token": surestepsToken,
        "x-suresteps-session-token": surestepsToken,
      },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const data = (await response.json()) as unknown;
    if (!Array.isArray(data) || data.length === 0) return null;

    const latestStopTime = (data as StepHistoryItem[])
      .map((item) =>
        typeof item.stopTime === "number"
          ? item.stopTime
          : typeof item.stopTime === "string"
            ? Number(item.stopTime)
            : NaN,
      )
      .filter((value) => Number.isFinite(value))
      .reduce((max, value) => Math.max(max, value), Number.NEGATIVE_INFINITY);

    if (!Number.isFinite(latestStopTime)) return null;

    return new Date(latestStopTime).toLocaleDateString();
  } catch {
    return null;
  }
}

export default async function PatientPortalHomePage() {
  const { user, stediMode } = await getPatientPortalUser();
  const hasLocalUser = Boolean(user.id);

  const [tests, assignments, remoteUser, riskScore, stepHistoryCount, latestStepHistoryDate, latestStepHistoryTests] =
    await Promise.all([
      hasLocalUser
        ? prisma.rapidStepTest.findMany({
            where: { userId: user.id },
            orderBy: { completedAt: "desc" },
            take: 5,
          })
        : Promise.resolve([]),
      hasLocalUser ? DeviceService.getActiveAssignmentsForUser(user.id!) : Promise.resolve([]),
      getRemoteUserProfile(user.email),
      getRiskScoreFromLocalApi(user.email),
      getStepHistoryCountFromLocalApi(user.email),
      getLatestStepHistoryDateFromLocalApi(user.email),
      getLatestStepHistoryTestsFromLocalApi(user.email),
    ]);

  const birthDateForAge = user.birthDate || remoteUser?.birthDate || "";
  const phoneForCustomerLookup = user.phone || remoteUser?.phone || null;
  const customerName = await getCustomerNameFromLocalCustomerApi(phoneForCustomerLookup);
  const displayName = customerName || `${user.firstName} ${user.lastName}`.trim();
  const hasRemoteDevice = Boolean(remoteUser?.deviceNickName?.trim());
  const assignedDevicesCount = Math.max(assignments.length, hasRemoteDevice ? 1 : 0);
  const isDeviceConnected = assignedDevicesCount > 0;

  const latestTest = tests[0];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-gradient-to-r from-sky-700 via-sky-600 to-cyan-500 p-8 text-white shadow-lg">
        <p className="text-sm uppercase tracking-[0.2em] text-sky-100">Patient overview</p>
        <h1 className="mt-3 text-3xl font-semibold">Welcome back, {displayName}</h1>
        <p className="mt-3 max-w-2xl text-sm text-sky-50">
          Review your account details, check assigned devices, and keep track of your most recent rapid step tests.
        </p>
        {stediMode && !hasLocalUser ? (
          <p className="mt-3 text-sm text-sky-100">
            Connected with STEDI token. Local patient profile data is unavailable for this account.
          </p>
        ) : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <PatientInformationCard
          name={displayName}
          age={calculateAge(birthDateForAge)}
          email={user.email}
          assessmentDate={
            latestStepHistoryDate ??
            (latestTest?.completedAt
              ? new Date(latestTest.completedAt).toLocaleDateString()
              : "No assessment yet")
          }
          status={isDeviceConnected ? "Device connected" : "No device assigned"}
        />

        <section className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold text-slate-900">At a glance</h2>
          <dl className="mt-4 space-y-4 text-sm text-slate-700">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <dt>Assigned devices</dt>
              <dd className="font-semibold text-slate-900">{assignedDevicesCount}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <dt>Recorded tests</dt>
              <dd className="font-semibold text-slate-900">{stepHistoryCount ?? tests.length}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <dt>Risk score</dt>
              <dd className="font-semibold text-slate-900">
                {riskScore !== null ? riskScore.toFixed(1) : "N/A"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt>Portal access</dt>
              <dd className="font-semibold text-emerald-600">Active</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Recent rapid step tests</h2>
            <p className="mt-1 text-sm text-slate-500">Latest assessments associated with your account...</p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-left text-sm font-semibold text-slate-700">
              <tr>
                <th className="px-4 py-3">Start Time</th>
                <th className="px-4 py-3">Stop Time</th>
                <th className="px-4 py-3">Test Time</th>
                <th className="px-4 py-3">Total Steps</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-sm text-slate-700">
              {latestStepHistoryTests.length > 0 ? (
                latestStepHistoryTests.map((test, idx) => (
                  <tr key={`${toTimestamp(test.startTime)}-${toTimestamp(test.stopTime)}-${idx}`}>
                    <td className="px-4 py-3">{formatDateTime(test.startTime)}</td>
                    <td className="px-4 py-3">{formatDateTime(test.stopTime)}</td>
                    <td className="px-4 py-3">
                      {typeof test.testTime === "number" || typeof test.testTime === "string"
                        ? String(test.testTime)
                        : "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      {typeof test.totalSteps === "number" || typeof test.totalSteps === "string"
                        ? String(test.totalSteps)
                        : "N/A"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-500" colSpan={4}>
                    No step history tests found for this account
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
