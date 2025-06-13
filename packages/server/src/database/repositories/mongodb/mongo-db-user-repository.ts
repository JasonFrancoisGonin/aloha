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
import { ObjectId, WithId } from "mongodb";
import { Injector, INJECTOR_TOKEN } from "typed-inject";
import {
  DatabaseProvider,
  MongoDBGenericRepository,
} from "./mongo-db-generic-repository";

export class MongoDBUserRepository extends MongoDBGenericRepository<schemas.User> {
  public static inject = [INJECTOR_TOKEN] as const;
  constructor(injector: Injector<DatabaseProvider>) {
    super("users", injector);
  }
  async findByUserId(
    userId: string
  ): Promise<(schemas.User & schemas.WithIdBase) | null> {
    const results = await super.findByPattern({ userId });
    if (results.length == 0) {
      return null;
    }

    if (results.length !== 1) {
      console.error("Found more than one user with id " + userId, results);
      throw new Error(`Found more than one user with id ` + userId);
    }
    return results[0];
  }

  async projectsByUser(id: string): Promise<schemas.ProjectWithId[]> {
    const pipeline = [
      {
        $match: {
          _id: new ObjectId(id),
        },
      },
      {
        $unwind: "$projects",
      },
      {
        $project: {
          projects: {
            $toObjectId: "$projects",
          },
        },
      },
      {
        $lookup: {
          from: "projects",
          localField: "projects",
          foreignField: "_id",
          as: "userProjects",
        },
      },
      {
        $unwind: "$userProjects",
      },
      {
        $replaceRoot: {
          newRoot: "$userProjects",
        },
      },
    ];

    const projects = await this.getCollection()
      .aggregate<WithId<schemas.Project>>(pipeline)
      .toArray();

    return projects.map((e) => this.mapIdField(e));
  }
}
