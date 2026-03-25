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
import Loading from "@/components/loading";
import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

import { usePermissionChecker } from "@/hooks/use-permission-checker";
import { getHubStatus, restartHub } from "@/services/hub";
import { isWithErrorsObject } from "@/services/utils";
import { exceptionToMessage } from "@/utils/type-utils";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { Separator } from "@/components/ui/separator";
import { endpoints_schemas } from "aloha-shared";
import { formatDistanceToNow } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { exhaustMap, merge, Subject, tap, timer } from "rxjs";
import { toast } from "sonner";
const forceGetStatus = new Subject<boolean>();

export default function HomePage() {
  const navigate = useNavigate();
  const [hubStatus, setHubStatus] =
    useState<endpoints_schemas.HubStatus | null>(null);

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

  return (
    <div className="" data-testid="home-page-witness">
      <div className="text mb-8">
        <div className="flex items-center justify-between mb-2">
          <PageTitle className="text-4xl font-bold text-foreground">
            Aloha!
          </PageTitle>
          {isAdministrator && (
            <ConfirmDialog
              message="Do you want to restart the HUB? This action will close all current active connections."
              onClick={() => {
                return doRestartManager();
              }}
            >
              <Button>
                <ArrowPathIcon className="w-5 h-5" />
                <span className="font-medium">Restart Hub</span>
              </Button>
            </ConfirmDialog>
          )}
        </div>
        <p className="text-xl mb-6">
          Welcome to the AI Logical Orchestrator Hub for Agents
        </p>
      </div>

      {!hubStatus ? (
        <Loading message="Checking the status of the hub..." />
      ) : (
        <>
          <div className="flex items-center mb-4">
            <span className="mr-2">Hub Status:</span>
            {hubStatus.manager.startDate !== null ? (
              <span className="text-green-600 font-semibold">
                Online since {formatDistanceToNow(hubStatus.manager.startDate)}
              </span>
            ) : (
              <span className="text-red-600 font-semibold">Offline</span>
            )}
          </div>

          <Separator className="my-8" />

          <div className="flex flex-wrap justify-center gap-4 my-8">
            <div className="w-64">
              <Card
                className="transform hover:scale-105 transition-all duration-200 ease-in-out cursor-pointer bg-white shadow-lg rounded-xl border border-gray-100 hover:shadow-xl"
                onClick={() => navigate("/clients")}
              >
                <CardContent className="flex flex-col items-center justify-center flex-1 p-6">
                  <div className="text-6xl font-bold text-foreground mb-2">
                    {hubStatus.clients.online}
                  </div>
                </CardContent>
                <CardFooter className="pt-0 pb-4">
                  <p className="text-center w-full text-sm font-medium text-muted-foreground">
                    MCP Clients Online
                  </p>
                </CardFooter>
              </Card>
            </div>
            <div className="w-64">
              <Card
                className="transform hover:scale-105 transition-all duration-200 ease-in-out cursor-pointer bg-white shadow-lg rounded-xl border border-gray-100 hover:shadow-xl"
                onClick={() => navigate("/agents")}
              >
                <CardContent className="flex flex-col items-center justify-center flex-1 p-6">
                  <div className="text-6xl font-bold text-foreground mb-2">
                    {hubStatus.agents.online}
                  </div>
                </CardContent>
                <CardFooter className="pt-0 pb-4">
                  <p className="text-center w-full text-sm font-medium text-muted-foreground">
                    Agents Online
                  </p>
                </CardFooter>
              </Card>
            </div>
            <div className="w-64">
              <Card
                className="transform hover:scale-105 transition-all duration-200 ease-in-out cursor-pointer bg-white shadow-lg rounded-xl border border-gray-100 hover:shadow-xl"
                onClick={() => navigate("/servers")}
              >
                <CardContent className="flex flex-col items-center justify-center flex-1 p-6">
                  <div className="text-6xl font-bold text-foreground mb-2">
                    {hubStatus.servers.total}
                  </div>
                </CardContent>
                <CardFooter className="pt-0 pb-4">
                  <p className="text-center w-full text-sm font-medium text-muted-foreground">
                    Servers
                  </p>
                </CardFooter>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
