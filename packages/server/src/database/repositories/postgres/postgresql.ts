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

import pg from "pg";
import { getLogger } from "../../../injector/provide-logger.js";

const logger = getLogger("POSTGRESQL");

let pool: pg.Pool;

export function getPool(): pg.Pool {
  if (pool === undefined) {
    logger().info("Connecting to PostgreSQL");
    if (!process.env.DB_URI) {
      throw new Error('Invalid/Missing environment variable: "DB_URI"');
    }

    const connectionString = process.env.DB_URI;
    logger().child({ connectionString }).info("PostgreSQL URI");

    if (process.env.NODE_ENV === "development") {
      const globalWithPg = global as typeof globalThis & {
        _pgPool?: pg.Pool;
      };

      if (!globalWithPg._pgPool) {
        globalWithPg._pgPool = new pg.Pool({
          connectionString,
          application_name: "aloha",
        });
      }
      pool = globalWithPg._pgPool;
    } else {
      pool = new pg.Pool({
        connectionString,
        application_name: "aloha",
      });
    }
  }

  return pool;
}
