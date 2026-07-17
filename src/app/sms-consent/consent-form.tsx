"use client";

import { useState } from "react";

export function ConsentForm() {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  async function submit(formData: FormData) {
    setStatus("saving");
    const response = await fetch("/api/sms-consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phoneNumber: formData.get("phoneNumber"),
        consent: formData.get("consent") === "on",
      }),
    });
    setStatus(response.ok ? "saved" : "error");
  }

  return (
    <form
      action={submit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <label
        className="block font-semibold text-slate-900"
        htmlFor="phoneNumber"
      >
        Mobile phone number
      </label>
      <p className="mt-1 text-sm text-slate-500">
        Use international format, such as +16085551234.
      </p>
      <input
        className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-3"
        id="phoneNumber"
        name="phoneNumber"
        type="tel"
        inputMode="tel"
        pattern="\+[1-9][0-9]{7,14}"
        placeholder="+16085551234"
        required
      />
      <label className="mt-6 flex items-start gap-3 text-sm leading-6">
        <input
          className="mt-1 h-5 w-5"
          name="consent"
          type="checkbox"
          required
        />
        <span>
          I agree to receive transactional SMS messages from STEDI Voice for
          account verification, balance-test updates, result-availability
          notices, and requested support. Message frequency varies. Message and
          data rates may apply. Reply STOP to opt out or HELP for help. Consent
          is not a condition of purchase.
        </span>
      </label>
      <button
        className="mt-6 rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-60"
        type="submit"
        disabled={status === "saving" || status === "saved"}
      >
        {status === "saving"
          ? "Saving…"
          : status === "saved"
            ? "Consent saved"
            : "Agree and continue"}
      </button>
      <p className="mt-4 text-sm" aria-live="polite">
        {status === "saved" && "Your SMS consent has been recorded."}
        {status === "error" &&
          "We could not save your consent. Please try again later."}
      </p>
    </form>
  );
}
