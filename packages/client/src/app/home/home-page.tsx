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
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { usePermissionChecker } from "@/hooks/use-permission-checker";
import { getHubStatus, restartHub } from "@/services/mcp-hub";
import { isWithErrorsObject } from "@/services/utils";
import { exceptionToMessage } from "@/utils/type-utils";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { entrypoint_schemas } from "aloha-shared";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { exhaustMap, merge, Subject, tap, timer } from "rxjs";
import { toast } from "sonner";

const forceGetStatus = new Subject<boolean>();

export default function HomePage() {
  const [hubStatus, setHubStatus] =
    useState<entrypoint_schemas.HubStatus | null>(null);

  useEffect(() => {
    const subscription = merge(forceGetStatus, timer(0, 5_000))
      .pipe(
        exhaustMap(async () => {
          try {
            const result = await getHubStatus();
            if (isWithErrorsObject(result)) {
              throw new Error(result.error);
            }
            return result;
          } catch (err) {
            console.log(`Error`, err);
            return null;
          }
        }),

        // distinctUntilChanged(isEqual),

        tap((status) => {
          setHubStatus(status);
        })
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const doRestartManager = useCallback(async () => {
    try {
      await restartHub();
      forceGetStatus.next(true);
    } catch (err) {
      toast.error(exceptionToMessage(err));
    }
  }, []);

  const permissionChecker = usePermissionChecker();

  const isAdministrator = useMemo(() => {
    return permissionChecker.isAdministrator();
  }, [permissionChecker]);

  if (!hubStatus) {
    return (
      <>
        <PageTitle>Aloha!</PageTitle>
        <Label>Loading ... </Label>
      </>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <PageTitle>Aloha!</PageTitle>
        {isAdministrator && (
          <ConfirmDialog
            message="Do you want to restart the HUB? This action will close all currennt active connections."
            onClick={() => {
              return doRestartManager();
            }}
          >
            <Button className="mr-2" variant="destructive">
              <ArrowPathIcon />
              Restart Hub
            </Button>
          </ConfirmDialog>
        )}
      </div>
      {/* <h1 className="text-3xl font-bold mb-4">Aloha!</h1> */}
      <p className="mb-2">
        Welcome to the AI Logical Orchestrator Hub for Agents.
      </p>
      <p className="mb-2">
        The Hub is{" "}
        {hubStatus.manager.startDate !== null ? (
          <>
            <span className="text-green-700 font-bold">online</span> since{" "}
            {formatDistanceToNow(hubStatus.manager.startDate)}
          </>
        ) : (
          <span className="text-red-700 font-bold">offline</span>
        )}
        .
      </p>
      <div className="flex gap-2 flex-wrap">
        <div className="w-64">
          <Card>
            <CardContent className="text-center">
              <span className="text-6xl">{hubStatus.clients.online}</span>
            </CardContent>
            <CardFooter>
              <div className="text-center w-full">MCP Clients online</div>
            </CardFooter>
          </Card>
        </div>
        <div className="w-64">
          <Card>
            <CardContent className="text-center">
              <span className="text-6xl">{hubStatus.agents.online}</span>
            </CardContent>
            <CardFooter>
              <div className="text-center w-full">Agents online</div>
            </CardFooter>
          </Card>
        </div>
        <div className="w-64">
          <Card>
            <CardContent className="text-center">
              <span className="text-6xl">{hubStatus.servers.total}</span>
            </CardContent>
            <CardFooter>
              <div className="text-center w-full">MCP Servers</div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
