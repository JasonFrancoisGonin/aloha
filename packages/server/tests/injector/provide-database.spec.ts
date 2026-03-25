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
import { createInjector } from "typed-inject";
import { getDatabaseType, provideDatabase } from "../../src/injector/provide-database";

describe("provideDatabase", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getDatabaseType", () => {
    it("should detect mongodb from URI", () => {
      process.env.DB_URI = "mongodb://localhost:27017/test";
      expect(getDatabaseType()).to.equal("mongodb");
    });

    it("should detect postgresql from URI", () => {
      process.env.DB_URI = "postgresql://localhost:5432/test";
      expect(getDatabaseType()).to.equal("postgresql");
    });

    it("should throw for unsupported database type", () => {
      process.env.DB_URI = "mysql://localhost:3306/test";
      expect(() => getDatabaseType()).to.throw("Unsupported database type");
    });

    it("should throw for missing DB_URI", () => {
      delete process.env.DB_URI;
      expect(() => getDatabaseType()).to.throw("Unsupported database type");
    });

    it("should throw for malformed DB_URI", () => {
      process.env.DB_URI = "not-a-uri";
      expect(() => getDatabaseType()).to.throw("Unsupported database type");
    });
  });

  describe("provideDatabase (mongodb)", () => {
    it("should provide all repository factories", () => {
      const baseInjector = createInjector().provideValue("serverSecret", "test-secret");
      const injector = provideDatabase(baseInjector);

      expect(injector.resolve("userRepository")).to.exist;
      expect(injector.resolve("connectionOptionsRepository")).to.exist;
      expect(injector.resolve("serverOptionsRepository")).to.exist;
      expect(injector.resolve("projectRepository")).to.exist;
      expect(injector.resolve("tokenRepository")).to.exist;
      expect(injector.resolve("agentRepository")).to.exist;
      expect(injector.resolve("testbedAgentRepository")).to.exist;
    });

    it("should provide userRepository with full CrudRepository + extras", () => {
      const baseInjector = createInjector().provideValue("serverSecret", "test-secret");
      const repo = provideDatabase(baseInjector).resolve("userRepository");

      expect(repo.findById).to.be.a("function");
      expect(repo.findByPattern).to.be.a("function");
      expect(repo.findByUserId).to.be.a("function");
      expect(repo.create).to.be.a("function");
      expect(repo.updateById).to.be.a("function");
      expect(repo.deleteById).to.be.a("function");
      expect(repo.count).to.be.a("function");
    });

    it("should provide agentRepository with CrudRepository methods", () => {
      const baseInjector = createInjector().provideValue("serverSecret", "test-secret");
      const repo = provideDatabase(baseInjector).resolve("agentRepository");

      expect(repo.findById).to.be.a("function");
      expect(repo.findByPattern).to.be.a("function");
      expect(repo.create).to.be.a("function");
      expect(repo.updateById).to.be.a("function");
      expect(repo.deleteById).to.be.a("function");
    });

    it("should provide connectionOptionsRepository with CrudRepository methods", () => {
      const baseInjector = createInjector().provideValue("serverSecret", "test-secret");
      const repo = provideDatabase(baseInjector).resolve("connectionOptionsRepository");

      expect(repo.findById).to.be.a("function");
      expect(repo.create).to.be.a("function");
      expect(repo.updateById).to.be.a("function");
      expect(repo.deleteById).to.be.a("function");
    });

    it("should provide getDatabase factory", () => {
      const baseInjector = createInjector().provideValue("serverSecret", "test-secret");
      const injector = provideDatabase(baseInjector);
      const getDb = injector.resolve("getDatabase");

      expect(getDb).to.be.a("function");
      const db = getDb();
      expect(db).to.exist;
    });
  });
});
