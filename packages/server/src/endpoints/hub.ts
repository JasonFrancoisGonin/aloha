import express, { Router, Request, Response } from "express";
import {
  AuthenticationStrategy,
  entrypoint_schemas,
  // schemas,
} from "aloha-shared";
import { injector } from "../injector/injector";
import { authorise } from "../middleware/authorise";
import { getLogger } from "../injector/provide-logger";
import { unknownToString } from "../utils/type-utils";
import { mcpServerShutdown, mcpServerStartup } from "../mcp/mcp-server-setup";

const logger = getLogger("HUB");
const startDate = new Date();

export function hubRouter() {
  const router: Router = express.Router();

  // Get information of the connected user
  router.get("/", (_req: Request, res: Response) => {
    const mcpManager = injector.resolve("mcpManager");
    const connections = Array.from(mcpManager.getConnections()).filter(
      (c) => c.connectionOptions.type == "client"
    );
    const servers = Array.from(mcpManager.getServers()).filter(
      (c) => c.options.type == "server"
    );
    const agents = Array.from(mcpManager.getConnections()).filter(
      (c) => c.connectionOptions.type == "agent"
    );

    // const agents = injector.resolve("agentRepository").findByPattern({});

    const response = entrypoint_schemas.HubStatusSchema.parse({
      startDate,
      manager: {
        startDate: mcpManager.getStartDate(),
      },
      clients: {
        online: connections.filter((e) => e.isConnected).length,
        total: connections.length,
      },
      agents: {
        online: agents.filter((e) => e.isConnected).length,
        total: agents.length,
      },
      servers: {
        online: servers.length,
        total: servers.length,
      },
    } as entrypoint_schemas.HubStatus);
    res.json(response).end();
  });

  router.post(
    "/restart",
    authorise([AuthenticationStrategy.Permissions.Administration]),
    async (_req, res) => {
      try {
        await mcpServerShutdown();
        await mcpServerStartup();
        res.status(204).end();
      } catch (err) {
        logger().error(err);
        res.status(500).json({ error: unknownToString(err) });
      }
    }
  );

  return router;
}
