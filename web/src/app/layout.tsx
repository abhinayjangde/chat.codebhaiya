import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "codebhaiya.ai",
  description: "AI chat interface with live citations and conversation history",
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
