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
  getMenuUsersElementHandle,
  getNewUserButtonHandle,
  getRandomString,
  getUserListPageHandle,
} from "./utils/test-ui-utils";
import { Page } from "puppeteer";

const testUserId = getRandomString();

async function waitForUserInTable(page: Page, searchUserId: string) {
  return await page.waitForFunction(
    (uid) => {
      const cells = document.querySelectorAll("td");
      for (const cell of Array.from(cells)) {
        if (cell.textContent?.includes(uid)) return cell;
      }
      return null;
    },
    { timeout: 10000 },
    searchUserId
  );
}

async function activateUserListPage(page: Page) {
  await safeClickHandle(await getMenuUsersElementHandle(page));
  await getUserListPageHandle(page);
  await page.waitForSelector("[data-testid='user-id-witness']", {
    timeout: 10000,
  });
  await sleep(1000);
}

async function getEditUserButtonForRow(page: Page, searchUserId: string) {
  // First find the row containing the user
  await waitForUserInTable(page, searchUserId);
  // Click the edit button in that row using $eval
  await page.evaluate((uid) => {
    const rows = document.querySelectorAll("tr");
    for (const row of Array.from(rows)) {
      if (row.textContent?.includes(uid)) {
        const btn = row.querySelector(
          "[data-testid='edit-user-button-witness']"
        ) as HTMLElement;
        if (btn) btn.click();
        return;
      }
    }
  }, searchUserId);
}

async function getDeleteUserButtonForRow(page: Page, searchUserId: string) {
  await waitForUserInTable(page, searchUserId);
  await page.evaluate((uid) => {
    const rows = document.querySelectorAll("tr");
    for (const row of Array.from(rows)) {
      if (row.textContent?.includes(uid)) {
        const btn = row.querySelector(
          "[data-testid='delete-user-button-witness']"
        ) as HTMLElement;
        if (btn) btn.click();
        return;
      }
    }
  }, searchUserId);
}

async function waitForUserFormLoaded(page: Page) {
  await page.waitForSelector("[role='dialog'] button[type='submit']", {
    timeout: 10000,
  });
}

async function clickSaveButton(page: Page) {
  await safeClickHandle(
    await page.waitForSelector("[role='dialog'] button[type='submit']")
  );
}

describe("[U] User", () => {
  let env: IntegrationEnvironment;
  beforeAll(async () => {
    env = await startIntegrationTestEnvironment();
  });

  afterAll(async () => await env?.stop());

  it("should create a new user", async () => {
    const page = await newHomePageTab(env);

    await activateUserListPage(page);

    await safeClickHandle(await getNewUserButtonHandle(page));

    await waitForUserFormLoaded(page);

    await page.type("input[name='userId']", testUserId);
    await page.type("input[name='fullName']", getRandomString());

    await clickSaveButton(page);

    await page.waitForNetworkIdle();
    await sleep(1000);
    await waitForUserInTable(page, testUserId);
    await page.close();
  });

  it("should disable a user via the edit form", async () => {
    const page = await newHomePageTab(env);

    await activateUserListPage(page);

    await getEditUserButtonForRow(page, testUserId);
    await waitForUserFormLoaded(page);

    // Toggle the "Enabled" switch to disable
    await safeClickHandle(
      await page.waitForSelector("[role='dialog'] [role='switch']")
    );

    await clickSaveButton(page);

    await page.waitForNetworkIdle();
    await sleep(1000);

    // Verify "disabled" text appears in the user's row
    const row = await page.waitForFunction(
      (uid) => {
        const rows = document.querySelectorAll("tr");
        for (const row of Array.from(rows)) {
          if (
            row.textContent?.includes(uid) &&
            row.textContent?.includes("disabled")
          )
            return row;
        }
        return null;
      },
      { timeout: 10000 },
      testUserId
    );
    expect(row).to.exist;

    await page.close();
  });

  it("should delete a user via the delete confirmation dialog", async () => {
    const page = await newHomePageTab(env);

    await activateUserListPage(page);

    await getDeleteUserButtonForRow(page, testUserId);

    await sleep(1000);

    await safeClickHandle(
      await page.waitForSelector("[role='alertdialog'] button:last-child")
    );

    await page.waitForNetworkIdle();
    await sleep(1000);

    // Verify user is no longer in table
    try {
      await waitForUserInTable(page, testUserId);
      expect.fail("User not deleted");
    } catch (e) {}
    await page.close();
  });
});
