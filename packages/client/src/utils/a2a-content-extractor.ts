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
import { Task, Message, Artifact, TaskState, TextPart } from "@a2a-js/sdk";

export function extractTextFromMessage(message: Message): string {
  return message.parts
    .filter((p): p is TextPart => p.kind === "text")
    .map((p) => p.text)
    .join("\n");
}

export function extractTextFromTask(task: Task): string {
  const texts: string[] = [];

  if (task.status?.message) {
    const msgText = task.status.message.parts
      .filter((p): p is TextPart => p.kind === "text")
      .map((p) => p.text)
      .join("\n");
    if (msgText) texts.push(msgText);
  }

  if (task.history) {
    for (const msg of task.history) {
      if (msg.role === "agent") {
        const text = extractTextFromMessage(msg);
        if (text) texts.push(text);
      }
    }
  }

  return texts.join("\n");
}

export function extractTextFromArtifact(artifact: Artifact): string {
  return artifact.parts
    .filter((p): p is TextPart => p.kind === "text")
    .map((p) => p.text)
    .join("\n");
}

export function getTaskStatusDisplay(state: TaskState): {
  label: string;
  color: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  switch (state) {
    case "submitted":
      return { label: "Submitted", color: "bg-blue-500", variant: "secondary" };
    case "working":
      return { label: "Working", color: "bg-yellow-500", variant: "outline" };
    case "completed":
      return { label: "Completed", color: "bg-green-500", variant: "default" };
    case "failed":
      return { label: "Failed", color: "bg-red-500", variant: "destructive" };
    case "canceled":
      return { label: "Cancelled", color: "bg-gray-500", variant: "secondary" };
    case "input-required":
      return {
        label: "Input Required",
        color: "bg-orange-500",
        variant: "outline",
      };
    case "rejected":
      return { label: "Rejected", color: "bg-red-400", variant: "destructive" };
    case "auth-required":
      return {
        label: "Auth Required",
        color: "bg-purple-500",
        variant: "outline",
      };
    default:
      return { label: "Unknown", color: "bg-gray-400", variant: "secondary" };
  }
}
