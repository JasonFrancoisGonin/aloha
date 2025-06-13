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

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  SSEClientTransport,
  SSEClientTransportOptions,
} from "@modelcontextprotocol/sdk/client/sse.js";
import {
  StreamableHTTPClientTransport,
  StreamableHTTPClientTransportOptions,
} from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { WebSocketClientTransport } from "@modelcontextprotocol/sdk/client/websocket.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import {
  ClientRequest,
  // ProgressNotificationSchema,
  Prompt,
  Resource,
  ResourceTemplate,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { schemas } from "aloha-shared";
import { getLogger } from "../injector/provide-logger";
import {
  hasMessageField,
  promisedStatus,
  PromisedStatus,
} from "../utils/type-utils";
import z from "zod";

const logger = getLogger("MCP-CLIENT");

export default class MCPClient {
  public client: Client;

  public connectionOptions: schemas.MCPBaseConnectionWithId;

  public resources: Resource[] = [];
  public resourceTemplates: ResourceTemplate[] = [];
  public prompts: Prompt[] = [];
  public tools: Tool[] = [];

  private transport: Transport;
  private connectPromise: PromisedStatus<boolean> | null = null;

  public get isConnected() {
    return this.connectPromise?.currentStatus() || false;
  }

  public get id() {
    return this.connectionOptions.id;
  }

  constructor(serverOptions: schemas.MCPBaseConnectionWithId) {
    this.connectionOptions = serverOptions;
    this.transport = this.constructTransport(serverOptions);

    this.client = this.constructClient();
  }

  private constructClient() {
    return new Client(
      {
        name: "mcp-hub",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );
  }

  private getSSEClientTransportOptions(
    serverOptions: schemas.MCPBaseConnection
  ): SSEClientTransportOptions | StreamableHTTPClientTransportOptions {
    if (serverOptions.authentication) {
      let additionalHeaders: { [k: string]: string } | undefined;

      switch (serverOptions.authentication.type) {
        case "none":
          break;
        case "basic": {
          const authData = serverOptions.authentication;
          additionalHeaders = {
            Authorization:
              "Basic " + btoa(authData.username + ":" + authData.password),
          };
          break;
        }
        case "token": {
          const authData = serverOptions.authentication;
          additionalHeaders = {
            Authorization: "Bearer " + authData.token,
          };
        }
      }

      if (additionalHeaders) {
        return {
          eventSourceInit: {
            fetch: (url, opts) => {
              const headers = opts?.headers || {};

              return global.fetch(url, {
                ...opts,
                headers: { ...headers, ...additionalHeaders },
              });
            },
          },
        };
      }
    }

    return {};
  }

  private constructTransport(
    serverOptions: schemas.MCPBaseConnection
  ): Transport {
    switch (serverOptions.serverProtocol) {
      case "http": {
        const stremableOptions =
          this.getSSEClientTransportOptions(serverOptions);
        return new StreamableHTTPClientTransport(
          new URL(serverOptions.serverUrl),
          stremableOptions
        );
      }
      case "websocket":
        return new WebSocketClientTransport(new URL(serverOptions.serverUrl));
      case "sse": {
        const sseOptions = this.getSSEClientTransportOptions(serverOptions);
        return new SSEClientTransport(
          new URL(`${serverOptions.serverUrl}/sse`),
          sseOptions
        );
      }
      default:
        throw new Error(
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          `Unsupported transport type: ${serverOptions.serverProtocol}`
        );
    }
  }

  public async connectClient() {
    if (this.connectPromise) {
      return this.connectPromise;
    }

    const log = logger().child({ clientId: this.connectionOptions.id });

    this.connectPromise = promisedStatus(
      false,
      this.client
        .connect(this.constructTransport(this.connectionOptions))
        // .then(() => {
        //   this.client.setNotificationHandler(
        //     ProgressNotificationSchema,
        //     (notification) => {
        //       log.info(notification);
        //     }
        //   );
        // })
        .then(() => {
          return true;
        })
        .catch(async (err) => {
          log.error(hasMessageField(err) ? err.message : err);
          await this.close();
          return false;
        })
    );

    return this.connectPromise;
  }

  public async pingClient() {
    const isConnected = await this.connectClient();
    if (!isConnected) {
      return;
    }
    try {
      await this.client.ping();
    } catch (error: unknown) {
      await this.close();
      logger().child({ connectionId: this.connectionOptions.id }).debug(error);
      throw error;
    }

    // this.client.setNotificationHandler()

    const capabilities = this.client.getServerCapabilities();

    if (capabilities?.resources) {
      try {
        const { resources } = await this.client.listResources();
        this.resources = resources;
      } catch (error) {
        logger().debug(error);
        this.resources = [];
      }
      try {
        const { resourceTemplates } = await this.client.listResourceTemplates();
        this.resourceTemplates = resourceTemplates;
      } catch (error) {
        logger().debug(error);
        this.resourceTemplates = [];
      }
    }

    if (capabilities?.prompts) {
      const { prompts } = await this.client.listPrompts();
      this.prompts = prompts;
    }

    if (capabilities?.tools) {
      const { tools } = await this.client.listTools();
      this.tools = tools;
    }
  }

  public async close() {
    this.connectPromise = null;
    if (this.transport) await this.transport.close();
    if (this.client) await this.client.close();
  }

  public async sendRequest<T extends z.ZodType<object>>(
    request: ClientRequest,
    schema: T
  ) {
    const isConnected = await this.connectClient();
    const log = logger().child({ clientId: this.connectionOptions.id });
    if (!isConnected) {
      log.error("Unable to send MCP request: client is not connected");
      throw new Error(`Client is not connected`);
    }
    const result = await this.client.request(request, schema);
    return result;
  }
}
