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
              operation: {
                type: "string",
                description: "The arithmetic operation to be performed.",
              },
            },
            required: ["operation"],
          },
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, (request) => {
    if (request.params.name === "Calculator") {
      console.log(request.params);
      const operation = request.params.arguments
        ? request.params.arguments["operation"]
        : "1+1";
      const result = eval(operation as string) as unknown;
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
    console.log("Received message");

    await transport.handlePostMessage(req, res);
  });

  return new Promise<http.Server>((resolve) => {
    const server = app.listen(port, () => {
      console.log(`Calculator MCP is running on port ${port}`);
      resolve(server);
    });
  });
}
