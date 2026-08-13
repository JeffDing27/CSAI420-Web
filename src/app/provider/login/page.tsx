"use client";

import { useState } from "react";
import { loginClinician } from "./actions";

export default function ProviderLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    // Simple mock hash (the real app uses PBKDF2 but for local/demo login we'll just pass it, 
    // or we assume the password is the hash, or we mock the hash for this prototype).
    // Let's just pass the password as is and let the server decide.
    try {
      const result = await loginClinician(email, password);
      if (result?.error) {
        setError(result.error);
      } else {
        window.location.href = "/provider/patients";
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <p className="text-center text-xs uppercase tracking-[0.22em] text-slate-500">Clinician Access</p>
        <h2 className="mt-2 text-center text-4xl font-extrabold text-slate-900">STEDI Provider Portal</h2>
        <p className="mt-2 text-center text-base text-slate-600">Sign in to your clinician account</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="app-panel py-8 px-5 sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4">
                <p className="text-sm font-semibold text-rose-700">{error}</p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-bold text-slate-700">Email address</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="app-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700">Password</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="app-input"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="app-button-primary w-full text-base py-3"
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
