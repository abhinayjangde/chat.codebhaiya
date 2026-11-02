import type { Metadata } from "next";
import { DocumentLibrary } from "@/components/documents/document-library";

export const metadata: Metadata = {
  title: "Document Library",
  description:
    "Organize, inspect, and chat with your uploaded documents, PDFs, notes, and code snippets.",
  alternates: {
    canonical: "/documents",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function DocumentsPage() {
  return <DocumentLibrary />;
}
