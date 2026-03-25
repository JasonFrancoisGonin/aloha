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

import { Route, Routes } from "react-router";
import Page401 from "./errors/401";
import Page403 from "./errors/403";
import Page404 from "./errors/404";
import HomePage from "./home/home-page";
import JWTTokensListPage from "./jwt-tokens/jwt-token-list-page";
import MCPClientDetailsPage from "./clients/client-detail";
import MCPClientsListPage from "./clients/client-list-page";
import MCPServerDetailPage from "./servers/server-detail-page";
import MCPServersListPage from "./servers/server-list-page";
import ProjectsListPage from "./projects/project-list-page";
import AgentsListPage from "./agents/agent-list-page";
import AgentDetailPage from "./agents/agent-detail";
import UsersListPage from "./users/user-list-page";
import TestbedAgentsListPage from "./testbed-agents/testbed-agent-list-page";
import TestbedAgentDetailPage from "./testbed-agents/testbed-agent-detail";
import ChangelogPage from "./changelog/changelog-page";
import LicensePage from "./license/license-page";

export const PATH_NOT_AUTHORISED = "/unauthorised";
export const PATH_NOT_FOUND = "/not-found";
export const PATH_NOT_ALLOWED = "/not-permitted";
export const PATH_LOGIN = "/api/login";
export const PATH_LOGOUT = "/api/logout";

export default function Routing() {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="/clients" element={<MCPClientsListPage />} />
      <Route path="/clients/:id" element={<MCPClientDetailsPage />} />
      <Route path="/agents" element={<AgentsListPage />} />
      <Route path="/agents/:id" element={<AgentDetailPage />} />
      <Route path="/testbed-agents" element={<TestbedAgentsListPage />} />
      <Route path="/testbed-agents/:id" element={<TestbedAgentDetailPage />} />
      <Route path="/servers" element={<MCPServersListPage />} />
      <Route path="/servers/:id" element={<MCPServerDetailPage />} />
      <Route path="/users" element={<UsersListPage />} />
      <Route path="/jwt-tokens" element={<JWTTokensListPage />} />
      <Route path="/projects" element={<ProjectsListPage />} />
      <Route path="/changelog" element={<ChangelogPage />} />
      <Route path="/license" element={<LicensePage />} />
      <Route path={PATH_NOT_FOUND} element={<Page404 />} />
      <Route path={PATH_NOT_AUTHORISED} element={<Page401 />} />
      <Route path={PATH_NOT_ALLOWED} element={<Page403 />} />
      <Route path="*" element={<Page404 />} />
    </Routes>
  );
}
