import { LegalLayout, LegalSection } from "@/components/LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      description="How Cas Analyzer collects, uses, and protects your personal information."
      lastUpdated="April 23, 2026"
    >
      <p>
        This Privacy Policy explains how <strong>Financial Friend</strong> ("we",
        "our", or "us") collects, uses, and safeguards information when you use
        Cas Analyzer (the "Service"). By using the Service, you agree to the
        practices described below.
      </p>

      <LegalSection heading="1. Information We Collect">
        <p>We collect the following types of information:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong>Account Information:</strong> name, email address, and
            mobile number you provide during registration.
          </li>
          <li>
            <strong>Uploaded Documents:</strong> CAS (Consolidated Account
            Statement) PDFs and the data extracted from them for analysis.
          </li>
          <li>
            <strong>Connected Account Data:</strong> if you choose to connect
            Gmail, we access only the email metadata and attachments needed to
            locate CAS files.
          </li>
          <li>
            <strong>Usage Data:</strong> basic information about how you
            interact with the Service for diagnostics and product improvement.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="2. How We Use Your Information">
        <ul className="list-disc pl-6 space-y-2">
          <li>To provide portfolio analysis and insights you request.</li>
          <li>To create and manage your account.</li>
          <li>To improve, secure, and troubleshoot the Service.</li>
          <li>To communicate important updates or respond to your queries.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Data Sharing">
        <p>
          We do not sell your personal information. We may share data only with
          trusted service providers who help us operate the Service (for
          example, hosting and analytics) and only to the extent necessary.
          These providers are bound by confidentiality obligations.
        </p>
      </LegalSection>

      <LegalSection heading="4. Data Retention">
        <p>
          We retain your information for as long as your account is active or
          as needed to provide the Service. You may request deletion of your
          account and associated data at any time by contacting us.
        </p>
      </LegalSection>

      <LegalSection heading="5. Security">
        <p>
          We use reasonable technical and organizational measures to protect
          your information. However, no method of transmission or storage is
          completely secure, and we cannot guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection heading="6. Your Rights">
        <p>
          You have the right to access, correct, or delete the personal
          information we hold about you. To exercise these rights, contact us
          at the email address listed below.
        </p>
      </LegalSection>

      <LegalSection heading="7. Children's Privacy">
        <p>
          The Service is not intended for individuals under the age of 18. We
          do not knowingly collect information from children.
        </p>
      </LegalSection>

      <LegalSection heading="8. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. The "Last
          updated" date at the top of this page indicates when it was last
          revised. Continued use of the Service after changes means you accept
          the updated policy.
        </p>
      </LegalSection>

      <LegalSection heading="9. Contact Us">
        <p>
          For questions about this Privacy Policy, please contact us at:
        </p>
        <ul className="list-none pl-0 space-y-1">
          <li>
            <strong>Email:</strong> gunjan@financialfriend.in
          </li>
          <li>
            <strong>Address:</strong> Mall of Jaipur, 710, Gandhi Path Rd, East, Vaishali Nagar, Jaipur, Rajasthan 302021, India
          </li>
          <li>
            <strong>Phone:</strong> +91 93511 04008
          </li>
        </ul>
      </LegalSection>
    </LegalLayout>
  );
}
