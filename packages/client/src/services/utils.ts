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
import { ZodSchema } from "zod";

export class HTTPError extends Error {
  private _status: number;
  private _statusDescription: string;

  constructor(message?: string, response?: Response);
  constructor(message?: string, status?: number, statusDescription?: string);
  constructor(
    message?: string,
    status?: number | Response,
    statusDescription?: string
  ) {
    super(message);
    if (typeof status === "number") {
      this._status = status ?? 0;
      this._statusDescription = statusDescription ?? "Unknown status code";
    } else if (status !== undefined) {
      this._status = status.status;
      this._statusDescription = status.statusText;
    } else {
      this._status = 0;
      this._statusDescription = "Unknown status code";
    }
  }
  public get status() {
    return this._status;
  }
  public get statusDescription() {
    return this._statusDescription;
  }
}

export async function customFetch(
  operation: string,
  input: string | URL | globalThis.Request,
  init?: RequestInit
) {
  const response = await fetch(input, init);
  if (!response.ok) {
    const jsonReponse = await response.json();
    throw new HTTPError(
      operation + ": " + jsonReponse.error,
      response.status,
      response.statusText
    );
  }
  return response;
}

export declare type WithErrors<BaseType> = Partial<BaseType> & {
  isError: true;
  error: string;
};

export function safeParseWithErrors<T>(
  obj: unknown,
  schema: ZodSchema<T>
): T | WithErrors<T> {
  const result = schema.safeParse(obj);
  if (result.error) {
    const flatErrors = result.error.flatten();
    const errorsMessage =
      flatErrors.formErrors.join("; ") +
      Object.keys(flatErrors.fieldErrors)
        .map(
          (key) =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            `field ${key}: ${(flatErrors.fieldErrors as any)[key]?.join(", ")}`
        )
        .join("; ");
    return {
      ...(obj as T),
      isError: true,
      error: errorsMessage,
    };
  } else {
    return result.data;
  }
}

export function isWithErrorsObject<T>(
  obj: T | WithErrors<T>
): obj is WithErrors<T> {
  return typeof obj === "object" && obj !== null && "isError" in obj;
}

export type VisibilityServiceFunc = (
  id: string,
  visibility: schemas.VisibilityInterface
) => Promise<void>;

export function setVisibilityGenerator(url: string): VisibilityServiceFunc {
  return async (id, visibility) => {
    const response = await customFetch(
      "Update project",
      `${url}/${id}/_setVisibility`,
      {
        method: "POST",
        body: JSON.stringify(visibility),
        headers: { "Content-Type": "application/json" },
      }
    );
    if (!response.ok) {
      const data = await response.text();
      throw new Error(data);
    }
  };
}

export type CreatorServiceFunc = (
  id: string,
  creator: { creator: string }
) => Promise<void>;

export function setCreatorGenerator(url: string): CreatorServiceFunc {
  return async (id, creator) => {
    const response = await customFetch(
      "Set creator",
      `${url}/${id}/_setCreator`,
      {
        method: "POST",
        body: JSON.stringify(creator),
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      const data = await response.text();
      throw new Error(data);
    }
  };
}
