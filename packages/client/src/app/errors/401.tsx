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

import { PATH_LOGIN } from "../routing";

export default function Page401() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">401 unauthorised</h1>
      <p>
        This functionality is not available unless you are logged in.{" "}
        <a
          href={PATH_LOGIN}
          className="text-blue-800 hover:text-blue-600 hover:underline"
        >
          Click here to login
        </a>
        .
      </p>
    </div>
  );
}
