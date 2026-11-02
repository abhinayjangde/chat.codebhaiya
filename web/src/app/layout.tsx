import type { Metadata, Viewport } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://chat.codebhaiya.com";

export const viewport: Viewport = {
  themeColor: "#0b1112",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Codebhaiya | The AI Workbench for Builders",
    template: "%s | Codebhaiya",
  },
  description:
    "Codebhaiya is an intelligent AI workbench for developers and curious builders. Multi-model routing (Gemini, Llama, GPT), live web search grounding, smart code generation, and document context.",
  applicationName: "Codebhaiya",
  authors: [{ name: "Codebhaiya", url: siteUrl }],
  creator: "Codebhaiya",
  publisher: "Codebhaiya",
  category: "technology",
  keywords: [
    "Codebhaiya",
    "AI workbench",
    "developer AI",
    "AI coding assistant",
    "multi model AI",
    "web search grounding",
    "live citations AI",
    "document analysis AI",
    "LangChain chat",
    "Hinglish AI",
    "code generator",
    "conversational AI",
    "Gemini",
    "Llama",
  ],
  alternates: {
    canonical: "./",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Codebhaiya",
    title: "Codebhaiya | The AI Workbench for Builders",
    description:
      "Turn rough questions into clear plans, useful code, and work you are proud to share. Fast multi-model intelligence, live web citations, and document analysis.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Codebhaiya | The AI Workbench for Builders",
    description:
      "Turn rough questions into clear plans, useful code, and work you are proud to share. Multi-model AI and grounded web citations.",
    creator: "@codebhaiya",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${spaceGrotesk.variable} ${fraunces.variable} min-h-screen antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster position="bottom-left" toastOptions={{ duration: 3000 }} />
      </body>
    </html>
  );
}
