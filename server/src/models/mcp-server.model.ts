import mongoose from "mongoose";
import type { HydratedDocument, Model } from "mongoose";

export interface IMcpServer {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  isActive: boolean;
  lastConnectedAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

type McpServerModel = Model<IMcpServer, {}, {}>;
type McpServerDocument = HydratedDocument<IMcpServer>;

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
    command: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
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

export const McpServer = mongoose.model<IMcpServer, McpServerModel>(
  "McpServer",
  mcpServerSchema
);
