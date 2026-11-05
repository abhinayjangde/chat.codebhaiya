"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/auth.api";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(
    token ? null : "This reset link is invalid or incomplete. Request a new one to continue."
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is invalid. Request a new one to continue.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword(token, password);
      setIsComplete(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reset your password. Request a new link and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0d0d0d] px-6 py-12">
      <section className="w-full max-w-md space-y-6">
        <h1 className="text-center text-3xl font-bold tracking-tight text-[#f0f0f0]" style={{ fontFamily: "var(--font-fraunces), serif" }}>
          {isComplete ? "Password updated" : "Choose a new password"}
        </h1>

        {isComplete ? (
          <div className="space-y-5 text-center">
            <p className="text-sm leading-6 text-[#aaa]" role="status" aria-live="polite">
              Your password has been changed. Sign in with your new password. Other active sessions have been signed out.
            </p>
            <Link href="/login" className="inline-flex h-11 items-center justify-center rounded-md border border-[#2a2a2a] bg-[#1a1a1a] px-6 text-sm font-medium text-[#ccc] transition-colors hover:bg-[#252525] hover:text-white">
              Go to sign in
            </Link>
          </div>
        ) : (
          <>
            <p className="text-center text-sm text-[#a78bfa]">Use at least 8 characters for your new password.</p>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input
                type="password"
                name="new-password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                autoFocus
                placeholder="New password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isSubmitting || !token}
                className="h-11 rounded-md border-[#2a2a2a] bg-[#151515] text-[#e0e0e0] placeholder:text-[#666] focus-visible:border-[#444] focus-visible:ring-[#444]/30"
              />
              <Input
                type="password"
                name="confirm-password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={isSubmitting || !token}
                className="h-11 rounded-md border-[#2a2a2a] bg-[#151515] text-[#e0e0e0] placeholder:text-[#666] focus-visible:border-[#444] focus-visible:ring-[#444]/30"
              />

              {error && <p className="text-sm text-red-400" role="alert">{error}</p>}

              <Button type="submit" disabled={isSubmitting || !token} className="h-11 w-full rounded-md border border-[#2a2a2a] bg-[#1a1a1a] text-sm font-medium text-[#ccc] transition-colors hover:bg-[#252525] hover:text-white disabled:cursor-not-allowed disabled:opacity-60">
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating password…</> : "Update password"}
              </Button>
            </form>
            <div className="flex justify-center">
              <Link href="/forgot-password" className="text-xs font-medium text-[#888] underline underline-offset-2 transition-colors hover:text-[#ccc]">
                Request a new reset link
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
