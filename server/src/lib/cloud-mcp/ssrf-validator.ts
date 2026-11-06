import net from "node:net";
import dns from "node:dns/promises";

/**
 * Checks whether an IPv4 address belongs to a private, loopback, link-local,
 * multicast, or reserved range.
 *
 * Blocked ranges:
 * - 0.0.0.0/8 (Current network)
 * - 10.0.0.0/8 (Private network - RFC 1918)
 * - 100.64.0.0/10 (Carrier-grade NAT - RFC 6598)
 * - 127.0.0.0/8 (Loopback - RFC 1122)
 * - 169.254.0.0/16 (Link-local & Cloud Metadata - RFC 3927)
 * - 172.16.0.0/12 (Private network - RFC 1918)
 * - 192.0.0.0/24 (IETF Protocol Assignments - RFC 6890)
 * - 192.0.2.0/24 (TEST-NET-1 - RFC 5737)
 * - 192.168.0.0/16 (Private network - RFC 1918)
 * - 198.18.0.0/15 (Benchmarking - RFC 2544)
 * - 198.51.100.0/24 (TEST-NET-2 - RFC 5737)
 * - 203.0.113.0/24 (TEST-NET-3 - RFC 5737)
 * - 224.0.0.0/4 (Multicast - RFC 5771)
 * - 240.0.0.0/4 (Reserved / Broadcast - RFC 1112)
 */
export function isPrivateOrInternalIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false;
  }
  const a = parts[0]!;
  const b = parts[1]!;
  const c = parts[2]!;

  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 0 && c === 0) return true;
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a >= 224 && a <= 239) return true;
  if (a >= 240) return true;

  return false;
}

function parseMappedIpv4(ip: string): string | null {
  const lower = ip.toLowerCase();
  const match = lower.match(/(?:::ffff:|64:ff9b::)([0-9a-f:.]+)$/);
  if (!match || !match[1]) return null;
  const tail = match[1];
  if (tail.includes(".")) {
    return tail;
  }
  const parts = tail.split(":");
  if (parts.length === 2 && parts[0] !== undefined && parts[1] !== undefined) {
    const high = parseInt(parts[0], 16);
    const low = parseInt(parts[1], 16);
    return `${(high >> 8) & 0xff}.${high & 0xff}.${(low >> 8) & 0xff}.${low & 0xff}`;
  }
  return null;
}

function expandIPv6(ip: string): string[] | null {
  const parts = ip.split("::");
  if (parts.length > 2) return null;
  const head = parts[0] ? parts[0].split(":") : [];
  const tail = parts[1] !== undefined && parts[1] !== "" ? parts[1].split(":") : [];
  if (parts.length === 1) {
    if (head.length !== 8) return null;
    return head.map((p) => p.padStart(4, "0"));
  }
  const missing = 8 - (head.length + tail.length);
  if (missing < 0) return null;
  const zeros = Array(missing).fill("0000");
  return [...head, ...zeros, ...tail].map((p) => p.padStart(4, "0"));
}

/**
 * Checks whether an IPv6 address belongs to a private, loopback, link-local,
 * unique local, or multicast range.
 */
export function isPrivateOrInternalIPv6(ip: string): boolean {
  const mappedIpv4 = parseMappedIpv4(ip);
  if (mappedIpv4 && isPrivateOrInternalIPv4(mappedIpv4)) {
    return true;
  }

  const blocks = expandIPv6(ip);
  if (!blocks) return true;

  const hexBlocks = blocks.map((b) => parseInt(b, 16));
  const fullHex = blocks.join(":");

  // ::1 - Loopback
  if (fullHex === "0000:0000:0000:0000:0000:0000:0000:0001") return true;

  // :: - Unspecified
  if (fullHex === "0000:0000:0000:0000:0000:0000:0000:0000") return true;

  const first = hexBlocks[0];
  if (first === undefined) return true;

  // fe80::/10 - Link-Local Unicast
  if ((first & 0xffc0) === 0xfe80) return true;

  // fec0::/10 - Deprecated Site-Local
  if ((first & 0xffc0) === 0xfec0) return true;

  // fc00::/7 - Unique Local Address (ULA)
  if ((first & 0xfe00) === 0xfc00) return true;

  // ff00::/8 - Multicast
  if ((first & 0xff00) === 0xff00) return true;

  // 2001:db8::/32 - Documentation
  if (first === 0x2001 && hexBlocks[1] === 0x0db8) return true;

  // 100::/64 - Discard Prefix
  if (first === 0x0100 && hexBlocks[1] === 0 && hexBlocks[2] === 0 && hexBlocks[3] === 0) return true;

  return false;
}

/**
 * Evaluates whether an IP address (IPv4 or IPv6) is private or internal.
 */
export function isPrivateOrInternalIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    return isPrivateOrInternalIPv4(ip);
  }
  if (net.isIPv6(ip)) {
    return isPrivateOrInternalIPv6(ip);
  }
  return false;
}

/**
 * Normalizes host strings, decoding percent-encoding and standardizing IPv4
 * integer/octal/hex variants via WHATWG URL parsing.
 */
export function canonicalizeHost(rawHost: string): string {
  let host = rawHost.trim();
  try {
    host = decodeURIComponent(host);
  } catch {
    // Keep host as-is if decoding fails
  }

  if (host.startsWith("[") && host.endsWith("]")) {
    return host.slice(1, -1);
  }

  try {
    const parsed = new URL(`http://${host.startsWith("[") ? host : host}`);
    let canonical = parsed.hostname;
    if (canonical.startsWith("[") && canonical.endsWith("]")) {
      canonical = canonical.slice(1, -1);
    }
    return canonical;
  } catch {
    return host;
  }
}

/**
 * Checks whether a hostname matches known internal, loopback, or cloud-metadata hostnames.
 */
export function isPrivateOrInternalHostname(hostname: string): boolean {
  const clean = canonicalizeHost(hostname).toLowerCase();

  if (net.isIP(clean)) {
    return isPrivateOrInternalIp(clean);
  }

  if (clean === "localhost" || clean.endsWith(".localhost")) return true;

  if (
    clean.endsWith(".local") ||
    clean.endsWith(".internal") ||
    clean.endsWith(".localdomain") ||
    clean.endsWith(".lan") ||
    clean.endsWith(".corp") ||
    clean.endsWith(".home") ||
    clean.endsWith(".onion")
  ) {
    return true;
  }

  if (
    clean === "metadata.google.internal" ||
    clean === "instance-data" ||
    clean === "metadata" ||
    clean === "169.254.169.254"
  ) {
    return true;
  }

  return false;
}

/**
 * Validates a single host (hostname or IP) to ensure it does not resolve to
 * or represent a private, internal, or cloud metadata address.
 */
export async function validateHost(host: string): Promise<{ valid: boolean; reason?: string }> {
  const clean = canonicalizeHost(host);

  if (!clean) {
    return { valid: false, reason: "Host cannot be empty." };
  }

  if (isPrivateOrInternalHostname(clean)) {
    return {
      valid: false,
      reason: `Host "${clean}" is a private or internal network address, which is prohibited for security reasons.`,
    };
  }

  if (net.isIP(clean)) {
    if (isPrivateOrInternalIp(clean)) {
      return {
        valid: false,
        reason: `IP address "${clean}" is in a private, loopback, or reserved range, which is prohibited.`,
      };
    }
    return { valid: true };
  }

  // Resolve hostname via DNS to prevent DNS rebinding attacks pointing to internal services
  try {
    const lookupPromise = dns.lookup(clean, { all: true });
    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("DNS lookup timed out")), 3000);
    });

    const records = await Promise.race([lookupPromise, timeoutPromise]).finally(() => {
      if (timer) clearTimeout(timer);
    });

    if (!records || records.length === 0) {
      return {
        valid: false,
        reason: `Failed to resolve host "${clean}": no DNS records found.`,
      };
    }

    for (const record of records) {
      if (isPrivateOrInternalIp(record.address)) {
        return {
          valid: false,
          reason: `Host "${clean}" resolves to prohibited internal address "${record.address}".`,
        };
      }
    }
  } catch (err: any) {
    return {
      valid: false,
      reason: `DNS lookup failed for host "${clean}": ${err.message}`,
    };
  }

  return { valid: true };
}

/**
 * Extracts target hostnames/IPs from a PostgreSQL connection string.
 * Supports both URI schemes (postgres:// and postgresql://) and libpq key-value strings.
 */
export function extractPostgresHosts(connectionString: string): { hosts: string[]; isUri: boolean } {
  const trimmed = connectionString.trim();
  const uriMatch = trimmed.match(/^(?:postgres|postgresql):\/\/(?:[^@/]+@)?([^/?#]+)/i);
  if (uriMatch && uriMatch[1]) {
    const rawHosts = uriMatch[1];
    const hosts: string[] = [];
    let current = "";
    let inBracket = false;
    for (const ch of rawHosts) {
      if (ch === "[") inBracket = true;
      else if (ch === "]") inBracket = false;
      if (ch === "," && !inBracket) {
        if (current.trim()) hosts.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    if (current.trim()) hosts.push(current.trim());
    return {
      hosts: hosts.map((h) => {
        if (h.startsWith("[")) {
          const close = h.indexOf("]");
          return close !== -1 ? h.slice(1, close) : h;
        }
        return h.split(":")[0] ?? h;
      }),
      isUri: true,
    };
  }

  const kvMatch = trimmed.match(/(?:^|\s)host=([^\s]+)/i);
  if (kvMatch && kvMatch[1]) {
    const raw = kvMatch[1];
    const hosts = raw.split(",").map((h) => h.trim()).filter(Boolean);
    return { hosts, isUri: false };
  }

  return { hosts: [], isUri: false };
}

/**
 * Checks if a PostgreSQL connection string attempts to disable or downgrade SSL verification.
 */
export function hasInsecurePostgresSslOptions(connectionString: string): boolean {
  let lower = connectionString.toLowerCase();
  try {
    lower = decodeURIComponent(lower);
  } catch {
    // ignore decoding errors
  }

  // sslmode=disable, sslmode=no-verify, sslmode=allow, sslmode=prefer
  if (/sslmode\s*=\s*(?:disable|no-verify|allow|prefer)(?:&|\s|$)/i.test(lower)) {
    return true;
  }
  // ssl=false, ssl=0, ssl=off, ssl=disable
  if (/(?:[?&]|\s)ssl\s*=\s*(?:false|0|off|disable)(?:&|\s|$)/i.test(lower)) {
    return true;
  }
  return false;
}

/**
 * Extracts target hostnames/IPs from a MongoDB URI (mongodb:// or mongodb+srv://).
 */
export function extractMongoHosts(uri: string): string[] {
  const trimmed = uri.trim();
  const uriMatch = trimmed.match(/^(?:mongodb|mongodb\+srv):\/\/(?:[^@/]+@)?([^/?#]+)/i);
  if (!uriMatch || !uriMatch[1]) return [];

  const rawHosts = uriMatch[1];
  const hosts: string[] = [];
  let current = "";
  let inBracket = false;
  for (const ch of rawHosts) {
    if (ch === "[") inBracket = true;
    else if (ch === "]") inBracket = false;
    if (ch === "," && !inBracket) {
      if (current.trim()) hosts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) hosts.push(current.trim());
  return hosts.map((h) => {
    if (h.startsWith("[")) {
      const close = h.indexOf("]");
      return close !== -1 ? h.slice(1, close) : h;
    }
    return h.split(":")[0] ?? h;
  });
}

/**
 * Checks if a MongoDB connection URI attempts to disable TLS or certificate validation.
 */
export function hasInsecureMongoTlsOptions(uri: string): boolean {
  let lower = uri.toLowerCase();
  try {
    lower = decodeURIComponent(lower);
  } catch {
    // ignore decoding errors
  }

  if (/[?&]tlsallowinvalidcertificates\s*=\s*true(?:&|$)/i.test(lower)) return true;
  if (/[?&]tlsinsecure\s*=\s*true(?:&|$)/i.test(lower)) return true;
  if (/[?&](?:tls|ssl)\s*=\s*(?:false|0|off)(?:&|$)/i.test(lower)) return true;
  return false;
}

/**
 * Validates a PostgreSQL connection string for SSRF prevention and secure SSL configuration.
 */
export async function validatePostgresConnectionString(
  connectionString: string
): Promise<{ valid: boolean; error?: string }> {
  const trimmed = connectionString.trim();
  if (!trimmed) {
    return { valid: false, error: "PostgreSQL connection string cannot be empty." };
  }

  if (hasInsecurePostgresSslOptions(trimmed)) {
    return {
      valid: false,
      error: "Insecure SSL configuration detected: connections require TLS certificate validation (rejectUnauthorized: true).",
    };
  }

  const { hosts, isUri } = extractPostgresHosts(trimmed);
  if (!isUri && !trimmed.toLowerCase().includes("host=")) {
    return {
      valid: false,
      error: "Invalid PostgreSQL connection string format: expected URI scheme (postgres:// or postgresql://) or key-value format (host=...).",
    };
  }

  if (hosts.length === 0) {
    return {
      valid: false,
      error: "No target host specified in PostgreSQL connection string.",
    };
  }

  for (const host of hosts) {
    if (host.startsWith("/") || host.startsWith(".") || host.includes("\\") || host.startsWith("~")) {
      return {
        valid: false,
        error: `Host "${host}" is a local file or Unix socket path, which is prohibited.`,
      };
    }

    const hostCheck = await validateHost(host);
    if (!hostCheck.valid) {
      return {
        valid: false,
        error: hostCheck.reason || `Host "${host}" is prohibited.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validates a MongoDB connection URI for SSRF prevention and secure TLS configuration.
 */
export async function validateMongoUri(
  uri: string
): Promise<{ valid: boolean; error?: string }> {
  const trimmed = uri.trim();
  if (!trimmed) {
    return { valid: false, error: "MongoDB connection URI cannot be empty." };
  }

  if (!trimmed.startsWith("mongodb://") && !trimmed.startsWith("mongodb+srv://")) {
    return {
      valid: false,
      error: "Invalid MongoDB connection string: expected scheme to start with 'mongodb://' or 'mongodb+srv://'.",
    };
  }

  if (hasInsecureMongoTlsOptions(trimmed)) {
    return {
      valid: false,
      error: "Insecure TLS configuration detected: MongoDB Atlas connections require TLS certificate validation.",
    };
  }

  const hosts = extractMongoHosts(trimmed);
  if (hosts.length === 0) {
    return {
      valid: false,
      error: "No target host specified in MongoDB connection string.",
    };
  }

  for (const host of hosts) {
    if (host.startsWith("/") || host.startsWith(".") || host.includes("\\") || host.startsWith("~")) {
      return {
        valid: false,
        error: `Host "${host}" is a local file or Unix socket path, which is prohibited.`,
      };
    }

    const hostCheck = await validateHost(host);
    if (!hostCheck.valid) {
      return {
        valid: false,
        error: hostCheck.reason || `Host "${host}" is prohibited.`,
      };
    }
  }

  return { valid: true };
}
