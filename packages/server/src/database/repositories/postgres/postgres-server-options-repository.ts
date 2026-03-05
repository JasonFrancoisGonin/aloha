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

import { schemas } from "aloha-shared";
import { Injector, INJECTOR_TOKEN } from "typed-inject";
import { MCPServerOptionsRepository } from "../interfaces/server-options-repository-interface.js";
import { DatabaseProvider } from "./postgres-generic-repository.js";
import { JunctionHelper } from "./junction-helper.js";
import { PostgreSQLVisibilityRepository } from "./postgres-visibility-repository.js";

export class PostgreSQLMCPServerOptionsRepository
  extends PostgreSQLVisibilityRepository<schemas.MCPServerOptions>
  implements MCPServerOptionsRepository
{
  public static inject = [INJECTOR_TOKEN] as const;
  constructor(injector: Injector<DatabaseProvider>) {
    super("servers", injector);
    this.junctions.connections = new JunctionHelper(
      this.getPool(),
      "server_to_clients",
      "serverId",
      "clientId"
    );
    this.junctions.projects = new JunctionHelper(
      this.getPool(),
      "server_to_projects",
      "serverId",
      "projectId"
    );
  }

  async addNewConnection(id: string, connectionId: string): Promise<boolean> {
    return this.junctions.connections.add(id, connectionId);
  }

  async replaceConnections(
    id: string,
    connections: string[]
  ): Promise<boolean> {
    await this.junctions.connections.replaceAll(id, connections);
    return true;
  }

  async findByConnectionId(
    connectionId: string
  ): Promise<schemas.MCPServerOptionsWithId[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT s.* FROM servers s
         INNER JOIN server_to_clients sc ON s.id = sc."serverId"
         WHERE sc."clientId" = $1`,
        [connectionId]
      );
      return result.rows.map((row: Record<string, unknown>) =>
        this.mapRowToEntity(row)
      );
    } finally {
      client.release();
    }
  }

  async unsetCreator(id: string): Promise<boolean> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `UPDATE servers SET creator = NULL WHERE id = $1`,
        [id]
      );
      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }
}
