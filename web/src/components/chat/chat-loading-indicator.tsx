"use client";

import { useEffect, useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatLoadingIndicatorProps {
  hasWebSearch?: boolean;
  activeTool?: string;
  className?: string;
}

const BASE_LOOP = [
  "thinking...",
  "wait I'm thinking...",
  "searching...",
  "analyzing...",
];

const WEB_SEARCH_LOOP = [
  "thinking...",
  "wait I'm thinking...",
  "searching...",
  "searching on web...",
  "analyzing...",
];

export function ChatLoadingIndicator({
  hasWebSearch = false,
  activeTool,
  className,
}: ChatLoadingIndicatorProps) {
  const isWebSearchActive = activeTool === "web_search";
  const effectiveHasWebSearch = hasWebSearch || isWebSearchActive;

  const texts = useMemo(
    () => (effectiveHasWebSearch ? WEB_SEARCH_LOOP : BASE_LOOP),
    [effectiveHasWebSearch]
  );

  const [currentIndex, setCurrentIndex] = useState(0);

  // Rotate text every 2 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % texts.length);
    }, 2000);

    return () => clearInterval(timer);
  }, [texts.length]);

  // If web search tool is actively executing, pin/display "searching on web..."
  const currentText = isWebSearchActive
    ? "searching on web..."
    : texts[currentIndex % texts.length];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 text-xs text-(--chat-loading) py-1 select-none",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0 text-(--chat-loading)" />
      <span
        key={currentText}
        className="animate-in fade-in duration-300 transition-opacity"
      >
        {currentText}
      </span>
    </div>
  );
}
