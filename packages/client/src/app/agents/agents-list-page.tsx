import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useService } from "@/hooks/useService";
import { getAgentsList } from "@/services/agents";
import { WithErrors } from "@/services/utils";
import { DocumentPlusIcon } from "@heroicons/react/16/solid";
import { entrypoint_schemas, schemas } from "aloha-shared";
import { useCallback, useState } from "react";
import { ScrollArea } from "../../components/ui/scroll-area";
import { AgentCard } from "./agent-card";
import AgentEditDialog from "./agent-edit-dialog";

export default function AgentsListPage() {
  const [reloadAgents, setReloadAgents] = useState(1);

  const [isLoading, agents] = useService<
    | entrypoint_schemas.AgentListDetail
    | WithErrors<entrypoint_schemas.AgentListDetail>
  >(() => getAgentsList(), [], [], [reloadAgents]);
  const [filter, setFilter] = useState<string>("");

  const filterAgents = useCallback(
    (a: schemas.AgentWithId) => {
      if (filter.length < 3) return true;
      return filter
        .toLowerCase()
        .split(" ")
        .map(
          (f) =>
            a.name.toLowerCase().includes(f) ||
            !!a.description?.toLowerCase().includes(f) ||
            !!a.tags?.some((t) => t.toLowerCase().includes(f))
        )
        .some((f) => f);
    },
    [filter]
  );

  return (
    <>
      <PageTitle>Agents</PageTitle>
      <div className="flex justify-between items-center mb-4">
        <Input
          type="search"
          className="bg-white mr-2"
          placeholder="Search server"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <AgentEditDialog
          agentId={undefined}
          trigger={
            <Button>
              <DocumentPlusIcon />
              New Agent
            </Button>
          }
          onAccept={async () => setReloadAgents(reloadAgents + 1)}
        ></AgentEditDialog>
      </div>
      {isLoading && <div className="w-full text-center">Loading... </div>}
      {!isLoading && !("isError" in agents) && (
        <ScrollArea className="h-[calc(100vh-100px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.filter(filterAgents).map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </ScrollArea>
      )}
    </>
  );
}
