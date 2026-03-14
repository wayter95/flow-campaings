"use client";

import { useCallback, useMemo } from "react";
import type { Node, Edge } from "@xyflow/react";
import { FlowCanvas } from "./flow-canvas";
import { flowToSteps, stepsToFlow } from "@/lib/flow-utils";
import { saveFlowData } from "@/services/automations";

interface FlowEditorWrapperProps {
  automationId: string;
  automationName: string;
  trigger: { type: string; formId?: string; tagId?: string };
  steps: { type: string; config: Record<string, unknown>; order: number }[];
  flowData: { nodes: unknown[]; edges: unknown[] } | null;
  forms: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  templates: { id: string; name: string; subject: string }[];
}

export function FlowEditorWrapper({
  automationId,
  trigger,
  steps,
  flowData,
  forms,
  tags,
  templates,
}: FlowEditorWrapperProps) {
  // Use saved flowData if available, otherwise convert from steps
  const { initialNodes, initialEdges } = useMemo(() => {
    if (flowData?.nodes && flowData?.edges) {
      return {
        initialNodes: flowData.nodes as Node[],
        initialEdges: flowData.edges as Edge[],
      };
    }

    // Convert existing steps to flow format
    if (steps.length > 0) {
      const { nodes, edges } = stepsToFlow(trigger, steps);
      return { initialNodes: nodes, initialEdges: edges };
    }

    // Empty canvas with just a trigger
    return {
      initialNodes: [
        {
          id: "trigger_0",
          type: "trigger" as const,
          position: { x: 250, y: 50 },
          data: { triggerType: trigger.type, formId: trigger.formId, tagId: trigger.tagId },
        },
      ] as Node[],
      initialEdges: [] as Edge[],
    };
  }, [flowData, steps, trigger]);

  const handleSave = useCallback(
    async (nodes: Node[], edges: Edge[]) => {
      try {
        const { trigger: newTrigger, steps: newSteps } = flowToSteps(nodes, edges);

        const result = await saveFlowData(
          automationId,
          { nodes, edges },
          newTrigger,
          newSteps
        );

        return result;
      } catch (err) {
        return { error: String(err) };
      }
    },
    [automationId]
  );

  return (
    <FlowCanvas
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      onSave={handleSave}
      forms={forms}
      tags={tags}
      templates={templates}
    />
  );
}
