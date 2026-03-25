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

import { WithErrors } from "@/services/utils";
import { schemas } from "aloha-shared";
import { useNavigate } from "react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";

interface AgentCardProps {
  agent: schemas.TestbedAgentWithId | WithErrors<schemas.TestbedAgentWithId>;
}

export function TestbedAgentCard({ agent }: AgentCardProps) {
  const navigate = useNavigate();
  return (
    <Card
      key={agent.id}
      onClick={() => navigate(`/testbed-agents/${agent.id}`)}
      className="transform hover:scale-105 transition-all duration-200 ease-in-out cursor-pointer bg-white shadow-lg rounded-xl border border-gray-100 hover:shadow-xl flex flex-col h-full"
    >
      <CardHeader className="pb-4">
        <CardTitle className="flex justify-between items-start truncate gap-3">
          <span className="text-lg font-semibold text-gray-900 truncate min-w-0 flex-1">
            {agent.name}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="text-sm text-gray-600 mb-4 flex-grow">
        {"isError" in agent && (
          <p className="text-red-600 font-medium mb-2">
            There is an error with this testbed agent
          </p>
        )}

        <p className="line-clamp-3">{agent.description}</p>
      </CardContent>
    </Card>
  );
}
