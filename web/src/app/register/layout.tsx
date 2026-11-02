import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create an Account",
  description:
    "Join Codebhaiya for free. Access real-time multi-model intelligence, web citations, document uploads, and a developer-first AI workbench.",
  alternates: {
    canonical: "/register",
  },
  openGraph: {
    title: "Create an Account | Codebhaiya",
    description:
      "Join Codebhaiya for free. Fast multi-model intelligence, live citations, and document analysis.",
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
