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

const Module = require("module");

const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request.endsWith('.js') && !request.includes('node_modules')) {
    const tsRequest = request.replace(/\.js$/, '.ts');
    try {
      return originalResolveFilename.call(this, tsRequest, parent, isMain, options);
    } catch {
      // Fall back to original if .ts doesn't exist
    }
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
