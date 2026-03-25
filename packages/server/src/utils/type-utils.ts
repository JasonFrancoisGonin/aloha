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

import z from "zod";

export function hasMessageField(x: unknown): x is { message: string } {
  return !!x && typeof x === "object" && "message" in x;
}

export function unknownToString(x: unknown) {
  if (hasMessageField(x)) {
    return x.message;
  }
  return String(x);
}

export interface PromisedStatus<T> extends Promise<T> {
  currentStatus(): T;
}
export function promisedStatus<T>(initStatus: T, p: Promise<T>) {
  let status: T = initStatus;
  const promise = p.then((e) => {
    status = e;
    return e;
  });
  const promiseWithStatus = promise as PromisedStatus<T>;
  promiseWithStatus.currentStatus = () => {
    return status;
  };
  return promiseWithStatus;
}

export function assertFieldInObject<K extends string, T>(
  x: unknown,
  field: K,
  fieldValidator: z.ZodType<T>
): asserts x is Record<K, T> {
  z.object({ [field]: fieldValidator }).parse(x);
}

export function assertDefined<T>(
  obj: T | null | undefined
): asserts obj is NonNullable<T> {
  if (!obj) {
    throw new Error("Object must be defined");
  }
}
