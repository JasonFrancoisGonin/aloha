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
import { authentication_strategy } from "aloha-shared";
import {
  createMockDependencies,
  setupMockInjector,
  restoreInjector,
  createTestApp,
  setupAuthPlugins,
  teardownAuthPlugins,
  adminUser,
  regularUser,
  adminDbUser,
  regularDbUser,
  MockDependencies,
} from "./endpoint-test-helpers";
import { setAuthPlugins } from "../../src/middleware/authorise";
import { usersRoutes } from "../../src/endpoints/users";
import { HTTPError } from "../../src/endpoints/utils";
import { replaceInjector, injector } from "../../src/injector/injector";

const http = (app: Express) => request.execute(app);

const validUser = {
  userId: "new-user-id",
  fullName: "New User",
  permissions: [],
  disabled: false,
};

describe("usersRoutes", () => {
  let deps: MockDependencies;
  let app: Express;

  before(async () => {
    deps = createMockDependencies();
    // count > 0 so createDefaultAdminUser is skipped
    deps.userRepository.count.resolves(1);
    setupMockInjector(deps);
    setupAuthPlugins();
    const router = await usersRoutes();
    app = createTestApp(router, { user: adminUser, basePath: "/api/users" });
  });

  after(() => {
    restoreInjector();
    teardownAuthPlugins();
  });

  beforeEach(() => {
    deps.userRepository.findByPattern.reset();
    deps.userRepository.findByPattern.resolves([]);
    deps.userRepository.findById.reset();
    deps.userRepository.findById.resolves(null);
    deps.userRepository.create.reset();
    deps.userRepository.create.callsFake(async (item: any) => ({ ...item, id: "u-new" }));
    deps.userRepository.updateById.reset();
    deps.userRepository.updateById.resolves(true);
    deps.userRepository.deleteById.reset();
    deps.userRepository.deleteById.resolves(true);
    deps.userRepository.findByUserId.reset();
    deps.userRepository.findByUserId.resolves(null);
    deps.connectionOptionsRepository.findByPattern.reset();
    deps.connectionOptionsRepository.findByPattern.resolves([]);
    deps.connectionOptionsRepository.unsetCreator.reset();
    deps.connectionOptionsRepository.unsetCreator.resolves(true);
    deps.serverOptionsRepository.findByPattern.reset();
    deps.serverOptionsRepository.findByPattern.resolves([]);
    deps.serverOptionsRepository.unsetCreator.reset();
    deps.serverOptionsRepository.unsetCreator.resolves(true);
    deps.fetchCache.clear.resetHistory();
  });

  // ── BOOTSTRAP ─────────────────────────────────────────────────────────

  describe("bootstrap", () => {
    it("should create default admin when user repository is empty", async () => {
      const d = createMockDependencies();
      d.userRepository.count.resolves(0);
      d.userRepository.create.resolves({ id: "admin-1" });
      const prev = injector();
      const mockInj = { resolve: sinon.stub().callsFake((k: string) => (d as any)[k]) };
      replaceInjector(mockInj as any);
      await usersRoutes();
      replaceInjector(prev);
      expect(d.userRepository.create.calledOnce).to.be.true;
      const arg = d.userRepository.create.firstCall.args[0];
      expect(arg.userId).to.equal("admin");
      expect(arg.permissions).to.deep.equal(Object.values(authentication_strategy.Permissions));
    });
  });

  // ── LIST ──────────────────────────────────────────────────────────────

  describe("GET / (list)", () => {
    it("should return users", async () => {
      deps.userRepository.findByPattern.resolves([adminDbUser]);
      const res = await http(app).get("/api/users");
      expect(res.status).to.equal(200);
      expect(res.body).to.have.lengthOf(1);
    });
  });

  // ── GET ───────────────────────────────────────────────────────────────

  describe("GET /:id (get)", () => {
    it("should return user by id", async () => {
      deps.userRepository.findById.resolves(adminDbUser);
      const res = await http(app).get("/api/users/user-1");
      expect(res.status).to.equal(200);
      expect(res.body.userId).to.equal("admin-user");
    });

    it("should return 404 for unknown user", async () => {
      const res = await http(app).get("/api/users/unknown");
      expect(res.status).to.equal(404);
    });
  });

  // ── CREATE ────────────────────────────────────────────────────────────

  describe("POST / (create)", () => {
    it("should create a user", async () => {
      const res = await http(app).post("/api/users").send(validUser);
      expect(res.status).to.equal(204);
      expect(deps.userRepository.create.calledOnce).to.be.true;
    });

    it("should return 400 for invalid body", async () => {
      const res = await http(app).post("/api/users").send({ fullName: "X" });
      expect(res.status).to.equal(400);
    });

    it("should return 400 for short userId", async () => {
      const res = await http(app).post("/api/users").send({ ...validUser, userId: "ab" });
      expect(res.status).to.equal(400);
    });

    it("should return 502 when userId is the anonymous reserved word", async () => {
      const res = await http(app).post("/api/users").send({
        ...validUser,
        userId: authentication_strategy.ANONYMOUS_USER,
      });
      expect(res.status).to.equal(502);
    });

    it("should return 502 when userId already exists", async () => {
      deps.userRepository.findByPattern.resolves([{ id: "existing", userId: "new-user-id" }]);
      const res = await http(app).post("/api/users").send(validUser);
      expect(res.status).to.equal(502);
    });
  });

  // ── UPDATE ────────────────────────────────────────────────────────────

  describe("POST /:id (update)", () => {
    it("should update a user", async () => {
      deps.userRepository.findById.resolves({ id: "u1", userId: "existing-user", fullName: "Old" });
      deps.userRepository.findByPattern.resolves([]);
      const res = await http(app).post("/api/users/u1").send({ fullName: "Updated" });
      expect(res.status).to.equal(204);
    });

    it("should return 404 when user not found", async () => {
      const res = await http(app).post("/api/users/unknown").send({ fullName: "X" });
      expect(res.status).to.equal(404);
    });

    it("should allow update when userId matches same user", async () => {
      deps.userRepository.findById.resolves({ id: "u1", userId: "same-user-id" });
      deps.userRepository.findByPattern.resolves([{ id: "u1", userId: "same-user-id" }]);
      const res = await http(app).post("/api/users/u1").send({ fullName: "Updated" });
      expect(res.status).to.equal(204);
    });

    it("should return 502 when userId conflicts with another user", async () => {
      deps.userRepository.findById.resolves({ id: "u1", userId: "user-one" });
      deps.userRepository.findByPattern.resolves([{ id: "u2", userId: "user-one" }]);
      const res = await http(app).post("/api/users/u1").send({ fullName: "Updated" });
      expect(res.status).to.equal(502);
    });
  });

  // ── DELETE ────────────────────────────────────────────────────────────

  describe("POST /:id/_delete (delete)", () => {
    it("should delete a user and unset creator on owned resources", async () => {
      deps.userRepository.deleteById.resolves(true);
      deps.connectionOptionsRepository.findByPattern.resolves([{ id: "c1" }, { id: "c2" }]);
      deps.serverOptionsRepository.findByPattern.resolves([{ id: "s1" }]);
      const res = await http(app).post("/api/users/u1/_delete");
      expect(res.status).to.equal(204);
      expect(deps.connectionOptionsRepository.unsetCreator.calledTwice).to.be.true;
      expect(deps.serverOptionsRepository.unsetCreator.calledOnce).to.be.true;
      expect(deps.fetchCache.clear.called).to.be.true;
    });

    it("should return 404 when user not found", async () => {
      deps.userRepository.deleteById.resolves(false);
      const res = await http(app).post("/api/users/u1/_delete");
      expect(res.status).to.equal(404);
    });
  });

  // ── AUTHENTICATION ────────────────────────────────────────────────────

  describe("authentication", () => {
    it("should return 401 for unauthenticated user on list", async () => {
      const unauthApp = createTestApp(await usersRoutes(), { basePath: "/api/users" });
      const res = await http(unauthApp).get("/api/users");
      expect(res.status).to.equal(401);
    });
  });

  // ── WRITE PERMISSION ENFORCEMENT ──────────────────────────────────────

  describe("write permission enforcement", () => {
    let restrictedApp: Express;

    before(async () => {
      setAuthPlugins([]);
      restrictedApp = createTestApp(await usersRoutes(), { user: regularUser, basePath: "/api/users" });
    });

    after(() => setupAuthPlugins());

    it("should return 403 on list without UsersRead", async () => {
      const res = await http(restrictedApp).get("/api/users");
      expect(res.status).to.equal(403);
    });

    it("should return 403 on create without UsersWrite", async () => {
      const res = await http(restrictedApp).post("/api/users").send(validUser);
      expect(res.status).to.equal(403);
    });

    it("should return 403 on delete without UsersWrite", async () => {
      const res = await http(restrictedApp).post("/api/users/u1/_delete");
      expect(res.status).to.equal(403);
    });
  });

  // ── ERROR HANDLING ────────────────────────────────────────────────────

  describe("error handling", () => {
    it("should return 500 on unexpected repository error", async () => {
      deps.userRepository.findByPattern.rejects(new Error("DB down"));
      const res = await http(app).get("/api/users");
      expect(res.status).to.equal(500);
    });

    it("should return HTTPError status code", async () => {
      deps.userRepository.findByPattern.rejects(new HTTPError(503, "Unavailable"));
      const res = await http(app).get("/api/users");
      expect(res.status).to.equal(503);
      expect(res.body.error).to.equal("Unavailable");
    });
  });
});
