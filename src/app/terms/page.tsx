import type { Metadata } from "next";
import { ComplianceShell, PolicySection } from "../compliance-shell";

export const metadata: Metadata = {
  title: "SMS Terms and Conditions | STEDI Voice",
};

export default function TermsPage() {
  return (
    <ComplianceShell
      title="SMS Terms and Conditions"
      description="Terms governing transactional text messages from STEDI Voice."
    >
      <p className="text-sm text-slate-500">Effective July 17, 2026</p>
      <PolicySection title="Program description">
        <p>
          STEDI Voice sends transactional messages to users who affirmatively
          opt in. Messages may include one-time authentication codes,
          balance-test status updates, result-availability notices, and
          responses to support requests. Messages are not promotional.
        </p>
      </PolicySection>
      <PolicySection title="Consent and eligibility">
        <p>
          By selecting the consent checkbox and submitting your mobile number,
          you authorize STEDI Voice to send transactional automated text
          messages to that number. Consent is not a condition of purchase. You
          represent that you control or are authorized to use the number.
        </p>
      </PolicySection>
      <PolicySection title="Frequency and charges">
        <p>
          Message frequency varies based on account activity and requested
          services. Message and data rates may apply according to your carrier
          plan. Carriers are not liable for delayed or undelivered messages.
        </p>
      </PolicySection>
      <PolicySection title="Opt out and help">
        <p>
          Reply STOP to any message to opt out. After opting out, you may
          receive one confirmation message. Reply HELP for assistance. You may
          opt in again through the STEDI SMS consent page.
        </p>
      </PolicySection>
      <PolicySection title="Privacy and service limitations">
        <p>
          Our Privacy Policy explains our information practices. SMS is not
          guaranteed to be private or secure. STEDI Voice messages do not
          provide emergency services or replace professional medical advice. For
          an emergency, contact the appropriate local emergency service.
        </p>
      </PolicySection>
      <PolicySection title="Changes">
        <p>
          We may modify or discontinue the messaging program and update these
          terms. Continued participation after an update constitutes acceptance
          of the revised terms.
        </p>
      </PolicySection>
    </ComplianceShell>
  );
}
