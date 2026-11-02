import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to your Codebhaiya account to access your AI chat history, saved document collections, and custom workspaces.",
  alternates: {
    canonical: "/login",
  },
  openGraph: {
    title: "Sign In | Codebhaiya",
    description:
      "Sign in to Codebhaiya to continue your AI coding sessions, document analyses, and workbench threads.",
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
