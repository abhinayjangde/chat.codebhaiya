"use client";

import { useState } from "react";
import { MessageSource } from "@/lib/types";
import { formatSourceHost } from "@/lib/chat-utils";

interface CitationMarkerProps {
  index: number;
  source: MessageSource;
}

export function CitationMarker({ index, source }: CitationMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null);

  const href = source.url ?? source.link;
  const host = href ? formatSourceHost(href) : "";

  const handleMouseMove = (e: React.MouseEvent) => {
    setPopoverPosition({ x: e.clientX + 12, y: e.clientY - 8 });
  };

  return (
    <span
      className="relative inline-block cursor-help"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={handleMouseMove}
    >
      <span
        className="inline-flex items-center justify-center rounded-full border border-(--chat-dropdown-border) bg-(--chat-surface) px-1.5 py-0.5 text-[11px] font-medium text-(--chat-text-secondary) hover:bg-(--chat-dropdown-hover) transition-colors"
      >
        [{index}]
      </span>

      {hovered && popoverPosition && (
        <div
          className="fixed z-50 rounded-lg border border-(--chat-dropdown-border) bg-(--chat-dropdown) p-3 shadow-xl text-xs animate-in fade-in zoom-in duration-200"
          style={{
            left: popoverPosition.x,
            top: popoverPosition.y,
            minWidth: "220px",
            maxWidth: "260px",
          }}
        >
          <div className="flex items-start gap-2">
            {href ? (
              <img
                src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`}
                alt=""
                className="h-6 w-6 rounded-sm object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="h-6 w-6 rounded-sm bg-(--chat-surface) flex items-center justify-center">
                <span
                  className="text-[10px] font-medium text-(--chat-text-secondary)"
                >
                  {host.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p
                className="font-medium text-(--chat-text) leading-4 truncate"
                title={source.title || "Source"}
              >
                {source.title || "Source"}
              </p>
              {source.snippet && (
                <p className="mt-0.5 text-(--chat-text-secondary) line-clamp-2 leading-4">
                  {source.snippet}
                </p>
              )}
              <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-(--chat-source-link)">
                <span
                  className="h-3 w-3 rounded-full bg-(--chat-text-secondary) text-white flex items-center justify-center text-[10px]"
                >
                  ●
                </span>
                Source +{index}
              </p>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
