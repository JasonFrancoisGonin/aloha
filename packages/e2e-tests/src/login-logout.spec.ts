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
import { afterAll, beforeAll, describe, it } from "vitest";
import {
  IntegrationEnvironment,
  safeClickHandle,
  startIntegrationTestEnvironment,
} from "./utils/integration-test-support";
import {
  getLoggedInElementHandle,
  getLogoutElementHandle,
} from "./utils/test-ui-utils";

describe("[A] Login-Logout", () => {
  let env: IntegrationEnvironment;
  beforeAll(async () => {
    env = await startIntegrationTestEnvironment();
  });

  afterAll(async () => await env?.stop());

  it("Should login and then logout", async () => {
    const page = env.page;
    await safeClickHandle(await getLoggedInElementHandle(page));
    await safeClickHandle(await getLogoutElementHandle(page));
    await page.close();
  });
});
