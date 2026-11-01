import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy policy | codebhaiya.ai",
  description: "How Codebhaiya handles account, conversation, and uploaded data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="A clear promise"
      title="Privacy, without the fog."
      intro="This policy explains what Codebhaiya collects, why we use it, and the choices you have when you use our AI workbench."
      updated="November 1, 2026"
      sections={[
        {
          title: "1. Who this is for",
          children: (
            <>
              <p>This policy applies to CodebhaiyaAI, the Codebhaiya web application, and related services that link to it (collectively, the “Service”). Codebhaiya is intended for people who are at least 18 years old. Please do not use the Service if you are under 18.</p>
              <p>In this policy, “you” means the person using the Service and “we” means Codebhaiya. This is a plain-language explanation, not a replacement for rights you may have under applicable data-protection law.</p>
            </>
          ),
        },
        {
          title: "2. Information you give us",
          children: (
            <>
              <p><strong className="text-[#e9f1ed]">Account details.</strong> When you register, we receive your name, email address, and password. Passwords should be unique to Codebhaiya; they are stored in protected form and are not displayed to us as plain text.</p>
              <p><strong className="text-[#e9f1ed]">Your work.</strong> We process prompts, messages, conversation history, uploaded documents, and preferences that you choose to send to the Service. Do not upload secrets, passwords, payment-card details, or sensitive personal information unless you have a clear reason and permission to do so.</p>
              <p><strong className="text-[#e9f1ed]">Support messages.</strong> If you contact us, we receive the details you include so we can respond and improve the Service.</p>
            </>
          ),
        },
        {
          title: "3. Information created when you use the Service",
          children: (
            <>
              <p>We receive technical information needed to operate and secure the Service, such as authentication tokens, browser or device characteristics, request timestamps, and error or performance information. We use this information to sign you in, keep sessions secure, diagnose failures, prevent abuse, and maintain availability.</p>
              <p>We do not use the contents of your private conversations to sell advertising. We do not make a promise that every third-party AI provider or web source follows this same policy; the provider’s terms may also apply when your request is sent to it.</p>
            </>
          ),
        },
        {
          title: "4. How we use information",
          children: (
            <>
              <p>We use information to provide and personalize chat, search, model routing, file analysis, conversation history, authentication, and account support. We also use it to protect the Service, investigate misuse, comply with law, and communicate important service or security changes.</p>
              <p>We process data on the basis of providing the Service you request, our legitimate interest in securing and improving it, your consent where consent is required, and legal obligations that apply to us.</p>
            </>
          ),
        },
        {
          title: "5. AI and service providers",
          children: (
            <>
              <p>To generate an answer or perform a requested task, your prompt and the relevant conversation or file context may be sent to the model, search, storage, hosting, email, or security providers that help us operate Codebhaiya. We share only what is needed for the requested function and require providers to protect it under their agreements with us.</p>
              <p>AI answers can be inaccurate, incomplete, or based on information that changes. Review important output yourself. Do not rely on Codebhaiya for medical, legal, financial, emergency, or other high-stakes decisions.</p>
            </>
          ),
        },
        {
          title: "6. Retention, deletion, and security",
          children: (
            <>
              <p>We keep account and conversation information for as long as needed to provide the Service, meet legal obligations, resolve disputes, enforce agreements, and maintain security. Retention can vary by data type and account status.</p>
              <p>You can ask us to correct or delete personal information associated with your account. Some information may remain where the law requires it or where it is necessary to prevent fraud or protect the Service. We use reasonable technical and organisational safeguards, but no internet service can guarantee absolute security.</p>
            </>
          ),
        },
        {
          title: "7. Your choices and rights",
          children: (
            <>
              <p>Depending on where you live, you may have rights to access, correct, update, erase, restrict, or receive a copy of your personal information, and to withdraw consent where processing relies on consent. You may also object to certain processing or lodge a complaint with your local data-protection authority.</p>
              <p>To make a request, email <a className="text-[#75e8d0] underline underline-offset-4" href="mailto:privacy@codebhaiya.com">privacy@codebhaiya.com</a> from the email address on your account. We may verify your identity before completing a request. We aim to respond within a reasonable period required by applicable law.</p>
            </>
          ),
        },
        {
          title: "8. Children and international transfers",
          children: (
            <>
              <p>The Service is not directed to children under 18, and we do not knowingly collect their personal information. If you believe a child has provided information, contact us so we can review and delete it where appropriate.</p>
              <p>Our providers may process information in countries other than where you live. When we transfer personal information across borders, we use safeguards required by applicable law and contract.</p>
            </>
          ),
        },
        {
          title: "9. Changes and contact",
          children: (
            <>
              <p>We may update this policy when the Service, law, or our practices change. We will update the date above and, where a change is material, provide a more prominent notice. Questions about privacy can be sent to <a className="text-[#75e8d0] underline underline-offset-4" href="mailto:privacy@codebhaiya.com">privacy@codebhaiya.com</a>.</p>
            </>
          ),
        },
      ]}
    />
  );
}
