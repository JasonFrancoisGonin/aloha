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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DocumentPlusIcon } from "@heroicons/react/16/solid";
import { schemas } from "aloha-shared";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { useService } from "../../hooks/useService";
import { getServersList } from "../../services/mcp-servers";
import MCPServerEditDialog from "./mcp-server-edit-dialog";
import { WithErrors } from "@/services/utils";

export default function MCPServersListPage() {
  const [reloadServer, setReloadServer] = useState(1);

  const [isLoading, servers] = useService<
    (
      | schemas.MCPServerOptionsWithId
      | WithErrors<schemas.MCPServerOptionsWithId>
    )[]
  >(getServersList, [], [], [reloadServer]);

  const [filter, setFilter] = useState<string>("");

  const navigate = useNavigate();

  const filterConnections = useCallback(
    (
      c:
        | schemas.MCPServerOptionsWithId
        | WithErrors<schemas.MCPServerOptionsWithId>
    ) => {
      if (filter.length < 3) return true;
      if ("isError" in c) return true;
      return filter
        .toLowerCase()
        .split(" ")
        .map(
          (f) =>
            c.name.toLowerCase().includes(f) ||
            !!c.description?.toLowerCase().includes(f) ||
            !!c.tags?.some((t) => t.toLowerCase().includes(f))
        )
        .some((f) => f);
    },
    [filter]
  );

  return (
    <>
      <PageTitle>MCP Servers</PageTitle>
      <div className="flex justify-between items-center mb-4">
        <Input
          type="search"
          className="bg-white mr-2"
          placeholder="Search server"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <MCPServerEditDialog
          serverId={undefined}
          trigger={
            <Button>
              <DocumentPlusIcon />
              New Server
            </Button>
          }
          onAccept={async () => setReloadServer(reloadServer + 1)}
        ></MCPServerEditDialog>
      </div>
      <div className="flex flex-wrap gap-8">
        {isLoading && <div className="w-full text-center">Loading... </div>}
        {!isLoading &&
          servers.filter(filterConnections).map((server) => (
            <Card
              className="w-64"
              key={server.id}
              onClick={() => navigate(`/mcp-servers/${server.id}`)}
            >
              <CardHeader>
                <CardTitle>{server.name}</CardTitle>
              </CardHeader>
              <CardContent className="grow text-sm">
                {"isError" in server && (
                  <p className="text-red-700 font-bold mb-2">
                    There is an error with this server
                  </p>
                )}
                {server.description}
              </CardContent>
              <CardFooter>
                <div className="mt-1">
                  {server.connections && !!server.connections.length ? (
                    <p className="font-bold">
                      {server.connections.length} client
                      {server.connections.length > 1 && "s"}
                    </p>
                  ) : (
                    <p className="italic">No clients</p>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
      </div>
    </>
  );
}
