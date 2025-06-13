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

export function hasMessageField(x: unknown): x is { message: string } {
  return !!x && typeof x === "object" && "message" in x;
}

export function exceptionToMessage(e: unknown) {
  if (!e) {
    return "Unknown error";
  }
  if (hasMessageField(e)) {
    return e.message;
  }
  return String(e);
}
export function isDefined<T>(x: T | null | undefined): x is NonNullable<T> {
  return x !== null && x !== undefined;
}

export function isIdDefined<T extends { id?: string }>(
  x: T
): x is T & { id: string } {
  return isDefined(x) && isDefined(x.id);
}
