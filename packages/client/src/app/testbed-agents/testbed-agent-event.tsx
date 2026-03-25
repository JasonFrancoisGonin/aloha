/*
Copyright (C) 2025 European Union

Licensed under the EUPL, Version 1.2 or – as soon they will be approved by the
European Commission – subsequent versions of the EUPL (the "Licence");
You may not use this work except in compliance with the Licence.
You may obtain a copy of the Licence at:
* https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12 *

Unless required by applicable law or agreed to in writing, software distributed under
the Licence is distributed on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS
OF ANY KIND, either express or implied. See the Licence for the specific language
governing permissions and limitations under the Licence.
*/

import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
} from "@/components/chat/chat-bubble";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import JsonView from "@/mcp-inspector/JsonView";
import { TestbedDisplayEvent } from "@/utils/testbed-event-transformer";
import { processSpecialTags } from "@/utils/process-special-tags";
import { Check, Code, Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import TestbedToolCall from "./testbed-tool-call";
import TestbedToolOutput from "./testbed-tool-output";
import TestbedLLMStatus from "./testbed-llm-status";

type Props = {
  event: TestbedDisplayEvent;
};

export function TestbedAgentEvent({ event }: Props) {
  const [copied, setCopied] = useState(false);

  const getTextContent = (): string => {
    switch (event.type) {
      case "user_message":
      case "system_prompt":
      case "agent_message":
        return event.content;
      case "error":
        return event.message;
      default:
        return "";
    }
  };

  const handleCopy = async () => {
    const text = getTextContent();
    if (text) {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const content = (() => {
    switch (event.type) {
      case "user_message":
      case "system_prompt":
        return <div className="whitespace-pre-wrap">{event.content}</div>;

      case "agent_message":
        return (
          <div>
            {processSpecialTags(event.content)}
            {event.streaming && (
              <Loader2 className="inline-block ml-2 h-4 w-4 animate-spin" />
            )}
          </div>
        );

      case "agent_updated":
        return <TestbedLLMStatus type={event.type} />;

      case "tool_call":
        return (
          <TestbedToolCall
            name={
              "name" in event.content.rawItem
                ? event.content.rawItem.name
                : "tool"
            }
          />
        );

      case "tool_output":
        return (
          <TestbedToolOutput output={JSON.stringify(event.content.output)} />
        );

      case "error":
        return (
          <div className="text-destructive">
            <div className="font-semibold">Error</div>
            <div>{event.message}</div>
          </div>
        );

      default:
        return null;
    }
  })();

  const variant: "received" | "sent" =
    event.type === "user_message" || event.type === "system_prompt"
      ? "sent"
      : "received";

  const avatar =
    event.type === "user_message"
      ? "👨🏽"
      : event.type === "error"
        ? "💀"
        : event.type === "system_prompt"
          ? "⚙"
          : "🤖";

  return (
    <ChatBubble variant={variant} className="max-w-full">
      <ChatBubbleAvatar fallback={avatar} />
      <ChatBubbleMessage variant={variant}>
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <div className="font-semibold mb-1">{event.agentName}</div>
            {content}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">
              {formatTime(event.timestamp)}
            </span>
            {getTextContent() && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCopy}
                aria-label="Copy message"
              >
                {copied ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            )}
            {event.rawEvents && event.rawEvents.length > 0 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    aria-label="View raw event data"
                  >
                    <Code className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Raw Event Data</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {event.rawEvents.map((rawEvent, index) => (
                      <div key={index}>
                        {event.rawEvents!.length > 1 && (
                          <div className="text-sm font-semibold mb-2">
                            Event {index + 1}
                          </div>
                        )}
                        <JsonView data={rawEvent.event} />
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </ChatBubbleMessage>
    </ChatBubble>
  );
}
