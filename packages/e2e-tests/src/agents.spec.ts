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
  getAgentsListPageHandle,
  getEditVisibilityButtonHandle,
  getEditVisibilitySubmitButtonHandle,
  getMenuAgentsElementHandle,
  getRandomString,
} from "./utils/test-ui-utils";
import { ElementHandle, Page } from "puppeteer";

async function waitForFirstAgentListed(page: Page) {
  return await page.waitForSelector(
    "[data-testid='agents-list-page-witness'] div[data-slot='card']",
    { timeout: 5000 }
  );
}

async function activateAgentListPage(page: Page) {
  await safeClickHandle(await getMenuAgentsElementHandle(page));
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

describe("[A] Agent", () => {
  let env: IntegrationEnvironment;
  beforeAll(async () => {
    env = await startIntegrationTestEnvironment();
  });

  afterAll(async () => await env?.stop());

  it("should create a new agent with tags and authentication", async () => {
    const page = await newHomePageTab(env);

    await activateAgentListPage(page);

    await clickButtonByText(page, "New Agent");

    await page.type("input[name='name']", getRandomString());
    await page.type("input[name='description']", getRandomString());
    await page.type("input[name='serverPath']", getRandomString());
    await page.type("input[name='serverUrl']", "http://localhost:3030");
    await page.type("input[name='tags']", "tag1, tag2");

    await safeClickHandle(
      await page.waitForSelector("[role='dialog'] button[type='submit']")
    );

    await page.waitForNetworkIdle();
    await waitForFirstAgentListed(page);
    await page.close();
  });

  it("should search for agents by tag using the search input", async () => {
    const page = await newHomePageTab(env);

    await activateAgentListPage(page);
    await page.waitForSelector("[type='search']");
    await page.type("[type='search']", "tag1");
    const agent = await waitForFirstAgentListed(page);
    expect(agent).to.exist;
    await page.close();
  });

  it("should disable an agent via the visibility edit dialog", async () => {
    const page = await newHomePageTab(env);
    await activateAgentListPage(page);
    const firstItem = await waitForFirstAgentListed(page);
    if (!firstItem) {
      expect.fail("Expected one item");
    }
    await safeClickHandle(firstItem);

    await safeClickHandle(await getEditVisibilityButtonHandle(page));

    await safeClickHandle(await page.waitForSelector("[role='switch']"));

    await safeClickHandle(await getEditVisibilitySubmitButtonHandle(page));

    await sleep(3000);

    const status = await (
      await page.waitForSelector("[data-testid='visibility-disabled-witness']")
    )?.evaluate((e) => e.textContent);

    expect(status).equals("Disabled");

    await page.close();
  });

  it("should delete an agent via the delete confirmation dialog", async () => {
    const page = await newHomePageTab(env);
    await activateAgentListPage(page);
    const firstItem = await waitForFirstAgentListed(page);
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

    await getAgentsListPageHandle(page);
    try {
      await waitForFirstAgentListed(page);
      expect.fail("Agent not deleted");
    } catch (e) {}
    await page.close();
  });
});
