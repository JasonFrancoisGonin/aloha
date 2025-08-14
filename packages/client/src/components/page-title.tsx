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

import { cn } from "@/lib/utils";

export default function PageTitle({
  children,
  className,
  isConnected,
  ...others
}: React.ComponentProps<"h1"> & {
  isConnected?: boolean;
}) {
  if (isConnected !== undefined) {
    return (
      <h1 className={cn("text-xl mb-4 font-bold", className)} {...others}>
        <div>{children}</div>
        <div
          className={`flex items-center gap-2 px-3 py-1.5 bg-${isConnected ? "emerald" : "red"}-50 border border-${isConnected ? "emerald" : "red"}-200 rounded-full`}
        >
          <div
            className={`w-2.5 h-2.5 bg-${isConnected ? "emerald" : "red"}-500 rounded-full animate-pulse shadow-sm shadow-${isConnected ? "emerald" : "red"}-200`}
          ></div>
          <span
            className={`text-sm font-medium text-${isConnected ? "emerald" : "red"}-700`}
          >
            {isConnected ? "connected" : "disconnected"}
          </span>
        </div>
      </h1>
    );
  }
  return (
    <h1 className={cn("text-xl mb-4 font-bold", className)} {...others}>
      {children}
    </h1>
  );
}
