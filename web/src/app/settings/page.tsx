import type { Metadata } from "next";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata: Metadata = {
  title: "Settings & Privacy",
  description:
    "Manage your account, export chat history, delete conversations, and review active sessions.",
  alternates: {
    canonical: "/settings",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function SettingsPage() {
  return <SettingsView />;
}
