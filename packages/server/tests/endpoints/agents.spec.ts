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
import { agentRoutes } from "../../src/endpoints/agents";
import { HTTPError } from "../../src/endpoints/utils";
import * as jwtAuth from "../../src/middleware/jwt-authentication";

const http = (app: Express) => request.execute(app);

const validAgent: schemas.Agent = {
  name: "Test Agent",
  serverUrl: "http://localhost:3000",
  serverProtocol: "a2a",
  serverPath: "agent-test",
  creator: "user-1",
  visibility: schemas.Visibility.Public,
  type: "agent",
};

const agentWithId = { ...validAgent, id: "a1" };

describe("agentRoutes", () => {
  let deps: MockDependencies;
  let app: Express;
  let oidcMocks: OidcMocks;
  let createJwtStub: sinon.SinonStub;

  before(() => {
    deps = createMockDependencies();
    oidcMocks = {
      registrar: createMockOidcRegistrar(),
      idpService: createMockOidcIdpService(),
    };
    setupMockInjector(deps, oidcMocks);
    setupAuthPlugins();
    createJwtStub = sinon.stub(jwtAuth, "createJwtToken").resolves("jwt-token");
    app = createTestApp(agentRoutes(), { user: adminUser, basePath: "/api/agents" });
  });

  after(() => {
    createJwtStub.restore();
    restoreInjector();
    teardownAuthPlugins();
  });

  beforeEach(() => {
    deps.agentRepository.findByPattern.reset();
    deps.agentRepository.findByPattern.resolves([]);
    deps.agentRepository.findById.reset();
    deps.agentRepository.findById.resolves(null);
    deps.agentRepository.create.reset();
    deps.agentRepository.create.callsFake(async (item: any) => ({ ...item, id: "a-new" }));
    deps.agentRepository.updateById.reset();
    deps.agentRepository.updateById.resolves(true);
    deps.agentRepository.deleteById.reset();
    deps.agentRepository.deleteById.resolves(true);
    deps.agentRepository.addNewConnection.reset();
    deps.agentRepository.addNewConnection.resolves(true);
    deps.agentRepository.replaceConnections.reset();
    deps.agentRepository.replaceConnections.resolves(true);
    deps.agentRepository.findByConnectionId.reset();
    deps.agentRepository.findByConnectionId.resolves([]);
    deps.connectionOptionsRepository.findById.reset();
    deps.connectionOptionsRepository.findById.resolves(null);
    deps.mcpManager.getConnection.reset();
    deps.mcpManager.getConnection.returns(null);
    deps.mcpManager.getServer.reset();
    deps.mcpManager.getServer.returns(null);
    deps.mcpManager.createConnection.reset();
    deps.mcpManager.createConnection.returns(null);
    deps.mcpManager.createServer.reset();
    deps.mcpManager.removeConnection.reset();
    deps.mcpManager.removeConnection.resolves();
    deps.mcpManager.removeServer.reset();
    deps.mcpManager.removeServer.resolves();
    deps.mcpManager.reloadConnection.reset();
    deps.mcpManager.reloadConnection.resolves();
    deps.userRepository.findById.reset();
    deps.userRepository.findById.resolves(adminDbUser);
    deps.tokenRepository.findByPattern.reset();
    deps.tokenRepository.findByPattern.resolves([]);
    deps.tokenRepository.create.reset();
    deps.tokenRepository.create.callsFake(async (item: any) => ({ ...item, id: "t-new" }));
    deps.tokenRepository.deleteById.reset();
    deps.tokenRepository.deleteById.resolves(true);
    deps.fetchCache.clear.resetHistory();
    createJwtStub.reset();
    createJwtStub.resolves("jwt-token");
    oidcMocks.registrar.registerClient.reset();
    oidcMocks.registrar.registerClient.resolves();
    oidcMocks.registrar.unregisterClient.reset();
    oidcMocks.registrar.unregisterClient.resolves();
    oidcMocks.idpService.getClientRegistration.reset();
    oidcMocks.idpService.getClientRegistration.resolves(undefined);
  });

  // ── LIST ──────────────────────────────────────────────────────────────

  describe("GET / (list)", () => {
    it("should return agents with connection status", async () => {
      deps.agentRepository.findByPattern.resolves([agentWithId]);
      deps.mcpManager.getConnection.returns({ isConnected: true, tools: [] });
      deps.mcpManager.getServer.returns({});
      const res = await http(app).get("/api/agents");
      expect(res.status).to.equal(200);
      expect(res.body).to.have.lengthOf(1);
      expect(res.body[0].isConnected).to.be.true;
    });
  });

  // ── GET ───────────────────────────────────────────────────────────────

  describe("GET /:id (get)", () => {
    it("should return agent with connection details", async () => {
      deps.agentRepository.findById.resolves({ ...agentWithId, connections: ["c1"] });
      deps.mcpManager.getConnection.withArgs("a1").returns({ isConnected: true, connectionOptions: agentWithId });
      deps.mcpManager.getConnection.withArgs("c1").returns({
        connectionOptions: { name: "Client1", type: "client" },
        isConnected: true,
      });
      const res = await http(app).get("/api/agents/a1");
      expect(res.status).to.equal(200);
      expect(res.body.isConnected).to.be.true;
      expect(res.body.connectionsDetail).to.have.lengthOf(1);
    });

    it("should return 404 for unknown agent", async () => {
      const res = await http(app).get("/api/agents/unknown");
      expect(res.status).to.equal(404);
    });
  });

  // ── CREATE ────────────────────────────────────────────────────────────

  describe("POST / (create)", () => {
    it("should create agent and both connection + server", async () => {
      const res = await http(app).post("/api/agents").send(validAgent);
      expect(res.status).to.equal(204);
      expect(deps.mcpManager.createConnection.calledOnce).to.be.true;
      expect(deps.mcpManager.createServer.calledOnce).to.be.true;
    });

    it("should auto-prefix serverPath with agent-", async () => {
      const agent = { ...validAgent, serverPath: "mypath" };
      const res = await http(app).post("/api/agents").send(agent);
      expect(res.status).to.equal(204);
      const createArg = deps.agentRepository.create.firstCall.args[0];
      expect(createArg.serverPath).to.equal("agent-mypath");
    });

    it("should return 409 for duplicate serverPath", async () => {
      deps.agentRepository.findByPattern.resolves([agentWithId]);
      const res = await http(app).post("/api/agents").send(validAgent);
      expect(res.status).to.equal(409);
    });

    it("should return 500 when logged user not found", async () => {
      deps.userRepository.findById.resolves(null);
      const res = await http(app).post("/api/agents").send(validAgent);
      expect(res.status).to.equal(500);
    });
  });

  // ── UPDATE ────────────────────────────────────────────────────────────

  describe("POST /:id (update)", () => {
    it("should update and reload connection", async () => {
      deps.agentRepository.findById.resolves(agentWithId);
      deps.agentRepository.findById.onSecondCall().resolves(agentWithId);
      const res = await http(app).post("/api/agents/a1").send({ name: "Updated" });
      expect(res.status).to.equal(204);
      expect(deps.mcpManager.reloadConnection.calledOnce).to.be.true;
    });

    it("should return 404 when agent not found", async () => {
      const res = await http(app).post("/api/agents/unknown").send({ name: "X" });
      expect(res.status).to.equal(404);
    });

    it("should return 409 for duplicate serverPath", async () => {
      deps.agentRepository.findById.resolves(agentWithId);
      deps.agentRepository.findByPattern.resolves([{ ...validAgent, id: "a-other" }]);
      const res = await http(app).post("/api/agents/a1").send({ serverPath: "agent-test" });
      expect(res.status).to.equal(409);
    });
  });

  // ── DELETE ────────────────────────────────────────────────────────────

  describe("POST /:id/_delete (delete)", () => {
    it("should delete and remove both connection + server", async () => {
      deps.agentRepository.findById.resolves(agentWithId);
      const res = await http(app).post("/api/agents/a1/_delete");
      expect(res.status).to.equal(204);
      expect(deps.mcpManager.removeConnection.calledOnce).to.be.true;
      expect(deps.mcpManager.removeServer.calledOnce).to.be.true;
    });

    it("should return 404 when agent not found", async () => {
      const res = await http(app).post("/api/agents/unknown/_delete");
      expect(res.status).to.equal(404);
    });
  });

  // ── TOKEN ─────────────────────────────────────────────────────────────

  describe("GET /:id/_token", () => {
    it("should create JWT token for agent creator", async () => {
      deps.agentRepository.findById.resolves(agentWithId);
      const res = await http(app).get("/api/agents/a1/_token");
      expect(res.status).to.equal(200);
      expect(res.body.token).to.equal("jwt-token");
      expect(createJwtStub.calledOnce).to.be.true;
    });

    it("should delete existing tokens before creating new one", async () => {
      deps.agentRepository.findById.resolves(agentWithId);
      deps.tokenRepository.findByPattern.resolves([{ id: "old-t1" }, { id: "old-t2" }]);
      await http(app).get("/api/agents/a1/_token");
      expect(deps.tokenRepository.deleteById.calledTwice).to.be.true;
    });

    it("should return 404 when agent not found", async () => {
      const res = await http(app).get("/api/agents/unknown/_token");
      expect(res.status).to.equal(404);
    });

    it("should return 404 when creator user not found", async () => {
      deps.agentRepository.findById.resolves({ ...agentWithId, creator: "unknown-user" });
      deps.userRepository.findById.withArgs("unknown-user").resolves(null);
      const res = await http(app).get("/api/agents/a1/_token");
      expect(res.status).to.equal(404);
    });

    it("should return 403 when requester is not the creator", async () => {
      deps.agentRepository.findById.resolves({ ...agentWithId, creator: "other-user" });
      deps.userRepository.findById.withArgs("other-user").resolves({ id: "other-user", userId: "other" });
      const res = await http(app).get("/api/agents/a1/_token");
      expect(res.status).to.equal(403);
    });

    it("should return 500 on createJwtToken failure", async () => {
      deps.agentRepository.findById.resolves(agentWithId);
      createJwtStub.rejects(new Error("jwt fail"));
      const res = await http(app).get("/api/agents/a1/_token");
      expect(res.status).to.equal(500);
    });
  });

  // ── CONNECT / DISCONNECT ──────────────────────────────────────────────

  describe("POST /:id/_connect/:cid", () => {
    it("should associate a client to an agent", async () => {
      deps.mcpManager.getServer.returns({ options: { ...agentWithId, connections: [] } });
      deps.connectionOptionsRepository.findById.resolves({ ...validAgent, creator: "user-1", visibility: schemas.Visibility.Public });
      const res = await http(app).post("/api/agents/a1/_connect/c1");
      expect(res.status).to.equal(204);
      expect(deps.agentRepository.addNewConnection.calledOnce).to.be.true;
    });

    it("should return 404 when agent server not found", async () => {
      const res = await http(app).post("/api/agents/a1/_connect/c1");
      expect(res.status).to.equal(404);
    });

    it("should return 404 when connection not found", async () => {
      deps.mcpManager.getServer.returns({ options: { ...agentWithId, connections: [] } });
      const res = await http(app).post("/api/agents/a1/_connect/c1");
      expect(res.status).to.equal(404);
    });
  });

  describe("POST /:id/_disconnect/:cid", () => {
    it("should dissociate a client from an agent", async () => {
      deps.mcpManager.getServer.returns({ options: { ...agentWithId, connections: ["c1"] } });
      const res = await http(app).post("/api/agents/a1/_disconnect/c1");
      expect(res.status).to.equal(204);
      expect(deps.agentRepository.replaceConnections.calledOnce).to.be.true;
    });

    it("should return 404 when agent server not found", async () => {
      const res = await http(app).post("/api/agents/a1/_disconnect/c1");
      expect(res.status).to.equal(404);
    });
  });

  // ── BY CONNECTION ID ──────────────────────────────────────────────────

  describe("GET /by_connection_id/:cid", () => {
    it("should return agents for a connection", async () => {
      deps.agentRepository.findByConnectionId.resolves([agentWithId]);
      const res = await http(app).get("/api/agents/by_connection_id/c1");
      expect(res.status).to.equal(200);
      expect(res.body).to.have.lengthOf(1);
    });
  });

  // ── CANCEL TASK ───────────────────────────────────────────────────────

  describe("POST /:agentId/cancelTask", () => {
    it("should return 404 when agent not found", async () => {
      const res = await http(app).post("/api/agents/a1/cancelTask").send({ taskId: "t1" });
      expect(res.status).to.equal(404);
    });

    it("should return 404 when A2A connection not found", async () => {
      deps.agentRepository.findById.resolves(agentWithId);
      const res = await http(app).post("/api/agents/a1/cancelTask").send({ taskId: "t1" });
      expect(res.status).to.equal(404);
    });
  });

  // ── SEND A2A MESSAGE STREAM ───────────────────────────────────────────

  describe("POST /:agentId/sendA2AMessageStream", () => {
    it("should return 404 when agent not found", async () => {
      const res = await http(app).post("/api/agents/a1/sendA2AMessageStream").send({});
      expect(res.status).to.equal(404);
    });

    it("should return 404 when A2A connection not found", async () => {
      deps.agentRepository.findById.resolves(agentWithId);
      const res = await http(app).post("/api/agents/a1/sendA2AMessageStream").send({});
      expect(res.status).to.equal(404);
    });
  });

  // ── IDENTITY PROPAGATION ──────────────────────────────────────────────

  describe("POST /:id/unregisterWithIdentityPropagationService", () => {
    it("should unregister successfully", async () => {
      deps.agentRepository.findById.resolves({
        ...agentWithId,
        authentication: { type: "oidc_client_secret", clientId: "cid", clientSecret: "cs" },
      });
      const res = await http(app).post("/api/agents/a1/unregisterWithIdentityPropagationService");
      expect(res.status).to.equal(204);
      expect(oidcMocks.registrar.unregisterClient.calledWith("cid")).to.be.true;
    });

    it("should return 404 when agent not found", async () => {
      const res = await http(app).post("/api/agents/a1/unregisterWithIdentityPropagationService");
      expect(res.status).to.equal(404);
    });

    it("should return 400 for unsupported auth type", async () => {
      deps.agentRepository.findById.resolves({ ...agentWithId, authentication: { type: "none" } });
      const res = await http(app).post("/api/agents/a1/unregisterWithIdentityPropagationService");
      expect(res.status).to.equal(400);
    });
  });

  describe("GET /:id/isRegisteredInIdentityPropagationService", () => {
    it("should return registered status", async () => {
      deps.agentRepository.findById.resolves({
        ...agentWithId,
        authentication: { type: "oidc_client_secret", clientId: "cid", clientSecret: "cs" },
      });
      oidcMocks.idpService.getClientRegistration.resolves({ client_id: "cid" });
      const res = await http(app).get("/api/agents/a1/isRegisteredInIdentityPropagationService");
      expect(res.status).to.equal(200);
      expect(res.body.registered).to.be.true;
    });
  });

  // ── AUTHENTICATION ────────────────────────────────────────────────────

  describe("authentication", () => {
    it("should return 401 for unauthenticated user on list", async () => {
      const unauthApp = createTestApp(agentRoutes(), { basePath: "/api/agents" });
      const res = await http(unauthApp).get("/api/agents");
      expect(res.status).to.equal(401);
    });
  });

  // ── WRITE PERMISSION ENFORCEMENT ──────────────────────────────────────

  describe("write permission enforcement", () => {
    let restrictedApp: Express;

    before(() => {
      setAuthPlugins([]);
      restrictedApp = createTestApp(agentRoutes(), { user: regularUser, basePath: "/api/agents" });
    });

    after(() => setupAuthPlugins());

    it("should return 403 on create without AgentsWrite", async () => {
      const res = await http(restrictedApp).post("/api/agents").send(validAgent);
      expect(res.status).to.equal(403);
    });

    it("should return 403 on delete without AgentsWrite", async () => {
      const res = await http(restrictedApp).post("/api/agents/a1/_delete");
      expect(res.status).to.equal(403);
    });
  });

  // ── ERROR HANDLING ────────────────────────────────────────────────────

  describe("error handling", () => {
    it("should return 500 on unexpected repository error", async () => {
      deps.agentRepository.findByPattern.rejects(new Error("DB down"));
      const res = await http(app).get("/api/agents");
      expect(res.status).to.equal(500);
    });

    it("should return HTTPError status code", async () => {
      deps.agentRepository.findByPattern.rejects(new HTTPError(503, "Unavailable"));
      const res = await http(app).get("/api/agents");
      expect(res.status).to.equal(503);
      expect(res.body.error).to.equal("Unavailable");
    });
  });
});
