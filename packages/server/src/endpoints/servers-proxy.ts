/*
Copyright (C) 2025 European Union
 
Licensed under the EUPL, Version 1.2 or – as soon they will be approved by the
European Commission – subsequent versions of the EUPL (the “Licence”);
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:
* https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12 *

Unless required by applicable law or agreed to in writing, software distributed under
the Licence is distributed on an “AS IS” basis, WITHOUT WARRANTIES OR CONDITIONS
OF ANY KIND, either express or implied. See the Licence for the specific language
governing permissions and limitations under the Licence.
*/

import { AuthenticationStrategy } from "aloha-shared";
import express, { NextFunction, Request, Response } from "express";
import { injector } from "../injector/injector";
import { getLogger } from "../injector/provide-logger";
import { authorise } from "../middleware/authorise";
import { HTTPError, verifyPermission } from "./utils";
import { AGENT_PROJECT } from "../middleware/jwt-authentication";

const logger = getLogger("SERVERS-PROXY");
const mcpManager = () => injector.resolve("mcpManager");
const agentRepository = () => injector.resolve("agentRepository");
const agentCache = () => injector.resolve("agentsCache");

export function serverProxyRoutes() {
  const router = express.Router();

  const getServer = async (
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    next: NextFunction
  ) => {
    const { path } = req.params;

    const log = logger().child({ path });
    try {
      if (!path) {
        res.writeHead(405).end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -1000,
              message: "Must provide the server path of the MCP server to call",
            },
            id: null,
          })
        );
        return;
      }
      const server = mcpManager().getServerByPath(path);
      if (!server) {
        res.writeHead(405).end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -1001,
              message: "Cannot find the MCP server",
            },
            id: null,
          })
        );
        return;
      }

      if (!server.router) {
        res.writeHead(405).end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -1002,
              message: "MCP server router is not initialized",
            },
            id: null,
          })
        );
        return;
      }

      if (req.user && req.user.displayName == AGENT_PROJECT) {
        const agent = await agentCache().get(req.user.id, () =>
          agentRepository().findById(req.user!.id)
        );
        if (!agent || agent.serverPath !== path) {
          res.writeHead(403).end(
            JSON.stringify({
              jsonrpc: "2.0",
              error: {
                code: -1002,
                message: "You are not authorised to perform this operation",
              },
              id: null,
            })
          );
          return undefined;
        }
      } else {
        await verifyPermission(server.options, req, "execute", true);
      }

      return server;
    } catch (e) {
      if (e instanceof HTTPError) {
        res.writeHead(e.errorCode).end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -1099,
              message: e.message,
            },
            id: null,
          })
        );
      } else {
        log.error(e);
        res.writeHead(405).end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: {
              code: -1099,
              message: "Failed to connect to MCP server",
            },
            id: null,
          })
        );
      }
    }
    return undefined;
  };

  // SSE Route
  router.get(
    "/:path/sse",
    authorise([AuthenticationStrategy.Permissions.ProxyApiAccess]),
    async (req: Request, res: Response, next: NextFunction) => {
      const { path } = req.params;

      const log = logger().child({ path });
      log.info("Proxy SSE request");

      const server = await getServer(req, res, next);
      if (server !== undefined && server.router !== undefined) {
        try {
          await server.router.sseRequest(req, res, next);
        } catch (e) {
          log.error(e);
          res.writeHead(405).end(
            JSON.stringify({
              jsonrpc: "2.0",
              error: {
                code: -1099,
                message: "Failed to connect to MCP server",
              },
              id: null,
            })
          );
        }
      }
    }
  );

  // Messages route
  router.post(
    "/:path/messages",
    authorise([AuthenticationStrategy.Permissions.ProxyApiAccess]),
    async (req: Request, res: Response, next: NextFunction) => {
      const { path } = req.params;

      const log = logger().child({ path });
      log.info("Proxy Messages request");

      const server = await getServer(req, res, next);
      if (server !== undefined && server.router !== undefined) {
        try {
          await server.router.messageRequest(req, res, next);
        } catch (e) {
          log.error(e);
          res.writeHead(405).end(
            JSON.stringify({
              jsonrpc: "2.0",
              error: {
                code: -1099,
                message: "Failed to connect to MCP server",
              },
              id: null,
            })
          );
        }
      }
    }
  );

  // Streamable HTTP Routes
  router.post(
    "/:path/mcp",
    authorise([AuthenticationStrategy.Permissions.ProxyApiAccess]),
    async (req, res, next) => {
      const { path } = req.params;

      const log = logger().child({ path });
      log.info("Proxy Messages request");

      const server = await getServer(req, res, next);
      if (server !== undefined && server.router !== undefined) {
        try {
          await server.router.httpPostRequest(req, res, next);
        } catch (e) {
          log.error(e);
          res.writeHead(405).end(
            JSON.stringify({
              jsonrpc: "2.0",
              error: {
                code: -1099,
                message: "Failed to connect to MCP server",
              },
              id: null,
            })
          );
        }
      }
    }
  );
  router.get(
    "/:path/mcp",
    authorise([AuthenticationStrategy.Permissions.ProxyApiAccess]),
    async (req, res, next) => {
      const { path } = req.params;

      const log = logger().child({ path });
      log.info("Proxy Messages request");

      const server = await getServer(req, res, next);
      if (server !== undefined && server.router !== undefined) {
        try {
          await server.router.httpGetRequest(req, res, next);
        } catch (e) {
          log.error(e);
          res.writeHead(405).end(
            JSON.stringify({
              jsonrpc: "2.0",
              error: {
                code: -1099,
                message: "Failed to connect to MCP server",
              },
              id: null,
            })
          );
        }
      }
    }
  );
  router.delete(
    "/:path/mcp",
    authorise([AuthenticationStrategy.Permissions.ProxyApiAccess]),
    async (req, res, next) => {
      const { path } = req.params;

      const log = logger().child({ path });
      log.info("Proxy Messages request");

      const server = await getServer(req, res, next);
      if (server !== undefined && server.router !== undefined) {
        try {
          await server.router.httpDeleteRequest(req, res, next);
        } catch (e) {
          log.error(e);
          res.writeHead(405).end(
            JSON.stringify({
              jsonrpc: "2.0",
              error: {
                code: -1099,
                message: "Failed to connect to MCP server",
              },
              id: null,
            })
          );
        }
      }
    }
  );

  return router;
}
