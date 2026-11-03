import mongoose from "mongoose";
import type { HydratedDocument, Model } from "mongoose";

export type McpServerType = "custom" | "cloud";

export interface IMcpServer {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  serverType: McpServerType;
  command?: string | undefined;
  args?: string[] | undefined;
  env?: Record<string, string> | undefined;
  cloudConnectorId?: string | undefined;
  cloudConfig?: Record<string, unknown> | undefined;
  authType?: "oauth" | "api_key" | "connection_string" | "none" | undefined;
  authData?: Record<string, string> | undefined;
  metadata?: {
    icon?: string | undefined;
    description?: string | undefined;
    category?: string | undefined;
    provider?: string | undefined;
    accountName?: string | undefined;
    badge?: string | undefined;
  } | undefined;
  isActive: boolean;
  lastConnectedAt?: Date | undefined;
  lastError?: string | undefined;
  createdAt: Date;
  updatedAt: Date;
}

type McpServerModel = Model<IMcpServer, {}, {}>;
export type McpServerDocument = HydratedDocument<IMcpServer>;

const mcpServerSchema = new mongoose.Schema<IMcpServer, McpServerModel>(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    serverType: {
      type: String,
      enum: ["custom", "cloud"],
      default: "custom",
    },
    command: {
      type: String,
      trim: true,
    },
    args: {
      type: [String],
      default: [],
    },
    env: {
      type: Map,
      of: String,
      default: {},
    },
    cloudConnectorId: {
      type: String,
      trim: true,
    },
    cloudConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    authType: {
      type: String,
      enum: ["oauth", "api_key", "connection_string", "none"],
      default: "none",
    },
    authData: {
      type: Map,
      of: String,
      default: {},
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastConnectedAt: {
      type: Date,
    },
    lastError: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// A user can have multiple servers but each name should be unique per user.
mcpServerSchema.index({ userId: 1, name: 1 }, { unique: true });
mcpServerSchema.index({ userId: 1, cloudConnectorId: 1 });

export const McpServer = mongoose.model<IMcpServer, McpServerModel>(
  "McpServer",
  mcpServerSchema
);
