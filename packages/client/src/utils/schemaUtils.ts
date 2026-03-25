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

import type { JsonValue, JsonSchemaType, JsonObject } from "./jsonUtils";

/**
 * Generates a default value based on a JSON schema type
 * @param schema The JSON schema definition
 * @returns A default value matching the schema type, or null for non-required fields
 */
export function generateDefaultValue(schema: JsonSchemaType): JsonValue {
  if ("default" in schema) {
    return schema.default;
  }

  if (!schema.required) {
    if (schema.type === "array") return [];
    if (schema.type === "object") return {};
    return undefined;
  }

  switch (schema.type) {
    case "string":
      return "";
    case "number":
    case "integer":
      return 0;
    case "boolean":
      return false;
    case "array":
      return [];
    case "object": {
      if (!schema.properties) return {};

      const obj: JsonObject = {};
      Object.entries(schema.properties)
        .filter(([, prop]) => prop.required)
        .forEach(([key, prop]) => {
          const value = generateDefaultValue(prop);
          obj[key] = value;
        });
      return obj;
    }
    default:
      return null;
  }
}

/**
 * Formats a field key into a human-readable label
 * @param key The field key to format
 * @returns A formatted label string
 */
export function formatFieldLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1") // Insert space before capital letters
    .replace(/_/g, " ") // Replace underscores with spaces
    .replace(/^\w/, (c) => c.toUpperCase()); // Capitalize first letter
}
