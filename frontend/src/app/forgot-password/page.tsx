"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* ── Left: Video Panel ── */}
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

      {/* ── Right: Reset Form ── */}
      <div
        className="relative flex items-center justify-center px-6 py-12"
        style={{ background: "#0d0d0d" }}
      >
        {/* Logo — top-right */}
        <div className="absolute right-6 top-6">
          <img
            src="https://avatars.githubusercontent.com/u/166032907?v=4"
            alt="Logo"
            className="size-8 rounded-full"
          />
        </div>

        <div className="w-full max-w-md space-y-6">
          {/* ── Heading ── */}
          <h1
            className="text-center text-3xl font-bold tracking-tight"
            style={{ color: "#f0f0f0", fontFamily: "var(--font-fraunces), serif" }}
          >
            Reset your password
          </h1>

          {/* ── Subtitle ── */}
          <p className="text-center text-sm text-[#a78bfa]">
            Enter your email address to reset your password.
          </p>

          {/* ── Form ── */}
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              // TODO: wire up password reset
            }}
          >
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-md border-[#2a2a2a] bg-[#151515] text-[#e0e0e0] placeholder:text-[#666] focus-visible:border-[#444] focus-visible:ring-[#444]/30"
            />

            <Button
              type="submit"
              className="h-11 w-full rounded-md border border-[#2a2a2a] bg-[#1a1a1a] text-sm font-medium text-[#ccc] transition-colors hover:bg-[#252525] hover:text-white cursor-pointer"
            >
              Continue
            </Button>
          </form>

          {/* ── Go back ── */}
          <div className="flex justify-center">
            <a
              href="/login"
              className="text-xs font-medium text-[#888] underline underline-offset-2 transition-colors hover:text-[#ccc]"
            >
              Go back
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
