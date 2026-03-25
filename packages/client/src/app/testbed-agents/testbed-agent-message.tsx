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
  ChatBubbleMessage,
  ChatBubbleAvatar,
} from "@/components/chat/chat-bubble";
import { AgentInputItem, AgentOutputItem } from "@openai/agents";
import { useMemo } from "react";

type Props = {
  message: AgentInputItem | AgentOutputItem;
};

export function TestbedAgentMessage({ message }: Props) {
  const [content, role] = useMemo(() => {
    if (message.type !== "message") return [null, null];

    if (typeof message.content !== "string") {
      const text = message.content
        .filter((e) => e.type === "output_text")
        .map((e) => e.text)
        .join("");

      return [text, message.role];
    } else {
      return [message.content, message.role];
    }
  }, [message]);

  if (content === null) {
    return null;
  }

  const isUser = role === "user";

  return (
    <ChatBubble variant={isUser ? "sent" : "received"} className="max-w-none">
      <ChatBubbleAvatar
      // fallback={
      //   isUser ? (
      //     <UserIcon className="w-5 h-5" />
      //   ) : (
      //     <CpuChipIcon className="w-5 h-5" />
      //   )
      // }
      />
      <ChatBubbleMessage
        variant={isUser ? "sent" : "received"}
        className="whitespace-pre-wrap"
      >
        {content}
      </ChatBubbleMessage>
    </ChatBubble>
  );
}
