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
import { provideLogger } from "../../src/injector/provide-logger-instance";

describe("provideLogger", () => {
  it("should provide rootLogger with all log methods", () => {
    const injector = provideLogger(createInjector());
    const logger = injector.resolve("rootLogger");

    expect(logger).to.exist;
    expect(logger.info).to.be.a("function");
    expect(logger.error).to.be.a("function");
    expect(logger.warn).to.be.a("function");
    expect(logger.debug).to.be.a("function");
  });

  it("should return the same singleton logger", () => {
    const injector = provideLogger(createInjector());
    const logger1 = injector.resolve("rootLogger");
    const logger2 = injector.resolve("rootLogger");

    expect(logger1).to.equal(logger2);
  });

  it("should create child loggers with module context", () => {
    const injector = provideLogger(createInjector());
    const logger = injector.resolve("rootLogger");
    const child = logger.child({ module: "test-module" });

    expect(child).to.exist;
    expect(child.info).to.be.a("function");
    expect(child).to.not.equal(logger);
  });
});
