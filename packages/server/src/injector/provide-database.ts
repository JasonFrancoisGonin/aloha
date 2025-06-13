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

import { Injector, INJECTOR_TOKEN } from "typed-inject";
import { AgentRepository } from "../database/repositories/interfaces/agent-repository-interface";
import { ConnectionOptionsRepository } from "../database/repositories/interfaces/connection-options-repository";
import { JWTTokenRepository } from "../database/repositories/interfaces/jwt-token-repository-interface";
import { ProjectRepository } from "../database/repositories/interfaces/project-repository-interface";
import { MCPServerOptionsRepository } from "../database/repositories/interfaces/server-options-repository-interface";
import { UsersRepository } from "../database/repositories/interfaces/user-repository-interface";
import { MongoDbAgentRepository } from "../database/repositories/mongodb/mongo-db-agent-repository";
import { DatabaseProvider } from "../database/repositories/mongodb/mongo-db-generic-repository";
import { MongoDbJWTTokenRepository } from "../database/repositories/mongodb/mongo-db-jwt-token-repository";
import { MongoDbProjectRepository } from "../database/repositories/mongodb/mongo-db-project-repository";
import { MongoDBMCPServerOptionsRepository } from "../database/repositories/mongodb/mongo-db-server-options-repository";
import { MongoDBUserRepository } from "../database/repositories/mongodb/mongo-db-user-repository";
import { getDatabase } from "../database/repositories/mongodb/mongodb";
import { MongoDBConnectionOptionsRepository } from "../database/repositories/mongodb/monogo-db-connection-options-repository";

function connectionOptionsRepositoryFactory(
  serverSecret: string,
  injector: Injector<DatabaseProvider>
) {
  return new MongoDBConnectionOptionsRepository(
    serverSecret,
    injector
  ) as ConnectionOptionsRepository;
}
connectionOptionsRepositoryFactory.inject = [
  "serverSecret",
  INJECTOR_TOKEN,
] as const;

function factoryWithSecret<R, T extends R>(clazz: {
  new (s: string, i: Injector<DatabaseProvider & { serverSecret: string }>): T;
}) {
  const c = (
    serverSecret: string,
    injector: Injector<DatabaseProvider & { serverSecret: string }>
  ) => {
    return new clazz(serverSecret, injector) as R;
  };
  c.inject = ["serverSecret", INJECTOR_TOKEN] as const;
  return c;
}

function factory<R, T extends R>(clazz: {
  new (i: Injector<DatabaseProvider>): T;
}) {
  const c = (injector: Injector<DatabaseProvider>) => {
    return new clazz(injector) as R;
  };
  c.inject = [INJECTOR_TOKEN] as const;
  return c;
}

export function provideDatabase<T extends { serverSecret: string }>(
  injector: Injector<T>
) {
  return injector
    .provideValue("getDatabase", () => getDatabase())
    .provideFactory(
      "userRepository",
      factory<UsersRepository, MongoDBUserRepository>(MongoDBUserRepository)
    )
    .provideFactory(
      "connectionOptionsRepository",
      factoryWithSecret<
        ConnectionOptionsRepository,
        MongoDBConnectionOptionsRepository
      >(MongoDBConnectionOptionsRepository)
    )
    .provideFactory(
      "serverOptionsRepository",
      factory<MCPServerOptionsRepository, MongoDBMCPServerOptionsRepository>(
        MongoDBMCPServerOptionsRepository
      )
    )
    .provideFactory(
      "projectRepository",
      factory<ProjectRepository, MongoDbProjectRepository>(
        MongoDbProjectRepository
      )
    )
    .provideFactory(
      "tokenRepository",
      factory<JWTTokenRepository, MongoDbJWTTokenRepository>(
        MongoDbJWTTokenRepository
      )
    )
    .provideFactory(
      "agentRepository",
      factoryWithSecret<AgentRepository, MongoDbAgentRepository>(
        MongoDbAgentRepository
      )
    );
}
