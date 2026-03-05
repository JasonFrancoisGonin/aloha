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
import { UsersRepository } from "../interfaces/user-repository-interface.js";
import {
  DatabaseProvider,
  PostgreSQLGenericRepository,
} from "./postgres-generic-repository.js";
import { JunctionHelper } from "./junction-helper.js";

export class PostgreSQLUserRepository
  extends PostgreSQLGenericRepository<schemas.User>
  implements UsersRepository
{
  public static inject = [INJECTOR_TOKEN] as const;
  constructor(injector: Injector<DatabaseProvider>) {
    super("users", injector);
    // NOTE: "userId" in user_to_projects refers to users.id (the UUID PK),
    // NOT the text "userId" field on the user entity. Confusing but matches the SQL schema.
    this.junctions.projects = new JunctionHelper(
      this.getPool(),
      "user_to_projects",
      "userId",
      "projectId"
    );
  }

  async findByUserId(
    userId: string
  ): Promise<(schemas.User & schemas.WithIdBase) | null> {
    const results = await this.findByPattern({ userId });
    if (results.length === 0) return null;
    if (results.length !== 1) {
      console.error("Found more than one user with id " + userId, results);
      throw new Error("Found more than one user with id " + userId);
    }
    return results[0];
  }

  async projectsByUser(id: string): Promise<schemas.ProjectWithId[]> {
    const projectIds = await this.junctions.projects.getRelated(id);
    if (projectIds.length === 0) return [];

    const placeholders = projectIds.map((_, i) => `$${i + 1}`).join(", ");
    const client = await this.getClient();
    try {
      const result = await client.query(
        `SELECT * FROM projects WHERE id IN (${placeholders})`,
        projectIds
      );
      return result.rows as schemas.ProjectWithId[];
    } finally {
      client.release();
    }
  }

  async count(): Promise<number> {
    const client = await this.getClient();
    try {
      const result = await client.query<{ count: string }>(
        "SELECT COUNT(*) as count FROM users"
      );
      return parseInt(result.rows[0].count, 10);
    } finally {
      client.release();
    }
  }
}
