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

import { schemas } from "aloha-shared";
import { getLogger } from "../injector/provide-logger";
import MCPClient from "./mcp-client";
import MCPServer from "./mcp-server";
import { ConnectionOptionsRepository } from "../database/repositories/interfaces/connection-options-repository";

const logger = getLogger("MCPMANAGER");

class MCPManager {
  private connections: Map<string, MCPClient> = new Map();
  private servers: Map<string, MCPServer> = new Map();
  private serversByPath: Map<string, MCPServer> = new Map();
  private startDate: Date | null = null;
  private pingHandle: ReturnType<typeof setInterval> | null = null;

  public static inject = ["connectionOptionsRepository"] as const;
  public constructor(
    private connectionOptionsRepository: ConnectionOptionsRepository
  ) {}

  public getStartDate() {
    return this.startDate;
  }

  getConnection(id: string) {
    return this.connections.get(id);
  }
  getConnections() {
    return this.connections.values();
  }

  createConnection(serverOptions: schemas.MCPBaseConnectionWithId): MCPClient {
    const serverOptionsId = serverOptions.id;

    const log = logger().child({ serverOptionsId: serverOptionsId });

    let connection = this.connections.get(serverOptionsId);
    if (!connection) {
      log.info("Creating new MCP connection handler");
      connection = new MCPClient(serverOptions);
      this.connections.set(serverOptionsId, connection);
    }
    return connection;
  }

  async removeConnection(id: string) {
    const log = logger().child({ connectionId: id });
    log.info("Removing connection");
    const connection = this.connections.get(id);
    if (connection) {
      await connection.close();
    }

    this.connections.delete(id);
  }

  async startPingService() {
    const log = logger();
    log.info("Start ping services");

    const pingFunction = async () => {
      if (this.connections.size === 0) return;
      const onlineServers = Array.from(this.connections.values()).reduce(
        (p, c) => p + (c.isConnected ? 1 : 0),
        0
      );

      for (const connection of this.connections.values()) {
        try {
          await connection.pingClient();
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          // logger().error(e);
        }
      }
      const connectedServers = Array.from(this.connections.values()).reduce(
        (p, c) => p + (c.isConnected ? 1 : 0),
        0
      );

      if (onlineServers !== connectedServers) {
        logger().info(
          {
            onlineServers: connectedServers,
            totalServers: this.connections.size,
          },
          `MCP servers online`
        );
      }
    };
    await pingFunction();
    this.pingHandle = setInterval(() => void pingFunction(), 5000);
    this.startDate = new Date();
  }

  public stopPingService() {
    if (this.pingHandle !== null) {
      clearInterval(this.pingHandle);
    }
    this.pingHandle = null;
    this.startDate = null;
  }

  async testConnection(id: string) {
    const log = logger().child({ connectionId: id });
    log.info("Testing connection");
    const connection = this.connections.get(id);
    if (connection) {
      try {
        await connection.pingClient();
        return true;
      } catch (e) {
        logger().error(e);
        return false;
      }
    }
    return false;
  }

  getServer(id: string) {
    return this.servers.get(id);
  }
  getServerByPath(path: string) {
    return this.serversByPath.get(path);
  }
  getServers() {
    return this.servers.values();
  }

  createServer(serverOptions: schemas.MCPBaseServerWithId): MCPServer {
    const serverOptionsId: string = serverOptions.id;
    const log = logger().child({
      serverId: serverOptionsId,
      serverOptions,
    });
    const server = this.servers.get(serverOptionsId);

    if (!server) {
      if (serverOptions.visibility === schemas.Visibility.Private) {
        // Handle private visibility logic here
        logger().info(`Creating private server: ${serverOptions.serverPath}`);
      } else if (serverOptions.visibility === schemas.Visibility.Public) {
        // Handle public visibility logic here
        logger().info(`Creating public server: ${serverOptions.serverPath}`);
      } else if (serverOptions.visibility === schemas.Visibility.Managed) {
        // Handle managed visibility logic here
        logger().info(`Creating managed server: ${serverOptions.serverPath}`);
      }
      const server = new MCPServer(serverOptions);
      const messagePath = `/api/mcp/${serverOptions.serverPath}/messages`;
      log.info({ messagesPath: messagePath }, "Serving messages");
      server.serve(messagePath);
      this.servers.set(serverOptionsId, server);
      this.serversByPath.set(serverOptions.serverPath, server);
      return server;
    }
    return server;
  }

  async removeServer(id: string) {
    const server = this.servers.get(id);
    if (server) {
      const log = logger().child({ serverId: id });
      log.info("Removing server");
      this.serversByPath.delete(server.options.serverPath);
      await server.close();
    }

    this.servers.delete(id);
  }

  async reloadConnection(
    connectionDefinition: schemas.MCPBaseConnectionWithId
  ) {
    const log = logger().child({ connectionId: connectionDefinition.id });

    log.info("Reloading definition");

    // const definition = await this.connectionOptionsRepository.findById(id);

    await this.removeConnection(connectionDefinition.id);

    // if (!connectionDefinition) {
    //   log.warn(`Unable to find the definition for connection with id `);
    //   return;
    // }

    const connection = this.createConnection(connectionDefinition);
    await connection.connectClient();
  }
}

export default MCPManager;
