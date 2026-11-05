"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Clock, Eye, EyeOff, HelpCircle, Loader2, RotateCcw } from "lucide-react";
import { ApiError, apiClient } from "@/lib/api";
import { readStoredTokens, writeStoredTokens, writeStoredUser } from "@/lib/storage";
import type { UserProfile } from "@/lib/types";
import Image from "next/image";
import toast from "react-hot-toast";
import { AuthSidebar } from "@/components/ui/auth-sidebar";

interface PendingRecoveryState {
  email: string;
  password: string;
  deletionScheduledAt?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);
  const [pendingRecovery, setPendingRecovery] = useState<PendingRecoveryState | null>(null);

  useEffect(() => {
    const tokens = readStoredTokens();
    if (tokens) {
      router.replace("/chat");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setPendingRecovery(null);

    try {
      const authData = await apiClient.login({
        email: email.trim().toLowerCase(),
        password,
      });

      const user: UserProfile = {
        ...authData.user,
        id: authData.user.id ?? authData.user.userId ?? "",
      };

      writeStoredTokens(authData.tokens);
      writeStoredUser(user);

      router.replace("/chat");
    } catch (err) {
      if (
        err instanceof ApiError &&
        err.status === 403 &&
        (err.details as Record<string, unknown> | undefined)?.code ===
          "ACCOUNT_PENDING_DELETION"
      ) {
        const details = err.details as Record<string, unknown>;
        setPendingRecovery({
          email: email.trim().toLowerCase(),
          password,
          deletionScheduledAt: details.deletionScheduledAt as string | undefined,
        });
        setError(null);
      } else {
        setError(
          err instanceof Error ? err.message : "Login failed. Please try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverAccount = async () => {
    if (!pendingRecovery) return;

    setIsRecovering(true);
    setError(null);

    try {
      const authData = await apiClient.recoverAccount({
        email: pendingRecovery.email,
        password: pendingRecovery.password,
      });

      const user: UserProfile = {
        ...authData.user,
        id: authData.user.id ?? authData.user.userId ?? "",
      };

      writeStoredTokens(authData.tokens);
      writeStoredUser(user);

      toast.success("Welcome back! Your account has been recovered.");
      router.replace("/chat");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Account recovery failed. Please try again."
      );
    } finally {
      setIsRecovering(false);
    }
  };

  const formattedScheduledDate = pendingRecovery?.deletionScheduledAt
    ? new Date(pendingRecovery.deletionScheduledAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "within 30 days";

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* ── Left: Auth Sidebar ── */}
      <AuthSidebar />

      {/* ── Right: Login Form ── */}
      <div
        className="relative flex items-center justify-center px-6 py-12"
        style={{ background: "#0d0d0d" }}
      >
        {/* Logo / brand mark — top-right */}
        <div className="absolute right-6 top-6">
          <Image
            src="https://avatars.githubusercontent.com/u/166032907?v=4"
            alt="Logo"
            className="size-8 rounded-full"
            width={100}
            height={100}
          />
        </div>

        <div className="w-full max-w-md space-y-7">
          {/* ── Heading ── */}
          <h1
            className="text-center text-3xl font-bold tracking-tight"
            style={{ color: "#f0f0f0", fontFamily: "var(--font-fraunces), serif" }}
          >
            Welcome to CodebhaiyaAI
          </h1>

          {/* ── Account Recovery Card if pending deletion ── */}
          {pendingRecovery && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3 text-amber-200">
              <div className="flex items-center gap-2 font-semibold text-amber-300 text-sm">
                <Clock className="h-5 w-5 shrink-0 text-amber-400" />
                <span>Account Scheduled for Deletion</span>
              </div>
              <p className="text-xs leading-relaxed text-amber-200/90">
                Your account is currently deactivated and cannot be accessed. All your chats, messages, and data are scheduled to be permanently deleted on{" "}
                <strong className="text-white font-medium">{formattedScheduledDate}</strong>.
              </p>
              <p className="text-xs text-amber-300 font-medium">
                If you changed your mind, you can recover your account right now within the 30-day window!
              </p>
              <div className="flex items-center gap-2.5 pt-1">
                <Button
                  type="button"
                  onClick={handleRecoverAccount}
                  disabled={isRecovering}
                  className="flex-1 bg-amber-500 text-black hover:bg-amber-400 font-semibold text-xs h-9"
                >
                  {isRecovering ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Recovering...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      Recover My Account
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPendingRecovery(null)}
                  disabled={isRecovering}
                  className="border-[#333] text-[#aaa] hover:bg-[#1a1a1a] hover:text-white text-xs h-9"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* ── Error message ── */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ── Form ── */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Email */}
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading || isRecovering}
              className="h-11 rounded-md border-[#2a2a2a] bg-[#151515] text-[#e0e0e0] placeholder:text-[#666] focus-visible:border-[#444] focus-visible:ring-[#444]/30"
            />

            {/* Password */}
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading || isRecovering}
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

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading || isRecovering}
              className="h-11 w-full rounded-md border border-[#2a2a2a] bg-[#1a1a1a] text-sm font-medium text-[#ccc] transition-colors hover:bg-[#252525] hover:text-white disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Log In"
              )}
            </Button>
          </form>

          {/* ── Links row ── */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#888]">
              Don&apos;t have an account?{" "}
              <a
                href="/register"
                className="font-medium text-[#a78bfa] transition-colors hover:text-[#c4b5fd]"
              >
                Register
              </a>
            </span>
            <a
              href="/forgot-password"
              className="text-[#a78bfa] transition-colors hover:text-[#c4b5fd]"
            >
              Forgot Password
            </a>
          </div>

          {/* ── Help ── */}
          <div className="flex justify-center">
            <a
              href="mailto:hello@codebhaiya.com"
              className="inline-flex items-center gap-1.5 text-xs text-[#888] transition-colors hover:text-[#ccc]"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Help
            </a>
          </div>

          {/* ── Footer ── */}
          <p className="text-center text-[11px] leading-relaxed text-[#555]">
            Your login constitutes acceptance of the{" "}
            <a
              href="/terms"
              className="text-[#a78bfa] transition-colors hover:text-[#c4b5fd]"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
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
