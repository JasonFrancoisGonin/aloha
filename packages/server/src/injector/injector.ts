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

import { createInjector } from "typed-inject";
import { provideDatabase } from "./provide-database";
import { provideLogger } from "./provide-logger";
import { provideMcpManager } from "./provide-mcp-manager";
import { provideEnvVars } from "./provide-env-vars";
import { provideCaches } from "./provide-caches";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { logger, schemas } from "aloha-shared"; // required by the compiler

export const injector = provideMcpManager(
  provideDatabase(
    provideLogger(provideEnvVars(provideCaches(createInjector())))
  )
);
