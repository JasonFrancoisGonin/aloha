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

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AgentInstance,
  updateTestbedAgent,
  getModelsForEndpoint,
} from "@/services/testbed-agents";
import { toast } from "sonner";

type Props = {
  systemPrompt: string;
  model: string;
  onSystemPromptChange: (prompt: string) => void;
  onModelChange: (model: string) => void;
  agentInstance: AgentInstance | null;
  onSave?: () => void;
};

export function SystemPromptSection({
  systemPrompt,
  model,
  onSystemPromptChange,
  onModelChange,
  agentInstance,
  onSave,
}: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const [originalPrompt, setOriginalPrompt] = useState(systemPrompt);
  const [originalModel, setOriginalModel] = useState(model);
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  const hasChanges = systemPrompt !== originalPrompt || model !== originalModel;

  const loadModels = async () => {
    if (agentInstance?.agentDetail) {
      try {
        const models = await getModelsForEndpoint(agentInstance.agentDetail);
        if (models?.data) {
          setAvailableModels(models.data.map((m) => m.id).sort());
        }
      } catch (error) {
        console.error("Failed to load models:", error);
      }
    }
  };

  const handleSave = async () => {
    if (!agentInstance?.agentDetail) return;

    setIsSaving(true);
    try {
      await updateTestbedAgent(agentInstance.agentDetail.id, {
        ...agentInstance.agentDetail,
        prompt: systemPrompt,
        model,
      });

      setOriginalPrompt(systemPrompt);
      setOriginalModel(model);
      toast.success("Settings saved successfully");
      onSave?.();
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    onSystemPromptChange(originalPrompt);
    onModelChange(originalModel);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg">System Settings</CardTitle>
        <div className="flex items-center gap-2">
          {hasChanges && <Badge variant="secondary">Unsaved changes</Badge>}
          <Button
            variant="outline"
            size="sm"
            onClick={loadModels}
            className="gap-2"
          >
            Refresh Models
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Model Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Model</label>
          <Select value={model} onValueChange={onModelChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((modelId) => (
                <SelectItem key={modelId} value={modelId}>
                  {modelId}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* System Prompt */}
        <div className="space-y-2">
          <label className="text-sm font-medium">System Prompt</label>
          <Textarea
            value={systemPrompt}
            onChange={(e) => onSystemPromptChange(e.target.value)}
            placeholder="Enter the system prompt for the agent..."
            className="min-h-32 font-mono text-sm"
          />
          <div className="text-xs text-muted-foreground">
            {systemPrompt.length} characters
          </div>
        </div>

        {/* Actions */}
        {hasChanges && (
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleReset}>
              Reset Changes
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {/* {isSaving ? (
                // <RefreshCwIcon className="w-4 h-4 animate-spin" />
              ) : (
                // <SaveIcon className="w-4 h-4" />
              )} */}
              Save Settings
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
