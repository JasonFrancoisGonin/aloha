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

import { endpoints_schemas } from "aloha-shared";
import { expect } from "chai";
import { request } from "chai-http";
import { Application } from "express";
import { AddressInfo } from "net";
import { MongoDBConnectionOptionsRepository } from "../../src/database/repositories/mongodb/monogo-db-connection-options-repository";
import { expressSetup } from "../../src/endpoints/express-setup";
import {
  allocateTestResources,
  MCPTestServer,
  mockAuthentication,
  releaseTestResources,
  startMCPTestServer,
  stopMCPTestServer,
  TestResources,
} from "../test-resources";
import { randomString } from "../test-utils";

describe("Basic MCP client-server flow", () => {
  let testResources: TestResources;
  let connectionOptionsRepository: MongoDBConnectionOptionsRepository;
  let mcpTestServer: MCPTestServer;

  let app: Application;

  before(async () => {
    testResources = await allocateTestResources();
    connectionOptionsRepository = testResources.injector.injectClass(
      MongoDBConnectionOptionsRepository
    );
    mockAuthentication(testResources);

    mcpTestServer = await startMCPTestServer("sse");

    app = await expressSetup();
  });

  after(async () => {
    await releaseTestResources(testResources);
    await stopMCPTestServer(mcpTestServer);
  });

  it("Load the Clients", async () => {
    // Check that the repository is empty
    expect(await connectionOptionsRepository.findByPattern({})).to.be.empty;

    // Check that there are no clients from the endpoint
    const emptyClientsRes = await request.execute(app).get("/api/client/");
    expect(emptyClientsRes.status).to.be.equal(200);
    const emptyClients = JSON.parse(emptyClientsRes.text) as unknown[];
    expect(emptyClients).to.be.empty;

    const mcpTestServerAddress =
      mcpTestServer.httpServer.address() as AddressInfo;
    // Add a new client, connecting to the mock MCP server

    expect(mcpTestServerAddress).to.exist;

    const newClient: endpoints_schemas.MCPConnectionOptionsCreate = {
      name: randomString(),
      serverProtocol: "sse",
      serverUrl: `http://127.0.0.1:${mcpTestServerAddress.port}/`,
      description: randomString(),
      type: "client",
    };

    const newClientRes = await request
      .execute(app)
      .post("/api/client/")
      .type("json")
      .accept("text/event-stream")
      .send(newClient);

    expect(newClientRes.status).to.be.equal(200);
    expect(
      await connectionOptionsRepository.findByPattern({
        name: newClient.name,
      })
    ).to.have.lengthOf(1);

    // Add a client
    // const addClientRes = await request
    //   .execute(app)
    //   .post("/api/client")
    //   .type("json")
    //   .send({});
    // expect(addClientRes.status).to.be.equal(200);
  });
});
