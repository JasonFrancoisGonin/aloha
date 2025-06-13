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
import { Collection, ObjectId } from "mongodb";
import { Injector } from "typed-inject";
import { VisibilityRepositoryInterface } from "../interfaces/visibility-repository-interface";
import {
  DatabaseProvider,
  MongoDBGenericRepository,
} from "./mongo-db-generic-repository";

export class MongoDBVisibilityRepository<T extends schemas.VisibilityInterface>
  extends MongoDBGenericRepository<T>
  implements VisibilityRepositoryInterface<T>
{
  constructor(collectionName: string, injector: Injector<DatabaseProvider>) {
    super(collectionName, injector);
  }
  async setVisibility(id: string, visibility: T): Promise<boolean> {
    const collection =
      this.getCollection() as unknown as Collection<schemas.VisibilityInterface>;
    const updateResult = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: visibility }
    );
    if (updateResult.modifiedCount <= 0) return false;
    if (visibility.visibility !== schemas.Visibility.Managed) {
      const unsetResult = await collection.updateOne(
        { _id: new ObjectId(id) },
        { $unset: { projects: true } }
      );

      return unsetResult.modifiedCount > 0;
    }
    return true;
  }
}
