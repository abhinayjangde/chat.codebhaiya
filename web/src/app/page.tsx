import type { Metadata } from "next";
import { HomeView } from "@/components/home-view";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://chat.codebhaiya.com";

export const metadata: Metadata = {
  title: "Codebhaiya | The AI Workbench for Builders",
  description:
    "An intelligent AI workspace for turning rough questions into clear plans, useful code, and work you are proud to share. Multi-model AI, grounded web citations, and document intelligence.",
  alternates: {
    canonical: siteUrl,
  },
  openGraph: {
    title: "Codebhaiya | The AI Workbench for Builders",
    description:
      "An intelligent AI workspace for turning rough questions into clear plans, useful code, and work you are proud to share.",
    url: siteUrl,
    siteName: "Codebhaiya",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Codebhaiya | The AI Workbench for Builders",
    description:
      "Intelligent workspace with multi-model routing, live web grounding, code generation, and document intelligence.",
  },
};

const jsonLdWebsite = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Codebhaiya",
  alternateName: ["Codebhaiya AI", "Chat Codebhaiya"],
  url: siteUrl,
  description:
    "An intelligent AI workbench for developers and curious builders with multi-model intelligence, web citations, and document analysis.",
  potentialAction: {
    "@type": "SearchAction",
    target: `${siteUrl}/chat?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

const jsonLdWebApp = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Codebhaiya AI Workbench",
  url: siteUrl,
  applicationCategory: "DeveloperApplication",
  operatingSystem: "All",
  description:
    "Turn rough questions into clear plans, useful code, and grounded research with live citations and document context.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Real-time streaming AI chat",
    "Multi-model routing (Google Gemini, Llama, OpenAI GPT)",
    "Live web search grounding with clickable citations",
    "Multimodal file and document analysis",
    "Support for English and Hinglish programming queries",
    "Clean syntax highlighting and code explanation",
  ],
};

const jsonLdOrg = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Codebhaiya",
  url: siteUrl,
  logo: "https://avatars.githubusercontent.com/u/166032907?v=4",
  sameAs: ["https://github.com/abhinayjangde/chat.codebhaiya"],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebsite) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
      />
      <HomeView />
    </>
  );
}
