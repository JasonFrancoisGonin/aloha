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
import { Injector } from "typed-inject";
import { VisibilityRepositoryInterface } from "../interfaces/visibility-repository-interface.js";
import {
  DatabaseProvider,
  PostgreSQLGenericRepository,
} from "./postgres-generic-repository.js";

export class PostgreSQLVisibilityRepository<
    T extends schemas.VisibilityInterface,
  >
  extends PostgreSQLGenericRepository<T>
  implements VisibilityRepositoryInterface<T>
{
  constructor(tableName: string, injector: Injector<DatabaseProvider>) {
    super(tableName, injector);
  }

  async setVisibility(id: string, visibility: T): Promise<boolean> {
    const client = await this.getClient();
    try {
      const result = await client.query(
        `UPDATE ${this.tableName} SET visibility = $1 WHERE id = $2`,
        [visibility.visibility, id]
      );
      if ((result.rowCount ?? 0) === 0) return false;

      if (
        visibility.visibility === schemas.Visibility.Managed &&
        visibility.projects &&
        this.junctions.projects
      ) {
        await this.junctions.projects.replaceAll(id, visibility.projects);
      } else if (this.junctions.projects) {
        await this.junctions.projects.replaceAll(id, []);
      }

      return true;
    } finally {
      client.release();
    }
  }
}
