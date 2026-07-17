import type { Metadata } from "next";
import { ComplianceShell, PolicySection } from "../compliance-shell";

export const metadata: Metadata = { title: "Privacy Policy | STEDI Voice" };

export default function PrivacyPage() {
  return (
    <ComplianceShell
      title="Privacy Policy"
      description="How STEDI Voice collects, uses, and protects information for its balance-test and messaging services."
    >
      <p className="text-sm text-slate-500">Effective July 17, 2026</p>
      <PolicySection title="Information we collect">
        <p>
          We collect information you provide when creating or using a STEDI
          account, including contact information, mobile number, consent
          choices, authentication events, support requests, and information
          needed to provide balance-test services.
        </p>
      </PolicySection>
      <PolicySection title="How we use information">
        <p>
          We use information to authenticate users, operate STEDI Voice, provide
          balance-test status and result-availability notices, respond to
          requested support, protect the service, and comply with law.
        </p>
      </PolicySection>
      <PolicySection title="Mobile information and SMS consent">
        <p>
          Mobile information and SMS consent records are not sold, rented, or
          shared with third parties or affiliates for marketing or promotional
          purposes. We may provide limited information to service providers that
          process messages for us, solely to deliver and support the requested
          service.
        </p>
        <p>
          Message frequency varies. Message and data rates may apply. Reply STOP
          to opt out or HELP for assistance. Opting out of SMS does not prevent
          use of non-messaging STEDI services.
        </p>
      </PolicySection>
      <PolicySection title="Data retention and security">
        <p>
          We retain information only as long as reasonably necessary for the
          purposes described here, legal obligations, dispute resolution, and
          service security. We use administrative, technical, and organizational
          safeguards, but no transmission or storage system is completely
          secure.
        </p>
      </PolicySection>
      <PolicySection title="Your choices">
        <p>
          You may withdraw SMS consent at any time by replying STOP. You may
          request access, correction, or deletion of applicable personal
          information through STEDI support, subject to legal requirements.
        </p>
      </PolicySection>
      <PolicySection title="Policy updates and contact">
        <p>
          We may update this policy as the service changes. The effective date
          above identifies the current version. Questions or privacy requests
          may be submitted through the STEDI support channel associated with
          your account.
        </p>
      </PolicySection>
    </ComplianceShell>
  );
}
