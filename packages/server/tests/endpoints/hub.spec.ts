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
// [Note: File generated using Generative AI technology]

// hub.spec.ts is SKIPPED because hub.ts uses `import.meta.url` (for the
// changelog endpoint), which makes the module impossible to import in the
// CJS test environment used by mocha + ts-node.
//
// The hub router contains:
//   GET /          – hub status (clients/agents/servers counts)
//   POST /restart  – requires Administration permission
//   GET /changelog – serves CHANGELOG.md (uses import.meta.url)
