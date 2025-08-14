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
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import http from "http";

export function startMockServer(port: number) {
  const app = express();

  const server = new Server(
    {
      name: "example-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListResourcesRequestSchema, () => {
    return {
      resources: [
        {
          uri: "file:///documentation.txt",
          name: "Documentation on how the Calculator works",
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, (request) => {
    if (request.params.uri === "file:///example.txt") {
      return {
        contents: [
          {
            uri: "file:///documentation.txt",
            mimeType: "text/plain",
            text: "Information about the calculator",
          },
        ],
      };
    } else {
      throw new Error("Resource not found");
    }
  });

  server.setRequestHandler(ListToolsRequestSchema, () => {
    return {
      tools: [
        {
          name: "Calculator",
          description: "This is a simple calculator.",
          inputSchema: {
            type: "object",
            properties: {
              expression: {
                type: "string",
                description: "The arithmetic expression to be performed.",
              },
            },
            required: ["expression"],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, (request) => {
    if (request.params.name === "Calculator") {
      console.log(request.params);
      const expression = request.params.arguments
        ? request.params.arguments["expression"]
        : "1+1";
      const result = eval(expression as string) as unknown;
      return {
        content: [
          {
            type: "text",
            text: String(result),
          },
        ],
      };
    } else {
      throw new Error("Tool not found");
    }
  });

  let transport: SSEServerTransport;

  app.get("/sse", async (req, res) => {
    console.log("Received connection");
    transport = new SSEServerTransport("/message", res);
    await server.connect(transport);
  });
  app.post("/message", async (req, res) => {
    await transport.handlePostMessage(req, res);
  });

  return new Promise<{ httpServer: http.Server; mcpServer: Server }>(
    (resolve) => {
      const httpServer = app.listen(port, () => {
        console.log(`Calculator MCP is running on port ${port}`);
        resolve({ httpServer, mcpServer: server });
      });
    }
  );
}
