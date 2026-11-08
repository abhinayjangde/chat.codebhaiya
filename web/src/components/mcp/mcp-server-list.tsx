"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Cloud,
  Code2,
  Terminal,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Wrench,
  X,
  Zap,
  ZapOff,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import type { McpServer, McpServerFormData } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { McpServerForm } from "./mcp-server-form";
import { McpMarketplace } from "./mcp-marketplace";

interface ToolItem {
  name: string;
  description?: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

interface McpServerListProps {
  accessToken?: string;
  runWithSession?: <T>(operation: (token: string) => Promise<T>) => Promise<T>;
  refreshTokens?: () => Promise<string | null>;
  onServersChange?: (servers: McpServer[]) => void;
  onBack?: () => void;
}

export function McpServerList({
  accessToken,
  runWithSession,
  refreshTokens,
  onServersChange,
  onBack,
}: McpServerListProps) {
  const [activeTab, setActiveTab] = useState<"marketplace" | "custom">("marketplace");
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServer | null>(null);
  const [savingServerId, setSavingServerId] = useState<string | null>(null);
  const [deletingServerId, setDeletingServerId] = useState<string | null>(null);
  const [toolsLoadingServerId, setToolsLoadingServerId] = useState<string | null>(null);

  // Tool preview modal state
  const [previewModal, setPreviewModal] = useState<{
    serverName: string;
    tools: ToolItem[];
  } | null>(null);

  /**
   * Executes an API request with automatic token refresh on 401/403.
   */
  const executeWithAuth = useCallback(
    async <T,>(operation: (token: string) => Promise<T>): Promise<T> => {
      if (runWithSession) {
        return runWithSession(operation);
      }

      if (!accessToken) {
        throw new Error("User is not authenticated");
      }

      try {
        return await operation(accessToken);
      } catch (error) {
        const apiError = error as { status?: number };
        if (
          (apiError.status === 401 || apiError.status === 403) &&
          refreshTokens
        ) {
          const newToken = await refreshTokens();
          if (newToken) {
            return await operation(newToken);
          }
        }
        throw error;
      }
    },
    [runWithSession, accessToken, refreshTokens]
  );

  const loadServers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await executeWithAuth((token) =>
        apiClient.listMcpServers(token)
      );
      const list = data.servers ?? [];
      setServers(list);
      onServersChange?.(list);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load MCP servers"
      );
    } finally {
      setLoading(false);
    }
  }, [executeWithAuth, onServersChange]);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  const handleSave = useCallback(
    async (data: McpServerFormData) => {
      setSavingServerId(editingServer?._id ?? "new");
      try {
        if (editingServer?._id) {
          await executeWithAuth((token) =>
            apiClient.updateMcpServer(editingServer._id, data, token)
          );
          toast.success("MCP server updated successfully");
        } else {
          await executeWithAuth((token) =>
            apiClient.createMcpServer(data, token)
          );
          toast.success("MCP server connected and added");
        }
        setFormOpen(false);
        setEditingServer(null);
        await loadServers();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save MCP server"
        );
      } finally {
        setSavingServerId(null);
      }
    },
    [editingServer?._id, executeWithAuth, loadServers]
  );

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove MCP server "${name}"?`)) {
      return;
    }
    setDeletingServerId(id);
    try {
      await executeWithAuth((token) => apiClient.deleteMcpServer(id, token));
      toast.success("MCP server removed");
      await loadServers();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove MCP server"
      );
    } finally {
      setDeletingServerId(null);
    }
  };

  const handlePreviewTools = async (server: McpServer) => {
    setToolsLoadingServerId(server._id);
    try {
      const data = await executeWithAuth((token) =>
        apiClient.listMcpServerTools(server._id, token)
      );
      const tools = data.tools ?? [];
      setPreviewModal({
        serverName: server.name,
        tools,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to inspect MCP tools"
      );
    } finally {
      setToolsLoadingServerId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-(--chat-bg) text-(--chat-text)">
      <header className="flex h-14 shrink-0 items-center border-b border-(--chat-dropdown-border) bg-(--chat-surface)/50 px-4 backdrop-blur-md md:px-8">
        <div className="flex items-center gap-3">
          {onBack && (
            <button type="button" onClick={onBack} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-(--chat-dropdown-border) bg-(--chat-surface) text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text)" aria-label="Back to chat">
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <h1 className="text-base font-semibold leading-tight text-(--chat-text)">MCP Connectors</h1>
            <p className="text-xs text-(--chat-text-muted)">Manage cloud integrations and active servers</p>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <nav aria-label="MCP connector sections" className="flex shrink-0 flex-row gap-1 border-b border-(--chat-dropdown-border) bg-(--chat-surface)/30 p-2 md:w-64 md:flex-col md:border-b-0 md:border-r md:p-4">
          <button type="button" onClick={() => setActiveTab("marketplace")} className={cn("flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition md:flex-none", activeTab === "marketplace" ? "bg-(--chat-brand)/10 font-semibold text-(--chat-brand)" : "text-(--chat-text-secondary) hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text)")}>
            <Cloud className="h-4 w-4 shrink-0" /><span>Cloud Marketplace</span>
          </button>
          <button type="button" onClick={() => setActiveTab("custom")} className={cn("flex flex-1 items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-medium transition md:flex-none", activeTab === "custom" ? "bg-(--chat-brand)/10 font-semibold text-(--chat-brand)" : "text-(--chat-text-secondary) hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text)")}>
            <Terminal className="h-4 w-4 shrink-0" /><span>Custom STDIO</span>
          </button>
        </nav>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-8">
          {activeTab === "marketplace" ? (
            <McpMarketplace embedded accessToken={accessToken} runWithSession={runWithSession} refreshTokens={refreshTokens} onServersChange={(newServers) => { setServers(newServers); onServersChange?.(newServers); }} />
          ) : (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-(--chat-text)">Custom STDIO Connectors</h2>
            <p className="text-xs text-(--chat-text-muted)">Configure local command-line servers and custom arguments.</p>
          </div>
          <Button type="button" onClick={() => { setEditingServer(null); setFormOpen(true); }} disabled={loading} className="shrink-0 gap-1.5">
            <Plus className="h-4 w-4" /> Add Server
          </Button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-(--chat-text-muted)">
            <Loader2 className="h-6 w-6 animate-spin mb-3 text-(--chat-brand)" />
            <p className="text-sm">Loading MCP connectors…</p>
          </div>
        ) : servers.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-(--chat-dropdown-border) bg-(--chat-surface)/50 px-6 py-16 text-center">
            <div className="rounded-full bg-(--chat-brand)/10 p-3 text-(--chat-brand) mb-4">
              <Code2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-(--chat-text)">
              No MCP connectors yet
            </h3>
            <p className="mt-1 max-w-md text-xs text-(--chat-text-muted)">
              Add an MCP server to give your AI assistants access to local command-line tools, databases, GitHub, or Python FastMCP scripts.
            </p>
            <Button
              type="button"
              onClick={() => {
                setEditingServer(null);
                setFormOpen(true);
              }}
              className="mt-5 gap-1.5"
            >
              <Plus className="h-4 w-4" /> Add First Connector
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {servers.map((server) => {
              const isDeleting = deletingServerId === server._id;
              const isInspecting = toolsLoadingServerId === server._id;

              return (
                <div
                  key={server._id}
                  className={cn(
                    "group flex flex-col justify-between gap-4 rounded-xl border border-(--chat-dropdown-border) bg-(--chat-surface) p-4 transition hover:border-(--chat-brand)/30 sm:p-5 md:flex-row md:items-center",
                    !server.isActive && "opacity-70"
                  )}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={cn(
                        "mt-1 rounded-lg p-2 shrink-0",
                        server.isActive
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-zinc-500/10 text-zinc-400"
                      )}
                      title={server.isActive ? "Active" : "Inactive"}
                    >
                      {server.isActive ? (
                        <Zap className="h-4 w-4" />
                      ) : (
                        <ZapOff className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm text-(--chat-text) truncate">
                          {server.name}
                        </h4>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
                            server.isActive
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                          )}
                        >
                          {server.isActive ? "Active" : "Disabled"}
                        </span>
                      </div>

                      <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-2 font-mono text-xs text-(--chat-text-muted)">
                        <span className="rounded bg-(--chat-bg) px-2 py-0.5 border border-(--chat-dropdown-border) text-(--chat-brand)">
                          {server.command}
                        </span>
                        {server.args && server.args.length > 0 && (
                          <span className="min-w-0 max-w-full flex-1 truncate text-(--chat-text-secondary) sm:max-w-md">
                            {server.args.join(" ")}
                          </span>
                        )}
                        {server.env && Object.keys(server.env).length > 0 && (
                          <span className="text-[11px] text-(--chat-text-faint)">
                            • {Object.keys(server.env).length} env var(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 self-end md:self-center">
                    {/* Preview Tools */}
                    <button
                      type="button"
                      onClick={() => handlePreviewTools(server)}
                      disabled={isInspecting || loading}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-(--chat-dropdown-border) bg-(--chat-bg) px-3 py-2 text-xs text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) sm:min-h-0 sm:px-2.5 sm:py-1.5"
                      title="Inspect exposed tools"
                    >
                      {isInspecting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Wrench className="h-3.5 w-3.5 text-(--chat-brand)" />
                      )}
                      <span>Tools</span>
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingServer(server);
                        setFormOpen(true);
                      }}
                      disabled={loading}
                      className="rounded-lg border border-(--chat-dropdown-border) bg-(--chat-bg) p-3 text-(--chat-text-secondary) transition hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) sm:p-2"
                      title="Edit server"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDelete(server._id, server.name)}
                      disabled={isDeleting || loading}
                      className="rounded-lg border border-(--chat-dropdown-border) bg-(--chat-bg) p-3 text-(--chat-text-secondary) transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 sm:p-2"
                      title="Remove server"
                      aria-label="Delete"
                    >
                      {isDeleting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-red-400" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add / Edit Form Modal */}
        {formOpen && (
          <McpServerForm
            server={editingServer ?? undefined}
            onSave={handleSave}
            onClose={() => {
              setFormOpen(false);
              setEditingServer(null);
            }}
            loading={savingServerId !== null}
          />
        )}

        {/* Tool Preview Modal */}
        {previewModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Exposed Tools"
          >
            <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setPreviewModal(null)}
            />
            <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-(--chat-dropdown-border) bg-(--chat-surface) p-4 shadow-2xl sm:p-6">
              <div className="flex items-center justify-between border-b border-(--chat-dropdown-border) pb-4 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-(--chat-brand)/10 p-2 text-(--chat-brand)">
                    <Wrench className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-(--chat-text)">
                      Exposed Tools
                    </h3>
                    <p className="text-xs text-(--chat-text-muted)">
                      Server: <span className="font-medium text-(--chat-text)">{previewModal.serverName}</span> ({previewModal.tools.length} tool{previewModal.tools.length === 1 ? "" : "s"})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewModal(null)}
                  className="rounded-lg p-1.5 text-(--chat-text-muted) hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) transition"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {previewModal.tools.length === 0 ? (
                <div className="py-8 text-center text-xs text-(--chat-text-muted)">
                  This MCP server did not advertise any tools.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {previewModal.tools.map((t) => {
                    const propCount = t.inputSchema?.properties
                      ? Object.keys(t.inputSchema.properties).length
                      : 0;
                    return (
                      <div
                        key={t.name}
                        className="rounded-lg border border-(--chat-dropdown-border) bg-(--chat-bg) p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold text-(--chat-brand)">
                            {t.name}
                          </span>
                          {propCount > 0 && (
                            <span className="text-[10px] text-(--chat-text-faint)">
                              {propCount} parameter{propCount === 1 ? "" : "s"}
                            </span>
                          )}
                        </div>
                        {t.description && (
                          <p className="mt-1 text-xs text-(--chat-text-secondary)">
                            {t.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="mt-6 flex justify-end pt-3 border-t border-(--chat-dropdown-border)">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPreviewModal(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
          )}
        </main>
      </div>
    </div>
  );
}
