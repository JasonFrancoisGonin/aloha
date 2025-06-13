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

import { schemas } from "aloha-shared";
import { customFetch } from "./utils";

import { getProjectsList } from "./projects";
import { getUsersList } from "./users";

const tokensUrl = "/api/token";

export interface JWTTokenExpanded extends schemas.JWTTokenWithId {
  projectName: string;
  creatorName: string;
}

export async function getTokensList(): Promise<JWTTokenExpanded[]> {
  const response = await customFetch("getTokensList", tokensUrl);
  const tokens: JWTTokenExpanded[] = await response.json();
  const projects = await getProjectsList();

  for (const token of tokens) {
    const project = projects.find((p) => p.id === token.projectId);
    token.expirationDate = new Date(token.expirationDate);
    token.projectName = project ? project.name : "Unknown Project";
  }
  try {
    const users = await getUsersList();

    for (const token of tokens) {
      const user = users.find((u) => u.id === token.userId);
      token.creatorName = user ? user.fullName : "Unknown User";
    }
  } catch (e) {
    console.log(e);
    for (const token of tokens) {
      token.creatorName = "-";
    }
  }
  return tokens;
}

export async function createToken(
  project: string,
  expirationDate: string
): Promise<string> {
  const response = await customFetch("createToken", tokensUrl, {
    method: "POST",
    body: JSON.stringify({
      project,
      expirationDate,
    }),
    headers: { "Content-Type": "application/json" },
  });
  const res = await response.json();
  const token = res.token;
  if (!token) {
    throw new Error(`No token returned`);
  }
  return token;
}

export async function disableToken(tokenId: string) {
  await customFetch("disableToken", `${tokensUrl}/${tokenId}/_disable`, {
    method: "POST",
  });
}
