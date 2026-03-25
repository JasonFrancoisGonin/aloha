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
  getMenuProjectsElementHandle,
  getNewProjectButtonHandle,
  getProjectListPageHandle,
  getRandomString,
} from "./utils/test-ui-utils";
import { Page } from "puppeteer";

const testProjectId = getRandomString();

async function waitForProjectInTable(page: Page, searchProjectId: string) {
  return await page.waitForFunction(
    (pid) => {
      const cells = document.querySelectorAll("td");
      for (const cell of Array.from(cells)) {
        if (cell.textContent?.includes(pid)) return cell;
      }
      return null;
    },
    { timeout: 10000 },
    searchProjectId
  );
}

async function activateProjectListPage(page: Page) {
  await safeClickHandle(await getMenuProjectsElementHandle(page));
  await getProjectListPageHandle(page);
  await sleep(1000);
}

async function getEditProjectButtonForRow(page: Page, searchProjectId: string) {
  await waitForProjectInTable(page, searchProjectId);
  await page.evaluate((pid) => {
    const rows = document.querySelectorAll("tr");
    for (const row of Array.from(rows)) {
      if (row.textContent?.includes(pid)) {
        const btn = row.querySelector(
          "[data-testid='edit-project-button-witness']"
        ) as HTMLElement;
        if (btn) btn.click();
        return;
      }
    }
  }, searchProjectId);
}

async function getDeleteProjectButtonForRow(
  page: Page,
  searchProjectId: string
) {
  await waitForProjectInTable(page, searchProjectId);
  await page.evaluate((pid) => {
    const rows = document.querySelectorAll("tr");
    for (const row of Array.from(rows)) {
      if (row.textContent?.includes(pid)) {
        const btn = row.querySelector(
          "[data-testid='delete-project-button-witness']"
        ) as HTMLElement;
        if (btn) btn.click();
        return;
      }
    }
  }, searchProjectId);
}

async function waitForProjectFormLoaded(page: Page) {
  await page.waitForSelector("[role='dialog'] button[type='submit']", {
    timeout: 10000,
  });
}

async function clickSaveButton(page: Page) {
  await safeClickHandle(
    await page.waitForSelector("[role='dialog'] button[type='submit']")
  );
}

describe("[P] Project", () => {
  let env: IntegrationEnvironment;
  beforeAll(async () => {
    env = await startIntegrationTestEnvironment();
  });

  afterAll(async () => await env?.stop());

  it("should create a new project", async () => {
    const page = await newHomePageTab(env);

    await activateProjectListPage(page);

    await safeClickHandle(await getNewProjectButtonHandle(page));

    await waitForProjectFormLoaded(page);

    await page.type("input[name='projectId']", testProjectId);
    await page.type("input[name='name']", getRandomString());

    await clickSaveButton(page);

    await page.waitForNetworkIdle();
    await sleep(1000);
    await waitForProjectInTable(page, testProjectId);
    await page.close();
  });

  it("should edit a project name", async () => {
    const page = await newHomePageTab(env);

    await activateProjectListPage(page);

    await getEditProjectButtonForRow(page, testProjectId);
    await waitForProjectFormLoaded(page);

    const nameInput = await page.waitForSelector(
      "[role='dialog'] input[name='name']:not(:disabled)"
    );
    await nameInput?.click({ clickCount: 3 });
    await page.type("[role='dialog'] input[name='name']", "Updated Name");

    await clickSaveButton(page);

    await page.waitForNetworkIdle();
    await sleep(1000);

    const row = await page.waitForFunction(
      (pid) => {
        const rows = document.querySelectorAll("tr");
        for (const row of Array.from(rows)) {
          if (
            row.textContent?.includes(pid) &&
            row.textContent?.includes("Updated Name")
          )
            return row;
        }
        return null;
      },
      { timeout: 10000 },
      testProjectId
    );
    expect(row).to.exist;

    await page.close();
  });

  it("should delete a project via the delete confirmation dialog", async () => {
    const page = await newHomePageTab(env);

    await activateProjectListPage(page);

    await getDeleteProjectButtonForRow(page, testProjectId);

    await sleep(1000);

    await safeClickHandle(
      await page.waitForSelector("[role='alertdialog'] button:last-child")
    );

    await page.waitForNetworkIdle();
    await sleep(1000);

    try {
      await waitForProjectInTable(page, testProjectId);
      expect.fail("Project not deleted");
    } catch (e) {}
    await page.close();
  });
});
