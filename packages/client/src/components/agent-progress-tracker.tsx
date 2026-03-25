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

import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AgentInstaceMergedEvent } from "@/services/testbed-agents";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  PlayIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  CogIcon,
  ChatBubbleLeftIcon,
  WrenchIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

type StepStatus = "pending" | "in-progress" | "completed" | "error";

type ProcessedStep = {
  id: string;
  title: string;
  status: StepStatus;
  events: AgentInstaceMergedEvent[];
  timestamp: Date;
  details?: string;
};

type Props = {
  events: AgentInstaceMergedEvent[];
  isGenerating: boolean;
  variant?: "inline" | "sidebar";
};

const getStepIcon = (status: StepStatus) => {
  switch (status) {
    case "pending":
      return <div className="w-2 h-2 rounded-full bg-gray-300" />;
    case "in-progress":
      return <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />;
    case "completed":
      return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
    case "error":
      return <ExclamationCircleIcon className="w-4 h-4 text-red-500" />;
  }
};

const getStepDetails = (step: ProcessedStep): string => {
  const event = step.events[step.events.length - 1];

  switch (event.type) {
    case "tool_call_request":
      return `Calling ${event.content}`;
    case "tool_call_output":
      return "Tool execution completed";
    case "llm_response_in_progress":
      return `Generating response...`;
    case "llm_response_done":
      return "Response completed";
    default:
      return "";
  }
};

const getEventTypeIcon = (eventType: string) => {
  switch (eventType) {
    case "llm_response_started":
    case "llm_response_in_progress":
    case "llm_response_done":
      return <ChatBubbleLeftIcon className="w-4 h-4" />;
    case "tool_call_request":
    case "tool_call_output":
      return <WrenchIcon className="w-4 h-4" />;
    case "agent_updated":
      return <CogIcon className="w-4 h-4" />;
    default:
      return <PlayIcon className="w-4 h-4" />;
  }
};

export function AgentProgressTracker({
  events,
  isGenerating,
  variant = "inline",
}: Props) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  const steps = useMemo(() => {
    const processedSteps: ProcessedStep[] = [];
    let currentStep: ProcessedStep | null = null;

    events.forEach((event) => {
      const stepTitle = getStepTitle(event);
      const stepId = `${event.type}-${processedSteps.length}`;

      // Group related events into steps
      if (currentStep && shouldGroupWithCurrentStep(currentStep, event)) {
        currentStep.events.push(event);
        currentStep.status = getStepStatus(event, isGenerating);
        currentStep.details = getStepDetails(currentStep);
      } else {
        // Start new step
        if (currentStep) {
          processedSteps.push(currentStep);
        }

        currentStep = {
          id: stepId,
          title: stepTitle,
          status: getStepStatus(event, isGenerating),
          events: [event],
          timestamp: new Date(),
          details: "",
        };
        currentStep.details = getStepDetails(currentStep);
      }
    });

    if (currentStep) {
      processedSteps.push(currentStep);
    }

    return processedSteps;
  }, [events, isGenerating]);

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const completedSteps = steps.filter((s) => s.status === "completed").length;
  const totalSteps = steps.length;
  const progressPercentage =
    totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  if (variant === "sidebar") {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Execution Progress</CardTitle>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Steps completed</span>
              <span>
                {completedSteps}/{totalSteps}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="space-y-2">
              <Collapsible>
                <CollapsibleTrigger
                  className="flex items-center justify-between w-full p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  onClick={() => toggleStep(step.id)}
                >
                  <div className="flex items-center gap-3">
                    {getStepIcon(step.status)}
                    <div className="text-left">
                      <div className="font-medium text-sm">{step.title}</div>
                      {step.details && (
                        <div className="text-xs text-muted-foreground">
                          {step.details}
                        </div>
                      )}
                    </div>
                  </div>
                  {expandedSteps.has(step.id) ? (
                    <ChevronDownIcon className="w-4 h-4" />
                  ) : (
                    <ChevronRightIcon className="w-4 h-4" />
                  )}
                </CollapsibleTrigger>

                <CollapsibleContent className="pl-7 pt-2 space-y-1">
                  {step.events.map((event, eventIndex) => (
                    <div
                      key={eventIndex}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      {getEventTypeIcon(event.type)}
                      <span>{formatEventDescription(event)}</span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          ))}

          {isGenerating && (
            <div className="flex items-center gap-3 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm font-medium">Processing...</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Inline variant (compact for in-chat display)
  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Agent is working...</h3>
          <Badge variant="secondary">
            {completedSteps}/{totalSteps} steps
          </Badge>
        </div>

        <Progress value={progressPercentage} className="mb-3 h-2" />

        <div className="space-y-2">
          {steps.slice(-3).map((step) => (
            <div key={step.id} className="flex items-center gap-2 text-sm">
              {getStepIcon(step.status)}
              <span
                className={cn(
                  step.status === "in-progress"
                    ? "font-medium"
                    : "text-muted-foreground"
                )}
              >
                {step.title}
              </span>
              {step.details && (
                <span className="text-xs text-muted-foreground">
                  • {step.details}
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper functions
function getStepTitle(event: AgentInstaceMergedEvent): string {
  switch (event.type) {
    case "llm_response_started":
      return "Generating response";
    case "llm_response_in_progress":
      return "Streaming response";
    case "llm_response_done":
      return "Response completed";
    case "tool_call_request":
      return `Tool: ${event.content}`;
    case "tool_call_output":
      return "Tool execution";
    case "agent_updated":
      return "Preparing agent";
    case "error_message":
      return "Error occurred";
    default:
      return "Processing";
  }
}

function shouldGroupWithCurrentStep(
  currentStep: ProcessedStep,
  event: AgentInstaceMergedEvent
): boolean {
  const lastEvent = currentStep.events[currentStep.events.length - 1];

  // Group streaming events together
  if (
    (lastEvent.type === "llm_response_started" ||
      lastEvent.type === "llm_response_in_progress") &&
    (event.type === "llm_response_in_progress" ||
      event.type === "llm_response_done")
  ) {
    return true;
  }

  // Group tool call request with its output
  if (
    lastEvent.type === "tool_call_request" &&
    event.type === "tool_call_output"
  ) {
    return true;
  }

  return false;
}

function getStepStatus(
  event: AgentInstaceMergedEvent,
  isGenerating: boolean
): StepStatus {
  switch (event.type) {
    case "error_message":
      return "error";
    case "llm_response_done":
    case "tool_call_output":
      return "completed";
    case "llm_response_started":
    case "llm_response_in_progress":
    case "tool_call_request":
      return isGenerating ? "in-progress" : "completed";
    default:
      return "completed";
  }
}

function formatEventDescription(event: AgentInstaceMergedEvent): string {
  switch (event.type) {
    case "tool_call_request":
      return `Requesting ${event.content}`;
    case "tool_call_output":
      return "Tool completed";
    case "llm_response_started":
      return "Started generating";
    case "llm_response_in_progress":
      return "Generating...";
    case "llm_response_done":
      return "Generation complete";
    default:
      return event.type.replace(/_/g, " ");
  }
}
