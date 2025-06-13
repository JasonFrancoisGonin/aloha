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

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  ClientRequest,
  ClientRequestSchema,
  CompatibilityCallToolResultSchema,
  CompleteResultSchema,
  GetPromptResultSchema,
  ReadResourceResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
  AuthenticationStrategy,
  entrypoint_schemas,
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

const fetchCache = () => injector.resolve("fetchCache");

const mcpManager = () => injector.resolve("mcpManager");

const repository = () => injector.resolve("connectionOptionsRepository");

const serverOptionsRepository = () =>
  injector.resolve("serverOptionsRepository");

const userRepository = () => injector.resolve("userRepository");

const logger = getLogger("CLIENTS");

export function clientsRoutes() {
  const router = crudGenerator({
    name: "client",
    logger: logger,
    repository,
    schema: schemas.MCPConnectionOptionsSchema,
    readPermissions: [AuthenticationStrategy.Permissions.ClientsRead],
    writePermissions: [AuthenticationStrategy.Permissions.ClientsWrite],
    endpoints: {
      list: {
        enableCache: false,
        factory: async (req) => {
          const servers = await repository().findByPattern({});

          const permitted = (
            await Promise.all(
              servers.map(async (server) =>
                (await verifyPermission(server, req, "read")) ? server : null
              )
            )
          ).filter((s) => s !== null);

          permitted.sort(stringComparer("name"));

          const detailedServers: entrypoint_schemas.MCPConnectionStatus[] =
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
          const opts = await repository().findById(id);

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

          const result: entrypoint_schemas.MCPConnectionDetail = {
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
        const connection = await repository().findById(id);

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
        if (
          !creator &&
          req.user?.permissions.includes(
            AuthenticationStrategy.Permissions.Administration
          )
        ) {
          const loggedUser = await userRepository().findById(req.user.id);
          if (!loggedUser) {
            throw new HTTPError(500, "Could not resolve the logged user");
          }
          creator = loggedUser.id;
        }

        const performed = await repository().updateById(id, {
          ...newConnectionOptions,
          creator,
          type: "client",
        });
        if (!performed) return false;
        const connectionOptions = await repository().findById(id);
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
        const connection = await repository().findById(id);

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
        const deleted = await repository().deleteById(id);

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
    authorise([AuthenticationStrategy.Permissions.ClientsWrite]),
    validateRequestBody(
      entrypoint_schemas.MCPConnectionOptionsCreateSchema,
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
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
          message: "message" in error ? error.message : error.toString(),
        });
      };

      try {
        const newConnectionData =
          req.body as entrypoint_schemas.MCPConnectionOptionsCreate;

        // // Ensure visibility is set to a default value if not provided
        // if (!newConnectionData.visibility) {
        //   newConnectionData.visibility = schemas.Visibility.Private;
        // }

        const loggedUser = await userRepository().findById(req.user!.id);
        if (!loggedUser) {
          await handleError("Could not resolve the logged user");
          return;
        }

        // Store in the database
        const newConnection = await repository().create({
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
    authorise([AuthenticationStrategy.Permissions.ClientsWrite]),
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

      const clientDefinition = await repository().findById(id);

      if (!clientDefinition) {
        res.status(404).json({ error: "Client not found" }).end();
        return;
      }

      const canExecute = await verifyPermission(
        clientDefinition,
        req,
        "execute"
      );

      if (!canExecute) {
        res
          .status(403)
          .json({ error: "The user has no rights to execute the tool" });
        return;
      }

      let schema: z.ZodSchema;
      switch (clientRequest.method) {
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
    repository: repository,
    logger,
    writePermissions: [AuthenticationStrategy.Permissions.ClientsWrite],
  });

  return router;
}
