"use client";

import { FormEvent, useMemo, useState } from "react";

type SignupForm = {
  userName: string;
  email: string;
  phone: string;
  region: string;
  birthDate: string;
  password: string;
  verifyPassword: string;
};

export default function Home() {
  const [signupForm, setSignupForm] = useState<SignupForm>({
    userName: "",
    email: "",
    phone: "",
    region: "US",
    birthDate: "",
    password: "",
    verifyPassword: "",
  });
  const [loginPassword, setLoginPassword] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [status, setStatus] = useState<string>("Ready");
  const [sessionToken, setSessionToken] = useState<string>("");

  const canSignup = useMemo(() => {
    return (
      signupForm.userName.trim().length > 0 &&
      signupForm.email.trim().length > 0 &&
      signupForm.phone.trim().length > 0 &&
      signupForm.birthDate.trim().length > 0 &&
      signupForm.password.length >= 8 &&
      signupForm.password === signupForm.verifyPassword
    );
  }, [signupForm]);

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setSignupLoading(true);
    setStatus("Creating account...");

    try {
      const res = await fetch("/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupForm),
      });

      const text = await res.text();
      if (!res.ok) {
        setStatus(`Signup failed (${res.status}): ${text}`);
        return;
      }

      setStatus(`Signup success: ${text || "User created"}`);
    } catch (err: any) {
      setStatus(`Signup error: ${err.message || "Unknown error"}`);
    } finally {
      setSignupLoading(false);
    }
  }

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setStatus("Logging in...");

    try {
      const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: signupForm.userName || signupForm.email,
          password: loginPassword,
        }),
      });

      const text = await res.text();
      if (!res.ok) {
        setStatus(`Login failed (${res.status}): ${text}`);
        return;
      }

      setSessionToken(text);
      setStatus("Login success. Session token captured below.");
    } catch (err: any) {
      setStatus(`Login error: ${err.message || "Unknown error"}`);
    } finally {
      setLoginLoading(false);
    }
  }

  return (
    <main className="app-shell py-10 px-4">
      <div className="mx-auto max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="app-panel p-6 md:p-8">
          <h1 className="app-title">STEDI API Demo Console</h1>
          <p className="app-subtitle mt-2">
            This page creates a user via <span className="font-mono text-sky-700">/user</span> and logs in via <span className="font-mono text-sky-700">/login</span>.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSignup}>
            <div>
              <label className="block text-sm font-bold text-slate-700">Username</label>
              <input
                className="app-input"
                value={signupForm.userName}
                onChange={(e) => setSignupForm((p) => ({ ...p, userName: e.target.value }))}
                placeholder="demo@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700">Email</label>
              <input
                className="app-input"
                type="email"
                value={signupForm.email}
                onChange={(e) => setSignupForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="demo@example.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-slate-700">Phone</label>
                <input
                  className="app-input"
                  value={signupForm.phone}
                  onChange={(e) => setSignupForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700">Region</label>
                <input
                  className="app-input"
                  value={signupForm.region}
                  onChange={(e) => setSignupForm((p) => ({ ...p, region: e.target.value }))}
                  placeholder="US"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700">Birth Date</label>
              <input
                className="app-input"
                type="date"
                value={signupForm.birthDate}
                onChange={(e) => setSignupForm((p) => ({ ...p, birthDate: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-slate-700">Password</label>
                <input
                  className="app-input"
                  type="password"
                  value={signupForm.password}
                  onChange={(e) => setSignupForm((p) => ({ ...p, password: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700">Verify Password</label>
                <input
                  className="app-input"
                  type="password"
                  value={signupForm.verifyPassword}
                  onChange={(e) =>
                    setSignupForm((p) => ({ ...p, verifyPassword: e.target.value }))
                  }
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSignup || signupLoading}
              className="app-button-primary"
            >
              {signupLoading ? "Creating..." : "Create Account"}
            </button>
          </form>
        </section>

        <section className="app-panel p-6 md:p-8">
          <h2 className="text-2xl font-extrabold text-slate-900">Quick Login Test</h2>
          <p className="app-subtitle mt-2">
            Use the same username/email and password to verify token generation.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-bold text-slate-700">Password</label>
              <input
                className="app-input"
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading || !loginPassword}
              className="app-button-secondary"
            >
              {loginLoading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-sm font-semibold text-slate-700">Status</p>
            <p className="text-sm text-slate-600 mt-1 break-words">{status}</p>
          </div>

          {sessionToken && (
            <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-200">
              <p className="text-sm font-semibold text-emerald-900">Session Token</p>
              <p className="text-xs text-emerald-800 mt-1 break-all">{sessionToken}</p>
            </div>
          )}

          <div className="mt-6 text-sm text-slate-600 space-y-1">
            <p>Next demos:</p>
            <p>- Provider Portal: <a className="text-blue-700" href="/provider/login">/provider/login</a></p>
            <p>- Moderator Dashboard: <a className="text-blue-700" href="/moderator">/moderator</a></p>
          </div>
        </section>
      </div>
    </main>
  );
}
