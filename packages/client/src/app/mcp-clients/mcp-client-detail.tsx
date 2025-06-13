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

import { CreatorAndVisibilityEditor } from "@/components/creator-and-visibility-editor";
import PageTitle from "@/components/page-title";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserContext } from "@/context/contexes";
import { usePermissionChecker } from "@/hooks/use-permission-checker";
import { isWithErrorsObject, WithErrors } from "@/services/utils";
import { exceptionToMessage, isIdDefined } from "@/utils/type-utils";
import { isEqual } from "@react-hookz/deep-equal";
import { AuthenticationStrategy, entrypoint_schemas } from "aloha-shared";
import { useContext, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router";
import {
  catchError,
  distinctUntilChanged,
  EMPTY,
  exhaustMap,
  merge,
  Subject,
  switchMap,
  timer,
} from "rxjs";
import { toast } from "sonner";
import {
  getConnectionDetail,
  setConnectionCreator,
  setConnectionVisibility,
} from "../../services/mcp-clients";
import MCPClientDeleteDialog from "./mcp-client-delete-dialog";
import MCPClientEditDialog from "./mcp-client-edit-dialog";
import McpClientTool from "./mcp-client-tool";
import PromptDetail from "./mcp-prompt-detail";
import ResourceDetail from "./mcp-resource-detail";

const PING_TIMEOUT = 3000;
const forceFetch = new Subject<boolean>();

export default function MCPClientDetailsPage() {
  const loggedUser = useContext(UserContext);
  const params = useParams();
  const [connection, setConnection] = useState<
    | entrypoint_schemas.MCPConnectionDetail
    | WithErrors<entrypoint_schemas.MCPConnectionDetail>
    | null
  >(null);
  const [loading, setLoading] = useState(true);

  const fetchConnection = async () => forceFetch.next(true);

  const permissionCheker = usePermissionChecker();

  const isTheUserTheConnectionOwner = useMemo(() => {
    return permissionCheker.hasOwnership(connection);
  }, [connection, permissionCheker]);

  const isClientCallable = useMemo(() => {
    return (
      !isWithErrorsObject(connection) &&
      (permissionCheker.hasPublicVisibility(connection) ||
        isTheUserTheConnectionOwner)
    );
  }, [connection, isTheUserTheConnectionOwner, permissionCheker]);

  useEffect(() => {
    if (params.id) {
      const subscription = merge(forceFetch, timer(0, PING_TIMEOUT))
        .pipe(
          exhaustMap(() => getConnectionDetail(params.id!)),
          distinctUntilChanged(isEqual),
          switchMap(async (connection) => {
            console.log(`Set connection`, connection);
            setConnection(connection);
            setLoading(false);
            return EMPTY;
          }),
          catchError((e) => {
            console.error(e);
            toast.error(
              `Error while fetching clients: ${exceptionToMessage(e)}`
            );
            return EMPTY;
          })
        )
        .subscribe();
      return () => subscription.unsubscribe();
    }
  }, [params, params.id]);

  if (loading) return <></>;

  if (!connection)
    return (
      <div>
        Could not retrieve the client. If the error persists,{" "}
        <MCPClientDeleteDialog
          disabled={!permissionCheker.isAdministrator()}
          client={{
            id: params.id,
            isError: true,
            error: "Client error",
            name: "delete",
          }}
        />{" "}
        and create it again.
      </div>
    );

  const cutDescription = (description?: string): React.ReactNode => {
    if (!description) return <i>There is no description for this element</i>;
    if (description.length < 150) return description;
    return description.substring(0, 150) + "...";
  };

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <PageTitle>{connection.name}</PageTitle>
        <div className="flex">
          <MCPClientDeleteDialog
            client={connection}
            disabled={!isTheUserTheConnectionOwner}
          />
          <MCPClientEditDialog
            client={connection}
            disabled={!isTheUserTheConnectionOwner}
          />
        </div>
      </div>

      {"isError" in connection && (
        <p className="text-red-700 font-bold mb-4">
          There is an error with this client: <i>{connection.error}</i>
          <br /> To make sure it works correctly, fix it as soon as possible.
        </p>
      )}
      <p className="mb-2">
        Status:{" "}
        {connection.isConnected ? (
          <span className="text-green-600 font-bold">online</span>
        ) : (
          <span className="text-red-500 font-bold">offline</span>
        )}
      </p>
      <p className="mb-2">Description: {connection.description}</p>
      <p className="mb-2">
        URL: <span className="italic">{connection.serverUrl}</span>
      </p>
      {isIdDefined(connection) &&
        loggedUser &&
        loggedUser.permissions.includes(
          AuthenticationStrategy.Permissions.Administration
        ) && (
          <CreatorAndVisibilityEditor
            name="Client"
            item={connection}
            setVisibilityService={setConnectionVisibility}
            setCreatorService={setConnectionCreator}
            onAccept={fetchConnection}
          />
        )}

      {connection.id &&
        connection.isConnected &&
        connection.resources &&
        connection.resources.length > 0 && (
          <div>
            <h2 className="mb-2 mt-4 font-bold">Resources</h2>
            <div className="flex flex-wrap gap-8">
              {connection.resources.map((r) => (
                <>
                  <Card className="w-64">
                    <CardHeader>
                      <div className="">
                        <CardTitle>{r.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="grow text-sm">
                      {cutDescription(r.description)}
                    </CardContent>
                    <CardFooter>
                      <div>
                        <ResourceDetail
                          resource={r}
                          clientId={connection.id!}
                          disabled={!isClientCallable}
                        />
                      </div>
                    </CardFooter>
                  </Card>
                </>
              ))}
            </div>
          </div>
        )}
      {connection.resourceTemplates &&
        connection.isConnected &&
        !!connection.resourceTemplates.length && (
          <div>
            <h2 className="mb-2 mt-4 font-bold">Resource Templates</h2>
            <div className="flex flex-wrap gap-8">
              {connection.resourceTemplates.map((r) => (
                <>
                  <Card className="w-64">
                    <CardHeader>
                      <div className="">
                        <CardTitle>{r.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="grow text-sm">
                      {cutDescription(r.description)}
                    </CardContent>
                    <CardFooter>
                      <div>
                        <ResourceDetail
                          resource={r}
                          clientId={connection.id!}
                          disabled={!isClientCallable}
                        />
                      </div>
                    </CardFooter>
                  </Card>
                </>
              ))}
            </div>
          </div>
        )}
      {connection.prompts &&
        connection.isConnected &&
        !!connection.prompts.length && (
          <div>
            <h2 className="mb-2 mt-4 font-bold">Prompts</h2>
            <div className="flex flex-wrap gap-8">
              {connection.prompts.map((r) => (
                <>
                  <Card className="w-64">
                    <CardHeader>
                      <div className="">
                        <CardTitle>{r.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="grow text-sm">
                      {cutDescription(r.description)}
                    </CardContent>
                    <CardFooter>
                      <div>
                        <PromptDetail
                          prompt={r}
                          clientId={connection.id!}
                          disabled={!isClientCallable}
                        />
                      </div>
                    </CardFooter>
                  </Card>
                </>
              ))}
            </div>
          </div>
        )}
      {connection.tools &&
        connection.isConnected &&
        connection.id &&
        !!connection.tools.length && (
          <div>
            <h2 className="mb-2 mt-4 font-bold">Tools</h2>
            <div className="flex flex-wrap gap-8">
              {connection.tools.map((r) => (
                <>
                  <Card className="w-64">
                    <CardHeader>
                      <div className="">
                        <CardTitle>{r.name}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="grow text-sm">
                      {cutDescription(r.description)}
                    </CardContent>
                    <CardFooter>
                      <div>
                        <McpClientTool
                          disabled={!isClientCallable}
                          tool={r}
                          key={r.name}
                          clientId={connection.id!}
                        />
                      </div>
                    </CardFooter>
                  </Card>
                </>
              ))}
            </div>
          </div>
        )}
    </>
  );
}
