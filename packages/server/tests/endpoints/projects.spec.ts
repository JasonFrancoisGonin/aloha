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
  adminDbUser,
  regularDbUser,
  MockDependencies,
} from "./endpoint-test-helpers";
import { setAuthPlugins } from "../../src/middleware/authorise";
import { projectsRoutes } from "../../src/endpoints/projects";
import { HTTPError } from "../../src/endpoints/utils";

const http = (app: Express) => request.execute(app);

describe("projectsRoutes", () => {
  let deps: MockDependencies;
  let app: any;

  before(() => {
    deps = createMockDependencies();
    setupMockInjector(deps);
    setupAuthPlugins();
    app = createTestApp(projectsRoutes(), { user: adminUser, basePath: "/api/project" });
  });

  after(() => {
    restoreInjector();
    teardownAuthPlugins();
  });

  beforeEach(() => {
    deps.projectRepository.findByPattern.reset();
    deps.projectRepository.findByPattern.resolves([]);
    deps.projectRepository.findById.reset();
    deps.projectRepository.findById.resolves(null);
    deps.projectRepository.create.reset();
    deps.projectRepository.create.callsFake(async (item: any) => ({ ...item, id: "proj-new" }));
    deps.projectRepository.updateById.reset();
    deps.projectRepository.updateById.resolves(true);
    deps.projectRepository.deleteById.reset();
    deps.projectRepository.deleteById.resolves(true);
    deps.userRepository.findById.reset();
    deps.userRepository.findById.resolves(adminDbUser);
    deps.fetchCache.clear.resetHistory();
  });

  const sampleProject = { id: "proj-1", projectId: "test-proj", name: "Test Project", description: "A test" };

  describe("GET /api/project (list)", () => {
    it("should return empty array when no projects", async () => {
      const res = await http(app).get("/api/project");
      expect(res.status).to.equal(200);
      expect(res.body).to.deep.equal([]);
    });

    it("should return all projects", async () => {
      deps.projectRepository.findByPattern.resolves([sampleProject]);
      const res = await http(app).get("/api/project");
      expect(res.status).to.equal(200);
      expect(res.body).to.have.lengthOf(1);
      expect(res.body[0].name).to.equal("Test Project");
    });
  });

  describe("GET /api/project/:id (get)", () => {
    it("should return project by id", async () => {
      deps.projectRepository.findById.resolves(sampleProject);
      const res = await http(app).get("/api/project/proj-1");
      expect(res.status).to.equal(200);
      expect(res.body.projectId).to.equal("test-proj");
    });

    it("should return 404 for unknown project", async () => {
      const res = await http(app).get("/api/project/unknown");
      expect(res.status).to.equal(404);
    });
  });

  describe("POST /api/project (create)", () => {
    it("should create a project", async () => {
      const res = await http(app).post("/api/project").send({
        projectId: "new-proj",
        name: "New Project",
        description: "desc",
      });
      expect(res.status).to.equal(204);
      expect(deps.projectRepository.create.calledOnce).to.be.true;
    });

    it("should reject invalid project data", async () => {
      const res = await http(app).post("/api/project").send({ name: "x" });
      expect(res.status).to.equal(400);
    });

    it("should reject project with short projectId", async () => {
      const res = await http(app).post("/api/project").send({
        projectId: "ab",
        name: "Short ID",
        description: "desc",
      });
      expect(res.status).to.equal(400);
    });
  });

  describe("POST /api/project/:id (update)", () => {
    it("should update a project", async () => {
      const res = await http(app).post("/api/project/proj-1").send({ name: "Updated" });
      expect(res.status).to.equal(204);
    });

    it("should return 404 when project not found", async () => {
      deps.projectRepository.updateById.resolves(false);
      const res = await http(app).post("/api/project/unknown").send({ name: "Updated" });
      expect(res.status).to.equal(404);
    });
  });

  describe("POST /api/project/:id/_delete (delete)", () => {
    it("should delete a project", async () => {
      const res = await http(app).post("/api/project/proj-1/_delete");
      expect(res.status).to.equal(204);
    });

    it("should return 404 when project not found", async () => {
      deps.projectRepository.deleteById.resolves(false);
      const res = await http(app).post("/api/project/proj-1/_delete");
      expect(res.status).to.equal(404);
    });
  });

  describe("authentication", () => {
    it("should return 401 for unauthenticated request on list", async () => {
      const unauthApp = createTestApp(projectsRoutes(), { basePath: "/api/project" });
      const res = await http(unauthApp).get("/api/project");
      expect(res.status).to.equal(401);
    });

    it("should return 401 for unauthenticated request on create", async () => {
      const unauthApp = createTestApp(projectsRoutes(), { basePath: "/api/project" });
      const res = await http(unauthApp).post("/api/project").send({ projectId: "p1", name: "P", description: "d" });
      expect(res.status).to.equal(401);
    });
  });

  describe("write permission enforcement", () => {
    let restrictedApp: any;

    before(() => {
      // No auth plugins → authenticated user with non-empty requiredPermissions gets 403
      setAuthPlugins([]);
      restrictedApp = createTestApp(projectsRoutes(), { user: regularUser, basePath: "/api/project" });
    });

    after(() => setupAuthPlugins());

    it("should allow read with empty readPermissions (no plugin check needed)", async () => {
      const res = await http(restrictedApp).get("/api/project");
      expect(res.status).to.equal(200);
    });

    it("should return 403 on create without UsersWrite", async () => {
      deps.userRepository.findById.resolves(regularDbUser);
      const res = await http(restrictedApp).post("/api/project").send({
        projectId: "new-proj", name: "New", description: "d",
      });
      expect(res.status).to.equal(403);
    });

    it("should return 403 on delete without UsersWrite", async () => {
      const res = await http(restrictedApp).post("/api/project/proj-1/_delete");
      expect(res.status).to.equal(403);
    });
  });

  describe("error handling", () => {
    it("should return 500 on unexpected repository error", async () => {
      deps.projectRepository.findByPattern.rejects(new Error("DB down"));
      const res = await http(app).get("/api/project");
      expect(res.status).to.equal(500);
    });

    it("should return HTTPError status code", async () => {
      deps.projectRepository.findByPattern.rejects(new HTTPError(503, "Unavailable"));
      const res = await http(app).get("/api/project");
      expect(res.status).to.equal(503);
      expect(res.body.error).to.equal("Unavailable");
    });
  });
});
