"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

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
        {/* Subtle gradient overlay for polish */}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-transparent to-[#0d0d0d]/40" />
      </div>

      {/* ── Right: Register Form ── */}
      <div
        className="relative flex items-center justify-center px-6 py-12"
        style={{ background: "#0d0d0d" }}
      >
        {/* Logo / brand mark — top-right */}
        <div className="absolute right-6 top-6">
          <img
            src="https://avatars.githubusercontent.com/u/166032907?v=4"
            alt="Logo"
            className="size-8 rounded-full"
          />
        </div>

        <div className="w-full max-w-md space-y-7">
          {/* ── Heading ── */}
          <h1
            className="text-center text-3xl font-bold tracking-tight"
            style={{ color: "#f0f0f0", fontFamily: "var(--font-fraunces), serif" }}
          >
            Create an account
          </h1>

          {/* ── Form ── */}
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              // TODO: wire up registration
            }}
          >
            {/* Name */}
            <Input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-md border-[#2a2a2a] bg-[#151515] text-[#e0e0e0] placeholder:text-[#666] focus-visible:border-[#444] focus-visible:ring-[#444]/30"
            />

            {/* Email */}
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-md border-[#2a2a2a] bg-[#151515] text-[#e0e0e0] placeholder:text-[#666] focus-visible:border-[#444] focus-visible:ring-[#444]/30"
            />

            {/* Password */}
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password (8-20 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 rounded-md border-[#2a2a2a] bg-[#151515] pr-10 text-[#e0e0e0] placeholder:text-[#666] focus-visible:border-[#444] focus-visible:ring-[#444]/30"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] transition-colors hover:text-[#aaa]"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 rounded-md border-[#2a2a2a] bg-[#151515] pr-10 text-[#e0e0e0] placeholder:text-[#666] focus-visible:border-[#444] focus-visible:ring-[#444]/30"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666] transition-colors hover:text-[#aaa]"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="h-11 w-full rounded-md border border-[#2a2a2a] bg-[#1a1a1a] text-sm font-medium text-[#ccc] transition-colors hover:bg-[#252525] hover:text-white"
            >
              Continue
            </Button>
          </form>

          {/* ── Links row ── */}
          <div className="flex items-center justify-between text-xs">
            <a
              href="/login"
              className="font-medium text-[#888] underline underline-offset-2 transition-colors hover:text-[#ccc]"
            >
              Go back
            </a>
            <span className="text-[#888]">
              Already have an account?{" "}
              <a
                href="/login"
                className="font-medium text-[#a78bfa] transition-colors hover:text-[#c4b5fd]"
              >
                Log in
              </a>
            </span>
          </div>

          {/* ── Footer ── */}
          <p className="text-center text-[11px] leading-relaxed text-[#555]">
            Your login constitutes acceptance of the{" "}
            <a
              href="#"
              className="text-[#a78bfa] transition-colors hover:text-[#c4b5fd]"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="#"
              className="text-[#a78bfa] transition-colors hover:text-[#c4b5fd]"
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
