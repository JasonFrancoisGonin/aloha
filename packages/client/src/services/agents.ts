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

const apiAgentUrl = "/api/agent";

export async function getAgentsListByConnectionId(connectionId: string) {
  const response = await customFetch(
    "Get agents list by connectionId",
    `${apiAgentUrl}/by_connection_id/${connectionId}`
  );
  const data: schemas.AgentWithId[] = await response.json();
  return data.map((agent) =>
    safeParseWithErrors(agent, schemas.AgentWithIdSchema)
  );
}
// Get all agents
export async function getAgentsList() {
  const response = await customFetch("Get agent list", apiAgentUrl);
  const data: entrypoint_schemas.AgentListDetail = await response.json();
  return safeParseWithErrors(data, entrypoint_schemas.AgentListDetailSchema);
}

// Get agent details by ID
export async function getAgentDetail(id: string) {
  const response = await customFetch(
    "Get agent detail",
    `${apiAgentUrl}/${id}`
  );
  const data: entrypoint_schemas.AgentDetail = await response.json();
  return safeParseWithErrors(data, entrypoint_schemas.AgentDetailSchema);
}

// Create a new agent
export async function createAgent(agentData: entrypoint_schemas.AgentCreate) {
  await customFetch("Create agent", apiAgentUrl, {
    method: "POST",
    body: JSON.stringify(agentData),
    headers: { "Content-Type": "application/json" },
  });
}

// Update agent by ID
export async function updateAgent(
  id: string,
  agentData: entrypoint_schemas.AgentCreate
) {
  await customFetch("Update agent", `${apiAgentUrl}/${id}`, {
    method: "POST",
    body: JSON.stringify(agentData),
    headers: { "Content-Type": "application/json" },
  });
}

// Delete agent by ID
export async function deleteAgent(id: string) {
  await customFetch("Delete agent", `${apiAgentUrl}/${id}/_delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
}

// Connect client to agent
export async function connectClientToAgent(agentId: string, clientId: string) {
  await customFetch(
    "Connect client to agent",
    `${apiAgentUrl}/${agentId}/_connect/${clientId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );
}

// Disconnect client from agent
export async function disconnectClientFromAgent(
  agentId: string,
  clientId: string
) {
  await customFetch(
    "Disconnect client to agent",
    `${apiAgentUrl}/${agentId}/_disconnect/${clientId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );
}

// Get the JWT token that should be used by the agent to connect to its mcp agent in ALOHA
export async function getAgentToken(agentId: string) {
  const response = await customFetch(
    "Get the token of an agent",
    `${apiAgentUrl}/${agentId}/_token`
  );
  const result: entrypoint_schemas.JWTTokenResponse = await response.json();
  return safeParseWithErrors(result, entrypoint_schemas.JWTTokenResponseSchema);
}

export const setAgentCreator = setCreatorGenerator(apiAgentUrl);
export const setAgentVisibility = setVisibilityGenerator(apiAgentUrl);
