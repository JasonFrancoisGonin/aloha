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

/* eslint-disable @typescript-eslint/no-unused-expressions */
import {
  CallToolResultSchema,
  ListToolsResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { expect } from "chai";
import MCPClient from "../../src/mcp/mcp-client";
import { assertDefined } from "../../src/utils/type-utils";
import {
  MCPTestServer,
  startMCPTestServer,
  stopMCPTestServer,
} from "../test-resources";
import { randomId } from "../test-utils";

describe("MCP Client", () => {
  let testServer!: MCPTestServer;
  let mcpClient!: MCPClient;

  async function allocateAndConnectClient() {
    assertDefined(testServer);
    assertDefined(mcpClient);

    const result = await mcpClient.connectClient();
    expect(result).to.be.true;

    await mcpClient.pingClient();
  }

  beforeEach(async () => {
    testServer = await startMCPTestServer("sse");

    mcpClient = new MCPClient({
      ...testServer.connectionOptions,
      id: randomId(),
    });
  });

  afterEach(async () => {
    if (mcpClient) {
      await mcpClient.close();
    }

    if (testServer) {
      await stopMCPTestServer(testServer);
    }
  });

  it("should allocate a test MCP client and mock server", async () => {
    await allocateAndConnectClient();

    expect(mcpClient.resources).to.have.length(1);
  });

  it("should get a list of tools", async () => {
    await allocateAndConnectClient();
    const result = await mcpClient.sendRequest(
      {
        method: "tools/list",
      },
      ListToolsResultSchema
    );
    const tools = result.tools;
    expect(tools).is.not.empty;
  });

  it("should call the Calculator tool", async () => {
    await allocateAndConnectClient();
    const result = await mcpClient.sendRequest(
      {
        method: "tools/call",
        params: {
          name: "Calculator",
          arguments: {
            expression: "4+1",
          },
        },
      },
      CallToolResultSchema
    );
    const content = result.content;
    expect(content).to.be.deep.equal([
      {
        type: "text",
        text: "5",
      },
    ]);
  });
});
