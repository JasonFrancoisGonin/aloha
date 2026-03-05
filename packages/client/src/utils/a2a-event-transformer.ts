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
  Artifact,
  Message,
  MessageSendParams,
  Task,
  TaskArtifactUpdateEvent,
  TaskState,
  TaskStatusUpdateEvent,
} from "@a2a-js/sdk";
import { isTextPart } from "./a2a-utils";

export type A2ADisplayEvent = {
  id: string;
  timestamp: Date;
  rawEvents?: RawA2AEvent[]; // Track original raw events for debugging
} & (
  | { type: "user_message"; content: string }
  | { type: "agent_message"; content: string; streaming?: boolean }
  | { type: "task_status"; status: TaskState; message?: string; taskId: string }
  | { type: "artifact_created"; artifact: Artifact; taskId: string }
  | { type: "artifact_updated"; artifact: Artifact; taskId: string }
  | { type: "error"; message: string; details?: unknown }
);

export type RawA2AEvent =
  | Task
  | Message
  | MessageSendParams
  | TaskStatusUpdateEvent
  | TaskArtifactUpdateEvent;

export type RawEventWithType = RawA2AEvent & {
  type: "user_message" | "agent_message" | "error_message";
};

export function transformA2AEvents(
  events: RawEventWithType[]
): A2ADisplayEvent[] {
  const displayEvents: A2ADisplayEvent[] = [];
  let streamingTextAccumulator: {
    content: string;
    id: string;
    timestamp: Date;
  } | null = null;

  for (const event of events) {
    const timestamp = new Date();

    // User messages
    if (event.type === "user_message" && "message" in event) {
      const msgEvent = event as MessageSendParams;
      const textParts = msgEvent.message.parts.filter(isTextPart);
      const content = textParts.map((p) => p.text).join("\n");

      displayEvents.push({
        id: msgEvent.message.messageId || crypto.randomUUID(),
        timestamp,
        type: "user_message",
        content,
        rawEvents: [event],
      });
      continue;
    }

    // Agent messages - accumulate streaming text
    if (event.type === "agent_message") {
      // Task event
      if ("kind" in event && event.kind === "task") {
        const task = event as Task;

        // Finalize any streaming message
        if (streamingTextAccumulator) {
          displayEvents.push({
            ...streamingTextAccumulator,
            type: "agent_message",
            streaming: false,
          });
          streamingTextAccumulator = null;
        }

        // Add task status
        const statusMessage = task.status.message
          ? task.status.message.parts
              .filter(isTextPart)
              .map((p) => p.text)
              .join("\n")
          : undefined;

        // Check if last event is same status - if so, update it instead of adding new
        const lastEvent = displayEvents[displayEvents.length - 1];
        if (
          lastEvent?.type === "task_status" &&
          lastEvent.status === task.status.state
        ) {
          // Concatenate messages if both exist
          const combinedMessage = [lastEvent.message, statusMessage]
            .filter(Boolean)
            .join("");
          displayEvents[displayEvents.length - 1] = {
            ...lastEvent,
            message: combinedMessage || undefined,
            timestamp, // Update to latest timestamp
            rawEvents: [...(lastEvent.rawEvents || []), event],
          };
        } else {
          displayEvents.push({
            id: crypto.randomUUID(),
            timestamp,
            type: "task_status",
            status: task.status.state as TaskState,
            message: statusMessage,
            taskId: task.id,
            rawEvents: [event],
          });
        }

        // Add artifacts
        for (const artifact of task.artifacts || []) {
          displayEvents.push({
            id: crypto.randomUUID(),
            timestamp,
            type: "artifact_created",
            artifact,
            taskId: task.id,
            rawEvents: [event],
          });
        }

        // Extract text from task history
        if (task.history && task.history.length > 0) {
          const lastMessage = task.history[task.history.length - 1];
          if (lastMessage.role === "agent") {
            const textParts = lastMessage.parts.filter(isTextPart);
            const content = textParts.map((p) => p.text).join("\n");
            if (content) {
              displayEvents.push({
                id: lastMessage.messageId || crypto.randomUUID(),
                timestamp,
                type: "agent_message",
                content,
                streaming: false,
                rawEvents: [event],
              });
            }
          }
        }
      }
      // Message event
      else if ("kind" in event && event.kind === "message") {
        const message = event as Message;
        if (message.role === "agent") {
          const textParts = message.parts.filter(isTextPart);
          const content = textParts.map((p) => p.text).join("\n");

          if (content) {
            // Accumulate streaming text
            if (streamingTextAccumulator) {
              streamingTextAccumulator.content += content;
            } else {
              streamingTextAccumulator = {
                id: message.messageId || crypto.randomUUID(),
                timestamp,
                content,
              };
            }

            // Update or add streaming message
            const existingIndex = displayEvents.findIndex(
              (e) =>
                e.type === "agent_message" &&
                e.id === streamingTextAccumulator!.id
            );

            if (existingIndex >= 0) {
              displayEvents[existingIndex] = {
                ...streamingTextAccumulator!,
                type: "agent_message",
                streaming: true,
                rawEvents: [
                  ...(displayEvents[existingIndex].rawEvents || []),
                  event,
                ],
              };
            } else {
              displayEvents.push({
                ...streamingTextAccumulator!,
                type: "agent_message",
                streaming: true,
                rawEvents: [event],
              });
            }
          }
        }
      }

      // TaskStatusUpdateEvent
      else if ("kind" in event && event.kind === "status-update") {
        const statusUpdate = event as TaskStatusUpdateEvent;

        // Finalize streaming message on status change
        if (streamingTextAccumulator) {
          const existingIndex = displayEvents.findIndex(
            (e) =>
              e.type === "agent_message" &&
              e.id === streamingTextAccumulator!.id
          );
          if (existingIndex >= 0) {
            displayEvents[existingIndex] = {
              ...streamingTextAccumulator!,
              type: "agent_message",
              streaming: false,
            };
          }
          streamingTextAccumulator = null;
        }

        const statusMessage = statusUpdate.status.message
          ? statusUpdate.status.message.parts
              .filter(isTextPart)
              .map((p) => p.text)
              .join("")
          : undefined;

        // Check if last event is same status - if so, update it instead of adding new
        const lastEvent = displayEvents[displayEvents.length - 1];
        if (
          lastEvent?.type === "task_status" &&
          lastEvent.status === statusUpdate.status.state
        ) {
          // Concatenate messages if both exist
          const combinedMessage = [lastEvent.message, statusMessage]
            .filter(Boolean)
            .join("");
          displayEvents[displayEvents.length - 1] = {
            ...lastEvent,
            message: combinedMessage || undefined,
            timestamp, // Update to latest timestamp
            rawEvents: [...(lastEvent.rawEvents || []), event],
          };
        } else {
          displayEvents.push({
            id: crypto.randomUUID(),
            timestamp,
            type: "task_status",
            status: statusUpdate.status.state,
            message: statusMessage,
            taskId: statusUpdate.taskId,
            rawEvents: [event],
          });
        }
      }

      // TaskArtifactUpdateEvent
      else if ("kind" in event && event.kind === "artifact-update") {
        const artifactUpdate = event as TaskArtifactUpdateEvent;
        displayEvents.push({
          id: crypto.randomUUID(),
          timestamp,
          type: "artifact_updated",
          artifact: artifactUpdate.artifact,
          taskId: artifactUpdate.taskId,
          rawEvents: [event],
        });
      }
    }

    // Error messages
    if (event.type === "error_message") {
      displayEvents.push({
        id: crypto.randomUUID(),
        timestamp,
        type: "error",
        message: typeof event === "string" ? event : "An error occurred",
        details: event,
        rawEvents: [event],
      });
    }
  }

  // Finalize any remaining streaming message
  if (streamingTextAccumulator) {
    displayEvents.push({
      ...streamingTextAccumulator,
      type: "agent_message",
      streaming: false,
      rawEvents: [],
    });
  }

  return displayEvents;
}
