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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { manageFetchError } from "@/hooks/useService";
import {
  ChatBubbleOvalLeftEllipsisIcon,
  ClipboardDocumentListIcon,
  DocumentDuplicateIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/16/solid";
import { entrypoint_schemas } from "aloha-shared";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { timer } from "rxjs";
import { switchMap } from "rxjs/operators";
import { getConnectionList } from "../../services/mcp-clients";
import MCPClientEditDialog from "./mcp-client-edit-dialog";
// import { useCustomFetch } from "../../hooks/useCustomFetch";
import { isEqual } from "@react-hookz/deep-equal";
import { WithErrors } from "@/services/utils";
import { toast } from "sonner";

export default function MCPClientsListPage() {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<
    (
      | entrypoint_schemas.MCPConnectionStatus
      | WithErrors<entrypoint_schemas.MCPConnectionStatus>
    )[]
  >([]);
  const [filter, setFilter] = useState<string>("");

  // useCustomFetch(getConnectionList, [], []);

  useEffect(() => {
    const refreshConnections = async () => {
      try {
        const newList = await getConnectionList();
        if (!isEqual(newList, connections)) {
          setConnections(newList);
          if (connections.some((c) => "isError" in c)) {
            toast.error(
              "Some clients have errors. To ensure that the platform behaves predictably, fix them as soon as possible."
            );
          }
        }
      } catch (e) {
        manageFetchError(e, navigate);
      }
    };

    const subscription = timer(0, 5000)
      .pipe(
        switchMap(() => {
          return refreshConnections();
        })
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, connections]);

  const filterConnections = useCallback(
    (
      c:
        | entrypoint_schemas.MCPConnectionStatus
        | WithErrors<entrypoint_schemas.MCPConnectionStatus>
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
      <PageTitle>MCP Clients</PageTitle>
      <div className="flex justify-between items-center mb-4">
        <Input
          type="search"
          className="mr-2 bg-white"
          placeholder="Search clients"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <MCPClientEditDialog disabled={false} client={undefined} />
      </div>
      <div className="flex flex-wrap gap-8">
        {connections.filter(filterConnections).map((c) => (
          <Card
            key={c.id}
            onClick={() => navigate(`/mcp-clients/${c.id}`)}
            className="w-64"
          >
            <CardHeader>
              <CardTitle>
                <div className="flex align-middle justify-between">
                  <span>{c.name}</span>
                  <span
                    className={`mr-2 w-4 h-4 rounded-full inline-block ${c.isConnected ? "bg-green-600" : "bg-red-500"}`}
                  />
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="grow text-sm">
              {"isError" in c && (
                <p className="text-red-700 font-bold mb-2">
                  There is an error with this client
                </p>
              )}
              {c.description}
            </CardContent>
            <CardFooter>
              <div>
                {c.isConnected ? (
                  <div className="flex">
                    <DocumentDuplicateIcon width={16} className="mr-1" />
                    {c.resources}
                    <ClipboardDocumentListIcon
                      width={16}
                      className="mr-1 ml-2"
                    />
                    {c.resourceTemplates}
                    <ChatBubbleOvalLeftEllipsisIcon
                      width={16}
                      className="mr-1 ml-2"
                    />
                    {c.prompts}
                    <WrenchScrewdriverIcon width={16} className="mr-1 ml-2" />
                    {c.tools}
                  </div>
                ) : (
                  <span className="text-sm opacity-70 italic">
                    Server is offline
                  </span>
                )}
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  );
}
