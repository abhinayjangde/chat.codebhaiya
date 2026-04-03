
import { MessageSource, UsedTool, StreamEvent } from "@/lib/types";

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "AbortError") {
    return true;
  }

  if (error instanceof Error) {
    return error.message.toLowerCase().includes("abort");
  }

  return false;
}

export function normalizeSource(source: MessageSource): MessageSource {
  if (source.url || !source.link) {
    return source;
  }
  return { ...source, url: source.link };
}

export function mergeSources(
  existing: MessageSource[] | undefined,
  incoming: MessageSource[]
): MessageSource[] {
  const byKey = new Map<string, MessageSource>();

  for (const source of [...(existing ?? []), ...incoming].map(normalizeSource)) {
    const key = `${source.url ?? source.link ?? ""}-${source.title}-${source.position ?? ""}`;
    byKey.set(key, source);
  }

  return Array.from(byKey.values());
}

export function mergeUsedTools(existing: UsedTool[] | undefined, incoming: UsedTool): UsedTool[] {
  const tools = [...(existing ?? [])];
  const key = `${incoming.name}-${JSON.stringify(incoming.input ?? null)}`;
  const index = tools.findIndex((tool) => {
    const currentKey = `${tool.name}-${JSON.stringify(tool.input ?? null)}`;
    return currentKey === key;
  });

  if (index === -1) {
    tools.push(incoming);
    return tools;
  }

  tools[index] = { ...tools[index], ...incoming };
  return tools;
}

export function formatDateLabel(value?: string): string {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const mins = Math.max(1, Math.round(diffMs / minute));
    return `${mins}m ago`;
  }

  if (diffMs < day) {
    const hrs = Math.max(1, Math.round(diffMs / hour));
    return `${hrs}h ago`;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function formatTime(value?: string): string {
  if (!value) {
    return "now";
  }

  return new Date(value).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function parseStreamChunk(
  chunk: string,
  onEvent: (event: StreamEvent) => void
): void {
  const lines = chunk.split(/\r?\n/);

  for (const line of lines) {
    if (!line.startsWith("data:")) {
      continue;
    }

    const payload = line.slice(5).trim();
    if (!payload) {
      continue;
    }

    try {
      const parsed = JSON.parse(payload) as StreamEvent;
      if (parsed && typeof parsed === "object" && "type" in parsed) {
        onEvent(parsed);
      }
    } catch {
      continue;
    }
  }
}

export async function consumeSseStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: StreamEvent) => void
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split(/\r?\n\r?\n/);
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      parseStreamChunk(chunk, onEvent);
    }
  }

  if (buffer.trim()) {
    parseStreamChunk(buffer, onEvent);
  }
}

export function shortTitle(title: string): string {
  if (title.length <= 52) {
    return title;
  }
  return `${title.slice(0, 52)}...`;
}

export function formatSourceHost(href: string): string {
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href;
  }
}
