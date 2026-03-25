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

type Props = {
  value: {
    disabled?: boolean;
    isConnected?: boolean;
  };
};
export function CardHeaderConnectionIndicator({ value }: Props) {
  const { disabled, isConnected } = value;
  return (
    <span
      className={`w-3 h-3 rounded-full animate-pulse shadow-sm ${
        disabled
          ? "bg-gray-500 shadow-gray-200"
          : isConnected
            ? "bg-emerald-500 shadow-emerald-200"
            : "bg-red-500 shadow-red-200"
      }`}
      title={disabled ? "Disabled" : isConnected ? "Connected" : "Disconnected"}
    ></span>
  );
}
