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

export const badgeColors: Record<ChangeItem["type"], string> = {
  added:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  changed: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  fixed: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  removed: "bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200",
  security: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export type ChangeItem = {
  type: "added" | "changed" | "fixed" | "removed" | "security";
  description: string;
};

export type Release = {
  version: string; // e.g. "v2.4.1"
  date: string; // ISO string or "2024‑07‑15"
  changes: ChangeItem[];
};

export const changelog: Release[] = [
  {
    version: "v2.4.1",
    date: "2024-07-15",
    changes: [
      {
        type: "added",
        description: "Support for custom themes in the dashboard.",
      },
      {
        type: "fixed",
        description: "Fix race condition when uploading large files.",
      },
      { type: "security", description: "Upgrade to OpenSSL 3.2.1." },
    ],
  },
  {
    version: "v2.4.0",
    date: "2024-06-30",
    changes: [
      {
        type: "added",
        description: "New analytics page with real‑time charts.",
      },
      {
        type: "changed",
        description: "Refactored API client to use fetch‑intercept.",
      },
      { type: "removed", description: "Deprecated `useLegacyAuth` hook." },
    ],
  },
  // …more releases
];
