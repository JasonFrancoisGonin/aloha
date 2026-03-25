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

import { Db, MongoClient } from "mongodb";
import { getLogger } from "../../../injector/provide-logger";
// import { Character, InformationBlock, User } from "./definitions";

const logger = getLogger("MONGODB");

let client: MongoClient;
let db: Db;

export function getDatabase(): Db {
  if (db === undefined) {
    logger().info("Connecting to MongoDB");
    if (!process.env.DB_URI) {
      throw new Error('Invalid/Missing environment variable: "DB_URI"');
    }

    const uri = process.env.DB_URI;
    const options = { appName: "aloha" };

    logger().child({ uri }).info("MongoDB URI");

    if (process.env.NODE_ENV === "development") {
      // In development mode, use a global variable so that the value
      // is preserved across module reloads caused by HMR (Hot Module Replacement).
      const globalWithMongo = global as typeof globalThis & {
        _mongoClient?: MongoClient;
      };

      if (!globalWithMongo._mongoClient) {
        globalWithMongo._mongoClient = new MongoClient(uri, options);
      }
      client = globalWithMongo._mongoClient;
    } else {
      // In production mode, it's best to not use a global variable.
      client = new MongoClient(uri, options);
    }

    db = client.db(process.env.MONGODB_DB);
  }

  return db;
}

export function getClient(): MongoClient {
  return client;
}
