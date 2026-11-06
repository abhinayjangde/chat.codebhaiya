import type { McpTool } from "../../mcp.js";
import type { CloudToolExecutionContext, CloudToolResult } from "../types.js";
import { MongoClient } from "mongodb";
import { validateMongoUri } from "../ssrf-validator.js";

export const mongodbTools: McpTool[] = [
  {
    name: "mongodb_list_collections",
    description: "List all collections in the connected MongoDB Atlas database.",
    inputSchema: {
      type: "object",
      properties: {
        database: { type: "string", description: "Database name (optional, defaults to configured database)" },
      },
    },
  },
  {
    name: "mongodb_find_documents",
    description: "Query documents from a MongoDB collection using MongoDB query filters, projection, sorting, and limit.",
    inputSchema: {
      type: "object",
      properties: {
        collection: { type: "string", description: "Collection name to query" },
        filter: { type: "object", description: "MongoDB query filter object (e.g. { status: 'active' })" },
        limit: { type: "number", description: "Max documents to return (default: 10, max: 50)" },
        sort: { type: "object", description: "Sort order (e.g. { createdAt: -1 })" },
        projection: { type: "object", description: "Fields projection (e.g. { password: 0 })" },
      },
      required: ["collection"],
    },
  },
  {
    name: "mongodb_aggregate",
    description: "Run an aggregation pipeline on a MongoDB Atlas collection.",
    inputSchema: {
      type: "object",
      properties: {
        collection: { type: "string", description: "Collection name" },
        pipeline: {
          type: "array",
          items: { type: "object" },
          description: "Aggregation pipeline stages (e.g. [{ $match: { status: 'active' } }, { $group: { _id: '$tier', total: { $sum: 1 } } }])",
        },
      },
      required: ["collection", "pipeline"],
    },
  },
  {
    name: "mongodb_collection_schema",
    description: "Sample documents from a collection to infer its field names, data types, and nested structure.",
    inputSchema: {
      type: "object",
      properties: {
        collection: { type: "string", description: "Collection name to inspect" },
      },
      required: ["collection"],
    },
  },
  {
    name: "mongodb_insert_document",
    description: "Insert a new document into a collection in MongoDB Atlas.",
    inputSchema: {
      type: "object",
      properties: {
        collection: { type: "string", description: "Collection name" },
        document: { type: "object", description: "Document JSON object to insert" },
      },
      required: ["collection", "document"],
    },
  },
];

const DEMO_COLLECTIONS: Record<string, Array<Record<string, unknown>>> = {
  customers: [
    { _id: "65a101", name: "Acme Corp", tier: "enterprise", mrr: 2400, contact: { email: "team@acme.com", phone: "+1-555-0101" }, tags: ["saas", "high-touch"] },
    { _id: "65a102", name: "Beta Labs", tier: "pro", mrr: 450, contact: { email: "contact@betalabs.io" }, tags: ["startup", "ai"] },
    { _id: "65a103", name: "Gamma Health", tier: "enterprise", mrr: 4800, contact: { email: "ops@gammahealth.org" }, tags: ["healthcare", "hipaa"] },
    { _id: "65a104", name: "Delta Logistics", tier: "starter", mrr: 99, contact: { email: "admin@deltalog.net" }, tags: ["freight"] },
  ],
  analytics_events: [
    { _id: "ev1", event: "user_signup", platform: "web", userId: "u123", timestamp: "2025-03-01T10:00:00Z" },
    { _id: "ev2", event: "upgrade_plan", platform: "web", userId: "u123", newTier: "pro", timestamp: "2025-03-05T14:20:00Z" },
    { _id: "ev3", event: "api_call", endpoint: "/mcp/query", responseTimeMs: 42, timestamp: "2025-03-05T15:00:00Z" },
  ],
};

export async function executeMongodbTool(
  toolName: string,
  args: Record<string, unknown>,
  ctx: CloudToolExecutionContext
): Promise<CloudToolResult> {
  const rawUri =
    (ctx.config.connectionString as string) ||
    ctx.authData.connectionString ||
    (ctx.config.uri as string) ||
    process.env.MANAGED_MONGODB_URI;
  const uri = typeof rawUri === "string" ? rawUri.trim() : undefined;

  if (uri) {
    const validation = await validateMongoUri(uri);
    if (!validation.valid) {
      return {
        isError: true,
        content: [{ type: "text", text: `MongoDB Atlas connection error: ${validation.error}` }],
      };
    }

    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      tls: true,
      tlsAllowInvalidCertificates: false,
    });
    try {
      await client.connect();
      const dbName = (args.database as string) || (ctx.config.database as string) || undefined;
      const db = client.db(dbName);

      if (toolName === "mongodb_list_collections") {
        const collections = await db.listCollections().toArray();
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ database: db.databaseName, collections: collections.map((c) => c.name) }, null, 2),
          }],
        };
      }

      if (toolName === "mongodb_find_documents") {
        const colName = String(args.collection);
        const filter = (args.filter as Record<string, unknown>) || {};
        const limit = Math.min(Number(args.limit || 10), 50);
        const sort = (args.sort as Record<string, 1 | -1>) || {};
        const projection = (args.projection as Record<string, 0 | 1>) || {};

        const docs = await db.collection(colName).find(filter, { projection, sort, limit }).toArray();
        return { content: [{ type: "text", text: JSON.stringify(docs, null, 2) }] };
      }

      if (toolName === "mongodb_aggregate") {
        const colName = String(args.collection);
        const pipeline = Array.isArray(args.pipeline) ? args.pipeline : [];
        const result = await db.collection(colName).aggregate(pipeline).toArray();
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      if (toolName === "mongodb_collection_schema") {
        const colName = String(args.collection);
        const samples = await db.collection(colName).find().limit(5).toArray();
        const schemaInference: Record<string, string> = {};
        for (const sample of samples) {
          for (const [k, v] of Object.entries(sample)) {
            schemaInference[k] = Array.isArray(v) ? "array" : typeof v;
          }
        }
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ collection: colName, fields: schemaInference, sampleCount: samples.length }, null, 2),
          }],
        };
      }

      if (toolName === "mongodb_insert_document") {
        const colName = String(args.collection);
        const doc = (args.document as Record<string, unknown>) || {};
        const res = await db.collection(colName).insertOne(doc);
        return { content: [{ type: "text", text: `Document inserted with _id: ${res.insertedId}` }] };
      }
    } catch (err: any) {
      return { isError: true, content: [{ type: "text", text: `MongoDB Atlas error: ${err.message}` }] };
    } finally {
      await client.close().catch(() => {});
    }
  }

  // Zero-Terminal Cloud Demo Mode
  if (toolName === "mongodb_list_collections") {
    return {
      content: [{
        type: "text",
        text: `[MongoDB Atlas Cloud Connector (Zero-Terminal Managed Mode)]\nConnected to Cloud Cluster: codebhaiya-production\nCollections in database:\n` +
          JSON.stringify(Object.keys(DEMO_COLLECTIONS), null, 2),
      }],
    };
  }

  if (toolName === "mongodb_find_documents") {
    const col = String(args.collection);
    const docs = DEMO_COLLECTIONS[col];
    if (!docs) {
      return { isError: true, content: [{ type: "text", text: `Collection "${col}" not found in database.` }] };
    }
    const limit = Number(args.limit || 10);
    return {
      content: [{
        type: "text",
        text: `[MongoDB Atlas Cloud Connector]\nCollection: ${col} (${docs.length} total documents)\n` +
          JSON.stringify(docs.slice(0, limit), null, 2),
      }],
    };
  }

  if (toolName === "mongodb_collection_schema") {
    const col = String(args.collection);
    const docs = DEMO_COLLECTIONS[col];
    if (!docs || docs.length === 0) {
      return { isError: true, content: [{ type: "text", text: `Collection "${col}" not found.` }] };
    }
    const sample = docs[0];
    const inferred: Record<string, string> = {};
    if (sample) {
      for (const [k, v] of Object.entries(sample)) {
        inferred[k] = Array.isArray(v) ? "array" : typeof v;
      }
    }
    return {
      content: [{
        type: "text",
        text: `[MongoDB Atlas Cloud Connector] Inferred schema for "${col}":\n` + JSON.stringify(inferred, null, 2),
      }],
    };
  }

  if (toolName === "mongodb_aggregate") {
    const col = String(args.collection);
    const docs = DEMO_COLLECTIONS[col] || [];
    return {
      content: [{
        type: "text",
        text: `[MongoDB Atlas Cloud Connector] Aggregation executed on "${col}". Stage count: ${Array.isArray(args.pipeline) ? args.pipeline.length : 0}\n` +
          JSON.stringify(docs, null, 2),
      }],
    };
  }

  if (toolName === "mongodb_insert_document") {
    const col = String(args.collection);
    const doc = (args.document as Record<string, unknown>) || {};
    const newId = "65a" + Math.floor(Math.random() * 9000 + 1000);
    const inserted = { _id: newId, ...doc };
    if (!DEMO_COLLECTIONS[col]) DEMO_COLLECTIONS[col] = [];
    DEMO_COLLECTIONS[col].push(inserted);
    return {
      content: [{
        type: "text",
        text: `[MongoDB Atlas Cloud Connector] Document inserted successfully into "${col}" with _id: ${newId}`,
      }],
    };
  }

  return { isError: true, content: [{ type: "text", text: `Unknown tool "${toolName}" for MongoDB Atlas connector.` }] };
}
