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
import {
  createMockDependencies,
  setupMockInjector,
  restoreInjector,
  createTestApp,
  setupAuthPlugins,
  teardownAuthPlugins,
  adminUser,
  adminDbUser,
  MockDependencies,
} from "./endpoint-test-helpers";
import * as jwtAuth from "../../src/middleware/jwt-authentication";
import { tokensRoutes } from "../../src/endpoints/tokens";
import { NO_AUTHENTICATION_USER_ID } from "../../src/middleware/no-authentication";
import { HTTPError } from "../../src/endpoints/utils";

const http = (app: Express) => request.execute(app);

describe("tokensRoutes", () => {
  let deps: MockDependencies;
  let app: Express;
  let createJwtStub: sinon.SinonStub;

  before(() => {
    deps = createMockDependencies();
    setupMockInjector(deps);
    setupAuthPlugins();
    createJwtStub = sinon.stub(jwtAuth, "createJwtToken").resolves("mock-jwt-token");
    app = createTestApp(tokensRoutes(), { user: adminUser, basePath: "/api/tokens" });
  });

  after(() => {
    createJwtStub.restore();
    restoreInjector();
    teardownAuthPlugins();
  });

  beforeEach(() => {
    deps.tokenRepository.findByPattern.reset();
    deps.tokenRepository.findByPattern.resolves([]);
    deps.tokenRepository.findById.reset();
    deps.tokenRepository.findById.resolves(null);
    deps.tokenRepository.create.reset();
    deps.tokenRepository.create.callsFake(async (item: any) => ({ ...item, id: "tok-1" }));
    deps.tokenRepository.updateById.reset();
    deps.tokenRepository.updateById.resolves(true);
    deps.projectRepository.findByPattern.reset();
    deps.projectRepository.findByPattern.resolves([]);
    deps.userRepository.findById.reset();
    deps.userRepository.findById.resolves(adminDbUser);
    deps.fetchCache.clear.resetHistory();
    createJwtStub.resetHistory();
    createJwtStub.resolves("mock-jwt-token");
  });

  // ── LIST ──────────────────────────────────────────────────────────────

  describe("GET / (list)", () => {
    it("should return tokens filtered by current user", async () => {
      const tokens = [{ id: "t1", userId: adminUser.id, projectId: "p1" }];
      deps.tokenRepository.findByPattern.resolves(tokens);
      const res = await http(app).get("/api/tokens");
      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal(tokens);
      expect(deps.tokenRepository.findByPattern.calledWith({ userId: adminUser.id })).to.be.true;
    });

    it("should return empty array when user has no tokens", async () => {
      const res = await http(app).get("/api/tokens");
      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal([]);
    });
  });

  // ── CREATE ────────────────────────────────────────────────────────────

  describe("POST / (create token)", () => {
    const validRequest = { project: "test-proj", expirationDate: "2030-01-01T00:00:00Z" };

    it("should create a JWT token and return it", async () => {
      deps.projectRepository.findByPattern.resolves([{ id: "proj-1", projectId: "test-proj", name: "Test" }]);
      const res = await http(app).post("/api/tokens").send(validRequest);
      expect(res.status).to.equal(200);
      expect(res.body.token).to.equal("mock-jwt-token");
      expect(deps.tokenRepository.create.calledOnce).to.be.true;
      expect(deps.fetchCache.clear.calledOnce).to.be.true;
    });

    it("should return 500 when project not found", async () => {
      deps.projectRepository.findByPattern.resolves([]);
      const res = await http(app).post("/api/tokens").send(validRequest);
      expect(res.status).to.equal(500);
      expect(res.body.error).to.include("project");
    });

    it("should return 403 when DB user not found", async () => {
      deps.projectRepository.findByPattern.resolves([{ id: "proj-1", projectId: "test-proj" }]);
      deps.userRepository.findById.resolves(null);
      const res = await http(app).post("/api/tokens").send(validRequest);
      expect(res.status).to.equal(403);
    });

    it("should use NO_AUTHENTICATION_USER_ID for NO-AUTH user", async () => {
      const noAuthUser = { ...adminUser, id: NO_AUTHENTICATION_USER_ID, provider: "NO-AUTH" };
      const noAuthApp = createTestApp(tokensRoutes(), { user: noAuthUser, basePath: "/api/tokens" });
      deps.projectRepository.findByPattern.resolves([{ id: "proj-1", projectId: "test-proj" }]);
      const res = await http(noAuthApp).post("/api/tokens").send(validRequest);
      expect(res.status).to.equal(200);
      const createArg = deps.tokenRepository.create.firstCall.args[0];
      expect(createArg.userId).to.equal(NO_AUTHENTICATION_USER_ID);
    });

    it("should return 400 for invalid body", async () => {
      const res = await http(app).post("/api/tokens").send({ bad: "data" });
      expect(res.status).to.equal(400);
    });

    it("should return 500 when createJwtToken throws", async () => {
      deps.projectRepository.findByPattern.resolves([{ id: "proj-1", projectId: "test-proj" }]);
      createJwtStub.rejects(new Error("signing failed"));
      const res = await http(app).post("/api/tokens").send(validRequest);
      expect(res.status).to.equal(500);
    });
  });

  // ── DISABLE ───────────────────────────────────────────────────────────

  describe("POST /:id/_disable", () => {
    it("should disable a token and return 204", async () => {
      deps.tokenRepository.findById.resolves({ id: "t1", disabled: false });
      const res = await http(app).post("/api/tokens/t1/_disable");
      expect(res.status).to.equal(204);
      expect(deps.tokenRepository.updateById.calledOnce).to.be.true;
      const updateArg = deps.tokenRepository.updateById.firstCall.args[1];
      expect(updateArg.disabled).to.be.true;
      expect(deps.fetchCache.clear.calledOnce).to.be.true;
    });

    it("should return 404 when token not found", async () => {
      const res = await http(app).post("/api/tokens/nonexistent/_disable");
      expect(res.status).to.equal(404);
    });

    it("should return 500 on repository error", async () => {
      deps.tokenRepository.findById.rejects(new Error("DB error"));
      const res = await http(app).post("/api/tokens/t1/_disable");
      expect(res.status).to.equal(500);
    });
  });

  // ── AUTHENTICATION ────────────────────────────────────────────────────

  describe("authentication", () => {
    it("should return 401 for unauthenticated user on list", async () => {
      const unauthApp = createTestApp(tokensRoutes(), { basePath: "/api/tokens" });
      const res = await http(unauthApp).get("/api/tokens");
      expect(res.status).to.equal(401);
    });
  });

  // ── ERROR HANDLING ────────────────────────────────────────────────────

  describe("error handling", () => {
    it("should return 500 on unexpected list error", async () => {
      deps.tokenRepository.findByPattern.rejects(new Error("DB down"));
      const res = await http(app).get("/api/tokens");
      expect(res.status).to.equal(500);
    });

    it("should return HTTPError status code", async () => {
      deps.tokenRepository.findByPattern.rejects(new HTTPError(503, "Unavailable"));
      const res = await http(app).get("/api/tokens");
      expect(res.status).to.equal(503);
      expect(res.body.error).to.equal("Unavailable");
    });
  });
});
