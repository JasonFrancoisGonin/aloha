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

import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Loading from "@/components/loading";
import { useService } from "@/hooks/useService";
import { getTestbedAgentsList } from "@/services/testbed-agents";
import { isWithErrorsObject, WithErrors } from "@/services/utils";
import { DocumentPlusIcon } from "@heroicons/react/16/solid";
import { schemas } from "aloha-shared";
import { useCallback, useState } from "react";
import { TestbedAgentCard } from "./testbed-agent-card";
import TestbedAgentEditDialog from "./testbed-agent-edit-dialog";

export default function TestbedAgentsListPage() {
  const [reloadAgents, setReloadAgents] = useState(1);

  const [isLoading, agents] = useService<
    (schemas.TestbedAgentWithId | WithErrors<schemas.TestbedAgentWithId>)[]
  >(() => getTestbedAgentsList(), [], [], [reloadAgents]);
  const [filter, setFilter] = useState<string>("");

  const filterAgents = useCallback(
    (a: schemas.TestbedAgent | WithErrors<schemas.TestbedAgent>) => {
      if (filter.length < 3) return true;
      return filter
        .toLowerCase()
        .split(" ")
        .map(
          (f) =>
            !isWithErrorsObject(a) &&
            (a.name?.toLowerCase().includes(f) ||
              !!a.description?.toLowerCase().includes(f))
        )
        .some((f) => f);
    },
    [filter]
  );

  return (
    <div className="max-w-8xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <PageTitle className="text-2xl font-bold text-gray-900">
            Testbed Agents
          </PageTitle>
          <TestbedAgentEditDialog
            agentId={undefined}
            trigger={
              <Button>
                <DocumentPlusIcon />
                New Testbed Agent
              </Button>
            }
            onAccept={async () => setReloadAgents(reloadAgents + 1)}
          ></TestbedAgentEditDialog>
        </div>

        {/* Search and Filter */}

        <Input
          type="search"
          className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Search clients by name, description, or tags..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {isLoading && <Loading message="Loading testbed agents..." />}

      <div className="flex flex-wrap gap-8">
        {!isLoading &&
          agents
            .filter(filterAgents)
            .map((agent) => <TestbedAgentCard key={agent.id} agent={agent} />)}
      </div>
    </div>
  );
}
