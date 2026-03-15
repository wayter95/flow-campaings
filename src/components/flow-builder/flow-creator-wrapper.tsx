"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { Node, Edge } from "@xyflow/react";
import { FlowCanvas } from "./flow-canvas";
import { flowToSteps } from "@/lib/flow-utils";
import { createAutomationWithFlow } from "@/services/automations";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FlowCreatorWrapperProps {
  forms: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  templates: { id: string; name: string; subject: string }[];
  whatsappTemplates: { id: string; name: string; message: string }[];
}

export function FlowCreatorWrapper({ forms, tags, templates, whatsappTemplates }: FlowCreatorWrapperProps) {
  const router = useRouter();
  const [name, setName] = useState("");

  const initialNodes: Node[] = [
    {
      id: "trigger_0",
      type: "trigger",
      position: { x: 250, y: 50 },
      data: { triggerType: "form_submitted" },
    },
  ];

  const handleSave = useCallback(
    async (nodes: Node[], edges: Edge[]) => {
      if (!name.trim()) {
        return { error: "Preencha o nome da automacao acima" };
      }

      try {
        const { trigger, steps } = flowToSteps(nodes, edges);

        const result = await createAutomationWithFlow(
          name,
          { nodes, edges },
          trigger,
          steps
        );

        if (result.error) return result;

        if ("automationId" in result && result.automationId) {
          router.push(`/automations/${result.automationId}`);
        }

        return { error: undefined };
      } catch (err) {
        return { error: String(err) };
      }
    },
    [name, router]
  );

  return (
    <div className="space-y-4">
      <div className="max-w-sm">
        <Label htmlFor="automation-name">Nome da automacao *</Label>
        <Input
          id="automation-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Welcome series"
        />
      </div>

      <FlowCanvas
        initialNodes={initialNodes}
        initialEdges={[]}
        onSave={handleSave}
        forms={forms}
        tags={tags}
        templates={templates}
        whatsappTemplates={whatsappTemplates}
      />
    </div>
  );
}
