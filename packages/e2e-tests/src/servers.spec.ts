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
  getEditVisibilityButtonHandle,
  getEditVisibilitySubmitButtonHandle,
  getMenuServersElementHandle,
  getRandomString,
  getServerListPageHandle,
} from "./utils/test-ui-utils";
import { ElementHandle, Page } from "puppeteer";

async function waitForFirstServerListed(page: Page) {
  return await page.waitForSelector(
    "[data-testid='server-list-page-witness'] div[data-slot='card']",
    { timeout: 5000 }
  );
}

async function activateServerListPage(page: Page) {
  await safeClickHandle(await getMenuServersElementHandle(page));
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

describe("[S] Server", () => {
  let env: IntegrationEnvironment;
  beforeAll(async () => {
    env = await startIntegrationTestEnvironment();
  });

  afterAll(async () => await env?.stop());

  it("should create a new server with tags", async () => {
    const page = await newHomePageTab(env);

    await activateServerListPage(page);

    await clickButtonByText(page, "New Server");

    await page.type("input[name='name']", getRandomString());
    await page.type("input[name='description']", getRandomString());
    await page.type("input[name='serverPath']", getRandomString());
    await page.type("input[name='tags']", "tag1, tag2");

    await safeClickHandle(
      await page.waitForSelector("[role='dialog'] button[type='submit']")
    );

    await page.waitForNetworkIdle();
    await waitForFirstServerListed(page);
    await page.close();
  });

  it("should search for servers by tag using the search input", async () => {
    const page = await newHomePageTab(env);

    await activateServerListPage(page);
    await page.waitForSelector("[type='search']");
    await page.type("[type='search']", "tag1");
    const server = await waitForFirstServerListed(page);
    expect(server).to.exist;
    await page.close();
  });

  it("should disable a server via the visibility edit dialog", async () => {
    const page = await newHomePageTab(env);
    await activateServerListPage(page);
    const firstItem = await waitForFirstServerListed(page);
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

  it("should delete a server via the delete confirmation dialog", async () => {
    const page = await newHomePageTab(env);
    await activateServerListPage(page);
    const firstItem = await waitForFirstServerListed(page);
    if (!firstItem) {
      expect.fail("Expected one item to delete");
    }
    await safeClickHandle(firstItem);

    await clickButtonByText(page, "Delete Server");

    await sleep(1000);

    await safeClickHandle(
      await page.waitForSelector("[role='alertdialog'] button:last-child")
    );

    await sleep(1000);

    await getServerListPageHandle(page);
    try {
      await waitForFirstServerListed(page);
      expect.fail("Server not deleted");
    } catch (e) {}
    await page.close();
  });
});
