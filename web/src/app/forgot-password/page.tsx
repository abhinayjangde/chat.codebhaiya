"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/auth.api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await authApi.requestPasswordReset(email.trim().toLowerCase());
      setIsSubmitted(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send a reset link. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          src="https://cloud.video.taobao.com/vod/cXTkVPZ9iQ0Zxu7bSbw1nesY7j2WVrd_WWjKWN8JJeg.mp4"
        />
        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent to-[#0d0d0d]/40" />
      </div>

      <div className="relative flex items-center justify-center px-6 py-12" style={{ background: "#0d0d0d" }}>
        <div className="absolute right-6 top-6">
          <Image
            src="https://avatars.githubusercontent.com/u/166032907?v=4"
            alt="Codebhaiya Logo"
            width={32}
            height={32}
            className="size-8 rounded-full"
          />
        </div>

        <div className="w-full max-w-md space-y-6">
          <h1 className="text-center text-3xl font-bold tracking-tight text-[#f0f0f0]" style={{ fontFamily: "var(--font-fraunces), serif" }}>
            {isSubmitted ? "Check your email" : "Reset your password"}
          </h1>

          {isSubmitted ? (
            <div className="space-y-5 text-center">
              <p className="text-sm leading-6 text-[#aaa]" role="status" aria-live="polite">
                If an account exists for <span className="font-medium text-[#e0e0e0]">{email}</span>, we&apos;ve sent a password reset link. The link expires in 30 minutes.
              </p>
              <p className="text-xs text-[#777]">Check your spam folder if you don&apos;t see the email.</p>
              <Button type="button" variant="outline" onClick={() => setIsSubmitted(false)} className="border-[#333] bg-[#151515] text-[#ccc] hover:bg-[#222]">
                Try another email
              </Button>
            </div>
          ) : (
            <>
              <p className="text-center text-sm text-[#a78bfa]">Enter your email address and we&apos;ll send you a link to choose a new password.</p>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <Input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  autoFocus
                  placeholder="Email address"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={isSubmitting}
                  className="h-11 rounded-md border-[#2a2a2a] bg-[#151515] text-[#e0e0e0] placeholder:text-[#666] focus-visible:border-[#444] focus-visible:ring-[#444]/30"
                />

                {error && <p className="text-sm text-red-400" role="alert">{error}</p>}

                <Button type="submit" disabled={isSubmitting} className="h-11 w-full rounded-md border border-[#2a2a2a] bg-[#1a1a1a] text-sm font-medium text-[#ccc] transition-colors hover:bg-[#252525] hover:text-white disabled:cursor-not-allowed disabled:opacity-60">
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending link…</> : "Send reset link"}
                </Button>
              </form>
            </>
          )}

          <div className="flex justify-center">
            <Link href="/login" className="text-xs font-medium text-[#888] underline underline-offset-2 transition-colors hover:text-[#ccc]">
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
