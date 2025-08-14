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

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  LoggingMessageNotificationSchema,
  ProgressNotificationSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { schemas } from "aloha-shared";
import { NextFunction, Request, Response } from "express";
import { ServerResponse } from "http";
import { injector } from "../injector/injector";
import { getLogger } from "../injector/provide-logger";
import MCPManager from "../mcp/mcp-manager";
import MCPClient from "./mcp-client";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
// import http from "http";
// import https from "https";
import { randomUUID } from "node:crypto";
import * as mcpTypes from "@modelcontextprotocol/sdk/types.js";

const logger = getLogger("MCPSERVER");

interface CustomRouter {
  sseRequest: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;
  messageRequest: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;
  httpPostRequest: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;
  httpGetRequest: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;
  httpDeleteRequest: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>;
}

const readRawBody = (req: Request): Promise<string> => {
  return new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk: string) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
};

class ServerSession {
  transport: SSEServerTransport | StreamableHTTPServerTransport;
  clients: { [k: string]: MCPClient } = {};

  public constructor(
    transport: SSEServerTransport | StreamableHTTPServerTransport
  ) {
    this.transport = transport;
  }

  public async close(closeTransport: boolean) {
    if (closeTransport) await this.transport.close();
    for (const client of Object.values(this.clients)) {
      await client.close();
    }
  }
}

class MCPServer {
  options: schemas.MCPBaseServerWithId;
  id: string;
  router: CustomRouter | undefined;
  private server: Server | undefined;
  private mcpManager: MCPManager;

  constructor(options: schemas.MCPBaseServerWithId) {
    this.options = options;
    this.id = options.id;
    this.mcpManager = injector().resolve("mcpManager");
  }

  public serve(messagesUrl: string) {
    if (!this.router) {
      const server = new Server(
        {
          name: this.options.name,
          version: "1.0.0",
        },
        {
          capabilities: {
            resources: {},
            tools: {},
            prompts: {},
            logging: {},
          },
          instructions: this.options.description,
        }
      );

      const serverSessions: {
        [k: string]: ServerSession;
      } = {};

      const findConnectedMCPConnection = () =>
        Array.from(this.mcpManager.getConnections()).filter(
          (c: MCPClient) =>
            c.isConnected &&
            ((c.connectionOptions.type === "agent" &&
              c.id === this.options.id) ||
              (this.options.connections &&
                this.options.connections.includes(c.connectionOptions.id)))
        );

      const getConnectionsForSession = async (
        sessionId: string,
        forceRefresh: boolean = false
      ): Promise<MCPClient[]> => {
        const connections = findConnectedMCPConnection();
        const returnConnections: MCPClient[] = [];
        for (const c of connections) {
          switch (c.connectionOptions.serverProtocol) {
            case "http": {
              if (!(sessionId in serverSessions)) {
                throw new Error(
                  "There was an error when retriving the session."
                );
              }
              if (c.id in serverSessions[sessionId].clients) {
                if (forceRefresh) {
                  await serverSessions[sessionId].clients[c.id].pingClient();
                }
                returnConnections.push(serverSessions[sessionId].clients[c.id]);
                continue;
              }

              const client = new MCPClient(c.connectionOptions);
              await client.connectClient();
              serverSessions[sessionId].clients[c.id] = client;

              await client.pingClient();

              returnConnections.push(client);
              continue;
            }
            default:
              returnConnections.push(c);
          }
        }
        return returnConnections;
      };

      server.setRequestHandler(
        ListPromptsRequestSchema,
        async (_request, context) => {
          if (!context.sessionId) throw new Error("Must provide a session");
          const connections = await getConnectionsForSession(context.sessionId);

          return {
            prompts: connections.map((c) => c.prompts).flat(),
          };
        }
      );

      server.setRequestHandler(
        ListResourceTemplatesRequestSchema,
        async (_request, context) => {
          if (!context.sessionId) throw new Error("Must provide a session");
          const connections = await getConnectionsForSession(context.sessionId);

          return {
            resourceTemplates: connections
              .map((c) => c.resourceTemplates)
              .flat(),
          };
        }
      );

      server.setRequestHandler(
        ListResourcesRequestSchema,
        async (_request, context) => {
          if (!context.sessionId) throw new Error("Must provide a session");
          const connections = await getConnectionsForSession(context.sessionId);

          return {
            resources: connections.map((c) => c.resources).flat(),
          };
        }
      );

      server.setRequestHandler(
        ReadResourceRequestSchema,
        async (request, context) => {
          if (!context.sessionId) throw new Error("Must provide a session");
          const connections = await getConnectionsForSession(context.sessionId);

          for (const c of connections) {
            const resource = c.resources.find(
              (t) => t.uri == request.params.uri
            );
            if (resource) {
              const response = await c.client.readResource(request.params);
              return response;
            }
          }
          throw new Error("Tool not found or server not connected");
        }
      );

      server.setRequestHandler(
        ListToolsRequestSchema,
        async (_request, context) => {
          if (!context.sessionId) throw new Error("Must provide a session");
          const connections = await getConnectionsForSession(context.sessionId);
          return {
            tools: connections.map((c) => c.tools).flat(),
          };
        }
      );

      server.setRequestHandler(
        CallToolRequestSchema,
        async (request, context) => {
          if (!context.sessionId) throw new Error("Must provide a session");
          const connections = await getConnectionsForSession(context.sessionId);

          for (const c of connections) {
            const tool = c.tools.find((t) => t.name == request.params.name);
            if (tool) {
              try {
                c.client.setNotificationHandler(
                  LoggingMessageNotificationSchema,
                  async (notification) => {
                    logger().info(
                      "LoggingMessageNotificationSchema",
                      notification
                    );
                    await context.sendNotification(notification);
                  }
                );
                c.client.setNotificationHandler(
                  ProgressNotificationSchema,
                  async (notification) => {
                    logger().info("ProgressNotificationSchema", notification);
                    await context.sendNotification(notification);
                  }
                );
                c.client.fallbackNotificationHandler = async (notification) => {
                  logger().info(notification);
                  await context.sendNotification(notification);
                };

                const response = await c.client.callTool(
                  request.params,
                  undefined,
                  {
                    onprogress: (progress) => {
                      context
                        .sendNotification({
                          params: progress,
                          method: "notifications/progress",
                        })
                        .then(() => {})
                        .catch((err) => logger().error(err));
                    },
                  }
                );
                return response;
              } finally {
                c.client.removeNotificationHandler("notifications/message");
                c.client.removeNotificationHandler("notifications/progress");
                c.client.fallbackNotificationHandler = undefined;
              }
            }
          }
          throw new Error("Tool not found or server not connected");
        }
      );

      const cleanup = async () => {
        for (const [key, transport] of Object.entries(serverSessions)) {
          try {
            delete serverSessions[key];
            await transport.close(true);
          } catch (error) {
            logger().error(error);
          }
        }
      };

      this.server = server;

      server.onclose = () => {
        void cleanup();
      };

      this.router = {
        sseRequest: async (_req: Request, res: ServerResponse) => {
          logger().info("Received sse connection request");
          try {
            const transport = new SSEServerTransport(messagesUrl, res);
            serverSessions[transport.sessionId] = new ServerSession(transport);
            logger().info(
              { sessionId: transport.sessionId },
              "Creating transport"
            );
            res.on("close", () => {
              logger().info(
                { sessionId: transport.sessionId },
                "Disconnecting transport"
              );
              delete serverSessions[transport.sessionId];
              void transport.close();
            });
            await server.connect(transport);
          } catch (error) {
            logger().error(error);
            res.end();
          }
        },
        messageRequest: async (req, res) => {
          const sessionId = req.query.sessionId as string;
          const log = logger().child({ sessionId });

          log.info(`Received message`);

          try {
            const transport = serverSessions[sessionId].transport;
            if (!transport) {
              log.error(`No transport found`);
              res.status(404).json({
                jsonrpc: "2.0",
                error: {
                  code: -32000,
                  message: `No transport found for session ` + sessionId,
                },
                id: null,
              });
              return;
            }
            if (!(transport instanceof SSEServerTransport)) {
              log.error(`Transport type does not match request`);
              res.status(404).json({
                jsonrpc: "2.0",
                error: {
                  code: -32000,
                  message:
                    `Message endpoint called for non SSE transport ` +
                    sessionId,
                },
                id: null,
              });
              return;
            }
            // transport.onmessage = (message) => {
            //   console.log(message);
            // };
            await transport.handlePostMessage(req, res);
          } catch (error) {
            log.error(error);
            res.status(500).json({
              jsonrpc: "2.0",
              error: {
                code: -32000,
                message: "Internal server error",
              },
              id: null,
            });
            // res.status(500).json({ error }).end();
          }
        },
        httpPostRequest: async (req: Request, res) => {
          try {
            const rawBody = await readRawBody(req);
            // console.log(rawBody);
            const contentType = req.headers["content-type"] || "text/plain";

            // Handle JSON if Content-Type is application/json
            if (contentType.includes("application/json")) {
              try {
                const jsonData: unknown = JSON.parse(rawBody);
                // console.log(jsonData);
                req.body = jsonData;
                // res.json({ parsed: jsonData, raw: rawBody });
              } catch (e) {
                logger().error(e);
                res.status(400).json({
                  jsonrpc: "2.0",
                  error: {
                    code: -32000,
                    message: `Invalid request`,
                  },
                  id: null,
                });
                return;
              }
            }
            // Handle plain text
            else {
              res.type("text/plain").send(`Received: ${rawBody}`);
            }
          } catch (err) {
            logger().error(err);
            res.status(500).json({
              jsonrpc: "2.0",
              error: {
                code: -32000,
                message: "Internal server error",
              },
              id: null,
            });
            return;
          }

          // Check for existing session ID
          const sessionId = req.headers["mcp-session-id"] as string | undefined;
          let transport: StreamableHTTPServerTransport;
          if (
            sessionId &&
            serverSessions[sessionId] &&
            serverSessions[sessionId].transport instanceof
              StreamableHTTPServerTransport
          ) {
            // Reuse existing transport
            transport = serverSessions[sessionId].transport;
          } else if (!sessionId && mcpTypes.isInitializeRequest(req.body)) {
            // New initialization request
            transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => randomUUID(),
              onsessioninitialized: (sessionId) => {
                // Store the transport by session ID
                serverSessions[sessionId] = new ServerSession(transport);
              },
            });
            // Clean up transport when closed
            transport.onclose = () => {
              if (transport.sessionId) {
                serverSessions[transport.sessionId]
                  .close(false)
                  .then(() => {})
                  .catch((err) => logger().error(err));
                delete serverSessions[transport.sessionId];
              }
            };
            // Connect to the MCP server
            await server.connect(transport);
          } else {
            // Invalid request
            res.status(400).json({
              jsonrpc: "2.0",
              error: {
                code: -32000,
                message: "Bad Request: No valid session ID provided",
              },
              id: null,
            });
            return;
          }
          // Handle the request
          await transport.handleRequest(req, res, req.body);
        },
        httpGetRequest: async (req, res) => {
          const sessionId = req.headers["mcp-session-id"] as string | undefined;
          if (!sessionId || !serverSessions[sessionId]) {
            res.status(400).send("Invalid or missing session ID");
            return;
          }
          const log = logger().child({ sessionId });

          const transport = serverSessions[sessionId].transport;
          if (!(transport instanceof StreamableHTTPServerTransport)) {
            log.error(`Transport type does not match request`);
            res
              .status(405)
              .json({
                error:
                  `MCP endpoint called for non Streamable HTTP transport ` +
                  sessionId,
              })
              .end();
            return;
          }

          await transport.handleRequest(req, res);
        },
        httpDeleteRequest: async (req, res) => {
          const sessionId = req.headers["mcp-session-id"] as string | undefined;
          if (!sessionId || !serverSessions[sessionId]) {
            res.status(400).send("Invalid or missing session ID");
            return;
          }
          const log = logger().child({ sessionId });

          const transport = serverSessions[sessionId].transport;
          if (!(transport instanceof StreamableHTTPServerTransport)) {
            log.error(`Transport type does not match request`);
            res
              .status(405)
              .json({
                error:
                  `MCP endpoint called for non Streamable HTTP transport ` +
                  sessionId,
              })
              .end();
            return;
          }

          await transport.handleRequest(req, res);
          await transport.close();
          delete serverSessions[sessionId];
        },
      };
    }

    return this.router;
  }

  public async close() {
    if (this.server) {
      await this.server.close();
    }
  }
}

export default MCPServer;
