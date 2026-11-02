"use client";

import {
  Check,
  ChevronRight,
  Code2,
  Plug,
  Puzzle,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { McpServer } from "@/lib/types";

interface PromptToolsMenuProps {
  servers: McpServer[];
  selectedServerIds: string[];
  onServerIdsChange: (ids: string[]) => void;
  embedded?: boolean;
}

export function PromptToolsMenu({
  servers,
  selectedServerIds,
  onServerIdsChange,
  embedded = false,
}: PromptToolsMenuProps) {
  const [open, setOpen] = useState(false);
  const [connectorsOpen, setConnectorsOpen] = useState(false);
  const activeCount = selectedServerIds.length;

  const toggleServer = (serverId: string) => {
    onServerIdsChange(
      selectedServerIds.includes(serverId)
        ? selectedServerIds.filter((id) => id !== serverId)
        : [...selectedServerIds, serverId]
    );
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          embedded
            ? "flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:cursor-pointer hover:text-(--chat-text)"
            : "inline-flex h-8 items-center gap-1.5 rounded-full border border-(--chat-composer-border) px-2.5 text-xs text-(--chat-action-icon) transition hover:cursor-pointer hover:bg-(--chat-dropdown-hover) hover:text-(--chat-action-icon-hover)",
          open && "bg-(--chat-dropdown-hover) text-(--chat-action-icon-hover)",
          activeCount > 0 &&
            (embedded
              ? "bg-(--chat-brand)/10 text-(--chat-brand)"
              : "border-(--chat-brand)/40 text-(--chat-brand)")
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Customize prompt tools"
        title={activeCount > 0 ? `${activeCount} connector(s) enabled` : "Customize prompt tools"}
      >
        {embedded ? (
          <>
            <span className="flex items-center gap-3">
              <SlidersHorizontal className="h-4 w-4 text-(--chat-label)" />
              Customize prompt
            </span>
            <ChevronRight className="h-4 w-4 text-[#666]" />
          </>
        ) : (
          <>
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {activeCount > 0 && <span>{activeCount}</span>}
          </>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setOpen(false);
              setConnectorsOpen(false);
            }}
          />
          <div
            className={cn(
              "absolute z-50 w-60 rounded-xl border border-(--chat-dropdown-border) bg-(--chat-dropdown) py-1.5 shadow-2xl",
              embedded
                ? "left-full bottom-0 ml-1"
                : "bottom-full left-0 mb-2"
            )}
            role="menu"
          >
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-(--chat-text-faint)">
              Customize prompt
            </div>

            <div
              className="relative"
              onMouseEnter={() => setConnectorsOpen(true)}
              onMouseLeave={() => setConnectorsOpen(false)}
            >
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text)"
                onClick={() => setConnectorsOpen((current) => !current)}
                role="menuitem"
              >
                <span className="flex items-center gap-3">
                  <Plug className="h-4 w-4 text-(--chat-label)" />
                  Connectors
                </span>
                <ChevronRight className="h-4 w-4 text-[#666]" />
              </button>

              {connectorsOpen && (
                <div
                  className="absolute bottom-0 left-full z-50 ml-1 w-72 rounded-xl border border-(--chat-dropdown-border) bg-(--chat-dropdown) py-1.5 shadow-2xl"
                  role="menu"
                >
                  <div className="border-b border-(--chat-dropdown-border) px-3 pb-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-(--chat-text-faint)">
                      MCP connectors
                    </p>
                    <p className="mt-0.5 text-[11px] text-(--chat-text-muted)">
                      Enable tools for this prompt.
                    </p>
                  </div>
                  <div className="max-h-52 overflow-y-auto p-1.5">
                    {servers.length === 0 ? (
                      <p className="px-2 py-3 text-center text-xs text-(--chat-text-muted)">
                        No connectors configured
                      </p>
                    ) : (
                      servers.map((server) => {
                        const selected = selectedServerIds.includes(server._id);
                        return (
                          <button
                            key={server._id}
                            type="button"
                            onClick={() => toggleServer(server._id)}
                            className={cn(
                              "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition hover:bg-(--chat-dropdown-hover)",
                              selected
                                ? "bg-(--chat-brand)/10 text-(--chat-brand)"
                                : "text-(--chat-text-secondary)"
                            )}
                            role="menuitemcheckbox"
                            aria-checked={selected}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span
                                className={cn(
                                  "h-2 w-2 shrink-0 rounded-full",
                                  server.isActive ? "bg-emerald-500" : "bg-zinc-500/50"
                                )}
                              />
                              <span className="truncate">{server.name}</span>
                            </span>
                            {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              disabled
              className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-(--chat-text-muted) opacity-70"
              role="menuitem"
              title="Skills are not configured yet"
            >
              <span className="flex items-center gap-3">
                <Code2 className="h-4 w-4" />
                Skills
              </span>
              <span className="text-[10px]">Soon</span>
            </button>
            <button
              type="button"
              disabled
              className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-(--chat-text-muted) opacity-70"
              role="menuitem"
              title="Plugins are not configured yet"
            >
              <span className="flex items-center gap-3">
                <Puzzle className="h-4 w-4" />
                Plugins
              </span>
              <span className="text-[10px]">Soon</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
