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

import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
} from "@/components/chat/chat-bubble";
import { Button } from "@/components/ui/button";
import JsonView from "@/mcp-inspector/JsonView";
import { AgentInstaceMergedEvent } from "@/services/testbed-agents";
import { hasMessageField } from "@/utils/type-utils";
import { DocumentMinusIcon, DocumentPlusIcon } from "@heroicons/react/16/solid";
import { useState } from "react";

type Props = {
  event: AgentInstaceMergedEvent;
};

function processSpecialTags(content: string): React.ReactNode {
  const thinkIdx = content.indexOf("<think>");
  if (thinkIdx === -1) {
    return <div className="mb-2 mt-2">{(content || "").trim()}</div>;
  }

  const thinkEnd = content.indexOf("</think>");

  if (thinkEnd === -1) {
    return (
      <div className="text-sm mt-2 mb-2 border-l-2 border-gray-300 pl-4">
        ... {content.substring(7).trim()}
      </div>
    );
  } else {
    return (
      <>
        <div className="text-sm mt-2 mb-2 border-l-2 border-gray-300 pl-4">
          ... {content.substring(7, thinkEnd).trim()} ...
        </div>
        {processSpecialTags(content.substring(thinkEnd + 7 + 1))}
      </>
    );
  }
}

function formatEventContent(event: AgentInstaceMergedEvent): React.ReactNode {
  switch (event.type) {
    case "error_message":
      if (hasMessageField(event.content)) {
        return event.content.message;
      }
      return JSON.stringify(event.content, null, 2);
    case "user_message":
    case "system_prompt":
      return event.content;
    case "llm_response_started":
      return "LLM start sending response";
    case "agent_updated":
      return "Preparing agent to run";
    case "tool_call_request":
      if (event.content.rawItem.type === "function_call") {
        return (
          <>
            <div>
              <i>Type: </i>
              {event.content.rawItem.type}
            </div>
            <div>
              <i>Name: </i>
              {event.content.rawItem.name}
            </div>

            <div>
              <i>Arguments: </i>
              {event.content.rawItem.arguments}
            </div>
          </>
        );
      }
      break;
    case "tool_call_output":
      if (
        event.content.rawItem.type === "function_call_result" &&
        event.content.rawItem.output.type === "text"
      ) {
        return (
          <>
            <div>
              <i>Result</i>
            </div>
            <div>{event.content.rawItem.output.text}</div>
          </>
        );
      }
      break;
    case "llm_response_in_progress":
      return processSpecialTags(event.progress);
    case "llm_response_done":
      return (
        <>
          {event.content.response.output.map((e) => {
            return (
              <>
                {e.type === "message" ? (
                  processSpecialTags(
                    e.content
                      .filter((v) => v.type === "output_text")
                      .map((v) => v.text)
                      .join()
                  )
                ) : e.type === "function_call" ? (
                  <div>
                    <i>LLM asked to call a tool, see below messages</i>
                  </div>
                ) : (
                  <div>{JSON.stringify(e, null, 2)}</div>
                )}
              </>
            );
          })}
        </>
      );
  }

  return (
    <>
      <div>
        <i>Unformatted event</i>
      </div>
      <div>{JSON.stringify(event, null, 2)}</div>
    </>
  );
}

export function TestbedAgentEvent({ event }: Props) {
  const [showRaw, setShowRaw] = useState(false);

  let bubbleMessageOtherClassName = "border-1 ";
  let otherTitleClassName = "";
  let variant: "received" | "sent" = "received";

  let messageType = "";
  switch (event.type) {
    case "llm_response_started":
      bubbleMessageOtherClassName += "border-amber-600";
      messageType = "LLM response started";
      break;
    case "llm_response_done":
      bubbleMessageOtherClassName += "border-green-600";
      messageType = "LLM response done";
      break;
    case "tool_call_request":
      bubbleMessageOtherClassName += "border-blue-600";
      messageType = "Tool call request";
      break;
    case "tool_call_output":
      bubbleMessageOtherClassName += "border-purple-600";
      messageType = "Tool call output";
      break;
    case "llm_response_in_progress":
      bubbleMessageOtherClassName += "border-yellow-600";
      messageType = "LLM response in progress";
      break;
    case "system_prompt":
      bubbleMessageOtherClassName = "bg-blue-400";
      messageType = "System prompt";
      variant = "sent";
      break;
    case "user_message":
      bubbleMessageOtherClassName = "";
      messageType = "User Message";
      variant = "sent";
      break;
    case "agent_updated":
      bubbleMessageOtherClassName += "border-cyan-600";
      messageType = "Agent updating";
      break;
    case "error_message":
      bubbleMessageOtherClassName += "border-red-600";
      messageType = "An error occurred";
      otherTitleClassName = "text-red-600";
  }

  const formattedEventContent = formatEventContent(event);

  return (
    <ChatBubble variant={variant} className="max-w-full">
      <ChatBubbleAvatar
        fallback={
          event.type === "user_message"
            ? "👨🏽"
            : event.type === "error_message"
              ? "💀"
              : event.type === "system_prompt"
                ? "⚙"
                : "🤖"
        }
      />
      <ChatBubbleMessage
        variant={variant}
        className={bubbleMessageOtherClassName}
      >
        <div>
          <b>{event.agentName}</b>
        </div>
        <div>
          <div className={"italic " + otherTitleClassName}>{messageType}</div>
        </div>
        <div className="">
          <div className="wrap-anywhere">{formattedEventContent}</div>

          {"content" in event &&
            event.type !== "user_message" &&
            event.type !== "system_prompt" && (
              <>
                <div className="mt-2 mb-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowRaw(!showRaw)}
                  >
                    {!showRaw && (
                      <>
                        <DocumentPlusIcon /> Show raw content
                      </>
                    )}
                    {showRaw && (
                      <>
                        <DocumentMinusIcon /> Hide raw content
                      </>
                    )}
                  </Button>
                </div>
                {showRaw && (
                  <div className="wrap-anywhere">
                    <JsonView data={event.content} />
                  </div>
                )}
              </>
            )}
        </div>
      </ChatBubbleMessage>
    </ChatBubble>
  );
}
