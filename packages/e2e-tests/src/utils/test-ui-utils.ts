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
import { Page } from "puppeteer";

export function getRandomString(len: number = 10): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export async function getLogoutElementHandle(page: Page) {
  const handle = await page.waitForSelector("[data-testid='logout-witness']");
  return handle;
}

export async function getLoggedInElementHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='logged-in-witness']"
  );
  return handle;
}

export async function getLoginElementHandle(page: Page) {
  const handle = await page.waitForSelector("[data-testid='login-witness']");
  return handle;
}

export async function getMenuAgentsElementHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='nav-agents-button-witness']"
  );
  return handle;
}

export async function getMenuClientElementHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='nav-clients-button-witness']"
  );
  return handle;
}

export async function getAgentsListPageHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='agents-list-page-witness']"
  );
  return handle;
}

export async function getClientListPageHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='client-list-page-witness']"
  );
  return handle;
}

export async function getMenuHomeElementHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='nav-home-button-witness']"
  );
  return handle;
}

export async function getMenuTestbedsElementHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='nav-testbeds-button-witness']"
  );
  return handle;
}

export async function getMenuServersElementHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='nav-servers-button-witness']"
  );
  return handle;
}

export async function getMenuUsersElementHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='nav-users-button-witness']"
  );
  return handle;
}

export async function getMenuProjectsElementHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='nav-projects-button-witness']"
  );
  return handle;
}

export async function getMenuJwtTokensElementHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='nav-jwt-tokens-button-witness']"
  );
  return handle;
}

export async function getMenuChangelogElementHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='nav-changelog-button-witness']"
  );
  return handle;
}

export async function getMenuLicenseElementHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='nav-license-button-witness']"
  );
  return handle;
}

export async function getHomePageHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='home-page-witness']"
  );
  return handle;
}

export async function getTestbedAgentListPageHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='testbed-agent-list-page-witness']"
  );
  return handle;
}

export async function getServerListPageHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='server-list-page-witness']"
  );
  return handle;
}

export async function getUserListPageHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='user-list-page-witness']"
  );
  return handle;
}

export async function getProjectListPageHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='project-list-page-witness']"
  );
  return handle;
}

export async function getNewProjectButtonHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='new-project-button-witness']"
  );
  return handle;
}

export async function getNewUserButtonHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='new-user-button-witness']"
  );
  return handle;
}

export async function getJwtTokenListPageHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='jwt-token-list-page-witness']"
  );
  return handle;
}

export async function getChangelogPageHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='changelog-page-witness']"
  );
  return handle;
}

export async function getLicensePageHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='license-page-witness']"
  );
  return handle;
}

export async function getDeleteClientButtonHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='client-delete-button-witness']"
  );
  return handle;
}

export async function getEditVisibilitySubmitButtonHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='visibility-edit-submit-button-witness']"
  );
  return handle;
}
export async function getEditVisibilityButtonHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='visibility-edit-button-witness']"
  );
  return handle;
}

export async function getDeleteClientConfirmButtonHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='client-delete-confirm-button-witness']"
  );
  return handle;
}

export async function getNewClientButtonHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='new-client-button-witness']"
  );
  return handle;
}

export async function getEditClientSaveButtonHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='client-submit-button-witness']"
  );
  return handle;
}

export async function getNewTokenButtonHandle(page: Page) {
  const handle = await page.waitForSelector(
    "[data-testid='new-token-button-witness']"
  );
  return handle;
}
