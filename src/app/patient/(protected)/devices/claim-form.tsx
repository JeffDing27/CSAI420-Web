"use client";

import { useState } from "react";
import { claimPatientDevice } from "./actions";

export default function ClaimDeviceForm() {
  const [claimCode, setClaimCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const formData = new FormData();
    formData.set("claimCode", claimCode);
    const result = await claimPatientDevice(formData);

    if (result?.error) {
      setError(result.error);
    } else {
      setMessage("Device linked to your account.");
      setClaimCode("");
    }

    setLoading(false);
  };

  return (
    <form className="rounded-lg border border-slate-200 bg-slate-50 p-5" onSubmit={handleSubmit}>
      <h2 className="text-lg font-semibold text-slate-900">Claim a device</h2>
      <p className="mt-1 text-sm text-slate-500">
        Enter the 6-digit claim code provided during device provisioning.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          value={claimCode}
          onChange={(event) => setClaimCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-900 shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          placeholder="123456"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-sky-300"
        >
          {loading ? "Claiming..." : "Claim device"}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-emerald-600">{message}</p> : null}
    </form>
  );
}
