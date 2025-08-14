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
import { expect } from "chai";
import { MongoDbAgentRepository } from "../../src/database/repositories/mongodb/mongo-db-agent-repository";
import {
  allocateTestResources,
  releaseTestResources,
  TestResources,
} from "../test-resources";
import { randomAgent, randomString, withoutId } from "../test-utils";

describe("MongoDbGenericRepository", () => {
  let testResources: TestResources;
  let repository: MongoDbAgentRepository;
  before(async () => {
    testResources = await allocateTestResources();
    repository = testResources.injector.injectClass(MongoDbAgentRepository);
  });

  after(async () => {
    await releaseTestResources(testResources);
  });

  describe("addNewConnection", () => {
    it("should add a connection to the agent", async () => {
      const agent = randomAgent();
      const { id } = await repository.create(agent);
      const connectionId = randomString(24);
      await repository.addNewConnection(id, connectionId);
      const loadedData = await repository.findById(id);
      expect(loadedData?.connections).to.be.deep.equal([connectionId]);
    });

    it("should add two connections to the agent, one after the other", async () => {
      const agent = randomAgent();
      const { id } = await repository.create(agent);
      const connectionId = randomString(24);
      const connectionId2 = randomString(24);
      await repository.addNewConnection(id, connectionId);
      await repository.addNewConnection(id, connectionId2);
      const loadedData = await repository.findById(id);
      expect(loadedData?.connections).to.be.deep.equal([
        connectionId,
        connectionId2,
      ]);
    });
  });

  describe("replaceConnections", () => {
    it("should replace a non existing collection with a new one", async () => {
      const agent = randomAgent();
      const { id } = await repository.create(agent);
      const connectionId = randomString(24);
      const res = await repository.replaceConnections(id, [connectionId]);
      expect(res).to.be.true;
      const loadedData = await repository.findById(id);
      expect(loadedData?.connections).to.be.deep.equal([connectionId]);
    });

    it("should replace a existing collection with a new one", async () => {
      const agent = randomAgent();

      agent.connections = [randomString()];

      const { id } = await repository.create(agent);
      const connectionId = randomString(24);
      const res = await repository.replaceConnections(id, [connectionId]);
      expect(res).to.be.true;
      const loadedData = await repository.findById(id);
      expect(loadedData?.connections).to.be.deep.equal([connectionId]);
    });
  });

  describe("findByConnectionId", () => {
    it("should finnd an agent by the connection id", async () => {
      const agent = randomAgent();

      agent.connections = [randomString()];

      await repository.create(agent);
      const loadedData = await repository.findByConnectionId(
        agent.connections[0]
      );
      expect(loadedData).to.have.length(1);
      expect(withoutId(loadedData[0])).to.be.deep.equal(agent);
    });
  });
});
