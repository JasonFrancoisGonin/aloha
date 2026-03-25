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
import cloneDeep from "clone-deep";
import { Injector, INJECTOR_TOKEN } from "typed-inject";
import { decrypt, encrypt } from "../../../utils/crypto.js";
import { TestbedAgentRepository } from "../interfaces/testbed-agent-repository-interface.js";
import { DatabaseProvider } from "./postgres-generic-repository.js";
import { JunctionHelper } from "./junction-helper.js";
import { PostgreSQLVisibilityRepository } from "./postgres-visibility-repository.js";

export class PostgreSQLTestbedAgentRepository
  extends PostgreSQLVisibilityRepository<schemas.TestbedAgent>
  implements TestbedAgentRepository
{
  public static inject = ["serverSecret", INJECTOR_TOKEN] as const;
  constructor(
    private serverSecret: string,
    injector: Injector<DatabaseProvider>
  ) {
    super("testbed_agents", injector);
    this.junctions.connections = new JunctionHelper(
      this.getPool(),
      "testbed_agent_to_clients",
      "testbedAgentId",
      "clientId"
    );
    this.junctions.projects = new JunctionHelper(
      this.getPool(),
      "testbed_agent_to_projects",
      "testbedAgentId",
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
  ): Promise<schemas.TestbedAgentWithId[]> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT ta.* FROM testbed_agents ta
         INNER JOIN testbed_agent_to_clients tac ON ta.id = tac."testbedAgentId"
         WHERE tac."clientId" = $1`,
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
        `UPDATE testbed_agents SET creator = NULL WHERE id = $1`,
        [id]
      );
      return (result.rowCount ?? 0) > 0;
    } finally {
      client.release();
    }
  }

  protected transformOnRead(
    e: schemas.TestbedAgent & schemas.WithIdBase
  ): schemas.TestbedAgent & schemas.WithIdBase {
    if (e.client) {
      try {
        e.client.apiKey = decrypt(e.client.apiKey, this.serverSecret);
      } catch {
        // already decrypted or plain text
      }
    }
    return e;
  }

  protected transformOnWrite(
    e: Partial<schemas.TestbedAgent>
  ): Partial<schemas.TestbedAgent> {
    const clone = cloneDeep(e);
    if (clone.client) {
      clone.client.apiKey = encrypt(clone.client.apiKey, this.serverSecret);
    }
    return clone;
  }
}
