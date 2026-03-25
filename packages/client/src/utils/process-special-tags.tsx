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

export function processSpecialTags(content: string): React.ReactNode {
  const thinkIdx = content.indexOf("<think>");
  if (thinkIdx === -1) {
    return <div className="mb-2 mt-2">{(content || "").trim()}</div>;
  }

  const thinkEnd = content.indexOf("</think>");

  if (thinkEnd === -1) {
    return (
      <div className="text-sm mt-2 mb-2 border-l-2 border-gray-300 pl-4">
        ... {content.substring(7).trim()}
      </div>
    );
  } else {
    return (
      <>
        <div className="text-sm mt-2 mb-2 border-l-2 border-gray-300 pl-4">
          ... {content.substring(7, thinkEnd).trim()} ...
        </div>
        {processSpecialTags(content.substring(thinkEnd + 7 + 1))}
      </>
    );
  }
}
