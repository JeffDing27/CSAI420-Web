import type { Metadata } from "next";
import Link from "next/link";
import { ComplianceShell } from "../compliance-shell";
import { ConsentForm } from "./consent-form";

export const metadata: Metadata = { title: "SMS Consent | STEDI Voice" };

export default function SmsConsentPage() {
  return (
    <ComplianceShell
      title="SMS consent"
      description="Choose whether to receive transactional text messages related to your STEDI Voice account and balance tests."
    >
      <ConsentForm />
      <p className="text-sm text-slate-600">
        Review the{" "}
        <Link className="underline" href="/privacy">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link className="underline" href="/terms">
          SMS Terms and Conditions
        </Link>
        .
      </p>
    </ComplianceShell>
  );
}
