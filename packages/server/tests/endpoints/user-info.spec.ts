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
  regularUser,
  MockDependencies,
} from "./endpoint-test-helpers";
import { userInfoRouter } from "../../src/endpoints/user-info";

const http = (app: Express) => request.execute(app);

describe("userInfoRouter", () => {
  let deps: MockDependencies;
  let app: Express;

  before(() => {
    deps = createMockDependencies();
    setupMockInjector(deps);
    setupAuthPlugins();
    app = createTestApp(userInfoRouter(), { user: adminUser, basePath: "/api/user-info" });
  });

  after(() => {
    restoreInjector();
    teardownAuthPlugins();
  });

  beforeEach(() => {
    deps.usersCache.get.reset();
    deps.usersCache.get.callsFake(async (_k: string, vp?: () => Promise<unknown>) => vp ? vp() : null);
    deps.userRepository.findById.reset();
    deps.userRepository.findById.resolves(null);
    deps.projectRepository.findById.reset();
    deps.projectRepository.findById.resolves(null);
  });

  // ── GET /api/user-info ────────────────────────────────────────────────

  it("should return 204 when user is not authenticated", async () => {
    const unauthApp = createTestApp(userInfoRouter(), { basePath: "/api/user-info" });
    const res = await http(unauthApp).get("/api/user-info");
    expect(res.status).to.equal(204);
  });

  it("should return user info with empty projects when user has none", async () => {
    deps.userRepository.findById.resolves({ id: "user-1", userId: "admin-user", projects: [] });
    const res = await http(app).get("/api/user-info");
    expect(res.status).to.equal(200);
    expect(res.body.id).to.equal(adminUser.id);
    expect(res.body.displayName).to.equal(adminUser.displayName);
    expect(res.body.projects).to.deep.equal([]);
  });

  it("should return user info when DB user is null (no projects field)", async () => {
    const res = await http(app).get("/api/user-info");
    expect(res.status).to.equal(200);
    expect(res.body.projects).to.deep.equal([]);
  });

  it("should resolve project names from repository", async () => {
    deps.userRepository.findById.resolves({ id: "user-1", userId: "admin-user", projects: ["p1", "p2"] });
    deps.projectRepository.findById.withArgs("p1").resolves({ id: "p1", name: "Project One" });
    deps.projectRepository.findById.withArgs("p2").resolves({ id: "p2", name: "Project Two" });
    const res = await http(app).get("/api/user-info");
    expect(res.status).to.equal(200);
    expect(res.body.projects).to.deep.equal([
      { id: "p1", name: "Project One" },
      { id: "p2", name: "Project Two" },
    ]);
  });

  it("should use 'Unknown' for projects not found in repository", async () => {
    deps.userRepository.findById.resolves({ id: "user-1", userId: "admin-user", projects: ["missing"] });
    deps.projectRepository.findById.withArgs("missing").resolves(null);
    const res = await http(app).get("/api/user-info");
    expect(res.body.projects).to.deep.equal([{ id: "missing", name: "Unknown" }]);
  });

  // ── ERROR HANDLING ────────────────────────────────────────────────────

  it("should return 204 when findCachedUsersById throws", async () => {
    deps.usersCache.get.rejects(new Error("cache failure"));
    const res = await http(app).get("/api/user-info");
    expect(res.status).to.equal(204);
  });
});
