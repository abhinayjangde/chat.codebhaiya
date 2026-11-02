import express from "express";
import type { NextFunction, Request, Response, Router } from "express";
import { McpServer } from "../models/mcp-server.model.js";
import { authenticateToken } from "../middleware/auth.middleware.js";
import {
  HttpError,
  parseBody,
  mcpServerSchema,
  mcpServerIdSchema,
} from "../lib/validation.js";
import { mcpClientRegistry, McpClient, MAX_MCP_SERVERS_PER_USER } from "../lib/mcp.js";
import { ObjectId } from "mongodb";

const router: Router = express.Router();

router.use(authenticateToken);

/**
 * GET /api/mcp/servers
 * List the authenticated user's MCP server configurations.
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
 * Register a new MCP server. Validates the config by attempting a connection
 * and listing tools (connection is closed immediately after).
 */
router.post("/servers", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ success: false, error: "User not authenticated" });
      return;
    }

    const body = parseBody(mcpServerSchema, req.body);

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

    // Test the connection by spinning up a short-lived client.
    const testClient = new McpClient(
      "test",
      body.name,
      body.command,
      body.args,
      body.env
    );
    try {
      await testClient.connect();
      const tools = await testClient.listTools();
      await testClient.disconnect();

      const server = await McpServer.create({
        userId: new ObjectId(userId),
        name: body.name,
        command: body.command,
        args: body.args,
        env: body.env,
        isActive: true,
        lastConnectedAt: new Date(),
      });

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
      await testClient.disconnect();
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

      const server = await McpServer.findOneAndUpdate(
        { _id: new ObjectId(serverId), userId: new ObjectId(userId) },
        {
          name: body.name,
          command: body.command,
          args: body.args,
          env: body.env,
          isActive: body.isActive,
        },
        { new: true }
      );

      if (!server) {
        throw new HttpError(404, "MCP server not found");
      }

      // If the server is active and already connected, disconnect so it can be
      // re-established with the new config on the next use.
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
 * Connect to an MCP server and list its exposed tools (for preview).
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

      const client = new McpClient(
        server._id.toString(),
        server.name,
        server.command,
        server.args,
        server.env
      );
      try {
        await client.connect();
        const tools = await client.listTools();
        mcpClientRegistry.delete(serverId); // close the preview connection

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
        await client.disconnect();
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
