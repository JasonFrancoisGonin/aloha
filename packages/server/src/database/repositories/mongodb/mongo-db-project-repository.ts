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

import { ProjectRepository } from "../interfaces/project-repository-interface";
import { schemas } from "aloha-shared";
import {
  DatabaseProvider,
  MongoDBGenericRepository,
} from "./mongo-db-generic-repository";
import { Injector, INJECTOR_TOKEN } from "typed-inject";

export class MongoDbProjectRepository
  extends MongoDBGenericRepository<schemas.Project>
  implements ProjectRepository
{
  public static inject = [INJECTOR_TOKEN] as const;
  constructor(injector: Injector<DatabaseProvider>) {
    super("projects", injector);
  }
}
