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

import { Badge } from "./ui/badge";

export function TagsList({
  item,
  inline,
}: {
  inline: boolean;
  item: { tags?: string[] };
}) {
  if (!item.tags || item.tags.length === 0) {
    return null;
  }
  return inline ? (
    <div className="flex flex-wrap gap-2 mt-4">
      {item.tags.map((e) => (
        <Badge key={e}>{e}</Badge>
      ))}
    </div>
  ) : (
    <div className="space-y-2 mb-6">
      <dt className="text-sm font-semibold uppercase tracking-wide">TAGS</dt>
      {item.tags.map((e) => (
        <Badge key={e} className="mr-2">
          {e}
        </Badge>
      ))}
    </div>
  );
}
