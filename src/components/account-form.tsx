"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  mode: "register" | "login";
  role: "PATIENT" | "CLINICIAN";
};

const fieldClass =
  "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200";

export default function AccountForm({ mode, role }: Props) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const isRegister = mode === "register";
  const isProvider = role === "CLINICIAN";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const endpoint = isRegister
      ? "/api/accounts/register"
      : "/api/accounts/login";

    if (isRegister) payload.role = role;
    else payload.portal = isProvider ? "provider" : "patient";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Unable to complete your request");
        return;
      }

      if (isRegister) {
        window.location.href = isProvider
          ? "/provider/login?registered=1"
          : "/account/login?registered=1";
      } else {
        window.location.href = result.destination;
      }
    } catch {
      setError("The service is temporarily unavailable. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const title = isRegister
    ? `Create ${isProvider ? "clinician" : "patient"} account`
    : `${isProvider ? "Provider" : "Patient"} sign in`;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12 text-slate-950">
      <div className="mx-auto max-w-xl">
        <Link href="/" className="text-sm font-semibold text-blue-700">
          ← STEDI Voice
        </Link>
        <div className="mt-5 rounded-2xl bg-white p-7 shadow-lg ring-1 ring-slate-200">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-slate-600">
            {isRegister
              ? "Your phone number links this account to the hands-free IVR."
              : "Use the email or username associated with your STEDI account."}
          </p>

          {error && (
            <div className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <form className="mt-6 space-y-4" onSubmit={submit}>
            {isRegister ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    First name
                    <input name="firstName" autoComplete="given-name" required className={fieldClass} />
                  </label>
                  <label className="text-sm font-medium">
                    Last name
                    <input name="lastName" autoComplete="family-name" required className={fieldClass} />
                  </label>
                </div>
                <label className="block text-sm font-medium">
                  Username
                  <input name="userName" autoComplete="username" required minLength={3} className={fieldClass} />
                </label>
                <label className="block text-sm font-medium">
                  Email
                  <input name="email" type="email" autoComplete="email" required className={fieldClass} />
                </label>
                <label className="block text-sm font-medium">
                  Mobile phone
                  <input name="phone" type="tel" autoComplete="tel" placeholder="+1 608 555 0100" required className={fieldClass} />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    Date of birth
                    <input name="birthDate" type="date" required className={fieldClass} />
                  </label>
                  <label className="text-sm font-medium">
                    Region
                    <input name="region" placeholder="US-WI" required className={fieldClass} />
                  </label>
                </div>
              </>
            ) : (
              <label className="block text-sm font-medium">
                Email or username
                <input name="identity" autoComplete="username" required className={fieldClass} />
              </label>
            )}

            <label className="block text-sm font-medium">
              Password
              <input
                name="password"
                type="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
                minLength={10}
                className={fieldClass}
              />
              {isRegister && (
                <span className="mt-1 block text-xs text-slate-500">
                  Use at least 10 characters.
                </span>
              )}
            </label>

            {isRegister && (
              <label className="flex gap-3 text-sm text-slate-600">
                <input type="checkbox" required className="mt-1 size-4" />
                <span>
                  I agree to the <Link className="text-blue-700 underline" href="/terms">Terms</Link> and{" "}
                  <Link className="text-blue-700 underline" href="/privacy">Privacy Policy</Link>.
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-60"
            >
              {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            {isRegister ? "Already registered?" : "Need an account?"}{" "}
            <Link
              className="font-semibold text-blue-700"
              href={
                isRegister
                  ? isProvider ? "/provider/login" : "/account/login"
                  : isProvider ? "/provider/register" : "/register"
              }
            >
              {isRegister ? "Sign in" : "Register"}
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
