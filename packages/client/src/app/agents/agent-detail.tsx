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

import ConfirmDialog from "@/components/confirm-dialog";
import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { exceptionToMessage, isIdDefined } from "@/utils/type-utils";
import {
  MinusCircleIcon,
  PencilIcon,
  PlusCircleIcon,
  TrashIcon,
} from "@heroicons/react/16/solid";
import { schemas } from "aloha-shared";
import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  connectClientToAgent,
  deleteAgent,
  disconnectClientFromAgent,
  getAgentDetail,
  setAgentCreator,
  setAgentVisibility,
} from "../../services/agents";
import { getConnectionList } from "../../services/mcp-clients";
// import AgentEditDialog from "./agent-edit-dialog";
import { CreatorAndVisibilityEditor } from "@/components/creator-and-visibility-editor";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePermissionChecker } from "@/hooks/use-permission-checker";
import { useService } from "@/hooks/useService";
import { isWithErrorsObject } from "@/services/utils";
import McpClientTool from "../mcp-clients/mcp-client-tool";
import AgentEditDialog from "./agent-edit-dialog";
import AgentTokenDialog from "./agent-token-dialog";

export default function AgentDetailPage() {
  const permissionChecker = usePermissionChecker();
  const { id } = useParams<{ id: string }>();

  const [isAgentLoading, agentDetail, setAgentDetail] = useService(
    (id) => getAgentDetail(id),
    [id],
    null,
    [id]
  );

  const [isConnectionLoading, allConnections, setAllConnections] = useService(
    () => getConnectionList(),
    [id],
    []
  );

  const loading = useMemo(
    () => isConnectionLoading || isAgentLoading,
    [isConnectionLoading, isAgentLoading]
  );

  const [draggingOver, setDraggingOver] = useState(0);

  const navigate = useNavigate();

  const permissionCheker = usePermissionChecker();

  const isTheUserTheOwner = useMemo(() => {
    return permissionCheker.hasOwnership(agentDetail);
  }, [agentDetail, permissionCheker]);

  const isAgentCallable = useMemo(() => {
    return (
      !isWithErrorsObject(agentDetail) &&
      (permissionCheker.hasPublicVisibility(agentDetail) || isTheUserTheOwner)
    );
  }, [agentDetail, isTheUserTheOwner, permissionCheker]);

  const refreshClients = useCallback(
    async (id?: string) => {
      try {
        const connections = await getConnectionList();
        setAllConnections(connections.filter((c) => !("isError" in c)));
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch connection list");
      }
      try {
        if (id !== undefined) {
          const detail = await getAgentDetail(id);
          setAgentDetail(detail);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch server details");
      }
    },
    [setAgentDetail, setAllConnections]
  );

  const associateClient = useCallback(
    async (clientId: string) => {
      if (!isTheUserTheOwner) {
        return;
      }

      if (id) {
        try {
          await connectClientToAgent(id, clientId);
          await refreshClients(id);
        } catch (err) {
          console.error(err);
          toast.error("Failed to fetch connection list");
        }
      }
    },
    [id, refreshClients, isTheUserTheOwner]
  );

  const dissociateClient = useCallback(
    async (clientId: string) => {
      if (!isTheUserTheOwner) {
        return;
      }

      if (id) {
        try {
          await disconnectClientFromAgent(id, clientId);
          await refreshClients(id);
        } catch (err) {
          console.error(err);
          toast.error("Failed to fetch connection list");
        }
      }
    },
    [id, refreshClients, isTheUserTheOwner]
  );

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!id || !agentDetail) {
    return <div>Agent not found</div>;
  }

  const serverConnections = agentDetail.connectionsDetail || [];
  const associatedConnections = serverConnections.map((conn) => conn.name);
  const unassociatedConnections = allConnections.filter(
    (conn) => !associatedConnections.includes(conn.name)
  );

  const EditDialog = ({ disabled }: { disabled: boolean }) => {
    return (
      <AgentEditDialog
        agentId={id}
        trigger={
          <Button disabled={disabled}>
            <PencilIcon /> Edit Agent
          </Button>
        }
        onAccept={async () => {
          await refreshClients(id);
        }}
      ></AgentEditDialog>
    );
  };

  async function doDeleteAgent() {
    try {
      await deleteAgent(id!);
      navigate(`/mcp-servers`);
    } catch (e) {
      console.error(e);
      toast.error(exceptionToMessage(e));
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <PageTitle>{agentDetail.name}</PageTitle>
        <div className="flex">
          <ConfirmDialog
            onClick={() => {
              return doDeleteAgent();
            }}
          >
            <Button
              className="mr-2"
              variant="destructive"
              disabled={!isTheUserTheOwner}
            >
              <TrashIcon />
              Delete Agent
            </Button>
          </ConfirmDialog>
          <EditDialog disabled={!isTheUserTheOwner}></EditDialog>
        </div>
      </div>
      {"isError" in agentDetail && (
        <p className="text-red-700 font-bold mb-4">
          There is an error with this server: <i>{agentDetail.error}</i>
          <br />
          To make sure it works correctly, fix it as soon as possible.
        </p>
      )}
      <p className="mb-2">
        Server path:{" "}
        <i>
          {window.location.origin}/api/mcp/{agentDetail.serverPath}/mcp
          <span className="ml-4">
            {!("isError" in agentDetail && agentDetail.isError) && (
              <AgentTokenDialog
                agent={agentDetail as schemas.AgentWithId}
                disabled={!isAgentCallable}
              />
            )}
          </span>
        </i>
      </p>

      {agentDetail.description && (
        <p className="mb-2">Description: {agentDetail.description}</p>
      )}

      {agentDetail.tags && agentDetail.tags.length > 0 && (
        <p className="mb-2">
          <strong className="font-bold">Tags:</strong>{" "}
          {agentDetail.tags.join(", ")}
        </p>
      )}
      {isIdDefined(agentDetail) && permissionChecker.isAdministrator() && (
        <CreatorAndVisibilityEditor
          name="Agent"
          item={agentDetail}
          setVisibilityService={setAgentVisibility}
          setCreatorService={setAgentCreator}
          onAccept={() => refreshClients(id)}
        />
      )}

      {agentDetail.tools &&
        agentDetail.isConnected &&
        agentDetail.id &&
        !!agentDetail.tools.length && (
          <div>
            <h2 className="mb-2 mt-4 font-bold">Tools</h2>
            <div className="flex flex-wrap gap-8">
              {agentDetail.tools.map((r) => (
                <>
                  <Card className="w-64">
                    <CardHeader>
                      <div className="">
                        <CardTitle>{r.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="grow text-sm">
                      {r.description}
                    </CardContent>
                    <CardFooter>
                      <div>
                        <McpClientTool
                          tool={r}
                          key={r.name}
                          clientId={agentDetail.id!}
                          disabled={!isAgentCallable}
                        />
                      </div>
                    </CardFooter>
                  </Card>
                </>
              ))}
            </div>
          </div>
        )}
      <div className="mt-4">
        <h2 className="font-bold mb-2">MCP Clients</h2>
        <div className="flex min-h-32 gap-12">
          <div className="grow-1">
            <p>Associated with this server</p>
            <ul
              className={`my-4 h-full ${draggingOver == 1 ? "bg-gray-300 rounded-2xl" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDraggingOver(1);
              }}
              onDragLeave={() => setDraggingOver(0)}
              onDrop={(e) => {
                setDraggingOver(0);
                const connectionId = e.dataTransfer.getData("connectionId");
                associateClient(connectionId);
              }}
            >
              {serverConnections.map((connection) => (
                <li
                  key={connection.id}
                  className="mb-1 flex gap-4 items-center p-2 border border-gray-700 rounded-xl bg-white"
                  draggable={isTheUserTheOwner}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("connectionId", connection.id || "");
                  }}
                >
                  <span
                    className={`w-4 h-4 rounded-full block ${connection.isConnected ? "bg-green-600" : "bg-red-500"}`}
                  />
                  <span className="grow-1">
                    {connection.name || "Unknown connection"}
                  </span>
                  <span onClick={() => dissociateClient(connection.id)}>
                    <MinusCircleIcon
                      width={16}
                      className="hover:text-blue-700"
                    />
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grow-1">
            <p>Available</p>
            <ul
              className={`my-4 h-full ${draggingOver == 2 ? "bg-gray-300 rounded-2xl" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDraggingOver(2);
              }}
              onDrop={(e) => {
                setDraggingOver(0);
                const connectionId = e.dataTransfer.getData("connectionId");
                dissociateClient(connectionId);
              }}
            >
              {unassociatedConnections.map((connection) => (
                <li
                  key={connection.id}
                  className="mb-1 flex gap-4 items-center p-2 border border-gray-700 rounded-2xl bg-white"
                  draggable={isTheUserTheOwner}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("connectionId", connection.id || "");
                  }}
                >
                  <span
                    className={`w-4 h-4 rounded-full block ${connection.isConnected ? "bg-green-600" : "bg-red-500"}`}
                  />
                  <span className="grow-1">
                    {connection.name || "Unknown connection"}
                  </span>
                  <span onClick={() => associateClient(connection.id!)}>
                    <PlusCircleIcon
                      width={16}
                      className="hover:text-blue-700"
                    />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
