"use client";

import { useState } from "react";
import { ExternalLink, Globe } from "lucide-react";
import { MessageSource } from "@/lib/types";
import { formatSourceHost } from "@/lib/chat-utils";

interface CitationMarkerProps {
  index: number;
  source: MessageSource;
}

function getValidUrl(rawHref?: string): string | undefined {
  if (!rawHref) return undefined;
  const trimmed = rawHref.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) {
    return trimmed;
  }
  if (trimmed.startsWith("www.") || trimmed.includes(".")) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export function CitationMarker({ index, source }: CitationMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const [badgeIconError, setBadgeIconError] = useState(false);
  const [popoverIconError, setPopoverIconError] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null);

  const rawHref = source.url ?? source.link;
  const href = getValidUrl(rawHref);
  const host = rawHref ? formatSourceHost(rawHref) : "";

  const handleMouseMove = (e: React.MouseEvent) => {
    if (typeof window !== "undefined") {
      const x = Math.min(e.clientX + 12, window.innerWidth - 300);
      const y = Math.min(e.clientY - 8, window.innerHeight - 150);
      setPopoverPosition({ x: Math.max(12, x), y: Math.max(12, y) });
    } else {
      setPopoverPosition({ x: e.clientX + 12, y: e.clientY - 8 });
    }
  };

  const badgeContent = (
    <span
      aria-hidden="true"
      className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border border-(--chat-dropdown-border) bg-(--chat-surface) align-[-3px] transition-all duration-150 group-hover:border-primary/60 group-hover:bg-primary/15 group-hover:shadow-sm select-none"
    >
      {host && !badgeIconError ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32`}
          alt=""
          className="h-3 w-3 rounded-full object-cover shrink-0"
          onError={() => setBadgeIconError(true)}
        />
      ) : (
        <Globe className="h-3 w-3 shrink-0 text-(--chat-text-secondary)" />
      )}
    </span>
  );

  const popoverContent = hovered && popoverPosition ? (
    <div
      className="fixed z-50 rounded-lg border border-(--chat-dropdown-border) bg-(--chat-dropdown) p-3 shadow-xl text-xs animate-in fade-in zoom-in duration-200 pointer-events-none"
      style={{
        left: popoverPosition.x,
        top: popoverPosition.y,
        minWidth: "220px",
        maxWidth: "280px",
      }}
    >
      <div className="flex items-start gap-2">
        {host && !popoverIconError ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`}
            alt=""
            className="h-6 w-6 rounded-sm object-cover shrink-0 mt-0.5"
            onError={() => setPopoverIconError(true)}
          />
        ) : (
          <div className="h-6 w-6 rounded-sm bg-(--chat-surface) flex items-center justify-center shrink-0 mt-0.5">
            <span className="text-[10px] font-medium text-(--chat-text-secondary)">
              {host ? host.charAt(0).toUpperCase() : "?"}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p
            className="font-medium text-(--chat-text) leading-4 truncate group-hover:text-primary transition-colors flex items-center gap-1"
            title={source.title || "Source"}
          >
            <span className="truncate">{source.title || "Source"}</span>
            {href ? <ExternalLink className="h-3 w-3 shrink-0 opacity-70" /> : null}
          </p>
          {source.snippet && (
            <p className="mt-0.5 text-(--chat-text-secondary) line-clamp-2 leading-4">
              {source.snippet}
            </p>
          )}
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-(--chat-source-link)">
            <span className="h-2 w-2 rounded-full bg-(--chat-source-link)" />
            <span className="truncate">{host || "Source"}</span>
            {href ? <span className="opacity-70 text-[10px]">(open in new tab ↗)</span> : null}
          </p>
        </div>
      </div>
    </div>
  ) : null;

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open source ${index}: ${source.title || host || href}`}
        className="relative inline-block align-baseline mx-0.5 cursor-pointer rounded-full no-underline outline-none group focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-(--chat-surface)"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseMove={handleMouseMove}
        title={source.title ? `${source.title} (${host || href})` : `Open source [${index}]`}
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {badgeContent}
        {popoverContent}
      </a>
    );
  }

  return (
    <span
      className="relative inline-block cursor-help align-baseline mx-0.5 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={handleMouseMove}
    >
      {badgeContent}
      {popoverContent}
    </span>
  );
}
