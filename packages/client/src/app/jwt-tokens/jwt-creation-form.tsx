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
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useService } from "@/hooks/useService";
import { cn } from "@/lib/utils";
import { CalendarIcon, DocumentCheckIcon } from "@heroicons/react/16/solid";
import { zodResolver } from "@hookform/resolvers/zod";
import { addYears, format } from "date-fns";
import { ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { getProjectsList } from "../../services/projects";
import { createToken } from "../../services/tokens";
import { exceptionToMessage } from "../../utils/type-utils";

const CreateTokenSchema = z.object({
  project: z.string(),
  expirationDate: z.date({ coerce: true }),
});
type CreateToken = z.infer<typeof CreateTokenSchema>;
type Props = {
  onAccept: () => Promise<void>;
  children: ReactNode;
};
export default function JWTCreationForm({ onAccept, children }: Props) {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  const [isLoadingProjects, projects] = useService(
    getProjectsList,
    [],
    [],
    [dialogOpen]
  );

  const [token, setToken] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(CreateTokenSchema),
  });

  async function onSubmit(values: CreateToken) {
    try {
      const newToken = await createToken(
        values.project,
        format(values.expirationDate, "yyyy-MM-dd")
      );
      if (newToken) {
        // navigate(`/mcp-clients`);
        // return null;
        setToken(newToken);
        await onAccept();
      } else {
        toast.error("Unknown error occurred");
      }
    } catch (e) {
      console.error(e);
      toast.error(`Error while creating the token: ${exceptionToMessage(e)}`);
    }
  }

  const copyToClipboard = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      toast.success("Token copied to clipboard!");
    }
  };

  const downloadToken = () => {
    if (token) {
      const element = document.createElement("a");
      const file = new Blob([token], { type: "text/plain" });
      element.href = URL.createObjectURL(file);
      element.download = "jwt-token.txt";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      toast.success("Token downloaded!");
    }
  };

  const resetDialog = () => {
    form.reset();
    setToken(null);
  };

  const now = new Date();
  const nextYear = addYears(now, 1);

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild onClick={() => resetDialog()}>
          {children}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {!token ? "Create a JWT Bearer Token" : "Your JWT Bearer Token"}
              {isLoadingProjects && " - Loading"}
            </DialogTitle>
          </DialogHeader>
          {token && (
            <div>
              <p className="text-sm whitespace-break-spaces text-wrap break-all max-w-96">
                {token}
              </p>
              <p className="text-sm text-gray-600 mt-4">
                This token is not stored on the server. Please save it securely.
              </p>
              <DialogFooter>
                <div className="mt-4">
                  <DialogClose asChild>
                    <Button type="button" variant="secondary" className="mr-2">
                      Close
                    </Button>
                  </DialogClose>
                  <Button
                    type="button"
                    onClick={copyToClipboard}
                    className="mr-2"
                  >
                    Copy Token
                  </Button>
                  <Button
                    type="button"
                    onClick={downloadToken}
                    className="bg-green-500 text-white  hover:bg-green-600"
                  >
                    Download Token
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
          {!token && (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8 border p-4 rounded bg-white"
              >
                <FormField
                  control={form.control}
                  name="project"
                  render={({ field }) => {
                    return (
                      <FormItem>
                        <FormLabel>Project</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger disabled={isLoadingProjects}>
                              <SelectValue placeholder="Select a Project" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {projects?.map((p) => (
                              <SelectItem value={p.projectId} key={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Select the project that should be accessed by using
                          the JWT Token
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />
                <FormField
                  control={form.control}
                  name="expirationDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Expiry date</FormLabel>
                      <Popover modal={true}>
                        <PopoverTrigger asChild disabled={isLoadingProjects}>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-[240px] pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > nextYear || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        The expity date for the token.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter className="justify-end">
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    disabled={form.formState.isSubmitting || isLoadingProjects}
                  >
                    <DocumentCheckIcon />
                    {form.formState.isSubmitting ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
