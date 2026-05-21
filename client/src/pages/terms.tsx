import { LegalLayout, LegalSection } from "@/components/LegalLayout";

export default function Terms() {
  return (
    <LegalLayout
      title="Terms of Use"
      description="The terms and conditions for using Cas Analyzer."
      lastUpdated="April 23, 2026"
    >
      <p>
        These Terms of Use ("Terms") govern your access to and use of Cas
        Analyzer (the "Service"), provided by <strong>Financial Friend</strong>.
        By using the Service, you agree to be bound by these Terms.
      </p>

      <LegalSection heading="1. Eligibility">
        <p>
          You must be at least 18 years old to use the Service. By using the
          Service, you represent that you meet this requirement and have the
          legal capacity to enter into these Terms.
        </p>
      </LegalSection>

      <LegalSection heading="2. Account Registration">
        <p>
          To use certain features, you may need to register and provide
          accurate information including your name, email, and mobile number.
          You are responsible for keeping your account credentials secure and
          for all activity that occurs under your account.
        </p>
      </LegalSection>

      <LegalSection heading="3. Use of the Service">
        <p>You agree to use the Service only for lawful purposes. You will not:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Upload content that is unlawful, harmful, or infringes on the rights of others.</li>
          <li>Attempt to access, tamper with, or use non-public areas of the Service.</li>
          <li>Reverse engineer, decompile, or disassemble any part of the Service.</li>
          <li>Use the Service to transmit malware or any malicious code.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Financial Information Disclaimer">
        <p>
          Cas Analyzer provides automated analysis of CAS PDFs for
          informational purposes only. The insights generated are not
          financial, investment, tax, or legal advice. You should consult a
          qualified professional before making any financial decisions.
        </p>
      </LegalSection>

      <LegalSection heading="5. Intellectual Property">
        <p>
          The Service, including its design, code, logos, and content (other
          than user-uploaded content), is owned by Financial Friend and
          protected by applicable intellectual property laws. You may not copy,
          modify, distribute, or create derivative works without our written
          permission.
        </p>
      </LegalSection>

      <LegalSection heading="6. Your Content">
        <p>
          You retain ownership of the documents and information you upload.
          You grant us a limited license to process this content solely for the
          purpose of providing the Service to you.
        </p>
      </LegalSection>

      <LegalSection heading="7. Termination">
        <p>
          We may suspend or terminate your access to the Service at any time
          if you violate these Terms or use the Service in a way that may
          cause harm. You may stop using the Service at any time.
        </p>
      </LegalSection>

      <LegalSection heading="8. Disclaimer of Warranties">
        <p>
          The Service is provided "as is" and "as available" without warranties
          of any kind, whether express or implied, including but not limited
          to merchantability, fitness for a particular purpose, or
          non-infringement.
        </p>
      </LegalSection>

      <LegalSection heading="9. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, Financial Friend shall not be
          liable for any indirect, incidental, special, consequential, or
          punitive damages arising out of or related to your use of the
          Service.
        </p>
      </LegalSection>

      <LegalSection heading="10. Changes to These Terms">
        <p>
          We may update these Terms from time to time. The "Last updated" date
          at the top of this page reflects the most recent version. Continued
          use of the Service after changes means you accept the updated Terms.
        </p>
      </LegalSection>

      <LegalSection heading="11. Governing Law">
        <p>
          These Terms are governed by the laws of India (State of Rajasthan),
          without regard to its conflict of law principles. Any disputes shall
          be resolved in the competent courts of Jaipur, Rajasthan.
        </p>
      </LegalSection>

      <LegalSection heading="12. Contact">
        <p>
          For any questions about these Terms, please reach out to us at:
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
