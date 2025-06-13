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
import { CreatorAndVisibilityEditor } from "@/components/creator-and-visibility-editor";
import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { usePermissionChecker } from "@/hooks/use-permission-checker";
import { useService } from "@/hooks/useService";
import { getAgentsList } from "@/services/agents";
import { exceptionToMessage, isIdDefined } from "@/utils/type-utils";
import {
  MinusCircleIcon,
  PencilIcon,
  PlusCircleIcon,
  TrashIcon,
} from "@heroicons/react/16/solid";
import { entrypoint_schemas } from "aloha-shared";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { getConnectionList } from "../../services/mcp-clients";
import {
  connectClientToServer,
  deleteServer,
  disconnectClientFromServer,
  getServerDetail,
  setServerCreator,
  setServerVisibility,
} from "../../services/mcp-servers";
import MCPServerEditDialog from "./mcp-server-edit-dialog";

export default function MCPServerDetailPage() {
  const permissionChecker = usePermissionChecker();
  const { id } = useParams<{ id: string }>();
  const [isServerLoading, serverDetail, setServerDetail] = useService(
    (id) => getServerDetail(id),
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
    () => isConnectionLoading || isServerLoading,
    [isConnectionLoading, isServerLoading]
  );

  const [draggingOver, setDraggingOver] = useState(0);

  const permissionCheker = usePermissionChecker();

  const isTheUserTheOwner = useMemo(() => {
    return permissionCheker.hasOwnership(serverDetail);
  }, [serverDetail, permissionCheker]);

  const navigate = useNavigate();

  const refreshClients = useCallback(
    async (id?: string) => {
      try {
        const connections = await getConnectionList();
        const agents =
          (await getAgentsList()) as unknown as entrypoint_schemas.MCPConnectionStatus[];
        setAllConnections(
          [
            ...connections.filter((c) => !("isError" in c)),
            ...agents.filter((c) => c !== undefined && !("isError" in c)),
          ].filter((c) => c !== undefined)
        );
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch connection list");
      }
      try {
        if (id !== undefined) {
          const detail = await getServerDetail(id);
          setServerDetail(detail);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch server details");
      }
    },
    [setServerDetail, setAllConnections]
  );

  useEffect(() => {
    refreshClients(id);
  }, [id, refreshClients]);

  const associateClient = useCallback(
    async (clientId: string) => {
      if (!isTheUserTheOwner) {
        return;
      }

      if (id) {
        try {
          await connectClientToServer(id, clientId);
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
          await disconnectClientFromServer(id, clientId);
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

  if (!id || !serverDetail) {
    return <div>Server not found</div>;
  }

  const serverConnections = serverDetail.connectionsDetail || [];
  const associatedConnections = serverConnections.map((conn) => conn.name);
  const unassociatedConnections = allConnections.filter(
    (conn) => !associatedConnections.includes(conn.name)
  );

  const EditDialog = ({ disabled }: { disabled: boolean }) => {
    return (
      <MCPServerEditDialog
        serverId={id}
        trigger={
          <Button disabled={disabled}>
            <PencilIcon /> Edit Server
          </Button>
        }
        onAccept={async () => {
          await refreshClients(id);
        }}
      ></MCPServerEditDialog>
    );
  };

  async function doDeleteServer() {
    try {
      await deleteServer(id!);
      navigate(`/mcp-servers`);
    } catch (e) {
      console.error(e);
      toast.error(exceptionToMessage(e));
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <PageTitle>{serverDetail.name}</PageTitle>
        <div className="flex">
          <ConfirmDialog
            onClick={() => {
              return doDeleteServer();
            }}
          >
            <Button
              className="mr-2"
              variant="destructive"
              disabled={!isTheUserTheOwner}
            >
              <TrashIcon />
              Delete Server
            </Button>
          </ConfirmDialog>
          <EditDialog disabled={!isTheUserTheOwner}></EditDialog>
          {/* <Button onClick={() => setEditFormOpen(true)}> */}
          {/*   <PencilIcon /> */}
          {/*   Edit Server */}
          {/* </Button> */}
        </div>
      </div>
      {"isError" in serverDetail && (
        <p className="text-red-700 font-bold mb-4">
          There is an error with this server: <i>{serverDetail.error}</i>
          <br />
          To make sure it works correctly, fix it as soon as possible.
        </p>
      )}
      <p className="mb-2">
        Server path:{" "}
        <i>
          {window.location.origin}/api/mcp/{serverDetail.serverPath}/sse
        </i>
      </p>
      {serverDetail.description && (
        <p className="mb-2">Description: {serverDetail.description}</p>
      )}

      {serverDetail.tags && serverDetail.tags.length > 0 && (
        <p className="mb-2">
          <strong className="font-bold">Tags:</strong>{" "}
          {serverDetail.tags.join(", ")}
        </p>
      )}
      {isIdDefined(serverDetail) && permissionChecker.isAdministrator() && (
        <CreatorAndVisibilityEditor
          name="Agent"
          item={serverDetail}
          setVisibilityService={setServerVisibility}
          setCreatorService={setServerCreator}
          onAccept={() => refreshClients(id)}
        />
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
                    className={`w-4 h-4 rounded-full block ${"isConnected" in connection && connection.isConnected ? "bg-green-600" : "bg-red-500"}`}
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
