/* eslint-disable @typescript-eslint/no-unused-expressions */

import { expect } from "chai";
import { UsersRepository } from "../src/database/repositories/interfaces/user-repository-interface";
import { MongoDBUserRepository } from "../src/database/repositories/mongodb/mongo-db-user-repository";
import {
  allocateTestResources,
  releaseTestResources,
  TestResources,
} from "./test-resources";
describe("MongoDbAgentRepository", () => {
  let testResources: TestResources;
  let repository: UsersRepository;
  before(async () => {
    testResources = await allocateTestResources();
    repository = testResources.injector.injectClass(MongoDBUserRepository);
  });

  after(async () => {
    await releaseTestResources(testResources);
  });

  describe("findByPattern", () => {
    it("should call the find method on the collection", async () => {
      const collection = testResources.database.collection("users");
      await collection.insertOne({ userId: "xyz" });
      const result = await repository.findByPattern({ userId: "xyz" });
      expect(result).not.to.be.null;
    });
  });
});
