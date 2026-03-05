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
import { provideSessionStore } from "../../src/injector/provide-session-store";

describe("provideSessionStore", () => {
  it("should provide a sessionStore for mongodb", () => {
    const baseInjector = createInjector().provideValue("sessionSecret", "test-session-secret");
    const injector = provideSessionStore(baseInjector);
    const store = injector.resolve("sessionStore");

    expect(store).to.exist;
    expect(store.get).to.be.a("function");
    expect(store.set).to.be.a("function");
    expect(store.destroy).to.be.a("function");
  });
});
