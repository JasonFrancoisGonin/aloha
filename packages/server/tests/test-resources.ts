// import getPort from "get-port";
// import { Db, MongoClient } from "mongodb";
// import { MongoMemoryServer } from "mongodb-memory-server";
// import { Injector } from "typed-inject";
// import { injector } from "../src/injector/injector";

// export type TestResources = {
//   mongoDbServer: MongoMemoryServer;
//   database: Db;
//   injector: typeof injector & Injector<{ test: true }>;
// };
// export async function allocateTestResources() {
//   const mockServer = await MongoMemoryServer.create({
//     instance: { port: await getPort() },
//   });
//   const mongoUri = mockServer.getUri();
//   const mockClient = new MongoClient(mongoUri);
//   await mockClient.connect();
//   const mockDatabase = mockClient.db();
//   const testInjector = injector
//     .provideValue("test", true)
//     .provideValue("getDatabase", () => mockDatabase);
//   return {
//     mongoDbServer: mockServer,
//     database: mockDatabase,
//     injector: testInjector,
//   } as TestResources;
// }

// export async function releaseTestResources(testResources: TestResources) {
//   await testResources.injector.dispose();
//   await testResources.mongoDbServer.stop({ doCleanup: true, force: true });
// }

import getPort from "get-port";
import sinon, { SinonSandbox } from "sinon";
import { Db, MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Injector } from "typed-inject";
import { injector } from "../src/injector/injector";

import * as mongodb from "../src/database/repositories/mongodb/mongodb";
import * as authorise from "../src/middleware/authorise";
// import { AuthenticationStrategy } from "aloha-shared";
import { getLogger } from "../src/injector/provide-logger";
import { Server } from "http";
import { startMockServer } from "./mock-mcp";

const logger = getLogger("MOCK");

export type TestResources = {
  mongoDbServer: MongoMemoryServer;
  database: Db;
  injector: typeof injector & Injector<{ test: true }>;
  sandbox: SinonSandbox;
  mockMCP?: Server;
};
export async function allocateTestResources() {
  const sandbox = sinon.createSandbox();
  const mockServer = await MongoMemoryServer.create({
    instance: { port: await getPort() },
  });
  const mongoUri = mockServer.getUri();
  const mockClient = new MongoClient(mongoUri);
  await mockClient.connect();
  const mockDatabase = mockClient.db();

  sandbox.stub(mongodb, "getDatabase").returns(mockDatabase);

  const testInjector = injector.provideValue("test", true);

  return {
    mongoDbServer: mockServer,
    database: mockDatabase,
    injector: testInjector,
    sandbox,
  } as TestResources;
}

export async function releaseTestResources(testResources: TestResources) {
  await testResources.injector.dispose();
  await testResources.mongoDbServer.stop({ doCleanup: true, force: true });
  testResources.sandbox.restore();
  // if (testResources.authPlugins)
  //   authorise.setAuthPlugins(testResources.authPlugins);
  if (testResources.mockMCP) {
    testResources.mockMCP.close();
  }
}

export function mockAuthentication(
  testResources: TestResources,
  permissions?: string[]
) {
  // if (!testResources.authPlugins)
  //   testResources.authPlugins = authorise.getAuthPlugins();
  // authorise.setAuthPlugins([
  //   {
  //     init: () => new Promise(() => null),
  //     getAuthenticationMiddleware: () =>
  //       new Promise((resolve) =>
  //         resolve((req, _res, next) => {
  //           console.log("Injecting fake user");
  //           req.user = {
  //             id: "fake",
  //             displayName: "Fake User",
  //             permissions: permissions || [],
  //             provider: "fake",
  //             email: "fake@fake.fk",
  //           };
  //           next();
  //         })
  //       ),
  //     getInfo: () => new Promise(() => ({ provider: "fake" })),
  //     login: () =>
  //       new Promise((resolve) => resolve((_req, _res, next) => next())),
  //     logout: () =>
  //       new Promise((resolve) => resolve((_req, _res, next) => next())),
  //     checkPermissions: (_user, requiredPermissions) =>
  //       new Promise((resolve) =>
  //         resolve(
  //           permissions
  //             ? requiredPermissions.every((p) => permissions.includes(p))
  //             : true
  //         )
  //       ),
  //   },
  // ]);
  testResources.sandbox
    .stub(authorise, "authorise")
    .callsFake((requiredPermissions) => (req, res, next) => {
      logger().debug("Injecting fake user");
      const ok =
        permissions && requiredPermissions
          ? requiredPermissions.every((p) => permissions.includes(p))
          : true;
      if (ok) next();
      else res.status(401).json({ error: "Unauthorised" });
    });
}

export async function mockMCP(testResources: TestResources) {
  testResources.mockMCP = await startMockServer(await getPort());
}
