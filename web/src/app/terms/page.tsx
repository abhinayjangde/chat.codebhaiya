import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  alternates: {
    canonical: "/terms",
  },
  openGraph: {
    title: "Terms of Service | Codebhaiya",
    description: "The rules for using the Codebhaiya AI workbench.",
  },
  description: "The rules for using the Codebhaiya AI workbench.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="The working agreement"
      title="A good tool needs good boundaries."
      intro="These terms keep Codebhaiya useful, safe, and fair for the people building with it."
      updated="November 1, 2026"
      sections={[
        {
          title: "1. Accepting these terms",
          children: (
            <>
              <p>By creating an account or using Codebhaiya, you agree to these Terms of Service and our Privacy Policy. If you use Codebhaiya for an organisation, you confirm that you have authority to accept these terms for it. If you do not agree, do not use the Service.</p>
              <p>You must be at least 18 years old and able to enter a binding agreement. We may update these terms as the Service evolves; continued use after an update means you accept the revised terms.</p>
            </>
          ),
        },
        {
          title: "2. Your account",
          children: (
            <>
              <p>Keep your account credentials confidential and tell us promptly if you suspect unauthorised access. You are responsible for activity under your account, except where that activity results from our failure to use reasonable security measures.</p>
              <p>Use an accurate email address and keep your information current. We may suspend or close an account when necessary to prevent abuse, protect users, comply with law, or address a material breach of these terms.</p>
            </>
          ),
        },
        {
          title: "3. Your content and our service",
          children: (
            <>
              <p>You keep ownership of prompts, documents, and other material you submit (“Your Content”). You give us a limited licence to host, process, transmit, and display Your Content only as needed to provide, secure, troubleshoot, and improve the Service. You confirm that you have the rights and permissions needed to submit it.</p>
              <p>Codebhaiya may generate output that is similar to output generated for another user. Subject to applicable law, you may use output you receive, but you are responsible for checking that it is accurate, lawful, original enough for your purpose, and suitable for publication or production.</p>
            </>
          ),
        },
        {
          title: "4. Acceptable use",
          children: (
            <>
              <p>Do not use the Service to break the law, infringe another person’s rights, distribute malware, phish, harass, exploit children, impersonate someone, expose private information, evade security controls, or interfere with the Service.</p>
              <p>Do not use generated output as a substitute for professional advice, to make high-impact decisions about a person, or to create dangerous instructions. Do not probe, scrape, reverse engineer, overload, or attempt to access accounts or systems you do not own or have permission to test.</p>
              <p>We may remove content or limit access when we reasonably believe it violates these rules or creates risk. We may cooperate with lawful requests from authorities.</p>
            </>
          ),
        },
        {
          title: "5. AI limitations",
          children: (
            <>
              <p>Codebhaiya is an assistive tool, not an authority. Responses may contain mistakes, outdated information, unsafe suggestions, or fabricated citations. You must independently verify important facts, code, calculations, licences, and recommendations before relying on them.</p>
              <p>Availability, models, features, limits, and third-party integrations may change. We do not guarantee that the Service or any particular model will be uninterrupted, secure, accurate, or available for every purpose.</p>
            </>
          ),
        },
        {
          title: "6. Third-party services",
          children: (
            <>
              <p>The Service may connect to model providers, search sources, hosting providers, or links operated by others. Their terms, privacy notices, rate limits, and content may apply separately. We are not responsible for third-party services or information outside our control.</p>
            </>
          ),
        },
        {
          title: "7. Intellectual property and feedback",
          children: (
            <>
              <p>Codebhaiya, its branding, software, design, and documentation are owned by us or our licensors. These terms give you permission to use the Service; they do not transfer our intellectual-property rights to you.</p>
              <p>If you send feedback, suggestions, or ideas, you allow us to use them without restriction or payment. We will not treat feedback as confidential unless we separately agree in writing.</p>
            </>
          ),
        },
        {
          title: "8. Disclaimers and liability",
          children: (
            <>
              <p>To the maximum extent allowed by law, the Service is provided “as is” and “as available,” without warranties of any kind, express or implied. We do not exclude rights or warranties that cannot legally be excluded.</p>
              <p>To the maximum extent allowed by law, Codebhaiya and its contributors will not be liable for indirect, incidental, special, consequential, exemplary, or loss-of-profit damages arising from use of the Service. Our total liability for claims relating to the Service will not exceed the amount you paid us for the Service in the twelve months before the event giving rise to the claim, or INR 1,000 if you used the Service for free.</p>
            </>
          ),
        },
        {
          title: "9. Ending the relationship",
          children: (
            <>
              <p>You may stop using the Service at any time. We may suspend or terminate access for a breach, legal requirement, security risk, or if we discontinue the Service. Sections that by their nature should continue— including content ownership, acceptable use consequences, disclaimers, liability, and dispute terms—will continue after termination.</p>
            </>
          ),
        },
        {
          title: "10. Governing law and contact",
          children: (
            <>
              <p>These terms are governed by the laws of India, without regard to conflict-of-law rules. Courts located in India will have jurisdiction, subject to any mandatory consumer or local laws that apply to you.</p>
              <p>Questions about these terms can be sent to <a className="text-[#75e8d0] underline underline-offset-4" href="mailto:hello@codebhaiya.com">hello@codebhaiya.com</a>.</p>
            </>
          ),
        },
      ]}
    />
  );
}
