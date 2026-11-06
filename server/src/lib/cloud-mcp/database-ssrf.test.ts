import { describe, expect, it } from "vitest";
import {
  isPrivateOrInternalIPv4,
  isPrivateOrInternalIPv6,
  isPrivateOrInternalHostname,
  validateHost,
  validatePostgresConnectionString,
  validateMongoUri,
  hasInsecurePostgresSslOptions,
  hasInsecureMongoTlsOptions,
} from "./ssrf-validator.js";
import { executePostgresTool } from "./executors/postgres.executor.js";
import { executeMongodbTool } from "./executors/mongodb.executor.js";
import type { CloudToolExecutionContext } from "./types.js";

describe("Database Connector SSRF Protection - IP Range & Hostname Checks", () => {
  it("rejects loopback and local IPv4 addresses (127.0.0.0/8, 0.0.0.0/8)", () => {
    expect(isPrivateOrInternalIPv4("127.0.0.1")).toBe(true);
    expect(isPrivateOrInternalIPv4("127.0.1.1")).toBe(true);
    expect(isPrivateOrInternalIPv4("127.255.255.255")).toBe(true);
    expect(isPrivateOrInternalIPv4("0.0.0.0")).toBe(true);
  });

  it("rejects private network ranges RFC 1918 (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)", () => {
    // 10.0.0.0/8
    expect(isPrivateOrInternalIPv4("10.0.0.1")).toBe(true);
    expect(isPrivateOrInternalIPv4("10.254.1.1")).toBe(true);

    // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
    expect(isPrivateOrInternalIPv4("172.16.0.1")).toBe(true);
    expect(isPrivateOrInternalIPv4("172.31.255.254")).toBe(true);
    // Public 172.x outside /12
    expect(isPrivateOrInternalIPv4("172.15.255.255")).toBe(false);
    expect(isPrivateOrInternalIPv4("172.32.0.1")).toBe(false);
    expect(isPrivateOrInternalIPv4("172.66.147.243")).toBe(false);

    // 192.168.0.0/16
    expect(isPrivateOrInternalIPv4("192.168.0.1")).toBe(true);
    expect(isPrivateOrInternalIPv4("192.168.1.100")).toBe(true);
    expect(isPrivateOrInternalIPv4("192.167.1.1")).toBe(false);
  });

  it("rejects link-local & cloud metadata service addresses (169.254.0.0/16)", () => {
    expect(isPrivateOrInternalIPv4("169.254.169.254")).toBe(true);
    expect(isPrivateOrInternalIPv4("169.254.1.1")).toBe(true);
    expect(isPrivateOrInternalIPv4("169.253.1.1")).toBe(false);
  });

  it("rejects carrier-grade NAT, multicast, and reserved IPv4 addresses", () => {
    // 100.64.0.0/10
    expect(isPrivateOrInternalIPv4("100.64.0.1")).toBe(true);
    expect(isPrivateOrInternalIPv4("100.127.255.255")).toBe(true);
    // Multicast (224.0.0.0/4) & Reserved (240.0.0.0/4, 255.255.255.255)
    expect(isPrivateOrInternalIPv4("224.0.0.1")).toBe(true);
    expect(isPrivateOrInternalIPv4("240.0.0.1")).toBe(true);
    expect(isPrivateOrInternalIPv4("255.255.255.255")).toBe(true);
  });

  it("rejects private, loopback, link-local, and mapped IPv6 addresses", () => {
    expect(isPrivateOrInternalIPv6("::1")).toBe(true);
    expect(isPrivateOrInternalIPv6("::")).toBe(true);
    expect(isPrivateOrInternalIPv6("fe80::1")).toBe(true);
    expect(isPrivateOrInternalIPv6("fc00::1")).toBe(true);
    expect(isPrivateOrInternalIPv6("fd12:3456:789a::1")).toBe(true);
    expect(isPrivateOrInternalIPv6("ff02::1")).toBe(true);

    // IPv4-mapped IPv6
    expect(isPrivateOrInternalIPv6("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateOrInternalIPv6("::ffff:169.254.169.254")).toBe(true);
    expect(isPrivateOrInternalIPv6("::ffff:10.0.0.1")).toBe(true);
    expect(isPrivateOrInternalIPv6("64:ff9b::7f00:1")).toBe(true);
  });

  it("rejects internal, local, and metadata hostnames", () => {
    expect(isPrivateOrInternalHostname("localhost")).toBe(true);
    expect(isPrivateOrInternalHostname("db.localhost")).toBe(true);
    expect(isPrivateOrInternalHostname("service.local")).toBe(true);
    expect(isPrivateOrInternalHostname("api.internal")).toBe(true);
    expect(isPrivateOrInternalHostname("metadata.google.internal")).toBe(true);
    expect(isPrivateOrInternalHostname("instance-data")).toBe(true);
    expect(isPrivateOrInternalHostname("metadata")).toBe(true);
    expect(isPrivateOrInternalHostname("app.lan")).toBe(true);
  });

  it("canonicalizes alternate IP formats (integer, octal, hex, brackets)", () => {
    expect(isPrivateOrInternalHostname("2130706433")).toBe(true); // 127.0.0.1 as dword integer
    expect(isPrivateOrInternalHostname("0x7f000001")).toBe(true); // 127.0.0.1 as hex
    expect(isPrivateOrInternalHostname("0177.0.0.1")).toBe(true); // 127.0.0.1 as octal
    expect(isPrivateOrInternalHostname("[::1]")).toBe(true);
    expect(isPrivateOrInternalHostname("%31%32%37%2e%30%2e%30%2e%31")).toBe(true);
  });
});

describe("Database Connector SSRF Protection - Host Validation & DNS Resolution", () => {
  it("rejects internal IP literals directly via validateHost", async () => {
    const res1 = await validateHost("127.0.0.1");
    expect(res1.valid).toBe(false);

    const res2 = await validateHost("169.254.169.254");
    expect(res2.valid).toBe(false);

    const res3 = await validateHost("10.0.0.5");
    expect(res3.valid).toBe(false);

    const res4 = await validateHost("[::1]");
    expect(res4.valid).toBe(false);
  });

  it("rejects DNS rebinding domains resolving to 127.0.0.1", async () => {
    const res = await validateHost("127.0.0.1.nip.io");
    expect(res.valid).toBe(false);
    expect(res.reason).toMatch(/resolves to prohibited internal/);
  });
});

describe("PostgreSQL Connection String Validation & SSL Enforcement", () => {
  it("rejects connection strings pointing to 169.254.169.254 (Cloud metadata)", async () => {
    const res = await validatePostgresConnectionString("postgres://user:pass@169.254.169.254:5432/mydb");
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/prohibited/i);
  });

  it("rejects connection strings pointing to localhost and 127.0.0.1", async () => {
    const res1 = await validatePostgresConnectionString("postgres://user:pass@127.0.0.1:5432/mydb");
    expect(res1.valid).toBe(false);

    const res2 = await validatePostgresConnectionString("postgresql://user:pass@localhost:5432/mydb");
    expect(res2.valid).toBe(false);

    const res3 = await validatePostgresConnectionString("host=127.0.0.1 port=5432 dbname=mydb");
    expect(res3.valid).toBe(false);
  });

  it("rejects connection strings pointing to private networks (10.x, 172.16.x, 192.168.x)", async () => {
    const res1 = await validatePostgresConnectionString("postgres://user:pass@10.0.1.20:5432/mydb");
    expect(res1.valid).toBe(false);

    const res2 = await validatePostgresConnectionString("postgres://user:pass@172.20.0.5:5432/mydb");
    expect(res2.valid).toBe(false);

    const res3 = await validatePostgresConnectionString("postgres://user:pass@192.168.1.50:5432/mydb");
    expect(res3.valid).toBe(false);
  });

  it("rejects local Unix domain socket paths", async () => {
    const res = await validatePostgresConnectionString("host=/var/run/postgresql dbname=mydb");
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/local file or Unix socket path/i);
  });

  it("rejects connection strings attempting to disable or bypass SSL verification", async () => {
    expect(hasInsecurePostgresSslOptions("postgres://db.example.com/db?sslmode=disable")).toBe(true);
    expect(hasInsecurePostgresSslOptions("postgres://db.example.com/db?sslmode=no-verify")).toBe(true);
    expect(hasInsecurePostgresSslOptions("postgres://db.example.com/db?sslmode=allow")).toBe(true);
    expect(hasInsecurePostgresSslOptions("postgres://db.example.com/db?sslmode=prefer")).toBe(true);
    expect(hasInsecurePostgresSslOptions("postgres://db.example.com/db?ssl=false")).toBe(true);
    expect(hasInsecurePostgresSslOptions("postgres://db.example.com/db?ssl=0")).toBe(true);
    expect(hasInsecurePostgresSslOptions("host=db.example.com sslmode=disable")).toBe(true);

    const res = await validatePostgresConnectionString("postgres://db.example.com/db?sslmode=no-verify");
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/Insecure SSL configuration/i);
  });
});

describe("MongoDB Connection URI Validation & TLS Enforcement", () => {
  it("rejects URIs with invalid scheme", async () => {
    const res = await validateMongoUri("redis://localhost:6379");
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/expected scheme to start with 'mongodb:\/\/'/i);
  });

  it("rejects URIs pointing to 169.254.169.254", async () => {
    const res = await validateMongoUri("mongodb://169.254.169.254:27017/admin");
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/prohibited/i);
  });

  it("rejects URIs pointing to localhost and private networks", async () => {
    const res1 = await validateMongoUri("mongodb://localhost:27017/admin");
    expect(res1.valid).toBe(false);

    const res2 = await validateMongoUri("mongodb://127.0.0.1:27017/admin");
    expect(res2.valid).toBe(false);

    const res3 = await validateMongoUri("mongodb://10.0.0.2:27017,10.0.0.3:27017/db");
    expect(res3.valid).toBe(false);
  });

  it("rejects URIs attempting to disable TLS or certificate validation", async () => {
    expect(hasInsecureMongoTlsOptions("mongodb://db.example.com/?tlsAllowInvalidCertificates=true")).toBe(true);
    expect(hasInsecureMongoTlsOptions("mongodb://db.example.com/?tlsInsecure=true")).toBe(true);
    expect(hasInsecureMongoTlsOptions("mongodb://db.example.com/?tls=false")).toBe(true);
    expect(hasInsecureMongoTlsOptions("mongodb://db.example.com/?ssl=false")).toBe(true);

    const res = await validateMongoUri("mongodb://db.example.com:27017/?tlsAllowInvalidCertificates=true");
    expect(res.valid).toBe(false);
    expect(res.error).toMatch(/Insecure TLS configuration/i);
  });
});

describe("Executor Integration & SSRF Prevention", () => {
  const mockContext = (connectionString: string): CloudToolExecutionContext => ({
    connectorId: "postgres",
    serverName: "Postgres Cloud",
    config: { connectionString },
    authData: {},
    authType: "connection_string",
  });

  it("executePostgresTool rejects SSRF to cloud metadata service (169.254.169.254)", async () => {
    const ctx = mockContext("postgres://user:pass@169.254.169.254:5432/mydb");
    const result = await executePostgresTool("postgres_query", { sql: "SELECT 1" }, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/prohibited/i);
  });

  it("executePostgresTool rejects SSRF to internal loopback (127.0.0.1)", async () => {
    const ctx = mockContext("postgres://user:pass@127.0.0.1:5432/mydb");
    const result = await executePostgresTool("postgres_query", { sql: "SELECT 1" }, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/prohibited/i);
  });

  it("executePostgresTool rejects insecure sslmode=no-verify", async () => {
    const ctx = mockContext("postgres://user:pass@aws-rds.amazonaws.com:5432/mydb?sslmode=no-verify");
    const result = await executePostgresTool("postgres_query", { sql: "SELECT 1" }, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/Insecure SSL configuration/i);
  });

  it("executeMongodbTool rejects SSRF to cloud metadata service (169.254.169.254)", async () => {
    const ctx: CloudToolExecutionContext = {
      connectorId: "mongodb-atlas",
      serverName: "MongoDB Cloud",
      config: { connectionString: "mongodb://169.254.169.254:27017/admin" },
      authData: {},
      authType: "connection_string",
    };
    const result = await executeMongodbTool("mongodb_list_collections", {}, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/prohibited/i);
  });

  it("executeMongodbTool rejects non-mongo scheme (e.g. redis://localhost:6379)", async () => {
    const ctx: CloudToolExecutionContext = {
      connectorId: "mongodb-atlas",
      serverName: "MongoDB Cloud",
      config: { connectionString: "redis://localhost:6379" },
      authData: {},
      authType: "connection_string",
    };
    const result = await executeMongodbTool("mongodb_list_collections", {}, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/expected scheme to start with 'mongodb:\/\/'/i);
  });

  it("executeMongodbTool rejects tlsAllowInvalidCertificates=true", async () => {
    const ctx: CloudToolExecutionContext = {
      connectorId: "mongodb-atlas",
      serverName: "MongoDB Cloud",
      config: { connectionString: "mongodb+srv://user:pass@cluster.mongodb.net/test?tlsAllowInvalidCertificates=true" },
      authData: {},
      authType: "connection_string",
    };
    const result = await executeMongodbTool("mongodb_list_collections", {}, ctx);
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toMatch(/Insecure TLS configuration/i);
  });
});
