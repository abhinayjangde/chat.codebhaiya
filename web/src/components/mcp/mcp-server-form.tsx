"use client";

import {
  type FormEvent,
  useRef,
  useState,
} from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import type {
  McpServer,
  McpServerFormData,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface McpServerFormProps {
  server?: McpServer | null;
  onSave: (data: McpServerFormData) => void;
  onClose: () => void;
  loading?: boolean;
}

interface Preset {
  label: string;
  name: string;
  command: string;
  args: string;
  hint: string;
}

const PRESETS: Preset[] = [
  {
    label: "Python (uv)",
    name: "Python MCP",
    command: "uv",
    args: "--directory D:\\curiosity\\custom-mcp run main.py",
    hint: "Local Python or FastMCP server via uv",
  },
  {
    label: "GitHub",
    name: "GitHub",
    command: "npx",
    args: "-y @modelcontextprotocol/server-github",
    hint: "GitHub MCP connector (requires GITHUB_PERSONAL_ACCESS_TOKEN)",
  },
  {
    label: "Filesystem",
    name: "Filesystem",
    command: "npx",
    args: "-y @modelcontextprotocol/server-filesystem C:\\path\\to\\folder",
    hint: "Filesystem connector",
  },
  {
    label: "Fetch",
    name: "Fetch",
    command: "npx",
    args: "-y @modelcontextprotocol/server-fetch",
    hint: "Web fetch connector",
  },
];

/**
 * Splits command-line arguments string respecting single and double quotes.
 */
function parseArgs(input: string): string[] {
  const result: string[] = [];
  const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    if (match[1] !== undefined) {
      result.push(match[1]);
    } else if (match[2] !== undefined) {
      result.push(match[2]);
    } else {
      result.push(match[0]);
    }
  }
  return result;
}

export function McpServerForm({
  server,
  onSave,
  onClose,
  loading = false,
}: McpServerFormProps) {
  const [name, setName] = useState(server?.name ?? "");
  const [command, setCommand] = useState(server?.command ?? "");
  const [argsInput, setArgsInput] = useState(
    server?.args && server.args.length > 0 ? server.args.join(" ") : ""
  );
  const [env, setEnv] = useState<Record<string, string>>(
    server?.env ?? {}
  );
  const [isActive, setIsActive] = useState(server?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const envKeyRef = useRef<HTMLInputElement>(null);
  const envValueRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    const trimmedCommand = command.trim();

    if (!trimmedName) {
      setError("Server name is required");
      return;
    }
    if (!trimmedCommand) {
      setError("Command is required");
      return;
    }

    const parsedArgs = parseArgs(argsInput);

    // Validate args don't start with "=" which breaks npm/npx package names
    const invalidArg = parsedArgs.find((a) => a.startsWith("="));
    if (invalidArg) {
      setError(
        `Invalid argument "${invalidArg}". Arguments should not start with "=" (e.g. use "-y github-mcp-server", not "=y github-mcp-server").`
      );
      return;
    }

    // Capture any pending env variable typed in the inputs
    const envClean: Record<string, string> = { ...env };
    const pendingKey = envKeyRef.current?.value.trim();
    const pendingValue = envValueRef.current?.value.trim() ?? "";
    if (pendingKey) {
      envClean[pendingKey] = pendingValue;
      if (envKeyRef.current) envKeyRef.current.value = "";
      if (envValueRef.current) envValueRef.current.value = "";
    }

    onSave({
      name: trimmedName,
      command: trimmedCommand,
      args: parsedArgs,
      env: envClean,
      isActive,
    });
  };

  const addEnvVar = () => {
    const key = envKeyRef.current?.value.trim();
    const value = envValueRef.current?.value.trim();
    if (!key) return;
    setEnv((prev) => ({
      ...prev,
      [key]: value ?? "",
    }));
    if (envKeyRef.current) envKeyRef.current.value = "";
    if (envValueRef.current) envValueRef.current.value = "";
    envKeyRef.current?.focus();
  };

  const removeEnvVar = (key: string) => {
    setEnv((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const applyPreset = (preset: Preset) => {
    setCommand(preset.command);
    setArgsInput(preset.args);
    if (!name.trim()) {
      setName(preset.name);
    }
  };

  const title = server ? "Edit MCP Server" : "Add MCP Server";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl border border-(--chat-dropdown-border) bg-(--chat-surface) p-4 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-(--chat-text)">
              {title}
            </h3>
            <p className="text-xs text-(--chat-text-muted) mt-0.5">
              Connect a Model Context Protocol (MCP) server running locally or via CLI.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-(--chat-text-muted) hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) transition"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Server Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs font-medium text-(--chat-text)">
              Server name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. custom-mcp"
              disabled={loading}
              className="text-sm"
            />
            <p className="text-[11px] text-(--chat-text-faint)">
              A display name for this connector.
            </p>
          </div>

          {/* Command (Exactly one input) */}
          <div className="space-y-1.5">
            <Label htmlFor="command" className="text-xs font-medium text-(--chat-text)">
              Command
            </Label>
            <Input
              id="command"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g. uv, npx, node, python"
              disabled={loading}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-(--chat-text-faint)">
              The executable to run (e.g. <code>uv</code>, <code>npx</code>, <code>node</code>, <code>python</code>).
            </p>
          </div>

          {/* Arguments */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="args" className="text-xs font-medium text-(--chat-text)">
                Arguments
              </Label>
              <span className="text-[11px] text-(--chat-text-faint)">space-separated</span>
            </div>
            <Input
              id="args"
              value={argsInput}
              onChange={(e) => setArgsInput(e.target.value)}
              placeholder="e.g. --directory D:\curiosity\custom-mcp run main.py"
              disabled={loading}
              className="font-mono text-xs"
            />
            <p className="text-[11px] text-(--chat-text-faint)">
              Arguments passed to the command. Quotes are supported for paths containing spaces.
            </p>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-(--chat-text-faint)">Presets:</span>
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="inline-flex items-center rounded-md border border-(--chat-dropdown-border) bg-(--chat-bg) px-2 py-1 text-xs text-(--chat-text-secondary) hover:border-(--chat-brand)/40 hover:bg-(--chat-dropdown-hover) hover:text-(--chat-text) transition"
                  disabled={loading}
                  title={preset.hint}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Environment Variables */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-(--chat-text)">
                Environment variables
              </Label>
              <span className="text-[11px] text-(--chat-text-faint)">Optional</span>
            </div>

            {Object.keys(env).length > 0 && (
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {Object.entries(env).map(([key, value]) => (
                  <div key={key} className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                    <Input
                      value={key}
                      onChange={(e) => {
                        const newKey = e.target.value;
                        setEnv((prev) => {
                          const next = { ...prev };
                          delete next[key];
                          if (newKey) next[newKey] = value;
                          return next;
                        });
                      }}
                      placeholder="KEY"
                      className="w-full flex-1 font-mono text-xs"
                      disabled={loading}
                    />
                    <Input
                      value={value}
                      onChange={(e) =>
                        setEnv((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      placeholder="value"
                      type="password"
                      className="w-full flex-1 font-mono text-xs"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => removeEnvVar(key)}
                      className="self-end rounded p-2 text-(--chat-text-muted) transition hover:bg-red-500/10 hover:text-red-400 sm:self-auto"
                      disabled={loading}
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              <Input
                ref={envKeyRef}
                placeholder="KEY (e.g. API_TOKEN)"
                className="w-full flex-1 font-mono text-xs"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addEnvVar();
                  }
                }}
              />
              <Input
                ref={envValueRef}
                placeholder="value"
                type="password"
                className="w-full flex-1 font-mono text-xs"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addEnvVar();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addEnvVar}
                disabled={loading}
                className="h-10 shrink-0 px-3 sm:h-9"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
            <p className="text-[11px] text-(--chat-text-faint)">
              Secrets are stored encrypted and never sent to the LLM.
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2.5 pt-2">
            <input
              id="isActive"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={loading}
              className="h-4 w-4 rounded border-(--chat-dropdown-border) bg-(--chat-bg) text-(--chat-brand) focus:ring-(--chat-focus-ring) cursor-pointer"
            />
            <Label
              htmlFor="isActive"
              className="text-xs font-normal text-(--chat-text-secondary) cursor-pointer select-none"
            >
              Active (available for use in chat sessions)
            </Label>
          </div>

          {/* Buttons */}
          <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-(--chat-dropdown-border)">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim() || !command.trim()}
              className="min-w-28"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Saving…
                </>
              ) : server ? (
                "Save changes"
              ) : (
                "Add server"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
