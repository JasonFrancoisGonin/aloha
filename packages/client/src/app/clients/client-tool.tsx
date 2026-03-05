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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import DynamicJsonForm from "@/mcp-inspector/DynamicJsonForm";
import JsonView from "@/mcp-inspector/JsonView";
import { sendMCPClientRequest } from "@/services/clients";
import { JsonSchemaType, JsonValue } from "@/utils/jsonUtils";
import { generateDefaultValue } from "@/utils/schemaUtils";
import { exceptionToMessage } from "@/utils/type-utils";
import { ClockIcon, PlayIcon } from "@heroicons/react/16/solid";
import {
  CallToolResultSchema,
  CompatibilityCallToolResult,
  CompatibilityCallToolResultSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import React from "react";

type Props = {
  tool: Tool;
  clientId: string;
  disabled: boolean;
};

export default function MCPClientTool({ tool, clientId, disabled }: Props) {
  const [open, setOpen] = React.useState(false);
  const [params, setParams] = React.useState<Record<string, unknown>>({});
  const [isToolRunning, setIsToolRunning] = React.useState(false);
  const [toolResult, setToolResult] =
    React.useState<CompatibilityCallToolResult | null>(null);
  const [descriptionOpen, setDescriptionOpen] = React.useState(false);

  const toolResultRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (open) {
      setToolResult(null);
      setParams({});
    }
  }, [open]);

  const renderToolResult = () => {
    if (!toolResult) return null;

    if ("content" in toolResult) {
      const parsedResult = CallToolResultSchema.safeParse(toolResult);
      if (!parsedResult.success) {
        return (
          <>
            <h4 className="font-semibold mb-2">Invalid Tool Result:</h4>
            <JsonView data={toolResult} />
            <h4 className="font-semibold mb-2">Errors:</h4>
            {parsedResult.error.issues.map((error, idx) => (
              <JsonView data={error} key={idx} />
            ))}
          </>
        );
      }
      const structuredResult = parsedResult.data;
      const isError = structuredResult.isError ?? false;

      return (
        <>
          <h4 className="font-semibold mb-2">
            Tool Result:{" "}
            {isError ? (
              <span className="text-red-600 font-semibold">Error</span>
            ) : (
              <span className="text-green-600 font-semibold">Success</span>
            )}
          </h4>
          {structuredResult.content.map((item, index) => (
            <div key={index} className="mb-2">
              {item.type === "text" && (
                <JsonView data={item.text} isError={isError} />
              )}
              {item.type === "image" && (
                <img
                  src={`data:${item.mimeType};base64,${item.data}`}
                  alt="Tool result image"
                  className="max-w-full h-auto"
                />
              )}
              {item.type === "resource" &&
                (item.resource?.mimeType?.startsWith("audio/") ? (
                  <audio
                    controls
                    src={`data:${item.resource.mimeType};base64,${item.resource.uri}`}
                    className="w-full"
                  >
                    <p>Your browser does not support audio playback</p>
                  </audio>
                ) : (
                  <JsonView data={item.resource} />
                ))}
            </div>
          ))}
        </>
      );
    } else if ("toolResult" in toolResult) {
      return (
        <>
          <h4 className="font-semibold mb-2">Tool Result (Legacy):</h4>

          <JsonView data={toolResult.toolResult} />
        </>
      );
    }
  };

  const callTool = async (name: string, params: Record<string, unknown>) => {
    try {
      const response = await sendMCPClientRequest(
        clientId,
        {
          method: "tools/call" as const,
          params: {
            name,
            arguments: params,
          },
        },
        CompatibilityCallToolResultSchema
      );
      setToolResult(response);
    } catch (e) {
      const result: CompatibilityCallToolResult = {
        content: [
          {
            type: "text",
            text: exceptionToMessage(e),
          },
        ],
        isError: true,
      };
      setToolResult(result);
    } finally {
      setTimeout(() => {
        if (toolResultRef.current) {
          toolResultRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 250);
    }
  };
  return (
    <Dialog onOpenChange={setOpen}>
      <DialogTrigger asChild disabled={disabled}>
        <Button variant="outline">
          <PlayIcon /> Run Tool
        </Button>
      </DialogTrigger>
      {open && (
        <DialogContent className="min-w-[80vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Test {tool.name}</DialogTitle>
            <DialogDescription>
              <p>
                {!!tool.description && tool.description.length > 150 ? (
                  <>
                    {descriptionOpen ? (
                      <>
                        {tool.description}{" "}
                        <span
                          className="text-blue-500 hover:text-blue-800 cursor-pointer underline"
                          onClick={() => setDescriptionOpen(false)}
                        >
                          see less
                        </span>
                      </>
                    ) : (
                      <>
                        {tool.description.slice(0, 150)}...{" "}
                        <span
                          className="text-blue-500 hover:text-blue-800 cursor-pointer underline"
                          onClick={() => setDescriptionOpen(true)}
                        >
                          see more
                        </span>
                      </>
                    )}
                  </>
                ) : (
                  tool.description
                )}
              </p>
              <hr className="my-2" />
              <p>Fill the fields here below and press the button "run"</p>
            </DialogDescription>
          </DialogHeader>
          <div className="grow overflow-y-auto">
            {Object.entries(tool.inputSchema.properties ?? []).map(
              ([key, value]) => {
                const prop = value as JsonSchemaType;
                return (
                  <div key={key} className="mb-4">
                    <Label
                      htmlFor={key}
                      className="block text-sm font-medium text-gray-700"
                    >
                      {key}
                    </Label>
                    {prop.type === "boolean" ? (
                      <div className="flex items-center space-x-2 mt-2">
                        <Checkbox
                          id={key}
                          name={key}
                          checked={!!params[key]}
                          onCheckedChange={(checked: boolean) =>
                            setParams({
                              ...params,
                              [key]: checked,
                            })
                          }
                        />
                        <label
                          htmlFor={key}
                          className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          {prop.description || "Toggle this option"}
                        </label>
                      </div>
                    ) : prop.type === "string" ? (
                      <Textarea
                        id={key}
                        name={key}
                        placeholder={prop.description}
                        value={(params[key] as string) ?? ""}
                        onChange={(e) =>
                          setParams({
                            ...params,
                            [key]: e.target.value,
                          })
                        }
                        className="mt-1"
                      />
                    ) : prop.type === "object" || prop.type === "array" ? (
                      <div className="mt-1">
                        <DynamicJsonForm
                          schema={{
                            type: prop.type,
                            properties: prop.properties,
                            description: prop.description,
                            items: prop.items,
                          }}
                          value={
                            (params[key] as JsonValue) ??
                            generateDefaultValue(prop)
                          }
                          onChange={(newValue: JsonValue) => {
                            setParams({
                              ...params,
                              [key]: newValue,
                            });
                          }}
                        />
                      </div>
                    ) : prop.type === "number" || prop.type === "integer" ? (
                      <Input
                        type="number"
                        id={key}
                        name={key}
                        placeholder={prop.description}
                        value={(params[key] as string) ?? ""}
                        onChange={(e) =>
                          setParams({
                            ...params,
                            [key]: Number(e.target.value),
                          })
                        }
                        className="mt-1"
                      />
                    ) : (
                      <div className="mt-1">
                        <DynamicJsonForm
                          schema={{
                            type: prop.type,
                            properties: prop.properties,
                            description: prop.description,
                            items: prop.items,
                          }}
                          value={params[key] as JsonValue}
                          onChange={(newValue: JsonValue) => {
                            setParams({
                              ...params,
                              [key]: newValue,
                            });
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              }
            )}
            <div ref={toolResultRef}>{toolResult && renderToolResult()}</div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={async () => {
                try {
                  setIsToolRunning(true);
                  await callTool(tool.name, params);
                } finally {
                  setIsToolRunning(false);
                }
              }}
              disabled={isToolRunning}
            >
              {isToolRunning ? (
                <>
                  <ClockIcon />
                  Running...
                </>
              ) : (
                <>
                  <PlayIcon />
                  Run Tool
                </>
              )}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
