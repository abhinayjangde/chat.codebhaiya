"use client";

import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type StreamStep = "thinking" | "webSearch" | "analyzing";

interface StreamStepItem {
  id: StreamStep;
  label: string;
  status: "pending" | "active" | "complete";
}

interface StreamStatusProps {
  steps: StreamStepItem[];
  className?: string;
}

export function StreamStatus({ steps, className }: StreamStatusProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300",
        className
      )}
    >
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1;
        return (
          <span key={step.id} className="flex items-center gap-1.5">
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium transition-all duration-300",
                step.status === "pending"
                  ? "border-(--chat-action-icon) text-(--chat-action-icon)"
                  : step.status === "active"
                  ? "border-(--chat-text-secondary) bg-(--chat-text-secondary) text-white animate-pulse"
                  : "border-green-500 bg-green-500 text-white"
              )}
            >
              {step.status === "active" ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin text-white" />
              ) : step.status === "complete" ? (
                <Check className="h-2.5 w-2.5" />
              ) : null}
            </span>
            <span
              className={cn(
                "text-[11px] font-medium transition-colors duration-300",
                step.status === "active"
                  ? "text-(--chat-text)"
                  : "text-(--chat-text-secondary)"
              )}
            >
              {step.label}
            </span>
            {!isLast && (
              <span className="h-1 w-1 rounded-full bg-(--chat-text-secondary) shrink-0" />
            )}
          </span>
        );
      })}
    </div>
  );
}
