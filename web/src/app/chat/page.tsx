import type { Metadata } from "next";
import { ChatApp } from "@/components/chat-app";

export const metadata: Metadata = {
  title: "Chat",
  description:
    "Interactive AI workbench with live web search grounding, multi-model intelligence, and document context.",
  alternates: {
    canonical: "/chat",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function ChatPage() {
  return <ChatApp />;
}
