import express from "express";
import type { NextFunction, Request, Response, Router } from "express";
import { McpServer } from "../models/mcp-server.model.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import {
  HttpError,
  parseBody,
  mcpServerSchema,
  mcpServerIdSchema,
  cloudConnectorConnectSchema,
} from "../lib/validation.js";
import {
  mcpClientRegistry,
  createMcpClient,
  MAX_MCP_SERVERS_PER_USER,
} from "../lib/mcp.js";
import { CLOUD_MCP_CATALOG, getConnectorById } from "../lib/cloud-mcp/catalog.js";
import { ObjectId } from "mongodb";
import { env } from "../config/env.js";

const router: Router = express.Router();

router.use(authenticateToken);

/**
 * GET /api/mcp/marketplace
 * List all available managed cloud connectors with user connection status.
 */
router.get("/marketplace", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: "User not authenticated" });
      return;
    }

    const connectedServers = await McpServer.find({
      userId: new ObjectId(userId),
      serverType: "cloud",
    }).lean();

    const connectedByConnectorId = new Map(
      connectedServers.map((s) => [s.cloudConnectorId, s])
    );

    const connectors = CLOUD_MCP_CATALOG.map((connector) => {
      const server = connectedByConnectorId.get(connector.id);
      return {
        ...connector,
        isConnected: Boolean(server && server.isActive),
        connectedServerId: server?._id?.toString(),
        serverName: server?.name,
        lastConnectedAt: server?.lastConnectedAt,
        installedConfig: server ? server.cloudConfig : undefined,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        connectors,
        totalCount: connectors.length,
        connectedCount: connectedServers.filter((s) => s.isActive).length,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/mcp/marketplace/connect
 * 1-Click zero-terminal connection to a managed cloud MCP connector.
 */
router.post("/marketplace/connect", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: "User not authenticated" });
      return;
    }

    const body = parseBody(cloudConnectorConnectSchema, req.body);
    const definition = getConnectorById(body.connectorId);
    if (!definition) {
      throw new HttpError(404, `Cloud connector "${body.connectorId}" not found in marketplace catalog.`);
    }

    const serverName = body.name || definition.name;

    // Check if an existing cloud connector is already configured for this user
    let existing = await McpServer.findOne({
      userId: new ObjectId(userId),
      cloudConnectorId: body.connectorId,
    });

    if (!existing) {
      const existingCount = await McpServer.countDocuments({
        userId: new ObjectId(userId),
      });
      if (existingCount >= MAX_MCP_SERVERS_PER_USER) {
        throw new HttpError(
          400,
          `You can configure at most ${MAX_MCP_SERVERS_PER_USER} MCP servers.`
        );
      }
    }

    // Spin up test client to verify connector readiness and list tools
    const dummyId = existing ? existing._id.toString() : new ObjectId().toString();
    const testClient = createMcpClient({
      _id: dummyId,
      name: serverName,
      serverType: "cloud",
      cloudConnectorId: body.connectorId,
      cloudConfig: body.cloudConfig,
      authData: body.authData,
      authType: body.authType,
      userId: userId,
    });

    await testClient.connect();
    const tools = await testClient.listTools();
    await testClient.disconnect();

    let server: any;
    if (existing) {
      existing.name = serverName;
      existing.cloudConfig = body.cloudConfig;
      existing.authType = body.authType;
      existing.authData = new Map(Object.entries(body.authData)) as any;
      existing.isActive = true;
      existing.lastConnectedAt = new Date();
      existing.metadata = {
        icon: definition.icon,
        description: definition.description,
        category: definition.category,
        provider: definition.provider,
        badge: definition.badge ?? undefined,
      };
      await existing.save();
      server = existing.toObject();
    } else {
      const serverDoc: any = {
        userId: new ObjectId(userId),
        name: serverName,
        serverType: "cloud",
        cloudConnectorId: body.connectorId,
        cloudConfig: body.cloudConfig,
        authType: body.authType,
        authData: body.authData,
        metadata: {
          icon: definition.icon,
          description: definition.description,
          category: definition.category,
          provider: definition.provider,
          badge: definition.badge ?? undefined,
        },
        isActive: true,
        lastConnectedAt: new Date(),
      };
      server = (await McpServer.create(serverDoc)).toObject();
    }

    // Refresh active client registry
    const serverIdStr = server._id.toString();
    if (mcpClientRegistry.get(serverIdStr)) {
      mcpClientRegistry.delete(serverIdStr);
    }

    res.status(200).json({
      success: true,
      message: `Successfully connected ${definition.name}!`,
      data: {
        server,
        toolCount: tools.length,
        tools,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/mcp/marketplace/disconnect/:connectorId
 * 1-Click disconnect / toggle off a cloud connector.
 */
router.post(
  "/marketplace/disconnect/:connectorId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "User not authenticated" });
        return;
      }

      const connectorId = Array.isArray(req.params.connectorId)
        ? req.params.connectorId[0]
        : req.params.connectorId;

      if (!connectorId) {
        throw new HttpError(400, "connectorId is required");
      }

      const server = await McpServer.findOneAndDelete({
        userId: new ObjectId(userId),
        cloudConnectorId: connectorId,
      });

      if (!server) {
        throw new HttpError(404, `No active cloud connector found for "${connectorId}".`);
      }

      mcpClientRegistry.delete(server._id.toString());

      res.status(200).json({
        success: true,
        message: `Disconnected ${server.name} connector.`,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/mcp/marketplace/oauth/init/:connectorId
 * Initiate 1-click cloud OAuth flow.
 */
router.get(
  "/marketplace/oauth/init/:connectorId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const connectorId = Array.isArray(req.params.connectorId)
        ? req.params.connectorId[0]
        : req.params.connectorId;

      if (!connectorId) {
        throw new HttpError(400, "connectorId is required");
      }
      const definition = getConnectorById(connectorId);
      if (!definition) {
        throw new HttpError(404, `Connector "${connectorId}" not found.`);
      }

      const state = `oauth_state_${Math.random().toString(36).substring(2, 12)}`;

      res.status(200).json({
        success: true,
        data: {
          connectorId,
          provider: definition.provider,
          name: definition.name,
          state,
          supportsOneClick: definition.supportsOneClickOAuth,
          oauthUrl: `/api/mcp/marketplace/oauth/callback?connectorId=${connectorId}&state=${state}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/mcp/servers
 * List the authenticated user's MCP server configurations (both custom and cloud).
 */
router.get("/servers", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: "User not authenticated" });
      return;
    }

    const servers = await McpServer.find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: { servers },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/mcp/servers
 * Register a new MCP server (custom STDIO or cloud).
 */
router.post("/servers", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: "User not authenticated" });
      return;
    }

    const body = parseBody(mcpServerSchema, req.body);

    if (body.serverType === "custom" && !env.ALLOW_CUSTOM_MCP_STDIO) {
      throw new HttpError(403, "Custom STDIO MCP servers are disabled on this deployment.");
    }

    // Enforce a per-user cap on configured servers.
    const existingCount = await McpServer.countDocuments({
      userId: new ObjectId(userId),
    });
    if (existingCount >= MAX_MCP_SERVERS_PER_USER) {
      throw new HttpError(
        400,
        `You can configure at most ${MAX_MCP_SERVERS_PER_USER} MCP servers.`
      );
    }

    const tempId = new ObjectId().toString();
    const testClient = createMcpClient({
      _id: tempId,
      name: body.name,
      serverType: body.serverType,
      command: body.command,
      args: body.args,
      env: body.env,
      cloudConnectorId: body.cloudConnectorId,
      cloudConfig: body.cloudConfig,
      authData: body.authData,
      authType: body.authType,
      userId,
    });

    try {
      await testClient.connect();
      const tools = await testClient.listTools();
      await testClient.disconnect();

      const serverDoc: any = {
        userId: new ObjectId(userId),
        name: body.name,
        serverType: body.serverType,
        command: body.command,
        args: body.args,
        env: body.env,
        cloudConnectorId: body.cloudConnectorId,
        cloudConfig: body.cloudConfig,
        authType: body.authType,
        authData: body.authData,
        isActive: body.isActive,
        lastConnectedAt: new Date(),
      };
      const server = await McpServer.create(serverDoc);

      res.status(201).json({
        success: true,
        data: {
          server: {
            ...((server as unknown) as Record<string, unknown>),
            toolCount: tools.length,
          },
        },
      });
    } catch (error) {
      await testClient.disconnect().catch(() => {});
      throw new HttpError(
        400,
        `Failed to connect to MCP server: ${(error as Error).message}`
      );
    }
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/mcp/servers/:id
 * Update an MCP server configuration.
 */
router.patch(
  "/servers/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "User not authenticated" });
        return;
      }

      const serverId = parseBody(
        mcpServerIdSchema,
        Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      );
      const body = parseBody(mcpServerSchema, req.body);

      if (body.serverType === "custom" && !env.ALLOW_CUSTOM_MCP_STDIO) {
        throw new HttpError(403, "Custom STDIO MCP servers are disabled on this deployment.");
      }

      const server = await McpServer.findOneAndUpdate(
        { _id: new ObjectId(serverId), userId: new ObjectId(userId) },
        {
          name: body.name,
          serverType: body.serverType,
          command: body.command,
          args: body.args,
          env: body.env,
          cloudConnectorId: body.cloudConnectorId,
          cloudConfig: body.cloudConfig,
          authType: body.authType,
          authData: body.authData,
          isActive: body.isActive,
        },
        { returnDocument: "after" }
      );

      if (!server) {
        throw new HttpError(404, "MCP server not found");
      }

      if (mcpClientRegistry.get(serverId)) {
        mcpClientRegistry.delete(serverId);
      }

      res.status(200).json({
        success: true,
        data: { server },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/mcp/servers/:id
 * Remove an MCP server configuration and disconnect any active client.
 */
router.delete(
  "/servers/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "User not authenticated" });
        return;
      }

      const serverId = parseBody(
        mcpServerIdSchema,
        Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      );

      const server = await McpServer.findOneAndDelete({
        _id: new ObjectId(serverId),
        userId: new ObjectId(userId),
      });

      if (!server) {
        throw new HttpError(404, "MCP server not found");
      }

      mcpClientRegistry.delete(serverId);

      res.status(200).json({
        success: true,
        message: "MCP server removed",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/mcp/servers/:id/tools
 * Connect to an MCP server (custom or cloud) and list its exposed tools.
 */
router.post(
  "/servers/:id/tools",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ success: false, error: "User not authenticated" });
        return;
      }

      const serverId = parseBody(
        mcpServerIdSchema,
        Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      );

      const server = await McpServer.findOne({
        _id: new ObjectId(serverId),
        userId: new ObjectId(userId),
      });

      if (!server) {
        throw new HttpError(404, "MCP server not found");
      }

      const client = createMcpClient(server as any);
      try {
        await client.connect();
        const tools = await client.listTools();
        await client.disconnect();

        res.status(200).json({
          success: true,
          data: {
            tools: tools.map((t) => ({
              name: t.name,
              description: t.description,
              inputSchema: t.inputSchema,
            })),
          },
        });
      } catch (error) {
        await client.disconnect().catch(() => {});
        throw new HttpError(
          400,
          `Failed to list tools: ${(error as Error).message}`
        );
      }
    } catch (error) {
      next(error);
    }
  }
);

export default router;
