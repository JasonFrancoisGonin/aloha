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
import { randomBytes } from "crypto";
import getPort from "get-port";

export function randomString(length: number = 10) {
  if (length % 2 !== 0) {
    length++;
  }

  return randomBytes(length / 2).toString("hex");
}

export function randomId() {
  return randomString(24);
}

export function randomProject() {
  return {
    description: randomString(),
    name: randomString(),
    projectId: randomString(),
    tags: [randomString(), randomString()],
  } as schemas.Project;
}

export function randomUser() {
  return {
    fullName: randomString(),
    userId: randomString(),
    permissions: [],
  } as schemas.User;
}

export function randomAgent() {
  return {
    creator: randomString(),
    name: randomString(),
    serverPath: randomString(),
    serverProtocol: "http",
    serverUrl: randomString(),
    type: "agent",
    visibility: schemas.Visibility.Private,
  } as schemas.Agent;
}

export function withoutId<T extends schemas.WithIdBase>(obj: T | null) {
  if (!obj) {
    return null;
  }

  const newObj: Omit<T, "id"> = { ...obj };
  delete newObj["id"];
  return newObj;
}

export async function randomConnectionsOptions(
  serverProtocol: schemas.MCPConnectionOptions["serverProtocol"]
) {
  if (serverProtocol === "websocket") {
    throw Error(`Websocket is not supported`);
  }

  const port = await getPort();
  const serverUrl = `http://127.0.0.1:${port}`;
  return {
    creator: randomString(),
    name: randomString(),
    serverProtocol,
    serverUrl,
    type: "client",
    visibility: schemas.Visibility.Private,
    description: randomString(),
    port,
  } as schemas.MCPConnectionOptions & { port: number };
}

export function randomServerOptions(clientIds: string[] = []) {
  return {
    creator: randomString(),
    name: randomString(),
    serverPath: randomString(),
    type: "server",
    visibility: schemas.Visibility.Private,
    connections: clientIds,
    description: randomString(),
  } as schemas.MCPServerOptions;
}
