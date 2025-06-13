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

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useService } from "@/hooks/useService";
import { getServersListByConnectionId } from "@/services/mcp-servers";
import { zodResolver } from "@hookform/resolvers/zod";
import { schemas } from "aloha-shared";
import { TrashIcon } from "@heroicons/react/16/solid";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { z } from "zod";
import { deleteConnection } from "../../services/mcp-clients";
import { exceptionToMessage } from "../../utils/type-utils";
import { WithErrors } from "@/services/utils";

export default function MCPClientDeleteDialog({
  disabled,
  client,
}: {
  disabled: boolean;
  client:
    | schemas.MCPConnectionOptionsWithId
    | WithErrors<schemas.MCPConnectionOptionsWithId>;
}) {
  const DeleteFormSchema = z.object({
    name: z.literal(client.name),
  });

  const navigate = useNavigate();

  const [deleteFormOpen, setDeleteFormOpen] = useState(false);
  const [isLoading, serversImpacted] = useService(
    getServersListByConnectionId,
    [client.id],
    []
  );

  const form = useForm({
    resolver: zodResolver(DeleteFormSchema),
    values: {
      name: "",
    },
  });

  async function onSubmit() {
    try {
      if (client.id) {
        await deleteConnection(client.id);
        setDeleteFormOpen(false);
        navigate(`/mcp-clients`);
      }
      return null;
    } catch (e) {
      console.error(e);
      toast.error(exceptionToMessage(e));
    }
  }

  return (
    <>
      <Dialog open={deleteFormOpen} onOpenChange={setDeleteFormOpen}>
        <DialogTrigger asChild disabled={disabled}>
          <Button variant="destructive" className="mr-2">
            <TrashIcon /> Delete Client
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Are you really sure {isLoading && " - Loading..."}
            </DialogTitle>
          </DialogHeader>
          <div>
            <p>Are you sure you want to delete the client?</p>
            {serversImpacted.length > 0 && (
              <>
                <p>
                  The servers listed here below will be updated by deleting the
                  connection to the client.
                </p>
                <Separator className="mt-2 mb-2" />
                <ul>
                  {serversImpacted.map((e) => (
                    <li key={e.id}>
                      <b>{e.name} </b> - {e.serverPath}
                    </li>
                  ))}
                </ul>
                <Separator className="mt-2 mb-2" />
              </>
            )}
            To delete the client, type <b>"{client.name}" </b>in the text box.
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-auto">
              <FormField
                name="name"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        {...field}
                        type="text"
                        name="name"
                        disabled={isLoading}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setDeleteFormOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    variant="destructive"
                  >
                    {form.formState.isSubmitting || isLoading
                      ? "Deleting..."
                      : "Delete connection"}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
