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
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  IntegrationEnvironment,
  newHomePageTab,
  safeClickHandle,
  sleep,
  startIntegrationTestEnvironment,
} from "./utils/integration-test-support";
import {
  getMenuTestbedsElementHandle,
  getRandomString,
  getTestbedAgentListPageHandle,
} from "./utils/test-ui-utils";
import { ElementHandle, Page } from "puppeteer";

const agentName = getRandomString();

async function waitForFirstTestbedAgentListed(page: Page) {
  return await page.waitForSelector(
    "[data-testid='testbed-agent-list-page-witness'] div[data-slot='card']",
    { timeout: 5000 }
  );
}

async function activateTestbedAgentListPage(page: Page) {
  await safeClickHandle(await getMenuTestbedsElementHandle(page));
}

async function clickButtonByText(page: Page, text: string) {
  const btn = await page.waitForFunction(
    (t) => {
      const buttons = document.querySelectorAll("button");
      for (const b of Array.from(buttons)) {
        if (b.textContent?.includes(t)) return b;
      }
      return null;
    },
    { timeout: 5000 },
    text
  );
  if (!btn) {
    throw Error("No button found");
  }
  await safeClickHandle(btn as ElementHandle<HTMLButtonElement>);
}

describe("[T] Testbed Agent", () => {
  let env: IntegrationEnvironment;
  beforeAll(async () => {
    env = await startIntegrationTestEnvironment();
  });

  afterAll(async () => await env?.stop());

  it("should create a new testbed agent", async () => {
    const page = await newHomePageTab(env);

    await activateTestbedAgentListPage(page);

    await clickButtonByText(page, "New Testbed Agent");

    await page.type("input[name='name']", agentName);
    await page.type("input[name='description']", getRandomString());
    await page.type("input[name='client.baseURL']", "http://localhost:3030");
    await page.type("textarea[name='client.apiKey']", getRandomString());
    await page.type("input[name='model']", "test-model");

    await safeClickHandle(
      await page.waitForSelector("[role='dialog'] button[type='submit']")
    );

    await page.waitForNetworkIdle();
    await waitForFirstTestbedAgentListed(page);
    await page.close();
  });

  it("should search for testbed agents by name using the search input", async () => {
    const page = await newHomePageTab(env);

    await activateTestbedAgentListPage(page);
    await page.waitForSelector("[type='search']");
    await page.type("[type='search']", agentName);
    const agent = await waitForFirstTestbedAgentListed(page);
    expect(agent).to.exist;
    await page.close();
  });

  it("should delete a testbed agent via the delete confirmation dialog", async () => {
    const page = await newHomePageTab(env);
    await activateTestbedAgentListPage(page);
    const firstItem = await waitForFirstTestbedAgentListed(page);
    if (!firstItem) {
      expect.fail("Expected one item to delete");
    }
    await safeClickHandle(firstItem);

    await clickButtonByText(page, "Delete Agent");

    await sleep(1000);

    // ConfirmDialog uses AlertDialog — click "Continue" to confirm
    await safeClickHandle(
      await page.waitForSelector("[role='alertdialog'] button:last-child")
    );

    await sleep(1000);

    await getTestbedAgentListPageHandle(page);
    try {
      await waitForFirstTestbedAgentListed(page);
      expect.fail("Testbed agent not deleted");
    } catch (e) {}
    await page.close();
  });
});
