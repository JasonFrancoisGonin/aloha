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
  AgentInstanceEvent,
  CustomAgentEvent,
} from "@/services/testbed-agents";
import { RunToolCallItem, RunToolCallOutputItem } from "@openai/agents";

export type TestbedDisplayEvent = {
  id: string;
  timestamp: Date;
  agentName: string;
  rawEvents?: (AgentInstanceEvent | CustomAgentEvent)[];
} & (
  | { type: "user_message"; content: string }
  | { type: "system_prompt"; content: string }
  | { type: "agent_message"; content: string; streaming?: boolean }
  | { type: "tool_call"; content: RunToolCallItem }
  | { type: "tool_output"; content: RunToolCallOutputItem }
  | { type: "agent_updated" }
  | { type: "error"; message: string; details?: unknown }
);

export function transformTestbedEvents(
  events: (AgentInstanceEvent | CustomAgentEvent)[]
): TestbedDisplayEvent[] {
  const displayEvents: TestbedDisplayEvent[] = [];
  let streamingTextAccumulator: {
    content: string;
    id: string;
    timestamp: Date;
    agentName: string;
  } | null = null;

  for (let idx = 0; idx < events.length; idx++) {
    const agentEvent = events[idx];
    const timestamp = new Date();

    // Handle custom agent events (user messages, system prompts, errors)
    if (agentEvent.type === "custom_agent_event") {
      // Finalize any streaming message before adding custom event
      if (streamingTextAccumulator) {
        displayEvents.push({
          ...streamingTextAccumulator,
          type: "agent_message",
          streaming: false,
          rawEvents: [agentEvent],
        });
        streamingTextAccumulator = null;
      }

      if (agentEvent.event.type === "user_message") {
        displayEvents.push({
          id: `caem-${idx}`,
          timestamp,
          agentName: "",
          type: "user_message",
          content: agentEvent.event.content,
          rawEvents: [agentEvent],
        });
      } else if (agentEvent.event.type === "system_prompt") {
        displayEvents.push({
          id: `caes-${idx}`,
          timestamp,
          agentName: agentEvent.agentInstance.agent.name,
          type: "system_prompt",
          content: agentEvent.event.content,
          rawEvents: [agentEvent],
        });
      } else if (agentEvent.event.type === "error_message") {
        displayEvents.push({
          id: `caee-${idx}`,
          timestamp,
          agentName: agentEvent.agentInstance.agent.name,
          type: "error",
          message:
            typeof agentEvent.event.content === "string"
              ? agentEvent.event.content
              : "An error occurred",
          details: agentEvent.event.content,
          rawEvents: [agentEvent],
        });
      }
      continue;
    }

    // Handle agent instance events
    const event = agentEvent.event;
    const agentName = agentEvent.agentInstance.agentDetail.name;

    if (event.type === "raw_model_stream_event") {
      if (event.data.type === "response_started") {
        // Finalize any previous streaming message
        if (streamingTextAccumulator) {
          displayEvents.push({
            ...streamingTextAccumulator,
            type: "agent_message",
            streaming: false,
          });
          streamingTextAccumulator = null;
        }
      } else if (event.data.type === "output_text_delta") {
        // Accumulate streaming text
        if (streamingTextAccumulator) {
          streamingTextAccumulator.content += event.data.delta;
        } else {
          streamingTextAccumulator = {
            id: `otd-${idx}`,
            timestamp,
            agentName,
            content: event.data.delta,
          };
        }

        // Update or add streaming message
        const existingIndex = displayEvents.findIndex(
          (e) =>
            e.type === "agent_message" && e.id === streamingTextAccumulator!.id
        );

        if (existingIndex >= 0) {
          displayEvents[existingIndex] = {
            ...streamingTextAccumulator!,
            type: "agent_message",
            streaming: true,
            rawEvents: [
              ...(displayEvents[existingIndex].rawEvents || []),
              agentEvent,
            ],
          };
        } else {
          displayEvents.push({
            ...streamingTextAccumulator!,
            type: "agent_message",
            streaming: true,
            rawEvents: [agentEvent],
          });
        }
      } else if (event.data.type === "response_done") {
        // Finalize streaming message
        if (streamingTextAccumulator) {
          const existingIndex = displayEvents.findIndex(
            (e) =>
              e.type === "agent_message" &&
              e.id === streamingTextAccumulator!.id
          );
          if (existingIndex >= 0) {
            if ("streaming" in displayEvents[existingIndex]) {
              displayEvents[existingIndex] = {
                ...displayEvents[existingIndex],
                streaming: false,
                rawEvents: [
                  ...(displayEvents[existingIndex].rawEvents || []),
                  agentEvent,
                ],
              };
            }
          }
          streamingTextAccumulator = null;
        }
      }
    } else if (event.type === "run_item_stream_event") {
      if (
        event.name === "tool_called" &&
        event.item.type === "tool_call_item"
      ) {
        // Finalize streaming before tool events
        if (streamingTextAccumulator) {
          displayEvents.push({
            ...streamingTextAccumulator,
            type: "agent_message",
            streaming: false,
          });
          streamingTextAccumulator = null;
        }

        displayEvents.push({
          id: `tcr-${idx}`,
          timestamp,
          agentName,
          type: "tool_call",
          content: event.item,
          rawEvents: [agentEvent],
        });
      } else if (
        event.name === "tool_output" &&
        event.item.type === "tool_call_output_item"
      ) {
        // Finalize streaming before tool events
        if (streamingTextAccumulator) {
          displayEvents.push({
            ...streamingTextAccumulator,
            type: "agent_message",
            streaming: false,
          });
          streamingTextAccumulator = null;
        }

        displayEvents.push({
          id: `tco-${idx}`,
          timestamp,
          agentName,
          type: "tool_output",
          content: event.item,
          rawEvents: [agentEvent],
        });
      }
    } else if (event.type === "agent_updated_stream_event") {
      // Finalize streaming before agent update
      if (streamingTextAccumulator) {
        displayEvents.push({
          ...streamingTextAccumulator,
          type: "agent_message",
          streaming: false,
        });
        streamingTextAccumulator = null;
      }

      displayEvents.push({
        id: `au-${idx}`,
        timestamp,
        agentName: event.agent.name,
        type: "agent_updated",
        rawEvents: [agentEvent],
      });
    }
  }

  return displayEvents;
}
