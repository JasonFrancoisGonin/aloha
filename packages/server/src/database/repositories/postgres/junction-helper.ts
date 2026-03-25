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

import { Pool } from "pg";

export class JunctionHelper {
  constructor(
    private pool: Pool,
    private table: string,
    private entityCol: string,
    private relatedCol: string
  ) {}

  async add(entityId: string, relatedId: string): Promise<boolean> {
    const res = await this.pool.query(
      `INSERT INTO ${this.table} ("${this.entityCol}", "${this.relatedCol}") VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING true`,
      [entityId, relatedId]
    );
    return res.rows.length > 0;
  }

  async remove(entityId: string, relatedId: string): Promise<boolean> {
    const res = await this.pool.query(
      `DELETE FROM ${this.table} WHERE "${this.entityCol}" = $1 AND "${this.relatedCol}" = $2`,
      [entityId, relatedId]
    );
    return (res.rowCount ?? 0) > 0;
  }

  async getRelated(entityId: string): Promise<string[]> {
    const res = await this.pool.query(
      `SELECT "${this.relatedCol}" FROM ${this.table} WHERE "${this.entityCol}" = $1`,
      [entityId]
    );
    return res.rows.map(
      (row: Record<string, string>) => row[this.relatedCol]
    );
  }

  async replaceAll(entityId: string, newIds: string[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `DELETE FROM ${this.table} WHERE "${this.entityCol}" = $1`,
        [entityId]
      );
      for (const id of newIds) {
        await client.query(
          `INSERT INTO ${this.table} ("${this.entityCol}", "${this.relatedCol}") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [entityId, id]
        );
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }

  /** Used by the generic repository to build auto-join SELECT queries */
  get config() {
    return {
      table: this.table,
      entityCol: this.entityCol,
      relatedCol: this.relatedCol,
    };
  }
}
