/*
Copyright (C) 2025 European Union
 
Licensed under the EUPL, Version 1.2 or – as soon they will be approved by the
European Commission – subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:
* https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12 *

Unless required by applicable law or agreed to in writing, software distributed under
the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS
OF ANY KIND, either express or implied. See the Licence for the specific language
governing permissions and limitations under the Licence.
*/
// [Note: File generated using Generative AI technology]

import { expect } from "chai";
import { request } from "chai-http";
import sinon from "sinon";
import { Express } from "express";
import { schemas } from "aloha-shared";
import {
  createMockDependencies,
  setupMockInjector,
  restoreInjector,
  createTestApp,
  setupAuthPlugins,
  teardownAuthPlugins,
  createMockOidcRegistrar,
  createMockOidcIdpService,
  adminUser,
  regularUser,
  adminDbUser,
  regularDbUser,
  MockDependencies,
  OidcMocks,
} from "./endpoint-test-helpers";
import { setAuthPlugins } from "../../src/middleware/authorise";
import { clientsRoutes } from "../../src/endpoints/clients";
import { HTTPError } from "../../src/endpoints/utils";

const http = (app: Express) => request.execute(app);

const validClient: schemas.MCPConnectionOptions = {
  name: "Test Client",
  serverUrl: "http://localhost:3000",
  serverProtocol: "http",
  creator: "user-1",
  visibility: schemas.Visibility.Public,
  type: "client",
};

const clientWithId = { ...validClient, id: "c1" };

const mockConnection = {
  connectionOptions: clientWithId,
  isConnected: true,
  resources: [{ uri: "r1" }],
  resourceTemplates: [],
  prompts: [],
  tools: [{ name: "t1" }],
};

describe("clientsRoutes", () => {
  let deps: MockDependencies;
  let app: Express;
  let oidcMocks: OidcMocks;

  before(() => {
    deps = createMockDependencies();
    oidcMocks = {
      registrar: createMockOidcRegistrar(),
      idpService: createMockOidcIdpService(),
    };
    setupMockInjector(deps, oidcMocks);
    setupAuthPlugins();
    app = createTestApp(clientsRoutes(), { user: adminUser, basePath: "/api/clients" });
  });

  after(() => {
    restoreInjector();
    teardownAuthPlugins();
  });

  beforeEach(() => {
    deps.connectionOptionsRepository.findByPattern.reset();
    deps.connectionOptionsRepository.findByPattern.resolves([]);
    deps.connectionOptionsRepository.findById.reset();
    deps.connectionOptionsRepository.findById.resolves(null);
    deps.connectionOptionsRepository.create.reset();
    deps.connectionOptionsRepository.create.callsFake(async (item: any) => ({ ...item, id: "c-new" }));
    deps.connectionOptionsRepository.updateById.reset();
    deps.connectionOptionsRepository.updateById.resolves(true);
    deps.connectionOptionsRepository.deleteById.reset();
    deps.connectionOptionsRepository.deleteById.resolves(true);
    deps.serverOptionsRepository.findByConnectionId.reset();
    deps.serverOptionsRepository.findByConnectionId.resolves([]);
    deps.serverOptionsRepository.replaceConnections.reset();
    deps.serverOptionsRepository.replaceConnections.resolves(true);
    deps.mcpManager.getConnection.reset();
    deps.mcpManager.getConnection.returns(null);
    deps.mcpManager.createConnection.reset();
    deps.mcpManager.createConnection.returns(null);
    deps.mcpManager.reloadConnection.reset();
    deps.mcpManager.reloadConnection.resolves();
    deps.mcpManager.removeConnection.reset();
    deps.mcpManager.removeConnection.resolves();
    deps.userRepository.findById.reset();
    deps.userRepository.findById.resolves(adminDbUser);
    deps.agentRepository.findById.reset();
    deps.agentRepository.findById.resolves(null);
    deps.fetchCache.clear.resetHistory();
    oidcMocks.registrar.registerClient.reset();
    oidcMocks.registrar.registerClient.resolves();
    oidcMocks.registrar.unregisterClient.reset();
    oidcMocks.registrar.unregisterClient.resolves();
    oidcMocks.idpService.getClientRegistration.reset();
    oidcMocks.idpService.getClientRegistration.resolves(undefined);
  });

  // ── LIST ──────────────────────────────────────────────────────────────

  describe("GET / (list)", () => {
    it("should return clients with connection status", async () => {
      deps.connectionOptionsRepository.findByPattern.resolves([clientWithId]);
      deps.mcpManager.getConnection.returns(mockConnection);
      const res = await http(app).get("/api/clients");
      expect(res.status).to.equal(200);
      expect(res.body).to.have.lengthOf(1);
      expect(res.body[0].isConnected).to.be.true;
      expect(res.body[0].tools).to.equal(1);
      expect(res.body[0].resources).to.equal(1);
    });

    it("should show disconnected status when no connection", async () => {
      deps.connectionOptionsRepository.findByPattern.resolves([clientWithId]);
      const res = await http(app).get("/api/clients");
      expect(res.body[0].isConnected).to.be.false;
      expect(res.body[0].tools).to.equal(0);
    });
  });

  // ── GET ───────────────────────────────────────────────────────────────

  describe("GET /:id (get)", () => {
    it("should return client with full connection details", async () => {
      deps.connectionOptionsRepository.findById.resolves(clientWithId);
      deps.mcpManager.getConnection.returns(mockConnection);
      const res = await http(app).get("/api/clients/c1");
      expect(res.status).to.equal(200);
      expect(res.body.isConnected).to.be.true;
      expect(res.body.tools).to.be.an("array");
    });

    it("should return 404 when client not in DB", async () => {
      const res = await http(app).get("/api/clients/unknown");
      expect(res.status).to.equal(404);
    });

    it("should return 404 when no active connection", async () => {
      deps.connectionOptionsRepository.findById.resolves(clientWithId);
      const res = await http(app).get("/api/clients/c1");
      expect(res.status).to.equal(404);
    });
  });

  // ── UPDATE ────────────────────────────────────────────────────────────

  describe("POST /:id (update)", () => {
    it("should update and reload connection", async () => {
      deps.connectionOptionsRepository.findById.resolves(clientWithId);
      deps.connectionOptionsRepository.findById.onSecondCall().resolves(clientWithId);
      const res = await http(app).post("/api/clients/c1").send({ name: "Updated" });
      expect(res.status).to.equal(204);
      expect(deps.mcpManager.reloadConnection.calledOnce).to.be.true;
    });

    it("should return 404 when client not found", async () => {
      const res = await http(app).post("/api/clients/unknown").send({ name: "X" });
      expect(res.status).to.equal(404);
    });

    it("should set creator to logged user when connection has no creator", async () => {
      const noCreator = { ...clientWithId, creator: undefined };
      deps.connectionOptionsRepository.findById.resolves(noCreator);
      deps.connectionOptionsRepository.findById.onSecondCall().resolves(clientWithId);
      const res = await http(app).post("/api/clients/c1").send({ name: "Updated" });
      expect(res.status).to.equal(204);
      const updateArg = deps.connectionOptionsRepository.updateById.firstCall.args[1];
      expect(updateArg.creator).to.equal(adminDbUser.id);
    });
  });

  // ── DELETE ────────────────────────────────────────────────────────────

  describe("POST /:id/_delete (delete)", () => {
    it("should delete, remove from servers, and call mcpManager.removeConnection", async () => {
      deps.connectionOptionsRepository.findById.resolves(clientWithId);
      deps.serverOptionsRepository.findByConnectionId.resolves([
        { id: "s1", connections: ["c1", "c2"] },
      ]);
      const res = await http(app).post("/api/clients/c1/_delete");
      expect(res.status).to.equal(204);
      expect(deps.serverOptionsRepository.replaceConnections.calledOnce).to.be.true;
      const replaceArgs = deps.serverOptionsRepository.replaceConnections.firstCall.args;
      expect(replaceArgs[0]).to.equal("s1");
      expect(replaceArgs[1]).to.deep.equal(["c2"]);
      expect(deps.mcpManager.removeConnection.calledOnce).to.be.true;
    });

    it("should return 404 when client not found", async () => {
      const res = await http(app).post("/api/clients/unknown/_delete");
      expect(res.status).to.equal(404);
    });
  });

  // ── CREATE (SSE) ──────────────────────────────────────────────────────

  describe("POST / (create via SSE)", () => {
    it("should create client and attempt connection", async () => {
      const mockConn = { connectClient: sinon.stub().resolves() };
      deps.mcpManager.createConnection.returns(mockConn);
      const res = await http(app).post("/api/clients").send({
        name: "New Client",
        serverUrl: "http://localhost:4000",
        serverProtocol: "http",
        type: "client",
      });
      expect(res.status).to.equal(200);
      expect(deps.connectionOptionsRepository.create.calledOnce).to.be.true;
      expect(mockConn.connectClient.calledOnce).to.be.true;
    });

    it("should handle connection failure gracefully", async () => {
      const mockConn = { connectClient: sinon.stub().rejects(new Error("timeout")) };
      deps.mcpManager.createConnection.returns(mockConn);
      const res = await http(app).post("/api/clients").send({
        name: "New Client",
        serverUrl: "http://localhost:4000",
        serverProtocol: "http",
        type: "client",
      });
      expect(res.status).to.equal(200);
      expect(res.text).to.include("timeout");
    });

    it("should handle failed createConnection", async () => {
      const res = await http(app).post("/api/clients").send({
        name: "New Client",
        serverUrl: "http://localhost:4000",
        serverProtocol: "http",
        type: "client",
      });
      expect(res.status).to.equal(200);
      expect(res.text).to.include("Failed to create client");
    });

    it("should handle user not found", async () => {
      deps.userRepository.findById.resolves(null);
      const res = await http(app).post("/api/clients").send({
        name: "New Client",
        serverUrl: "http://localhost:4000",
        serverProtocol: "http",
        type: "client",
      });
      expect(res.status).to.equal(200);
      expect(res.text).to.include("Could not resolve the logged user");
    });
  });

  // ── IDENTITY PROPAGATION ──────────────────────────────────────────────

  describe("POST /:id/unregisterWithIdentityPropagationService", () => {
    it("should return 404 when client not found", async () => {
      const res = await http(app).post("/api/clients/c1/unregisterWithIdentityPropagationService");
      expect(res.status).to.equal(404);
    });

    it("should return 400 for unsupported auth type", async () => {
      deps.connectionOptionsRepository.findById.resolves({ ...clientWithId, authentication: { type: "none" } });
      const res = await http(app).post("/api/clients/c1/unregisterWithIdentityPropagationService");
      expect(res.status).to.equal(400);
    });

    it("should unregister successfully", async () => {
      deps.connectionOptionsRepository.findById.resolves({
        ...clientWithId,
        authentication: { type: "oidc_client_secret", clientId: "cid", clientSecret: "cs" },
      });
      const res = await http(app).post("/api/clients/c1/unregisterWithIdentityPropagationService");
      expect(res.status).to.equal(204);
      expect(oidcMocks.registrar.unregisterClient.calledWith("cid")).to.be.true;
    });

    it("should return 500 on unregister failure", async () => {
      deps.connectionOptionsRepository.findById.resolves({
        ...clientWithId,
        authentication: { type: "oidc_client_secret", clientId: "cid", clientSecret: "cs" },
      });
      oidcMocks.registrar.unregisterClient.rejects(new Error("fail"));
      const res = await http(app).post("/api/clients/c1/unregisterWithIdentityPropagationService");
      expect(res.status).to.equal(500);
    });
  });

  describe("POST /:id/registerWithIdentityPropagationService", () => {
    it("should return 404 when client not found", async () => {
      const res = await http(app).post("/api/clients/c1/registerWithIdentityPropagationService");
      expect(res.status).to.equal(404);
    });

    it("should return 400 for unsupported auth type", async () => {
      deps.connectionOptionsRepository.findById.resolves({ ...clientWithId, authentication: { type: "none" } });
      const res = await http(app).post("/api/clients/c1/registerWithIdentityPropagationService");
      expect(res.status).to.equal(400);
    });

    it("should register successfully", async () => {
      deps.connectionOptionsRepository.findById.resolves({
        ...clientWithId,
        authentication: { type: "oidc_client_secret", clientId: "cid", clientSecret: "cs" },
      });
      const res = await http(app).post("/api/clients/c1/registerWithIdentityPropagationService");
      expect(res.status).to.equal(204);
      expect(oidcMocks.registrar.registerClient.calledOnce).to.be.true;
    });
  });

  describe("GET /:id/isRegisteredInIdentityPropagationService", () => {
    it("should return 404 when client not found", async () => {
      const res = await http(app).get("/api/clients/c1/isRegisteredInIdentityPropagationService");
      expect(res.status).to.equal(404);
    });

    it("should return 400 for unsupported auth type", async () => {
      deps.connectionOptionsRepository.findById.resolves({ ...clientWithId, authentication: { type: "none" } });
      const res = await http(app).get("/api/clients/c1/isRegisteredInIdentityPropagationService");
      expect(res.status).to.equal(400);
    });

    it("should return registered: false when not registered", async () => {
      deps.connectionOptionsRepository.findById.resolves({
        ...clientWithId,
        authentication: { type: "oidc_client_secret", clientId: "cid", clientSecret: "cs" },
      });
      const res = await http(app).get("/api/clients/c1/isRegisteredInIdentityPropagationService");
      expect(res.status).to.equal(200);
      expect(res.body.registered).to.be.false;
    });

    it("should return registered: true when registered", async () => {
      deps.connectionOptionsRepository.findById.resolves({
        ...clientWithId,
        authentication: { type: "oidc_client_secret", clientId: "cid", clientSecret: "cs" },
      });
      oidcMocks.idpService.getClientRegistration.resolves({ client_id: "cid" });
      const res = await http(app).get("/api/clients/c1/isRegisteredInIdentityPropagationService");
      expect(res.status).to.equal(200);
      expect(res.body.registered).to.be.true;
    });
  });

  // ── SEND MCP REQUEST ──────────────────────────────────────────────────

  describe("POST /:id/sendMCPClientRequest", () => {
    it("should return 404 when client not found", async () => {
      const res = await http(app).post("/api/clients/c1/sendMCPClientRequest").send({
        method: "tools/list",
        params: {},
      });
      expect(res.status).to.equal(404);
    });

    it("should return 404 when no client/agent definition found", async () => {
      deps.mcpManager.getConnection.returns(mockConnection);
      const res = await http(app).post("/api/clients/c1/sendMCPClientRequest").send({
        method: "tools/list",
        params: {},
      });
      expect(res.status).to.equal(404);
    });

    it("should return 402 for unsupported method", async () => {
      deps.mcpManager.getConnection.returns(mockConnection);
      deps.connectionOptionsRepository.findById.resolves(clientWithId);
      const res = await http(app).post("/api/clients/c1/sendMCPClientRequest").send({
        method: "ping",
      });
      expect(res.status).to.equal(402);
    });
  });

  // ── AUTHENTICATION ────────────────────────────────────────────────────

  describe("authentication", () => {
    it("should return 401 for unauthenticated user on list", async () => {
      const unauthApp = createTestApp(clientsRoutes(), { basePath: "/api/clients" });
      const res = await http(unauthApp).get("/api/clients");
      expect(res.status).to.equal(401);
    });
  });

  // ── WRITE PERMISSION ENFORCEMENT ──────────────────────────────────────

  describe("write permission enforcement", () => {
    let restrictedApp: Express;

    before(() => {
      setAuthPlugins([]);
      restrictedApp = createTestApp(clientsRoutes(), { user: regularUser, basePath: "/api/clients" });
    });

    after(() => setupAuthPlugins());

    it("should return 403 on create without ClientsWrite", async () => {
      const res = await http(restrictedApp).post("/api/clients").send({
        name: "New", serverUrl: "http://localhost:4000", serverProtocol: "http", type: "client",
      });
      expect(res.status).to.equal(403);
    });

    it("should return 403 on delete without ClientsWrite", async () => {
      const res = await http(restrictedApp).post("/api/clients/c1/_delete");
      expect(res.status).to.equal(403);
    });
  });

  // ── ERROR HANDLING ────────────────────────────────────────────────────

  describe("error handling", () => {
    it("should return 500 on unexpected repository error", async () => {
      deps.connectionOptionsRepository.findByPattern.rejects(new Error("DB down"));
      const res = await http(app).get("/api/clients");
      expect(res.status).to.equal(500);
    });

    it("should return HTTPError status code", async () => {
      deps.connectionOptionsRepository.findByPattern.rejects(new HTTPError(503, "Unavailable"));
      const res = await http(app).get("/api/clients");
      expect(res.status).to.equal(503);
      expect(res.body.error).to.equal("Unavailable");
    });
  });
});
