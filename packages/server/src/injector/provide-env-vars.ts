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

import "dotenv/config";
import { Injector } from "typed-inject";

export function provideEnvVars<T>(injector: Injector<T>) {
  return injector
    .provideValue("serverSecret", process.env.SERVER_SECRET as string)
    .provideValue("clientSecret", process.env.CLIENT_SECRET as string);
}
