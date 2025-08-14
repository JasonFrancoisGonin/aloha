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

// const fetchCache = () => injector.resolve("fetchCache");

import {
  authentication_strategy,
  endpoints_schemas,
  // endpoints_schemas,
  schemas,
} from "aloha-shared";
import {
  crudGenerator,
  HTTPError,
  permissionsManagerGenerator,
  verifyPermission,
} from "./utils";
import { getLogger } from "../injector/provide-logger";
import { injector } from "../injector/injector";
import { authorise } from "../middleware/authorise";
import { stringComparer } from "../utils/sort-comparators";
import { Request, Response } from "express";
import {
  AGENT_PROJECT,
  createJwtToken,
} from "../middleware/jwt-authentication";
import { assertFieldInObject } from "../utils/type-utils";
import { z } from "zod";

const logger = getLogger("AGENT");

const agentRepository = () => injector().resolve("agentRepository");
const mcpManager = () => injector().resolve("mcpManager");
const fetchCache = () => injector().resolve("fetchCache");
const userRepository = () => injector().resolve("userRepository");

export function agentRoutes() {
  logger().info("Registering agents router");

  const router = crudGenerator<schemas.Agent>({
    name: "agent",
    logger: logger,
    repository: agentRepository,
    schema: schemas.AgentSchema,
    readPermissions: [authentication_strategy.Permissions.AgentsRead],
    writePermissions: [authentication_strategy.Permissions.AgentsWrite],
    endpoints: {
      list: {
        enableCache: false,
        factory: async (req) => {
          const agents = await agentRepository().findByPattern({});

          const permitted = (
            await Promise.all(
              agents.map(async (agent) =>
                (await verifyPermission(agent, req, "read")) ? agent : null
              )
            )
          ).filter((s) => s !== null);

          permitted.sort(stringComparer("name"));

          const detailedAgents: endpoints_schemas.AgentListDetail[] =
            permitted.map(({ id, ...agentOptions }) => {
              const client = mcpManager().getConnection(id);
              const server = mcpManager().getServer(id);
              return {
                ...agentOptions,
                id: id,
                isConnected: !!client && client.isConnected && !!server,
                tools: client?.tools.length || 0,
              };
            });

          return detailedAgents;
        },
      },
      get: {
        enableCache: false,
        factory: async (req) => {
          assertFieldInObject(req.params, "id", z.string());
          const id = req.params.id;
          const agentInfo = await agentRepository().findById(id);

          if (!agentInfo) {
            throw new HTTPError(404, "Agent not found");
          }

          const connection = mcpManager().getConnection(id);

          await verifyPermission(agentInfo, req, "read", true);

          return {
            ...agentInfo,
            isConnected: connection && connection.isConnected,
            tools: connection?.tools,
            connectionsDetail: agentInfo.connections
              ?.map((sc) => {
                const connection = mcpManager().getConnection(sc);
                if (connection == undefined) return null;
                return {
                  id: sc,
                  name: connection?.connectionOptions.name,
                  isConnected: connection?.isConnected,
                  type: connection.connectionOptions.type,
                };
              })
              .filter((sc) => sc !== null),
          };
          // return result as schemas.MCPServerOptions;
        },
      },
      create: async (req) => {
        const agentData = req.body as schemas.Agent;
        if (!agentData.serverPath.startsWith("agent-")) {
          agentData.serverPath = `agent-${agentData.serverPath}`;
        }
        const agentWithSamePath = await agentRepository().findByPattern({
          serverPath: agentData.serverPath,
        });

        if (agentWithSamePath.length > 0) {
          throw new HTTPError(409, "Agent Server Path already used");
        }

        // Ensure visibility is set to a default value if not provided
        const visibility = agentData.visibility ?? schemas.Visibility.Private;

        // Ensure that the creator is set to the user requesting the creation
        // if (!authentication_strategy.isUserAuthenticated(req)) {
        //   throw new HTTPError(500, "Could not resolve the logged user");
        // }

        const user = authentication_strategy.getUserFromSession(req);
        const loggedUser = await userRepository().findById(user.id);
        if (!loggedUser) {
          throw new HTTPError(500, "Could not resolve the logged user");
        }

        const inserted = await agentRepository().create({
          ...agentData,
          visibility,
          creator: loggedUser.id,
        });

        if (!inserted) {
          throw new HTTPError(
            500,
            "Could not create the Agent in the database"
          );
        }

        // Create both a connection and a server for this agent
        mcpManager().createConnection(inserted);
        mcpManager().createServer(inserted);

        return inserted;
      },
      update: async (req) => {
        assertFieldInObject(req.params, "id", z.string());
        const id = req.params.id;
        const newAgentOptions = req.body as Partial<schemas.Agent>;
        const agentWithSamePath = await agentRepository().findByPattern({
          serverPath: newAgentOptions.serverPath,
        });

        if (
          agentWithSamePath.length > 0 &&
          agentWithSamePath.find((e) => e.id === id) === undefined
        ) {
          throw new HTTPError(409, "Agent Server Path already used");
        }

        const agentOption = await agentRepository().findById(id);

        if (agentOption === null) {
          throw new HTTPError(404, "Agent not found");
        }

        await verifyPermission(agentOption, req, "write", true);

        // Ensure visibility is set to a default value if not provided
        if (!newAgentOptions.visibility) {
          newAgentOptions.visibility = schemas.Visibility.Private;
        }

        // If the server does not have a creator, set it now
        let creator = newAgentOptions.creator;
        const user = authentication_strategy.getUserFromSession(req);
        if (
          !creator &&
          user?.permissions.includes(
            authentication_strategy.Permissions.Administration
          )
        ) {
          const loggedUser = await userRepository().findById(user.id);
          if (!loggedUser) {
            throw new HTTPError(500, "Could not resolve the logged user");
          }
          creator = loggedUser.id;
        }

        const performed = await agentRepository().updateById(id, {
          ...newAgentOptions,
          creator,
        });
        if (!performed) return false;
        const agentOptions = await agentRepository().findById(id);
        if (agentOptions) {
          await mcpManager().reloadConnection(agentOptions);
          return true;
        } else {
          return false;
        }
      },
      delete: async (req) => {
        assertFieldInObject(req.params, "id", z.string());
        const id = req.params.id;
        const agent = await agentRepository().findById(id);

        if (agent === null) {
          throw new HTTPError(404, "Agent not found");
        }
        await verifyPermission(agent, req, "write", true);

        const deleted = await agentRepository().deleteById(id);
        if (deleted) {
          await mcpManager().removeConnection(id);
          await mcpManager().removeServer(id);
        }
        return deleted;
      },
    },
  });

  router.get(
    "/:id/_token",
    authorise([authentication_strategy.Permissions.AgentsWrite]),
    async (req: Request, res: Response) => {
      const { id } = req.params;
      const log = logger().child({ agentId: id });
      log.info("Create token for agent creator");

      try {
        const agent = await agentRepository().findById(id);
        if (!agent) {
          res.status(404).json({ error: "Agent not found" });
          return;
        }

        await verifyPermission(agent, req, "read");

        const creatorUser = await userRepository().findById(agent.creator);
        if (!creatorUser) {
          res.status(404).json({ error: "Creator user not found" });
          return;
        }

        // if (!authentication_strategy.isUserAuthenticated(req)) {
        //   throw new HTTPError(500, "Could not resolve the logged user");
        // }
        const user = authentication_strategy.getUserFromSession(req);

        if (user.id !== creatorUser.id && user.id !== creatorUser.userId) {
          res.status(403).json({
            error:
              "Only the creator of an agent can issue tokens for the agent",
          });
          return;
        }

        const tokenRepository = () => injector().resolve("tokenRepository");
        // Delete all existing tokens for this agent
        const existing = await tokenRepository().findByPattern({
          userId: agent.id,
        });
        for (const existing_token of existing) {
          await tokenRepository().deleteById(existing_token.id);
        }

        // Create token without project association for agents
        const newToken = await tokenRepository().create({
          userId: agent.id,
          permissions: [authentication_strategy.Permissions.ProxyApiAccess],
          expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          projectId: AGENT_PROJECT,
          disabled: false,
        });

        const jwt = createJwtToken(newToken);
        fetchCache().clear();
        res.send({ token: jwt }).end();
      } catch (e) {
        log.error(e);
        res
          .status(500)
          .json({ error: "Failed to create access token for the agent" });
      }
    }
  );

  // Associate a client to a server
  router.post(
    "/:id/_connect/:cid",
    authorise([authentication_strategy.Permissions.AgentsWrite]),
    async (req: Request, res: Response) => {
      // assertFieldInObject(req.params, "id", z.string());
      // assertFieldInObject(req.params, "cid", z.string());
      const { id, cid } = req.params;

      const log = logger().child({ serverId: id, connectionId: cid });
      log.info("Associate connection to Agent");

      try {
        if (!id) {
          res
            .status(500)
            .json({ error: "Must provide the id of the Agent to update" });
          return;
        }
        if (!cid) {
          res
            .status(500)
            .json({ error: "Must provide the id of the client to connect" });
          return;
        }
        const server = mcpManager().getServer(id);
        if (!server) {
          res.status(404).json({ error: "Agent not found" });
          return;
        }

        await verifyPermission(server.options, req, "write", true);

        const connectionOption = await injector()
          .resolve("connectionOptionsRepository")
          .findById(cid);

        if (!connectionOption) {
          res.status(404).json({ error: "Connection not found" });
          return;
        }
        if (server.options.connections?.includes(cid)) {
          res.status(204).end();
          return;
        }

        await verifyPermission(connectionOption, req, "read", true);

        const result = await agentRepository().addNewConnection(id, cid);

        if (result) {
          server.options.connections?.push(cid);
          fetchCache().clear();
          res.status(204).end();
        } else {
          res.status(404).json({ error: "Failed to update Agent" });
        }
      } catch (error) {
        if (error instanceof HTTPError) {
          res.status(error.errorCode).json({ error: error.message });
        } else {
          log.error(error);
          let errorMessage = "Failed to update Agent";
          if (
            error &&
            typeof error == "object" &&
            "message" in error &&
            typeof error.message == "string"
          ) {
            errorMessage = error.message;
          }
          res.status(500).json({ error: errorMessage });
        }
      }
    }
  );

  // Dissociate a client to a server
  router.post(
    "/:id/_disconnect/:cid",
    authorise([authentication_strategy.Permissions.AgentsWrite]),
    async (req: Request, res: Response) => {
      // assertFieldInObject(req.params, "id", z.string());
      // assertFieldInObject(req.params, "cid", z.string());
      const { id, cid } = req.params;

      const log = logger().child({ serverId: id, connectionId: cid });
      log.info("Disconnect client from Agent");

      try {
        if (!id) {
          res
            .status(500)
            .json({ error: "Must provide the id of the Agent to update" });
          return;
        }
        if (!cid) {
          res
            .status(500)
            .json({ error: "Must provide the id of the client to connect" });
          return;
        }
        const server = mcpManager().getServer(id);
        if (!server) {
          res.status(404).json({ error: "Agent not found" });
          return;
        }
        await verifyPermission(server.options, req, "write", true);

        if (!server.options.connections?.some((sc) => sc === cid)) {
          res.status(204).end();
          return;
        }
        const newConnections = server.options.connections?.filter(
          (sc) => sc !== cid
        );
        const result = await agentRepository().replaceConnections(
          id,
          newConnections
        );

        if (result) {
          server.options.connections = newConnections;
          fetchCache().clear();
          res.status(204).end();
        } else {
          res.status(404).json({ error: "Agent not found" });
        }
      } catch (error) {
        if (error instanceof HTTPError) {
          res.status(error.errorCode).json({ error: error.message });
        } else {
          log.error(error);
          res.status(500).json({ error: "Failed to update Agent" });
        }
      }
    }
  );

  router.get(
    "/by_connection_id/:cid",
    authorise([authentication_strategy.Permissions.ServersRead]),
    async (req: Request, res: Response) => {
      // assertFieldInObject(req.params, "cid", z.string());
      const { cid } = req.params;

      const log = logger().child({ connectionId: cid });
      log.info("Get agents bound to connection");

      try {
        if (!cid) {
          res.status(400).json({ error: "No connection id specified" });
          return;
        }

        const result = await agentRepository().findByConnectionId(cid);
        res.json(result).end();
        return;
      } catch (error) {
        log.error(error);
        res
          .status(500)
          .json({ error: "Failed to find agents by connection id" });
      }
    }
  );

  permissionsManagerGenerator({
    router,
    name: "agents",
    repository: agentRepository,
    logger,
    writePermissions: [authentication_strategy.Permissions.ServersWrite],
  });

  return router;
}
