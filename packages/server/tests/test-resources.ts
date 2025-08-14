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
import http from "http";
import { Db, MongoClient } from "mongodb";
import { MongoMemoryServer } from "mongodb-memory-server";
import sinon, { SinonSandbox } from "sinon";
import { Injector } from "typed-inject";
import { injector } from "../src/injector/injector";

import * as mongodb from "../src/database/repositories/mongodb/mongodb";
import * as authorise from "../src/middleware/authorise";
// import { AuthenticationStrategy } from "aloha-shared";
import { schemas } from "aloha-shared";
import { getLogger } from "../src/injector/provide-logger";
import { startMockServer } from "./mock-mcp";
import { randomConnectionsOptions } from "./test-utils";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

const logger = getLogger("MOCK");

export type TestResources = {
  mongoDbServer: MongoMemoryServer;
  database: Db;
  injector: ReturnType<typeof injector> & Injector<{ test: true }>;
  sandbox: SinonSandbox;
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
  sandbox.stub(mongodb, "getClient").returns(mockClient);

  const testInjector = injector().provideValue("test", true);

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

export type MCPTestServer = {
  connectionOptions: schemas.MCPConnectionOptions;
  httpServer: http.Server;
  mcpServer: Server;
};

export async function startMCPTestServer(
  serverProtocol: schemas.MCPConnectionOptions["serverProtocol"]
) {
  const connectionOptions = await randomConnectionsOptions(serverProtocol);
  const { httpServer, mcpServer } = await startMockServer(
    connectionOptions.port
  );
  return {
    connectionOptions,
    httpServer,
    mcpServer,
  } as MCPTestServer;
}

export async function stopMCPTestServer(testServer: MCPTestServer) {
  testServer.httpServer.closeAllConnections();
  await testServer.mcpServer.close();
  return new Promise<void>((resolve) => {
    testServer.httpServer.close(() => resolve());
  });
}
