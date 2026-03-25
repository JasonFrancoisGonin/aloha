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
  getJwtTokenListPageHandle,
  getMenuJwtTokensElementHandle,
  getMenuProjectsElementHandle,
  getNewProjectButtonHandle,
  getNewTokenButtonHandle,
  getProjectListPageHandle,
  getRandomString,
} from "./utils/test-ui-utils";
import { Page } from "puppeteer";

const testProjectId = getRandomString();
const testProjectName = getRandomString();

async function createProject(page: Page) {
  await safeClickHandle(await getMenuProjectsElementHandle(page));
  await getProjectListPageHandle(page);
  await sleep(1000);

  await safeClickHandle(await getNewProjectButtonHandle(page));
  await page.waitForSelector("[role='dialog'] button[type='submit']", {
    timeout: 10000,
  });

  await page.type("input[name='projectId']", testProjectId);
  await page.type("input[name='name']", testProjectName);

  await safeClickHandle(
    await page.waitForSelector("[role='dialog'] button[type='submit']")
  );
  await page.waitForNetworkIdle();
  await sleep(1000);
}

async function activateTokenListPage(page: Page) {
  await safeClickHandle(await getMenuJwtTokensElementHandle(page));
  await getJwtTokenListPageHandle(page);
  await sleep(1000);
}

async function waitForTokenInTable(page: Page, projectName: string) {
  return await page.waitForFunction(
    (name) => {
      const cells = document.querySelectorAll("td");
      for (const cell of Array.from(cells)) {
        if (cell.textContent?.includes(name)) return cell;
      }
      return null;
    },
    { timeout: 10000 },
    projectName
  );
}

async function getDisableTokenButtonForRow(page: Page, projectName: string) {
  await waitForTokenInTable(page, projectName);
  await page.evaluate((name) => {
    const rows = document.querySelectorAll("tr");
    for (const row of Array.from(rows)) {
      if (row.textContent?.includes(name)) {
        const btn = row.querySelector(
          "[data-testid='disable-token-button-witness']"
        ) as HTMLElement;
        if (btn) btn.click();
        return;
      }
    }
  }, projectName);
}

describe("[AT] Access Token", () => {
  let env: IntegrationEnvironment;
  beforeAll(async () => {
    env = await startIntegrationTestEnvironment();
  });

  afterAll(async () => await env?.stop());

  it("should create a project as prerequisite", async () => {
    const page = await newHomePageTab(env);
    await createProject(page);
    await page.close();
  });

  it("should create a new access token", async () => {
    const page = await newHomePageTab(env);

    await activateTokenListPage(page);

    await safeClickHandle(await getNewTokenButtonHandle(page));

    // Wait for the Create Token button to become enabled (projects loaded)
    await page.waitForFunction(
      () => {
        const btn = document.querySelector(
          "[role='dialog'] button[type='submit']"
        ) as HTMLButtonElement;
        return btn && !btn.disabled;
      },
      { timeout: 10000 }
    );

    // Click the project select trigger
    await safeClickHandle(
      await page.waitForSelector("[role='dialog'] [data-slot='form-control']")
    );

    // Select the first project option from the dropdown
    await safeClickHandle(
      await page.waitForSelector(
        "[data-radix-select-viewport] div[role='option']:first-child",
        { timeout: 5000 }
      )
    );

    await safeClickHandle(
      await page.waitForSelector("[role='dialog'] button[type='submit']")
    );

    await page.waitForNetworkIdle();
    await sleep(1000);

    // Close the success dialog (Close button)
    await safeClickHandle(
      await page.waitForSelector("[role='dialog'] button", { timeout: 5000 })
    );
    await sleep(1000);

    await waitForTokenInTable(page, testProjectName);
    await page.close();
  });

  it("should disable a token via the confirmation dialog", async () => {
    const page = await newHomePageTab(env);

    await activateTokenListPage(page);

    await getDisableTokenButtonForRow(page, testProjectName);

    await sleep(1000);

    await safeClickHandle(
      await page.waitForSelector("[role='alertdialog'] button:last-child")
    );

    await page.waitForNetworkIdle();
    await sleep(1000);

    // Verify token row shows DISABLED
    const row = await page.waitForFunction(
      (name) => {
        const rows = document.querySelectorAll("tr");
        for (const row of Array.from(rows)) {
          if (
            row.textContent?.includes(name) &&
            row.textContent?.includes("DISABLED")
          )
            return row;
        }
        return null;
      },
      { timeout: 10000 },
      testProjectName
    );
    expect(row).to.exist;

    await page.close();
  });
});
