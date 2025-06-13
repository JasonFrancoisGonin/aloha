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

import { entrypoint_schemas } from "aloha-shared";
import { customFetch, safeParseWithErrors } from "./utils";

const apiBaseUrl = "/api/hub";

export async function getHubStatus() {
  const response = await customFetch("Get Hub Status", `${apiBaseUrl}/`);
  const obj = await response.json();
  return safeParseWithErrors(obj, entrypoint_schemas.HubStatusSchema);
}

export async function restartHub() {
  await customFetch("Restart Hub", `${apiBaseUrl}/restart`, {
    method: "POST",
  });
}
