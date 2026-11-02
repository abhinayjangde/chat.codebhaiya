"use client";

import {
  Check,
  ChevronDown,
  Plug,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import type { McpServer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface McpServerPickerProps {
  servers?: McpServer[];
  accessToken?: string;
  runWithSession?: <T>(operation: (token: string) => Promise<T>) => Promise<T>;
  selectedServerIds: string[];
  onChange: (ids: string[]) => void;
}

export function McpServerPicker({
  servers: initialServers,
  accessToken,
  runWithSession,
  selectedServerIds,
  onChange,
}: McpServerPickerProps) {
  const [servers, setServers] = useState<McpServer[]>(initialServers ?? []);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(selectedServerIds);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialServers) {
      setServers(initialServers);
    }
  }, [initialServers]);

  const loadServers = useCallback(async () => {
    if (initialServers && initialServers.length > 0) return;
    if (!accessToken && !runWithSession) return;

    setLoading(true);
    try {
      const data = runWithSession
        ? await runWithSession((t) => apiClient.listMcpServers(t))
        : await apiClient.listMcpServers(accessToken!);
      setServers(data.servers ?? []);
    } catch {
      // Silent - picker is optional
    } finally {
      setLoading(false);
    }
  }, [initialServers, accessToken, runWithSession]);

  useEffect(() => {
    if (!initialServers) {
      loadServers();
    }
  }, [initialServers, loadServers]);

  useEffect(() => {
    setSelected(selectedServerIds);
  }, [selectedServerIds]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleServer = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const applySelection = () => {
    onChange(selected);
    setOpen(false);
  };

  const activeCount = servers.filter((s) => selected.includes(s._id)).length;

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setSelected(selectedServerIds);
          setOpen((prev) => !prev);
        }}
        disabled={loading}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-(--chat-dropdown-border) bg-(--chat-surface) px-2.5 py-1.5 text-xs text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text)",
          activeCount > 0 && "border-(--chat-brand)/40 bg-(--chat-brand)/10 text-(--chat-brand)"
        )}
        aria-label="MCP connectors"
        title={activeCount > 0 ? `${activeCount} MCP connector(s) active` : "Select MCP connectors"}
      >
        <Plug className={cn("h-3.5 w-3.5 shrink-0", activeCount > 0 ? "text-(--chat-brand)" : "text-(--chat-text-muted)")} />
        <span className="font-medium text-xs">
          {activeCount > 0 ? `${activeCount} MCP active` : "MCP"}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
      </button>

      {open && (
        <div
          ref={menuRef}
          className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-(--chat-dropdown-border) bg-(--chat-surface) py-2 shadow-2xl z-50"
        >
          <div className="px-3 pb-2 border-b border-(--chat-dropdown-border)">
            <Label className="text-[11px] font-bold uppercase tracking-wider text-(--chat-text-faint)">
              Chat MCP Connectors
            </Label>
            <p className="text-[11px] text-(--chat-text-muted) mt-0.5">
              Select connectors for this conversation.
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto p-1.5">
            {loading ? (
              <div className="px-3 py-4 text-center text-xs text-(--chat-text-muted)">
                Loading…
              </div>
            ) : servers.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-(--chat-text-muted)">
                No connectors configured yet
              </div>
            ) : (
              <div className="space-y-1">
                {servers.map((server) => {
                  const isChecked = selected.includes(server._id);
                  return (
                    <button
                      key={server._id}
                      type="button"
                      onClick={() => toggleServer(server._id)}
                      className={cn(
                        "flex items-center justify-between w-full px-2.5 py-2 text-xs transition rounded-lg text-left",
                        isChecked
                          ? "bg-(--chat-brand)/10 text-(--chat-brand) font-medium"
                          : "text-(--chat-text-secondary) hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text)"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full shrink-0",
                            server.isActive
                              ? "bg-emerald-500"
                              : "bg-zinc-500/50"
                          )}
                          title={server.isActive ? "Active" : "Disabled"}
                        />
                        <span className="truncate">{server.name}</span>
                        <span className="text-[10px] text-(--chat-text-faint) font-mono truncate">
                          {server.command}
                        </span>
                      </div>
                      {isChecked && (
                        <Check className="h-3.5 w-3.5 shrink-0 ml-2 text-(--chat-brand)" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="border-t border-(--chat-dropdown-border) px-3 pt-2 flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={applySelection}>
              Apply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
