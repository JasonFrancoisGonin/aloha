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

/* eslint-disable react-hooks/exhaustive-deps */
import { exceptionToMessage } from "@/utils/type-utils";
import { useEffect, useState } from "react";
import { NavigateFunction, useNavigate } from "react-router";
import { toast } from "sonner";
import { PATH_NOT_ALLOWED, PATH_NOT_AUTHORISED } from "../app/routing";
import { HTTPError } from "../services/utils";

export async function manageFetchError(e: unknown, navigate: NavigateFunction) {
  if (e instanceof HTTPError) {
    switch (e.status) {
      case 401:
        await navigate(PATH_NOT_AUTHORISED, {
          flushSync: true,
        });
        break;
      case 403:
        await navigate(PATH_NOT_ALLOWED, {
          flushSync: true,
        });
        break;
      default:
        toast.error(`Error while fetching item(s): ${e.message}`);
    }
  } else {
    console.error(e);
    toast.error(`Error while fetching item(s): ${exceptionToMessage(e)}`);
  }
}

export function useService<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  serviceFunction: (...args: any[]) => Promise<T>,
  deps: React.DependencyList,
  defaultValue: T,
  conditialCallDeps: React.DependencyList = []
): [boolean, T, React.Dispatch<React.SetStateAction<T>>] {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<T>(defaultValue);
  useEffect(() => {
    if (conditialCallDeps.some((e) => !e)) {
      setLoading(false);
      return;
    }

    const internalServiceFunction = async () => {
      try {
        const result = await serviceFunction(...deps);
        setResult(result);
      } catch (e) {
        await manageFetchError(e, navigate);
      } finally {
        setLoading(false);
      }
      return;
    };

    setLoading(true);
    if (import.meta.env.DEV) {
      setTimeout(() => internalServiceFunction(), 2000);
    } else {
      internalServiceFunction();
    }
  }, [...deps, ...conditialCallDeps]);

  return [loading, result, setResult];
}
