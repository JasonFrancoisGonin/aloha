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
import { expect } from "chai";
import { injector } from "../../src/injector/injector";
import { startMCPTestServer } from "../test-resources";
import {
  randomConnectionsOptions,
  randomId,
  randomServerOptions,
  randomString,
} from "../test-utils";
import MCPManager from "./mcp-manager";
import sinon from "sinon";
import { assertDefined } from "../../src/utils/type-utils";

describe("MCP Manager", () => {
  let mcpManager!: MCPManager;

  before(() => {
    mcpManager = injector().resolve("mcpManager");
  });

  afterEach(async () => {
    const connections = [...mcpManager.getConnections()];
    await Promise.all(
      connections.map((e) => mcpManager.removeConnection(e.id))
    );

    const servers = [...mcpManager.getServers()];
    await Promise.all(servers.map((e) => mcpManager.removeServer(e.id)));
  });

  describe("getConnection(s)", () => {
    it("should retrieve the connection by id", async () => {
      const connectionOption = await randomConnectionsOptions("sse");
      const connectionId: string = randomId();
      mcpManager.createConnection({
        ...connectionOption,
        id: connectionId,
      });
      const connection = mcpManager.getConnection(connectionId);
      expect(connection).to.exist;
    });

    it("should get the list of all connections", async () => {
      const connectionOption = await randomConnectionsOptions("sse");
      const connectionId: string = randomId();
      mcpManager.createConnection({
        ...connectionOption,
        id: connectionId,
      });
      const connections = [...mcpManager.getConnections()];
      expect(connections).to.have.length(1);
      expect(connections[0].id).to.be.equal(connectionId);
    });
  });

  describe("createConnection/removeConnection", () => {
    it("should create a new connection and remove it", async () => {
      const newConnection = await randomConnectionsOptions("sse");
      const id = randomId();
      mcpManager.createConnection({ ...newConnection, id });
      expect(mcpManager.getConnection(id)).to.exist;

      await mcpManager.removeConnection(id);

      expect(mcpManager.getConnection(id)).to.be.undefined;
    });

    it("should not create a connection twice", async () => {
      const newConnection = await randomConnectionsOptions("sse");
      const id = randomId();
      const connection = mcpManager.createConnection({ ...newConnection, id });
      expect(mcpManager.getConnection(id)).to.exist;

      const connection2 = mcpManager.createConnection({
        ...newConnection,
        id,
      });

      expect(connection).to.be.equal(connection2);
    });

    it("should not remove a connection twice", async () => {
      const newConnection = await randomConnectionsOptions("sse");
      const id = randomId();
      mcpManager.createConnection({ ...newConnection, id });

      expect(mcpManager.getConnection(id)).to.exist;

      await mcpManager.removeConnection(id);
      expect(mcpManager.getConnection(id)).to.be.undefined;

      await mcpManager.removeConnection(id);

      expect(mcpManager.getConnection(id)).to.be.undefined;
    });
  });

  describe("startPingService", () => {
    it("should start to ping the mock mcp client", async () => {
      const mcpTestServer = await startMCPTestServer("sse");
      const id = randomId();
      mcpManager.createConnection({
        ...mcpTestServer.connectionOptions,
        id,
      });

      const client = mcpManager.getConnection(id);

      assertDefined(client);

      const spy = sinon.spy(client, "pingClient");

      await mcpManager.startPingService();
      const startDate = mcpManager.getStartDate();

      expect(startDate?.getDate()).is.lessThanOrEqual(Date.now());

      mcpManager.stopPingService();

      expect(spy.callCount).greaterThanOrEqual(1);
      expect(mcpManager.getStartDate()).to.be.null;
    });
  });

  describe("testConnection", () => {
    it("should ping the client only once", async () => {
      const mcpTestServer = await startMCPTestServer("sse");
      const id = randomId();
      mcpManager.createConnection({
        ...mcpTestServer.connectionOptions,
        id,
      });

      const client = mcpManager.getConnection(id);

      assertDefined(client);

      const spy = sinon.spy(client, "pingClient");

      await mcpManager.testConnection(id);

      expect(spy.callCount).equal(1);
      expect(mcpManager.getStartDate()).to.be.null;
    });
  });

  describe("createServer", () => {
    it("should create a server with no client", () => {
      const serverOptions = randomServerOptions();
      const serverId = randomId();

      mcpManager.createServer({ ...serverOptions, id: serverId });

      const mcpProxyServer = mcpManager.getServer(serverId);
      expect(mcpProxyServer).to.exist;

      const mcpProxyServerByPath = mcpManager.getServerByPath(
        serverOptions.serverPath
      );
      expect(mcpProxyServerByPath).to.be.equal(mcpProxyServer);
    });

    it("should not create the same server twice", () => {
      const serverOptions = randomServerOptions();
      const serverId = randomId();

      mcpManager.createServer({ ...serverOptions, id: serverId });

      const mcpProxyServer = mcpManager.getServer(serverId);
      expect(mcpProxyServer).to.exist;

      const secondProxyServer = mcpManager.createServer({
        ...serverOptions,
        id: serverId,
      });
      expect(mcpProxyServer).to.be.equal(secondProxyServer);
    });
  });

  describe("removeServer", () => {
    it("should create and remove a server", async () => {
      const serverOptions = randomServerOptions();
      const serverId = randomId();

      mcpManager.createServer({ ...serverOptions, id: serverId });

      const mcpProxyServer = mcpManager.getServer(serverId);
      expect(mcpProxyServer).to.exist;

      await mcpManager.removeServer(serverId);
      expect(mcpManager.getServer(serverId)).to.not.exist;
    });

    it("should not fail on deleting a non existing server", async () => {
      const serverOptions = randomServerOptions();
      const serverId = randomId();

      mcpManager.createServer({ ...serverOptions, id: serverId });

      const mcpProxyServer = mcpManager.getServer(serverId);
      expect(mcpProxyServer).to.exist;

      await mcpManager.removeServer(serverId);
      expect(mcpManager.getServer(serverId)).to.not.exist;

      await mcpManager.removeServer(serverId);
      expect(mcpManager.getServer(serverId)).to.not.exist;
    });
  });

  describe("reloadConnection", () => {
    it("should reload a client connection", async () => {
      const mcpTestServer = await startMCPTestServer("sse");
      const id = randomId();
      const connectionOptionWithId = {
        ...mcpTestServer.connectionOptions,
        id,
      };

      // ensure to work on a shallow copy
      mcpManager.createConnection({ ...connectionOptionWithId });

      connectionOptionWithId.name = randomString();

      await mcpManager.reloadConnection({
        ...(await randomConnectionsOptions(
          connectionOptionWithId.serverProtocol
        )),
        id,
      });

      const reloadedConnection = mcpManager.getConnection(id);
      assertDefined(reloadedConnection);

      expect(reloadedConnection.connectionOptions.name).not.to.be.equal(
        connectionOptionWithId.name
      );
      expect(reloadedConnection.connectionOptions.serverUrl).not.to.be.equal(
        connectionOptionWithId.serverUrl
      );
    });
  });
});
