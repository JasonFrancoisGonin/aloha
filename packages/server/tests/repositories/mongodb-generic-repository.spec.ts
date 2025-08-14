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
import { MongoDBGenericRepository } from "../../src/database/repositories/mongodb/mongo-db-generic-repository";
import {
  allocateTestResources,
  releaseTestResources,
  TestResources,
} from ".././test-resources";
import { randomString, withoutId } from ".././test-utils";

type Document = { field: string };

describe("MongoDbGenericRepository", () => {
  let testResources: TestResources;
  let repository: MongoDBGenericRepository<Document>;
  before(async () => {
    testResources = await allocateTestResources();
    repository = new MongoDBGenericRepository(
      "test_documents",
      testResources.injector
    );
  });

  after(async () => {
    await releaseTestResources(testResources);
  });

  describe("create", () => {
    it("should create a new document and assign an id", async () => {
      const field = randomString();
      const result = await repository.create({ field });
      expect(result).not.to.be.null;
      expect(result.id).not.to.be.null;
      expect(result.field).to.be.equal(field);
    });
  });

  describe("findByPattern", () => {
    it("should load data from DB by using a pattern", async () => {
      const field = randomString();
      await repository.create({ field });

      const loadedData = await repository.findByPattern({ field });
      expect(loadedData).to.have.length(1);
      expect(loadedData[0].field).equal(field);
    });

    it("should not find an element with unknown pattern", async () => {
      const field = randomString();
      await repository.create({ field });
      const loadedData = await repository.findByPattern({
        field: randomString(),
      });
      expect(loadedData).to.have.length(0);
    });
  });

  describe("findById", () => {
    it("should find a item by the generated id", async () => {
      const item: Document = { field: randomString() };
      const { id } = await repository.create(item);

      const loadedData = await repository.findById(id);
      expect(withoutId(loadedData)).to.be.deep.equal(item);
    });

    it("should not find a item by the unknwn id", async () => {
      const item: Document = { field: randomString() };
      await repository.create(item);

      const loadedData = await repository.findById(randomString(24));
      expect(loadedData).to.be.null;
    });

    it("should contain id field but not the _id", async () => {
      const item: Document = { field: randomString() };
      const { id } = await repository.create(item);

      const loadedData = await repository.findById(id);
      expect(loadedData).to.haveOwnProperty("id");
      expect(loadedData).not.to.haveOwnProperty("_id");
    });
  });

  describe("updateById", () => {
    it("should update a field", async () => {
      const field = randomString();
      const { id } = await repository.create({ field });
      const newField = randomString();
      const res = await repository.updateById(id, { field: newField });
      expect(res).to.be.true;

      const loadedData = await repository.findById(id);
      expect(loadedData?.field).to.be.equal(newField);
    });

    it("should not update a field for unknown document", async () => {
      const field = randomString();
      const { id } = await repository.create({ field });
      const newField = randomString();
      const res = await repository.updateById(randomString(24), {
        field: newField,
      });
      expect(res).to.be.false;

      const loadedData = await repository.findById(id);
      expect(loadedData?.field).to.be.equal(field);
    });
  });

  describe("deleteById", () => {
    it("should delete a document", async () => {
      const { id } = await repository.create({ field: randomString() });
      const res = await repository.deleteById(id);
      expect(res).to.be.true;

      const loadedData = await repository.findById(id);
      expect(loadedData).to.be.null;
    });

    it("should not delete a unknown document", async () => {
      const { id } = await repository.create({ field: randomString() });
      const res = await repository.deleteById(randomString(24));
      expect(res).to.be.false;

      const loadedData = await repository.findById(id);
      expect(loadedData).not.to.be.null;
    });
  });
});
