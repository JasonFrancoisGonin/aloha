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
import { UsersRepository } from "../../src/database/repositories/interfaces/user-repository-interface";
import { MongoDBUserRepository } from "../../src/database/repositories/mongodb/mongo-db-user-repository";
import { MongoDbProjectRepository } from "../../src/database/repositories/mongodb/mongo-db-project-repository";
import {
  allocateTestResources,
  releaseTestResources,
  TestResources,
} from ".././test-resources";
import { randomProject, randomUser, withoutId } from ".././test-utils";

describe("MongoDbUserRepository", () => {
  let testResources: TestResources;
  let userRepository: UsersRepository;
  before(async () => {
    testResources = await allocateTestResources();
    userRepository = testResources.injector.injectClass(MongoDBUserRepository);
  });

  after(async () => {
    await releaseTestResources(testResources);
  });

  describe("findByPattern", () => {
    it("should call the find method on the collection", async () => {
      const collection = testResources.database.collection("users");
      await collection.insertOne({ userId: "xyz" });
      const result = await userRepository.findByPattern({ userId: "xyz" });
      expect(result).not.to.be.null;
    });
  });

  describe("findByUserId", () => {
    it("should find a user by userId", async () => {
      const user = randomUser();
      await userRepository.create(user);
      const loadedUser = await userRepository.findByUserId(user.userId);
      expect(loadedUser).not.to.be.null;
      expect(withoutId(loadedUser)).to.be.deep.equal(user);
    });
  });

  describe("projectsByUser", () => {
    it("should find the projects related to the user identified by id", async () => {
      const projectRepository = testResources.injector.injectClass(
        MongoDbProjectRepository
      );

      const project = await projectRepository.create(randomProject());

      const user = randomUser();

      user.projects = [project.id];

      const insertedUser = await userRepository.create(user);

      const loadedProjects = await userRepository.projectsByUser(
        insertedUser.id
      );

      expect(loadedProjects).to.have.length(1);

      expect(loadedProjects[0]).to.be.deep.equal(project);
    });
  });
});
