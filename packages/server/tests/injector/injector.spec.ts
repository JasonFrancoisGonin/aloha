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
import { injector, replaceInjector } from "../../src/injector/injector";

describe("injector", () => {
  it("should return the default injector", () => {
    const inj = injector();
    expect(inj).to.exist;
    expect(inj.resolve).to.be.a("function");
  });

  it("should resolve core dependencies from the full chain", () => {
    const inj = injector();

    expect(inj.resolve("isProduction")).to.be.a("boolean");
    expect(inj.resolve("serverSecret")).to.be.a("string");
    expect(inj.resolve("clientSecret")).to.be.a("string");
    expect(inj.resolve("rootLogger")).to.exist;
    expect(inj.resolve("userRepository")).to.exist;
    expect(inj.resolve("jwtCache")).to.exist;
    expect(inj.resolve("sessionStore")).to.exist;
    expect(inj.resolve("mcpManager")).to.exist;
    expect(inj.resolve("test")).to.be.false;
  });

  it("should allow replacing the injector", () => {
    const original = injector();
    const replaced = original.provideValue("test", true);

    replaceInjector(replaced as typeof original);
    expect(injector().resolve("test")).to.be.true;

    // restore
    replaceInjector(original);
    expect(injector().resolve("test")).to.be.false;
  });
});
