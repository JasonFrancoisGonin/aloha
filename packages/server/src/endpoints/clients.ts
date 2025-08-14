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

import {
  ClientRequest,
  ClientRequestSchema,
  CompatibilityCallToolResultSchema,
  CompleteResultSchema,
  GetPromptResultSchema,
  ListToolsResultSchema,
  ReadResourceResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  authentication_strategy,
  endpoints_schemas,
  schemas,
} from "aloha-shared";
import { Request, Response } from "express";
import z from "zod";
import { injector } from "../injector/injector";
import { getLogger } from "../injector/provide-logger";
import { authorise } from "../middleware/authorise";
import { stringComparer } from "../utils/sort-comparators";
import { assertFieldInObject, unknownToString } from "../utils/type-utils";
import {
  crudGenerator,
  HTTPError,
  permissionsManagerGenerator,
  validateRequestBody,
  verifyPermission,
} from "./utils";

const fetchCache = () => injector().resolve("fetchCache");

const mcpManager = () => injector().resolve("mcpManager");

const clientRepository = () =>
  injector().resolve("connectionOptionsRepository");
const agentRepository = () => injector().resolve("agentRepository");

const serverOptionsRepository = () =>
  injector().resolve("serverOptionsRepository");

const userRepository = () => injector().resolve("userRepository");

const logger = getLogger("CLIENTS");

export function clientsRoutes() {
  logger().info("Registering client router");

  const router = crudGenerator({
    name: "client",
    logger: logger,
    repository: clientRepository,
    schema: schemas.MCPConnectionOptionsSchema,
    readPermissions: [authentication_strategy.Permissions.ClientsRead],
    writePermissions: [authentication_strategy.Permissions.ClientsWrite],
    endpoints: {
      list: {
        enableCache: false,
        factory: async (req) => {
          const servers = await clientRepository().findByPattern({});

          const permitted = (
            await Promise.all(
              servers.map(async (server) =>
                (await verifyPermission(server, req, "read")) ? server : null
              )
            )
          ).filter((s) => s !== null);

          permitted.sort(stringComparer("name"));

          const detailedServers: endpoints_schemas.MCPConnectionStatus[] =
            permitted.map(({ id, ...server }) => {
              const connection = mcpManager().getConnection(id);
              return {
                ...server,
                id: id,
                isConnected: connection ? connection.isConnected : false,
                resources: connection ? connection.resources.length : 0,
                resourceTemplates: connection
                  ? connection.resourceTemplates.length
                  : 0,
                prompts: connection ? connection.prompts.length : 0,
                tools: connection ? connection.tools.length : 0,
              };
            });
          return detailedServers;
        },
      },
      create: false,
      get: {
        enableCache: false,
        factory: async (req) => {
          assertFieldInObject(req.params, "id", z.string());
          const id = req.params.id;
          const opts = await clientRepository().findById(id);

          if (opts === null) {
            throw new HTTPError(404, "Client not found");
          }

          const connection = mcpManager().getConnection(id);

          if (!connection) {
            throw new HTTPError(404, "Client not found");
          }

          await verifyPermission(
            connection.connectionOptions,
            req,
            "read",
            true
          );

          const result: endpoints_schemas.MCPConnectionDetail = {
            ...opts,
            id,
            isConnected: connection.isConnected,
            resources: connection.resources,
            resourceTemplates: connection.resourceTemplates,
            prompts: connection.prompts,
            tools: connection.tools,
          };
          return result;
        },
      },
      update: async (req) => {
        assertFieldInObject(req.params, "id", z.string());
        const id = req.params.id;
        const newConnectionOptions =
          req.body as Partial<schemas.MCPConnectionOptions>;
        const connection = await clientRepository().findById(id);

        if (connection === null) {
          throw new HTTPError(404, "Client not found");
        }
        await verifyPermission(connection, req, "write", true);

        // Ensure visibility is set to a default value if not provided
        if (!newConnectionOptions.visibility) {
          newConnectionOptions.visibility = schemas.Visibility.Private;
        }

        // If the connection does not have a creator, set it now
        let creator = connection.creator;
        // if (!authentication_strategy.isUserAuthenticated(req)) {
        //   throw new HTTPError(500, "Could not resolve the logged user");
        // }
        const user = authentication_strategy.getUserFromSession(req);
        if (
          !creator &&
          user.permissions.includes(
            authentication_strategy.Permissions.Administration
          )
        ) {
          const loggedUser = await userRepository().findById(user.id);
          if (!loggedUser) {
            throw new HTTPError(500, "Could not resolve the logged user");
          }
          creator = loggedUser.id;
        }

        const performed = await clientRepository().updateById(id, {
          ...newConnectionOptions,
          creator,
          type: "client",
        });
        if (!performed) return false;
        const connectionOptions = await clientRepository().findById(id);
        if (connectionOptions) {
          await mcpManager().reloadConnection(connectionOptions);
          return true;
        } else {
          return false;
        }
      },
      delete: async (req) => {
        assertFieldInObject(req.params, "id", z.string());
        const id = req.params.id;
        const connection = await clientRepository().findById(id);

        if (connection === null) {
          throw new HTTPError(404, "Client not found");
        }
        await verifyPermission(connection, req, "write", true);

        const serverRepository = serverOptionsRepository();
        const servers = await serverRepository.findByConnectionId(id);

        await Promise.all(
          servers.map(async (e) => {
            const connections = e.connections || [];
            const idx = connections.indexOf(id);
            if (idx >= 0) {
              connections.splice(idx, 1);
              await serverRepository.replaceConnections(e.id, connections);
            }
          })
        );
        const deleted = await clientRepository().deleteById(id);

        if (deleted) {
          await mcpManager().removeConnection(id);
          return true;
        }

        return false;
      },
    },
  });

  // Create a new client
  router.post(
    "/",
    authorise([authentication_strategy.Permissions.ClientsWrite]),
    validateRequestBody(
      endpoints_schemas.MCPConnectionOptionsCreateSchema,
      logger,
      true
    ),
    async (req: Request, res: Response) => {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();

      const log = logger().child({ connection: req.body as unknown });
      log.info("Creating client");

      const sendEvent = (event: string, data: unknown) => {
        return new Promise<void>((resolve, reject) => {
          logger().debug({ event }, `Sending event`);
          if (event === "error") {
            res.write(
              `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
              (error) => (error ? reject(error) : resolve())
            );
          } else {
            res.write(
              `data: ${JSON.stringify({ type: event, content: data })}\n\n`,
              (error) => (error ? reject(error) : resolve())
            );
          }
        });
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handleError = async (error: any) => {
        logger().error(error);
        await sendEvent("error", {
          message: unknownToString(error),
        });
      };

      try {
        const newConnectionData =
          req.body as endpoints_schemas.MCPConnectionOptionsCreate;

        // // Ensure visibility is set to a default value if not provided
        // if (!newConnectionData.visibility) {
        //   newConnectionData.visibility = schemas.Visibility.Private;
        // }

        if (!authentication_strategy.isUserAuthenticated(req)) {
          await handleError("Could not resolve the logged user");
          return;
        }
        const user = authentication_strategy.getUserFromSession(req);
        const loggedUser = await userRepository().findById(user.id);
        if (!loggedUser) {
          await handleError("Could not resolve the logged user");
          return;
        }

        // Store in the database
        const newConnection = await clientRepository().create({
          ...newConnectionData,
          creator: loggedUser.id,
          visibility: schemas.Visibility.Private,
          type: "client",
        });

        if (!newConnection) {
          await handleError("Could not create the client in the database");
          return;
        }
        fetchCache().clear();

        await sendEvent("Client has been stored in the database", {
          id: newConnection.id,
        });

        // Create a new connection in the MCPManager object
        const connection = mcpManager().createConnection(newConnection);
        if (connection) {
          await sendEvent("Connecting to the client...", {
            id: newConnection.id,
          });

          // Attempt to connect to the server
          try {
            await connection.connectClient();
            await sendEvent("Client connection successful", {
              id: newConnection.id,
            });
          } catch (error) {
            await handleError(error);
          }
        } else {
          await handleError(new Error("Failed to create client"));
        }
      } catch (error) {
        await handleError(error);
      } finally {
        res.end();
      }
    }
  );

  router.post(
    "/:id/sendMCPClientRequest",
    validateRequestBody(ClientRequestSchema, logger),
    authorise([authentication_strategy.Permissions.ClientsWrite]),
    async (req: Request, res: Response) => {
      const { id } = req.params;
      const log = logger().child({ id });

      const clientRequest = req.body as ClientRequest;

      log.info("Send MCP Request to client");

      if (!id) {
        res
          .status(500)
          .json({ error: "Must provide the id of the client to call" });
        return;
      }

      const client = mcpManager().getConnection(id);
      if (!client) {
        res.status(404).json({ error: "Client not found" }).end();
        return;
      }

      const clientDefinition = await clientRepository().findById(id);
      const agentDefinition = await agentRepository().findById(id);

      if (!clientDefinition && !agentDefinition) {
        res
          .status(404)
          .json({ error: "Client/Agent definition not found" })
          .end();
        return;
      }

      const definition = clientDefinition || agentDefinition;
      if (!definition) {
        res
          .status(500)
          .json({ error: "Client/Agent definition not found" })
          .end();
        return;
      }

      const canExecute = await verifyPermission(definition, req, "execute");

      if (!canExecute) {
        res
          .status(403)
          .json({ error: "The user has no rights to execute the tool" });
        return;
      }

      let schema: z.ZodSchema;
      switch (clientRequest.method) {
        case "tools/list":
          schema = ListToolsResultSchema;
          break;
        case "tools/call":
          schema = CompatibilityCallToolResultSchema;
          break;
        case "resources/read":
          schema = ReadResourceResultSchema;
          break;
        case "prompts/get":
          schema = GetPromptResultSchema;
          break;
        case "completion/complete":
          schema = CompleteResultSchema;
          break;
        default:
          res.status(402).json({
            error: `Unsupported method name: ${clientRequest.method}`,
          });
          return;
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const response = await client.sendRequest(clientRequest, schema);
        res.json(response).end();
        return;
      } catch (error) {
        log.error(error);
        res
          .status(500)
          .json({ error: unknownToString(error) })
          .end();
        return;
      }
    }
  );
  permissionsManagerGenerator({
    router,
    name: "client",
    repository: clientRepository,
    logger,
    writePermissions: [authentication_strategy.Permissions.ClientsWrite],
  });

  return router;
}
