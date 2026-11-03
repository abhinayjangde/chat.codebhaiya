"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Cloud,
  Copy,
  Database,
  GitBranch,
  Layers,
  Leaf,
  Loader2,
  Lock,
  Search,
  Settings2,
  Terminal,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api";
import type {
  CloudConnector,
  ConnectCloudPayload,
  McpServer,
  McpTool,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface McpMarketplaceProps {
  accessToken?: string;
  runWithSession?: <T>(operation: (token: string) => Promise<T>) => Promise<T>;
  refreshTokens?: () => Promise<string | null>;
  onServersChange?: (servers: McpServer[]) => void;
  onSwitchToCustom?: () => void;
  onBack?: () => void;
}

export function McpMarketplace({
  accessToken,
  runWithSession,
  refreshTokens,
  onServersChange,
  onSwitchToCustom,
  onBack,
}: McpMarketplaceProps) {
  const [connectors, setConnectors] = useState<CloudConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Config modal state
  const [configModalConnector, setConfigModalConnector] = useState<CloudConnector | null>(null);
  const [configInputs, setConfigInputs] = useState<Record<string, string>>({});
  const [authInputs, setAuthInputs] = useState<Record<string, string>>({});
  const [customServerName, setCustomServerName] = useState("");
  const [isSandboxMode, setIsSandboxMode] = useState(true);

  // Tools preview modal state
  const [toolsModalData, setToolsModalData] = useState<{
    connectorName: string;
    tools: McpTool[];
  } | null>(null);

  /**
   * Helper to execute an authenticated request with auto-refresh.
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
        if ((apiError.status === 401 || apiError.status === 403) && refreshTokens) {
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

  const loadMarketplace = useCallback(async () => {
    setLoading(true);
    try {
      const data = await executeWithAuth((token) => apiClient.getMarketplace(token));
      setConnectors(data.connectors ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || "Failed to load cloud marketplace");
    } finally {
      setLoading(false);
    }
  }, [executeWithAuth]);

  useEffect(() => {
    void loadMarketplace();
  }, [loadMarketplace]);

  /**
   * Refresh the user's servers list in the parent chat app context.
   */
  const syncParentServers = useCallback(async () => {
    if (!onServersChange) return;
    try {
      const data = await executeWithAuth((token) => apiClient.listMcpServers(token));
      onServersChange(data.servers ?? []);
    } catch {
      // Non-critical background sync
    }
  }, [executeWithAuth, onServersChange]);

  /**
   * 1-Click Fast Connect (Zero Terminal Setup)
   */
  const handleQuickConnect = async (connector: CloudConnector) => {
    setConnectingId(connector.id);
    try {
      const payload: ConnectCloudPayload = {
        connectorId: connector.id,
        name: connector.name,
        authType: connector.defaultAuthType,
        cloudConfig: {},
        authData: {},
      };

      const result = await executeWithAuth((token) =>
        apiClient.connectCloudConnector(payload, token)
      );

      toast.success(`Connected ${connector.name} in 1 click! (${result.toolCount} tools ready)`);
      await loadMarketplace();
      await syncParentServers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || `Failed to connect ${connector.name}`);
    } finally {
      setConnectingId(null);
    }
  };

  /**
   * Disconnect Cloud Connector
   */
  const handleDisconnect = async (connector: CloudConnector) => {
    setDisconnectingId(connector.id);
    try {
      await executeWithAuth((token) =>
        apiClient.disconnectCloudConnector(connector.id, token)
      );
      toast.success(`Disconnected ${connector.name}`);
      await loadMarketplace();
      await syncParentServers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || `Failed to disconnect ${connector.name}`);
    } finally {
      setDisconnectingId(null);
    }
  };

  /**
   * Open Custom Configuration Dialog for custom DB URLs or API Keys
   */
  const openConfigModal = (connector: CloudConnector) => {
    setConfigModalConnector(connector);
    setCustomServerName(connector.serverName || connector.name);
    setConfigInputs((connector.installedConfig as Record<string, string>) || {});
    setAuthInputs({});
    setIsSandboxMode(true);
  };

  /**
   * Submit Custom Configuration Form
   */
  const handleSaveConfig = async () => {
    if (!configModalConnector) return;
    setConnectingId(configModalConnector.id);
    try {
      const payload: ConnectCloudPayload = {
        connectorId: configModalConnector.id,
        name: customServerName || configModalConnector.name,
        authType: isSandboxMode ? configModalConnector.defaultAuthType : "api_key",
        cloudConfig: isSandboxMode ? {} : configInputs,
        authData: isSandboxMode ? {} : authInputs,
      };

      const result = await executeWithAuth((token) =>
        apiClient.connectCloudConnector(payload, token)
      );

      toast.success(`Connected ${configModalConnector.name}! (${result.toolCount} tools active)`);
      setConfigModalConnector(null);
      await loadMarketplace();
      await syncParentServers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg || "Failed to save configuration");
    } finally {
      setConnectingId(null);
    }
  };

  /**
   * Copy Sample Prompt to Clipboard
   */
  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    toast.success("Prompt copied to clipboard!");
  };

  // Filter connectors by category & search query
  const filteredConnectors = useMemo(() => {
    return connectors.filter((c) => {
      const matchesCategory =
        selectedCategory === "All" || c.category === selectedCategory;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.features.some((f) => f.toLowerCase().includes(q)) ||
        c.defaultTools.some((t) => t.name.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [connectors, selectedCategory, searchQuery]);

  const categories = ["All", "Databases", "Developer Tools", "Productivity"];
  const connectedCount = connectors.filter((c) => c.isConnected).length;

  // Icon mapping
  const renderConnectorIcon = (icon: string) => {
    switch (icon) {
      case "github":
        return <GitBranch className="h-6 w-6 text-purple-400" />;
      case "database":
        return <Database className="h-6 w-6 text-blue-400" />;
      case "leaf":
        return <Leaf className="h-6 w-6 text-emerald-400" />;
      case "zap":
        return <Zap className="h-6 w-6 text-amber-400" />;
      case "layers":
        return <Layers className="h-6 w-6 text-indigo-400" />;
      default:
        return <Cloud className="h-6 w-6 text-cyan-400" />;
    }
  };

  return (
    <div className="flex h-full flex-col bg-(--chat-bg) text-(--chat-text-primary)">
      {/* Top Bar */}
      <div className="border-b border-(--chat-border) bg-(--chat-surface) px-6 py-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Cloud className="h-4 w-4" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight">Managed Cloud MCP Marketplace</h1>
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                Zero Terminal Setup{connectedCount > 0 ? ` • ${connectedCount} Active` : ""}
              </span>
            </div>
            <p className="mt-1 text-sm text-(--chat-text-secondary)">
              Host pre-authenticated MCP server integrations directly in the cloud. Toggle databases and developer tools in 1 click — no local terminal, CLI, or stdio commands required.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onSwitchToCustom && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSwitchToCustom}
                className="gap-1.5 text-xs border-(--chat-border) hover:bg-(--chat-border)/50"
              >
                <Terminal className="h-3.5 w-3.5 text-neutral-400" />
                Custom STDIO
              </Button>
            )}
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-xs text-(--chat-text-secondary) hover:text-(--chat-text-primary)"
              >
                Back to Chat
              </Button>
            )}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition",
                  selectedCategory === cat
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-(--chat-border)/40 text-(--chat-text-secondary) hover:bg-(--chat-border) hover:text-(--chat-text-primary)"
                )}
              >
                {cat}
                {cat === "All" && ` (${connectors.length})`}
              </button>
            ))}
          </div>

          <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-(--chat-text-secondary)" />
            <input
              type="text"
              placeholder="Search connectors or tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-md border border-(--chat-border) bg-(--chat-bg) pl-8 pr-3 text-xs text-(--chat-text-primary) placeholder:text-(--chat-text-secondary) focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 text-(--chat-text-secondary)">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            <p className="text-sm">Loading Managed Cloud Connectors...</p>
          </div>
        ) : filteredConnectors.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center text-center">
            <p className="text-sm text-(--chat-text-secondary)">No connectors match your search.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("All");
              }}
              className="mt-3 text-xs"
            >
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredConnectors.map((connector) => {
              const isConnecting = connectingId === connector.id;
              const isDisconnecting = disconnectingId === connector.id;
              const isConnected = connector.isConnected;

              return (
                <div
                  key={connector.id}
                  className={cn(
                    "flex flex-col justify-between rounded-xl border bg-(--chat-surface) p-5 transition-all shadow-xs",
                    isConnected
                      ? "border-emerald-500/40 shadow-emerald-500/5 ring-1 ring-emerald-500/20"
                      : "border-(--chat-border) hover:border-(--chat-border)/80 hover:shadow-md"
                  )}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900/60 border border-(--chat-border)">
                          {renderConnectorIcon(connector.icon)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm text-(--chat-text-primary)">
                              {connector.name}
                            </h3>
                          </div>
                          <span className="text-[11px] text-(--chat-text-secondary)">
                            {connector.provider} • {connector.category}
                          </span>
                        </div>
                      </div>

                      {connector.badge && (
                        <span className="rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-medium text-indigo-400">
                          {connector.badge}
                        </span>
                      )}
                    </div>

                    {/* Tagline & Description */}
                    <p className="mt-3 text-xs font-medium text-(--chat-text-primary)">
                      {connector.tagline}
                    </p>
                    <p className="mt-1 text-xs text-(--chat-text-secondary) line-clamp-2">
                      {connector.description}
                    </p>

                    {/* Features list */}
                    <div className="mt-4 space-y-1.5 border-t border-(--chat-border)/60 pt-3">
                      {connector.features.slice(0, 3).map((feat, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-(--chat-text-secondary)">
                          <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-400" />
                          <span className="truncate">{feat}</span>
                        </div>
                      ))}
                    </div>

                    {/* Sample prompt chip */}
                    {connector.samplePrompts[0] && (
                      <div className="mt-3 rounded-lg bg-(--chat-bg) border border-(--chat-border)/60 p-2.5">
                        <div className="flex items-center justify-between text-[10px] font-medium text-(--chat-text-secondary)">
                          <span>Sample Chat Prompt</span>
                          <button
                            type="button"
                            onClick={() => handleCopyPrompt(connector.samplePrompts[0]!)}
                            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition"
                            title="Copy prompt"
                          >
                            <Copy className="h-3 w-3" />
                            <span>Copy</span>
                          </button>
                        </div>
                        <p className="mt-1 text-xs text-(--chat-text-primary) italic">
                          &ldquo;{connector.samplePrompts[0]}&rdquo;
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions Bottom Bar */}
                  <div className="mt-5 border-t border-(--chat-border) pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setToolsModalData({
                            connectorName: connector.name,
                            tools: connector.defaultTools,
                          })
                        }
                        className="text-[11px] text-(--chat-text-secondary) hover:text-indigo-400 underline-offset-2 hover:underline transition"
                      >
                        {connector.defaultTools.length} tools available
                      </button>

                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openConfigModal(connector)}
                          title="Custom credentials & settings"
                          className="h-8 w-8 p-0 text-(--chat-text-secondary) hover:text-(--chat-text-primary)"
                        >
                          <Settings2 className="h-3.5 w-3.5" />
                        </Button>

                        {isConnected ? (
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={isDisconnecting}
                            onClick={() => handleDisconnect(connector)}
                            className="h-8 text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                          >
                            {isDisconnecting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              "Disconnect"
                            )}
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={isConnecting}
                            onClick={() => handleQuickConnect(connector)}
                            className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 shadow-sm"
                          >
                            {isConnecting ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <Zap className="h-3.5 w-3.5 fill-current" />
                                1-Click Connect
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom Configuration Modal */}
      {configModalConnector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-xl border border-(--chat-border) bg-(--chat-surface) p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-(--chat-border) pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 border border-(--chat-border)">
                  {renderConnectorIcon(configModalConnector.icon)}
                </div>
                <div>
                  <h3 className="font-semibold text-base">{configModalConnector.name} Configuration</h3>
                  <p className="text-xs text-(--chat-text-secondary)">Connect with OAuth or enter custom credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfigModalConnector(null)}
                className="text-(--chat-text-secondary) hover:text-(--chat-text-primary)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <Label className="text-xs">Connector Name in Chat</Label>
                <Input
                  className="mt-1 h-8 text-xs"
                  value={customServerName}
                  onChange={(e) => setCustomServerName(e.target.value)}
                  placeholder={configModalConnector.name}
                />
              </div>

              {/* Mode Toggle */}
              <div className="rounded-lg border border-(--chat-border) bg-(--chat-bg) p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-(--chat-text-primary)">
                      Zero-Terminal Cloud Sandbox
                    </p>
                    <p className="text-[11px] text-(--chat-text-secondary)">
                      Instantly test queries and tools against pre-provisioned cloud data without needing local database credentials.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={isSandboxMode}
                    onChange={(e) => setIsSandboxMode(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-600 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {!isSandboxMode && (
                <div className="space-y-3 rounded-lg border border-(--chat-border) p-3 bg-(--chat-bg)/50">
                  <p className="text-xs font-medium text-amber-400 flex items-center gap-1.5">
                    <Lock className="h-3 w-3" /> Custom Production Credentials
                  </p>

                  {configModalConnector.configFields.map((field) => (
                    <div key={field.key}>
                      <Label className="text-xs">{field.label}</Label>
                      <Input
                        type={field.type}
                        className="mt-1 h-8 text-xs"
                        placeholder={field.placeholder}
                        value={configInputs[field.key] || ""}
                        onChange={(e) =>
                          setConfigInputs((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                      />
                      {field.description && (
                        <p className="mt-1 text-[10px] text-(--chat-text-secondary)">{field.description}</p>
                      )}
                    </div>
                  ))}

                  {configModalConnector.authFields.map((field) => (
                    <div key={field.key}>
                      <Label className="text-xs">{field.label}</Label>
                      <Input
                        type={field.type}
                        className="mt-1 h-8 text-xs"
                        placeholder={field.placeholder}
                        value={authInputs[field.key] || ""}
                        onChange={(e) =>
                          setAuthInputs((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                      />
                      {field.description && (
                        <p className="mt-1 text-[10px] text-(--chat-text-secondary)">{field.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-(--chat-border) pt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfigModalConnector(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={Boolean(connectingId)}
                onClick={handleSaveConfig}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
              >
                {connectingId ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5 fill-current" />
                    Save &amp; Connect
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tools Preview Modal */}
      {toolsModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-2xl max-h-[80vh] flex flex-col rounded-xl border border-(--chat-border) bg-(--chat-surface) p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-(--chat-border) pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-indigo-400" />
                <h3 className="font-semibold text-base">
                  {toolsModalData.connectorName} Tools ({toolsModalData.tools.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setToolsModalData(null)}
                className="text-(--chat-text-secondary) hover:text-(--chat-text-primary)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
              {toolsModalData.tools.map((t) => (
                <div key={t.name} className="rounded-lg border border-(--chat-border) bg-(--chat-bg) p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-indigo-400">
                      {t.name}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300">
                      MCP Tool
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-(--chat-text-secondary)">
                    {t.description || "No description available."}
                  </p>
                  {t.inputSchema && (
                    <div className="mt-2 text-[11px] font-mono bg-neutral-950/60 rounded p-2 text-neutral-300 overflow-x-auto">
                      <code>{JSON.stringify(t.inputSchema, null, 2)}</code>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end border-t border-(--chat-border) pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setToolsModalData(null)}
                className="text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
