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

import { entrypoint_schemas, schemas } from "aloha-shared";
import {
  customFetch,
  safeParseWithErrors,
  setCreatorGenerator,
  setVisibilityGenerator,
} from "./utils";

const apiServersUrl = "/api/server";

export async function getServersListByConnectionId(connectionId: string) {
  const response = await customFetch(
    "Get server list by connectionId",
    `${apiServersUrl}/by_connection_id/${connectionId}`
  );
  const data: entrypoint_schemas.MCPServerOptionsList = await response.json();
  return data.map((server) =>
    safeParseWithErrors(server, schemas.MCPServerOptionsWithIdSchema)
  );
}
// Get all servers
export async function getServersList() {
  const response = await customFetch("Get server list", apiServersUrl);
  const data: entrypoint_schemas.MCPServerOptionsList = await response.json();
  return data.map((server) =>
    safeParseWithErrors(server, schemas.MCPServerOptionsWithIdSchema)
  );
}

// Get server details by ID
export async function getServerDetail(id: string) {
  const response = await customFetch(
    "Get server detail",
    `${apiServersUrl}/${id}`
  );
  const data = await response.json();
  return safeParseWithErrors(
    data,
    entrypoint_schemas.MCPServerOptionsDetailSchema
  );
}

// Create a new server
export async function createServer(
  serverOptions: entrypoint_schemas.MCPServerOptionsCreate
) {
  await customFetch("Create server", apiServersUrl, {
    method: "POST",
    body: JSON.stringify(serverOptions),
    headers: { "Content-Type": "application/json" },
  });
}

// Update server by ID
export async function updateServer(
  id: string,
  serverOptions: entrypoint_schemas.MCPServerOptionsCreate
) {
  await customFetch("Update server", `${apiServersUrl}/${id}`, {
    method: "POST",
    body: JSON.stringify(serverOptions),
    headers: { "Content-Type": "application/json" },
  });
}

// Delete server by ID
export async function deleteServer(id: string) {
  await customFetch("Delete server", `${apiServersUrl}/${id}/_delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

// Connect client to server
export async function connectClientToServer(
  serverId: string,
  clientId: string
) {
  await customFetch(
    "Connect client to server",
    `${apiServersUrl}/${serverId}/_connect/${clientId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );
}

// Disconnect client from server
export async function disconnectClientFromServer(
  serverId: string,
  clientId: string
) {
  await customFetch(
    "Disconnect client to server",
    `${apiServersUrl}/${serverId}/_disconnect/${clientId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );
}

export const setServerCreator = setCreatorGenerator(apiServersUrl);
export const setServerVisibility = setVisibilityGenerator(apiServersUrl);
