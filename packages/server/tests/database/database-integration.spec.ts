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
import { injector } from "../../src/injector/injector";

describe("database integration", () => {
  it("should have DB_URI set", () => {
    expect(process.env.DB_URI).to.exist;
    expect(process.env.DB_URI).to.include("mongodb://");
  });

  it("should resolve userRepository", () => {
    const repo = injector().resolve("userRepository");
    expect(repo).to.exist;
    expect(repo.findByUserId).to.be.a("function");
  });

  it("should resolve agentRepository", () => {
    const repo = injector().resolve("agentRepository");
    expect(repo).to.exist;
    expect(repo.findById).to.be.a("function");
  });

  it("should resolve projectRepository", () => {
    const repo = injector().resolve("projectRepository");
    expect(repo).to.exist;
    expect(repo.findById).to.be.a("function");
  });
});
