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
export type RepositoryRead<T> = {
  findByPattern(item: Partial<T>): Promise<(T & schemas.WithIdBase)[]>;
  findById(
    id: schemas.WithIdBase["id"]
  ): Promise<(T & schemas.WithIdBase) | null>;
};

export type RepositoryWrite<T> = {
  create(item: T): Promise<T & schemas.WithIdBase>;
  updateById(id: schemas.WithIdBase["id"], item: Partial<T>): Promise<boolean>;
  deleteById(id: schemas.WithIdBase["id"]): Promise<boolean>;
};

export interface CrudRepository<T>
  extends RepositoryRead<T>,
    RepositoryWrite<T> {}
