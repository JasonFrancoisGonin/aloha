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
import { provideCaches } from "../../src/injector/provide-caches";

describe("provideCaches", () => {
  it("should provide all expected cache instances", () => {
    const injector = provideCaches(createInjector());

    expect(injector.resolve("emptyCache")).to.exist;
    expect(injector.resolve("jwtCache")).to.exist;
    expect(injector.resolve("fetchCache")).to.exist;
    expect(injector.resolve("userProjectsCache")).to.exist;
    expect(injector.resolve("usersCache")).to.exist;
    expect(injector.resolve("agentsCache")).to.exist;
  });

  it("should provide transient emptyCache (new instance each time)", () => {
    const injector = provideCaches(createInjector());

    const cache1 = injector.resolve("emptyCache");
    const cache2 = injector.resolve("emptyCache");

    expect(cache1).to.not.equal(cache2);
  });

  it("should provide singleton caches (same instance each time)", () => {
    const injector = provideCaches(createInjector());

    expect(injector.resolve("jwtCache")).to.equal(injector.resolve("jwtCache"));
    expect(injector.resolve("fetchCache")).to.equal(injector.resolve("fetchCache"));
    expect(injector.resolve("usersCache")).to.equal(injector.resolve("usersCache"));
    expect(injector.resolve("agentsCache")).to.equal(injector.resolve("agentsCache"));
    expect(injector.resolve("userProjectsCache")).to.equal(injector.resolve("userProjectsCache"));
  });

  it("should provide caches with get/put/del operations", () => {
    const injector = provideCaches(createInjector());
    const cache = injector.resolve("usersCache");

    expect(cache.get).to.be.a("function");
    expect(cache.put).to.be.a("function");
    expect(cache.del).to.be.a("function");
    expect(cache.clear).to.be.a("function");
  });

  it("should support put and get on a cache", async () => {
    const injector = provideCaches(createInjector());
    const cache = injector.resolve("fetchCache");

    cache.put("key1", { data: "hello" });
    const result = await cache.get("key1");

    expect(result).to.deep.equal({ data: "hello" });
  });

  it("should support del on a cache", async () => {
    const injector = provideCaches(createInjector());
    const cache = injector.resolve("fetchCache");

    cache.put("key2", { data: "world" });
    cache.del("key2");
    const result = await cache.get("key2");

    expect(result).to.be.null;
  });
});
