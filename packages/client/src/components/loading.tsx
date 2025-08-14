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

import * as React from "react";

interface LoadingProps {
  message?: string;
  description?: string;
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({
  message = "Loading...",
  description = "Please wait while we fetch the information...",
  className = "",
}) => {
  return (
    <div
      className={`min-h-[400px] flex flex-col justify-center items-center space-y-4 ${className}`}
    >
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-transparent"></div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-lg font-medium text-gray-900">{message}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </div>
  );
};

export default Loading;
