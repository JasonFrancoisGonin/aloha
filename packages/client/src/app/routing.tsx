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
import JWTTokensListPage from "./jwt-tokens/jwt-tokens-list-page";
import MCPClientDetailsPage from "./mcp-clients/mcp-client-detail";
import MCPClientsListPage from "./mcp-clients/mcp-clients-list-page";
import MCPServerDetailPage from "./mcp-servers/mcp-server-detail-page";
import MCPServersListPage from "./mcp-servers/mcp-servers-list-page";
import ProjectsListPage from "./projects/projects-list-page";
import AgentsListPage from "./agents/agents-list-page";
import AgentDetailPage from "./agents/agent-detail";
import UsersListPage from "./users/users-list-page";

export const PATH_NOT_AUTHORISED = "/unauthorised";
export const PATH_NOT_FOUND = "/not-found";
export const PATH_NOT_ALLOWED = "/not-permitted";
export const PATH_LOGIN = "/api/login";
export const PATH_LOGOUT = "/api/logout";

export default function Routing() {
  return (
    <Routes>
      <Route index element={<HomePage />} />
      <Route path="/mcp-clients" element={<MCPClientsListPage />} />
      <Route path="/mcp-clients/:id" element={<MCPClientDetailsPage />} />
      <Route path="/agents" element={<AgentsListPage />} />
      <Route path="/agents/:id" element={<AgentDetailPage />} />
      <Route path="/mcp-servers" element={<MCPServersListPage />} />
      <Route path="/mcp-servers/:id" element={<MCPServerDetailPage />} />
      <Route path="/users" element={<UsersListPage />} />
      <Route path="/jwt-tokens" element={<JWTTokensListPage />} />
      <Route path="/projects" element={<ProjectsListPage />} />
      <Route path={PATH_NOT_FOUND} element={<Page404 />} />
      <Route path={PATH_NOT_AUTHORISED} element={<Page401 />} />
      <Route path={PATH_NOT_ALLOWED} element={<Page403 />} />
      <Route path="*" element={<Page404 />} />
    </Routes>
  );
}
