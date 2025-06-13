/* eslint-disable @typescript-eslint/no-unused-expressions */

import { expect } from "chai";
import { request } from "chai-http";
import { Application } from "express";
import { MongoDBConnectionOptionsRepository } from "../../src/database/repositories/mongodb/monogo-db-connection-options-repository";
import { expressSetup } from "../../src/endpoints/express-setup";
import {
  allocateTestResources,
  mockAuthentication,
  mockMCP,
  releaseTestResources,
  TestResources,
} from "../test-resources";
import { AddressInfo } from "net";
import { entrypoint_schemas, schemas } from "aloha-shared";

describe("Basic MCP client-server flow", () => {
  let testResources: TestResources;
  let connectionOptionsRepository: MongoDBConnectionOptionsRepository;

  let app: Application;

  before(async () => {
    testResources = await allocateTestResources();
    connectionOptionsRepository = testResources.injector.injectClass(
      MongoDBConnectionOptionsRepository
    );
    mockAuthentication(testResources);
    await mockMCP(testResources);

    app = await expressSetup();
  });

  after(async () => {
    await releaseTestResources(testResources);
  });

  it("Load the Clients", async () => {
    // Check that the repository is empty
    expect(await connectionOptionsRepository.findByPattern({})).to.be.empty;

    // Check that there are no clients from the endpoint
    const emptyClientsRes = await request.execute(app).get("/api/client/");
    expect(emptyClientsRes.status).to.be.equal(200);
    const emptyClients = JSON.parse(emptyClientsRes.text) as unknown[];
    expect(emptyClients).to.be.empty;

    // Add a new client, connecting to the mock MCP server

    expect(testResources.mockMCP).to.exist;
    expect(testResources.mockMCP?.address()).to.exist;

    const mockMCPAddress = testResources.mockMCP?.address() as AddressInfo;

    const newClient: entrypoint_schemas.MCPConnectionOptionsCreate = {
      name: "mock-connection",
      serverProtocol: "sse",
      serverUrl: `http://127.0.0.1:${mockMCPAddress.port}/`,
      visibility: schemas.Visibility.Private,
      description: "Mock MCP server for testing",
    };
    const newClientRes = await request
      .execute(app)
      .post("/api/client/")
      .type("json")
      .accept("text/event-stream")
      .send(newClient);

    // console.log(newClientRes);

    expect(newClientRes.status).to.be.equal(200);
    expect(
      await connectionOptionsRepository.findByPattern({})
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
