/**
 * Keep-Alive Self-Ping
 *
 * Render's free tier spins down your service after ~15 minutes of inactivity.
 * This module prevents that by pinging the server's own /health endpoint
 * every 14 minutes (just under the threshold).
 *
 * How it works:
 *  1. After the server starts, call `startKeepAlive(url)` with your app's URL.
 *  2. It sets an interval that sends a GET request to /health every 14 minutes.
 *  3. Render sees activity → doesn't shut down your server.
 *
 * Why self-ping instead of an external cron?
 *  - Zero extra cost — no third-party service needed.
 *  - Runs immediately when the server boots.
 *  - If the server is already down, a self-ping can't restart it anyway,
 *    so there's no downside to keeping it internal.
 */

const PING_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes

let pingTimer: ReturnType<typeof setInterval> | null = null;

export function startKeepAlive(serverUrl: string): void {
  // Only enable in production — no need to self-ping during local dev
  if (process.env.NODE_ENV !== "production") {
    console.log("[keep-alive] Skipped — not in production");
    return;
  }

  const healthUrl = `${serverUrl}/health`;

  // Clear any existing timer (safety net for restarts)
  if (pingTimer) clearInterval(pingTimer);

  pingTimer = setInterval(async () => {
    try {
      const res = await fetch(healthUrl);
      console.log(
        `[keep-alive] Pinged ${healthUrl} → ${res.status} at ${new Date().toISOString()}`
      );
    } catch (err) {
      console.error(`[keep-alive] Ping failed:`, err);
    }
  }, PING_INTERVAL_MS);

  // Don't let the timer keep Node.js alive if everything else is shutting down
  if (pingTimer && typeof pingTimer === "object" && "unref" in pingTimer) {
    pingTimer.unref();
  }

  console.log(
    `[keep-alive] Started — pinging ${healthUrl} every ${PING_INTERVAL_MS / 60000} minutes`
  );
}

export function stopKeepAlive(): void {
  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
    console.log("[keep-alive] Stopped");
  }
}
