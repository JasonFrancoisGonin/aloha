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
import { exceptionToMessage } from "@/utils/type-utils";
import {
  ExclamationTriangleIcon,
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
import AgentEditDialog from "./agent-edit-dialog";
import AgentTokenDialog from "./agent-token-dialog";
import ConnectionTypeIndicator from "@/components/connection-type-indicator";
import { getAllGenericConnections } from "@/services/testbed-agents";
import { Separator } from "@/components/ui/separator";
import { ScrollableUrl } from "@/components/scrollable-url";
import MCPClientTool from "../clients/client-tool";

const PING_TIMEOUT = 5000;

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [isAgentLoading, agentDetail, , refreshAgent] = useService(
    (id) => getAgentDetail(id),
    [id],
    null,
    [],
    PING_TIMEOUT
  );

  const [, allConnections] = useService(
    () => getAllGenericConnections(id, true, true, false),
    [id],
    [],
    [],
    PING_TIMEOUT
  );

  const [draggingOver, setDraggingOver] = useState(0);

  const navigate = useNavigate();

  const permissionCheker = usePermissionChecker();

  const isTheUserTheOwner = useMemo(() => {
    return permissionCheker.hasOwnership(agentDetail);
  }, [agentDetail, permissionCheker]);

  const isClientCallable = useMemo(() => {
    return (
      !isWithErrorsObject(agentDetail) &&
      permissionCheker.hasVisibility(agentDetail)
    );
  }, [agentDetail, permissionCheker]);

  const associateClient = useCallback(
    async (clientId: string) => {
      if (!isTheUserTheOwner) {
        return;
      }

      if (id) {
        try {
          await connectClientToAgent(id, clientId);
          refreshAgent();
        } catch (err) {
          console.error(err);
          toast.error("Failed to fetch connection list");
        }
      }
    },
    [id, refreshAgent, isTheUserTheOwner]
  );

  const dissociateClient = useCallback(
    async (clientId: string) => {
      if (!isTheUserTheOwner) {
        return;
      }

      if (id) {
        try {
          await disconnectClientFromAgent(id, clientId);
          refreshAgent();
        } catch (err) {
          console.error(err);
          toast.error("Failed to fetch connection list");
        }
      }
    },
    [id, refreshAgent, isTheUserTheOwner]
  );

  if (isAgentLoading) {
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
          refreshAgent();
        }}
      ></AgentEditDialog>
    );
  };

  async function doDeleteAgent() {
    try {
      await deleteAgent(id!);
      navigate(`/agents`);
    } catch (e) {
      console.error(e);
      toast.error(exceptionToMessage(e));
    }
  }

  return (
    <div className="max-w-8xl mx-auto px-4">
      {/* Header Section */}
      <div className="">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-6 gap-4">
          <div className="flex-1 min-w-0">
            <PageTitle
              className="flex gap-6 items-center"
              isConnected={agentDetail.isConnected}
            >
              {agentDetail.name}
            </PageTitle>
            {agentDetail.description && (
              <p className="text-gray-600 text-lg leading-relaxed max-w-3xl">
                {agentDetail.description}
              </p>
            )}
          </div>
          <div className="flex flex-shrink-0 gap-2 sm:ml-8 self-start">
            <ConfirmDialog
              onClick={() => {
                return doDeleteAgent();
              }}
            >
              <Button variant="destructive" disabled={!isTheUserTheOwner}>
                <TrashIcon />
                Delete Agent
              </Button>
            </ConfirmDialog>
            <EditDialog disabled={!isTheUserTheOwner}></EditDialog>
          </div>
        </div>
        {"isError" in agentDetail && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-800 mb-1">
                  Client Connection Error
                </h3>
                <p className="text-red-700">
                  There is an error with this client:{" "}
                  <span className="font-mono italic">{agentDetail.error}</span>
                </p>
                <p className="text-red-600 text-sm mt-1">
                  To ensure proper functionality, please fix this issue as soon
                  as possible.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <Separator />

      <div className="rounded-xl my-8">
        <div className="lg:flex gap-12">
          {/* Configuration Panel */}
          <div className="lg:w-1/3">
            <div className="space-y-2">
              <dt className="text-sm font-semibold uppercase tracking-wide">
                Server URL
              </dt>
              <ScrollableUrl
                url={agentDetail.serverUrl}
                className="max-w-full"
              />
            </div>

            <div className="mt-6">
              {agentDetail.id !== undefined && (
                <CreatorAndVisibilityEditor
                  name="Client"
                  item={
                    agentDetail as schemas.VisibilityInterface &
                      schemas.WithIdBase
                  }
                  setVisibilityService={setAgentVisibility}
                  setCreatorService={setAgentCreator}
                  onAccept={async () => refreshAgent()}
                />
              )}
            </div>
          </div>

          <div className="lg:w-2/3 mt-8 lg:mt-0">
            {agentDetail.tools &&
              agentDetail.isConnected &&
              agentDetail.id &&
              !!agentDetail.tools.length && (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    {agentDetail.tools.map((r) => (
                      <Card
                        key={r.name}
                        className="transform hover:scale-105 transition-all duration-200 ease-in-out cursor-pointer bg-white shadow-lg rounded-xl border border-gray-100 hover:shadow-xl flex flex-col h-full"
                        style={{
                          animation: "fadeInUp 0.3s ease-out forwards",
                        }}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-semibold text-gray-900">
                              {r.name}
                            </CardTitle>
                          </div>
                        </CardHeader>
                        <CardContent className="flex-grow text-sm text-gray-600 pb-3">
                          {r.description ? (
                            <p className="text-gray-600 line-clamp-3">
                              {r.description}
                            </p>
                          ) : (
                            <p className="italic text-gray-400">
                              No description provided.
                            </p>
                          )}
                        </CardContent>
                        <CardFooter className="pt-0">
                          <MCPClientTool
                            disabled={!isClientCallable}
                            tool={r}
                            clientId={agentDetail.id!}
                          />
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>

      <Separator />

      <div className="rounded-xl my-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
          <h2 className="text-xl font-semibold text-gray-900">MCP Clients</h2>
          <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            Drag & drop to manage associations
          </div>
        </div>

        {/* Agent Path */}
        <div className="space-y-2 py-4">
          <dt className="text-sm font-semibold uppercase tracking-wide">
            MCP Clients Connections info
          </dt>

          <div className="flex w-full items-center justify-between gap-4">
            <ScrollableUrl
              url={`${window.location.origin}/api/mcp/${agentDetail.serverPath}/mcp`}
              className="max-w-full grow"
            />
            {!("isError" in agentDetail && agentDetail.isError) && (
              <AgentTokenDialog
                agent={agentDetail as schemas.AgentWithId}
                disabled={!isTheUserTheOwner}
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* Associated Clients */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <h3 className="font-medium text-gray-700">
                Associated with Agent
              </h3>
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                {serverConnections.length}
              </span>
            </div>

            <div
              className={`min-h-40 p-4 rounded-xl border-2 border-dashed transition-all duration-200 ${
                draggingOver === 1
                  ? "border-blue-400 bg-blue-50/70 shadow-lg scale-[1.02]"
                  : "border-gray-200 bg-gray-50/50 hover:bg-gray-50"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDraggingOver(1);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDraggingOver(0);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDraggingOver(0);
                const connectionId = e.dataTransfer.getData("connectionId");
                associateClient(connectionId);
              }}
            >
              {serverConnections.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                  <div className="w-8 h-8 mb-2 opacity-40">
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                    </svg>
                  </div>
                  {/* color dark gray */}
                  <p className="text-sm text-gray-500">
                    Drop clients here to associate
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {serverConnections.map((connection, index) => (
                    <div
                      key={connection.id}
                      className={`group flex items-center gap-3 p-3 bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 ${
                        isTheUserTheOwner
                          ? "cursor-grab active:cursor-grabbing"
                          : "cursor-default"
                      }`}
                      draggable={isTheUserTheOwner}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          "connectionId",
                          connection.id || ""
                        );
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      style={{
                        animationDelay: `${index * 50}ms`,
                        animation: "fadeInUp 0.3s ease-out forwards",
                      }}
                    >
                      <ConnectionTypeIndicator type={connection.type} />

                      <div
                        className={`w-3 h-3 rounded-full flex-shrink-0 shadow-sm ${
                          connection.isConnected
                            ? "bg-emerald-500 shadow-emerald-200"
                            : "bg-red-500 shadow-red-200"
                        }`}
                      >
                        <div
                          className={`w-full h-full rounded-full animate-pulse ${
                            connection.isConnected
                              ? "bg-emerald-400"
                              : "bg-red-400"
                          }`}
                        ></div>
                      </div>

                      <span className="flex-1 font-medium text-gray-900 truncate">
                        {connection.name || "Unknown connection"}
                      </span>

                      {isTheUserTheOwner && (
                        <button
                          onClick={() => dissociateClient(connection.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 group-hover:opacity-100"
                          title="Remove association"
                        >
                          <MinusCircleIcon width={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Available Clients */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <h3 className="font-medium text-gray-700">Available Clients</h3>
              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                {unassociatedConnections.length}
              </span>
            </div>

            <div
              className={`min-h-40 p-4 rounded-xl border-2 border-dashed transition-all duration-200 ${
                draggingOver === 2
                  ? "border-gray-400 bg-gray-100 shadow-lg scale-[1.02]"
                  : "border-gray-200 bg-gray-50/30 hover:bg-gray-50/50"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDraggingOver(2);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDraggingOver(0);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDraggingOver(0);
                const connectionId = e.dataTransfer.getData("connectionId");
                dissociateClient(connectionId);
              }}
            >
              {unassociatedConnections.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                  <div className="w-8 h-8 mb-2 opacity-40">
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </div>
                  <p className="text-sm">All clients are associated</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {unassociatedConnections.map((connection, index) => (
                    <div
                      key={connection.id}
                      className={`group flex items-center gap-3 p-3 bg-white rounded-lg border shadow-sm hover:shadow-md transition-all duration-200 ${
                        isTheUserTheOwner
                          ? "cursor-grab active:cursor-grabbing"
                          : "cursor-default"
                      }`}
                      draggable={isTheUserTheOwner}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          "connectionId",
                          connection.id || ""
                        );
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      style={{
                        animationDelay: `${index * 50}ms`,
                        animation: "fadeInUp 0.3s ease-out forwards",
                      }}
                    >
                      <ConnectionTypeIndicator type={connection.type} />

                      <div
                        className={`w-3 h-3 rounded-full flex-shrink-0 shadow-sm ${
                          connection.isConnected
                            ? "bg-emerald-500 shadow-emerald-200"
                            : "bg-red-500 shadow-red-200"
                        }`}
                      >
                        <div
                          className={`w-full h-full rounded-full animate-pulse ${
                            connection.isConnected
                              ? "bg-emerald-400"
                              : "bg-red-400"
                          }`}
                        ></div>
                      </div>

                      <span className="flex-1 font-medium text-gray-900 truncate">
                        {connection.name || "Unknown connection"}
                      </span>

                      {isTheUserTheOwner && (
                        <button
                          onClick={() => associateClient(connection.id!)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50"
                          title="Associate with server"
                        >
                          <PlusCircleIcon width={18} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
