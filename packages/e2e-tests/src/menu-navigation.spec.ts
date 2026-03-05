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
import { afterAll, beforeAll, describe, it } from "vitest";
import {
  IntegrationEnvironment,
  newHomePageTab,
  safeClickHandle,
  startIntegrationTestEnvironment,
} from "./utils/integration-test-support";
import {
  getAgentsListPageHandle,
  getChangelogPageHandle,
  getClientListPageHandle,
  getHomePageHandle,
  getJwtTokenListPageHandle,
  getLicensePageHandle,
  getMenuAgentsElementHandle,
  getMenuChangelogElementHandle,
  getMenuClientElementHandle,
  getMenuHomeElementHandle,
  getMenuJwtTokensElementHandle,
  getMenuLicenseElementHandle,
  getMenuProjectsElementHandle,
  getMenuServersElementHandle,
  getMenuTestbedsElementHandle,
  getMenuUsersElementHandle,
  getProjectListPageHandle,
  getServerListPageHandle,
  getTestbedAgentListPageHandle,
  getUserListPageHandle,
} from "./utils/test-ui-utils";

describe("[B] Menu Navigation", () => {
  let env: IntegrationEnvironment;
  beforeAll(async () => {
    env = await startIntegrationTestEnvironment();
  });

  afterAll(async () => await env?.stop());

  it("Should activate home", async () => {
    const page = await newHomePageTab(env);
    await safeClickHandle(await getMenuHomeElementHandle(page));
    await getHomePageHandle(page);
    await page.close();
  });

  it("Should activate clients", async () => {
    const page = await newHomePageTab(env);
    await safeClickHandle(await getMenuClientElementHandle(page));
    await getClientListPageHandle(page);
    await page.close();
  });

  it("Should activate agents", async () => {
    const page = await newHomePageTab(env);
    await safeClickHandle(await getMenuAgentsElementHandle(page));
    await getAgentsListPageHandle(page);
    await page.close();
  });

  it("Should activate testbed agents", async () => {
    const page = await newHomePageTab(env);
    await safeClickHandle(await getMenuTestbedsElementHandle(page));
    await getTestbedAgentListPageHandle(page);
    await page.close();
  });

  it("Should activate servers", async () => {
    const page = await newHomePageTab(env);
    await safeClickHandle(await getMenuServersElementHandle(page));
    await getServerListPageHandle(page);
    await page.close();
  });

  it("Should activate users", async () => {
    const page = await newHomePageTab(env);
    await safeClickHandle(await getMenuUsersElementHandle(page));
    await getUserListPageHandle(page);
    await page.close();
  });

  it("Should activate projects", async () => {
    const page = await newHomePageTab(env);
    await safeClickHandle(await getMenuProjectsElementHandle(page));
    await getProjectListPageHandle(page);
    await page.close();
  });

  it("Should activate access tokens", async () => {
    const page = await newHomePageTab(env);
    await safeClickHandle(await getMenuJwtTokensElementHandle(page));
    await getJwtTokenListPageHandle(page);
    await page.close();
  });

  it("Should activate changelog", async () => {
    const page = await newHomePageTab(env);
    await safeClickHandle(await getMenuChangelogElementHandle(page));
    await getChangelogPageHandle(page);
    await page.close();
  });

  it("Should activate license", async () => {
    const page = await newHomePageTab(env);
    await safeClickHandle(await getMenuLicenseElementHandle(page));
    await getLicensePageHandle(page);
    await page.close();
  });
});
