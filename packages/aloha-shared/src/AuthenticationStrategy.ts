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

import { RequestHandler } from "express";
import { z } from "zod";
import { Logger } from "./logger.js";
import { UserWithId } from "./schemas.js";

export enum Permissions {
  ClientsRead = "CLIENTS_READ",
  ClientsWrite = "CLIENTS_WRITE",
  ServersRead = "SERVERS_READ",
  ServersWrite = "SERVERS_WRITE",
  AgentsRead = "AGENTS_READ",
  AgentsWrite = "AGENTS_WRITE",
  ProxyApiAccess = "MCP_PROXY_ACCESS",
  UsersRead = "USERS_READ",
  UsersWrite = "USERS_WRITE",
  Administration = "ADMINISTRATION",
}

export const ANONYMOUS_USER = "anonymous";

export const UserPrincipalSchema = z.object({
  id: z.string(),
  userId: z.string(),
  displayName: z.string(),
  email: z.string().optional(),
  permissions: z.array(z.string()),
  provider: z.string(),
});
export type UserPrincipal = z.infer<typeof UserPrincipalSchema>;

type NewType = RequestHandler;

export type AuthenticationStrategyOptions = {
  loggerFactory: () => Logger;
};

export const AuthenticationStrategyInfoSchema = z.object({
  provider: z.string(),
});
export type AuthenticationStrategyInfo = z.infer<
  typeof AuthenticationStrategyInfoSchema
>;

export interface AuthenticationStrategy {
  init(options: AuthenticationStrategyOptions): Promise<void>;
  getAuthenticationMiddleware(
    getUserDetail: (username: string) => Promise<UserWithId | null>
  ): Promise<NewType | RequestHandler[]>;
  checkPermissions(
    user: UserPrincipal,
    requiredPermissions: string[]
  ): Promise<boolean>;
  login(): Promise<RequestHandler | RequestHandler[]>;
  logout(): Promise<RequestHandler | RequestHandler[]>;
  getInfo(): Promise<AuthenticationStrategyInfo>;
}
