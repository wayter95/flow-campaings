import type { Node, Edge } from "@xyflow/react";

interface StepData {
  type: string;
  config: Record<string, unknown>;
  order: number;
}

interface TriggerData {
  type: string;
  formId?: string;
  tagId?: string;
}

/**
 * Converts visual flow data (nodes + edges) into the linear step format
 * used by the automation engine, plus extracts the trigger config.
 */
export function flowToSteps(nodes: Node[], edges: Edge[]): {
  trigger: TriggerData;
  steps: StepData[];
} {
  const triggerNode = nodes.find((n) => n.type === "trigger");
  if (!triggerNode) {
    throw new Error("No trigger node found");
  }

  const triggerData = triggerNode.data as Record<string, unknown>;
  const trigger: TriggerData = {
    type: (triggerData.triggerType as string) || "manual",
    ...(triggerData.formId ? { formId: triggerData.formId as string } : {}),
    ...(triggerData.tagId ? { tagId: triggerData.tagId as string } : {}),
  };

  // BFS traversal from trigger node to build ordered steps
  const steps: StepData[] = [];
  const visited = new Set<string>();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const queue: string[] = [];

  // Find nodes connected from trigger
  const triggerEdges = edges.filter((e) => e.source === triggerNode.id);
  for (const edge of triggerEdges) {
    queue.push(edge.target);
  }

  // Map from node ID to step index (for condition nodes)
  const nodeStepIndex = new Map<string, number>();

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    if (visited.has(currentId)) continue;
    visited.add(currentId);

    const node = nodeMap.get(currentId);
    if (!node || node.type === "trigger") continue;

    const data = node.data as Record<string, unknown>;
    const stepIndex = steps.length;
    nodeStepIndex.set(currentId, stepIndex);

    const step = nodeToStep(node, data, stepIndex);
    steps.push(step);

    // Find outgoing edges
    const outEdges = edges.filter((e) => e.source === currentId);
    for (const edge of outEdges) {
      queue.push(edge.target);
    }
  }

  // Second pass: resolve condition step references
  for (const node of nodes) {
    if (node.type !== "condition") continue;
    const stepIdx = nodeStepIndex.get(node.id);
    if (stepIdx === undefined) continue;

    const trueEdge = edges.find((e) => e.source === node.id && e.sourceHandle === "true");
    const falseEdge = edges.find((e) => e.source === node.id && e.sourceHandle === "false");

    const trueStep = trueEdge ? (nodeStepIndex.get(trueEdge.target) ?? steps.length) : steps.length;
    const falseStep = falseEdge ? (nodeStepIndex.get(falseEdge.target) ?? steps.length) : steps.length;

    steps[stepIdx].config.trueStep = trueStep;
    steps[stepIdx].config.falseStep = falseStep;
  }

  return { trigger, steps };
}

function nodeToStep(node: Node, data: Record<string, unknown>, order: number): StepData {
  switch (node.type) {
    case "action": {
      const actionType = (data.actionType as string) || "send_email";
      if (actionType === "send_email") {
        return {
          type: "send_email",
          config: {
            subject: data.subject || "",
            htmlContent: data.htmlContent || "",
            ...(data.templateId ? { templateId: data.templateId } : {}),
          },
          order,
        };
      }
      if (actionType === "send_whatsapp") {
        return {
          type: "send_whatsapp",
          config: {
            message: data.whatsappMessage || "",
          },
          order,
        };
      }
      return {
        type: actionType,
        config: { tagId: data.tagId || "" },
        order,
      };
    }
    case "delay":
      return {
        type: "delay",
        config: {
          duration: (data.duration as number) || 1,
          unit: (data.unit as string) || "days",
        },
        order,
      };
    case "condition":
      return {
        type: "condition",
        config: {
          field: data.field || "tag",
          op: data.op || "contains",
          value: data.value || "",
          trueStep: 0,
          falseStep: 0,
        },
        order,
      };
    default:
      return { type: node.type || "unknown", config: {}, order };
  }
}

/**
 * Converts existing automation steps back into flow nodes and edges.
 */
export function stepsToFlow(
  trigger: TriggerData,
  steps: { type: string; config: Record<string, unknown>; order: number }[]
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Create trigger node
  const triggerNode: Node = {
    id: "trigger_0",
    type: "trigger",
    position: { x: 250, y: 0 },
    data: {
      triggerType: trigger.type,
      ...(trigger.formId ? { formId: trigger.formId } : {}),
      ...(trigger.tagId ? { tagId: trigger.tagId } : {}),
    },
  };
  nodes.push(triggerNode);

  // Create step nodes
  let y = 120;
  const stepNodeIds: string[] = [];

  for (const step of steps) {
    const nodeId = `step_${step.order}`;
    stepNodeIds.push(nodeId);

    let nodeType: string;
    let data: Record<string, unknown>;

    switch (step.type) {
      case "send_email":
        nodeType = "action";
        data = { actionType: "send_email", ...step.config };
        break;
      case "send_whatsapp":
        nodeType = "action";
        data = { actionType: "send_whatsapp", whatsappMessage: (step.config as Record<string, unknown>).message || "", ...step.config };
        break;
      case "add_tag":
      case "remove_tag":
        nodeType = "action";
        data = { actionType: step.type, ...step.config };
        break;
      case "delay":
        nodeType = "delay";
        data = { ...step.config };
        break;
      case "condition":
        nodeType = "condition";
        data = { ...step.config };
        break;
      default:
        nodeType = "action";
        data = { ...step.config };
    }

    nodes.push({
      id: nodeId,
      type: nodeType,
      position: { x: 250, y },
      data,
    });

    y += 120;
  }

  // Create edges: trigger -> first step
  if (stepNodeIds.length > 0) {
    edges.push({
      id: `edge_trigger_0`,
      source: "trigger_0",
      target: stepNodeIds[0],
      animated: true,
      style: { stroke: "#6b7280" },
    });
  }

  // Create edges between sequential steps (skip condition targets)
  for (let i = 0; i < steps.length - 1; i++) {
    if (steps[i].type === "condition") {
      const config = steps[i].config;
      const trueIdx = config.trueStep as number;
      const falseIdx = config.falseStep as number;

      if (trueIdx < stepNodeIds.length) {
        edges.push({
          id: `edge_cond_true_${i}`,
          source: stepNodeIds[i],
          sourceHandle: "true",
          target: stepNodeIds[trueIdx],
          animated: true,
          style: { stroke: "#22c55e" },
        });
      }
      if (falseIdx < stepNodeIds.length) {
        edges.push({
          id: `edge_cond_false_${i}`,
          source: stepNodeIds[i],
          sourceHandle: "false",
          target: stepNodeIds[falseIdx],
          animated: true,
          style: { stroke: "#ef4444" },
        });
      }
    } else {
      edges.push({
        id: `edge_${i}_${i + 1}`,
        source: stepNodeIds[i],
        target: stepNodeIds[i + 1],
        animated: true,
        style: { stroke: "#6b7280" },
      });
    }
  }

  return { nodes, edges };
}

/**
 * Pre-built automation templates
 */
export function getWelcomeTemplate(): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: [
      {
        id: "t1",
        type: "trigger",
        position: { x: 250, y: 0 },
        data: { triggerType: "form_submitted" },
      },
      {
        id: "a1",
        type: "action",
        position: { x: 250, y: 120 },
        data: { actionType: "send_email", subject: "Bem-vindo!", htmlContent: "<h1>Ola {{firstName}}!</h1><p>Obrigado por se cadastrar.</p>" },
      },
      {
        id: "d1",
        type: "delay",
        position: { x: 250, y: 240 },
        data: { duration: 2, unit: "days" },
      },
      {
        id: "a2",
        type: "action",
        position: { x: 250, y: 360 },
        data: { actionType: "send_email", subject: "Voce sabia?", htmlContent: "<h1>Ola {{firstName}}!</h1><p>Confira nossos recursos...</p>" },
      },
      {
        id: "a3",
        type: "action",
        position: { x: 250, y: 480 },
        data: { actionType: "add_tag", tagName: "onboarded" },
      },
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1", animated: true, style: { stroke: "#6b7280" } },
      { id: "e2", source: "a1", target: "d1", animated: true, style: { stroke: "#6b7280" } },
      { id: "e3", source: "d1", target: "a2", animated: true, style: { stroke: "#6b7280" } },
      { id: "e4", source: "a2", target: "a3", animated: true, style: { stroke: "#6b7280" } },
    ],
  };
}

export function getReengagementTemplate(): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: [
      {
        id: "t1",
        type: "trigger",
        position: { x: 250, y: 0 },
        data: { triggerType: "tag_added" },
      },
      {
        id: "d1",
        type: "delay",
        position: { x: 250, y: 120 },
        data: { duration: 7, unit: "days" },
      },
      {
        id: "c1",
        type: "condition",
        position: { x: 250, y: 240 },
        data: { field: "unsubscribed", op: "equals", value: "false" },
      },
      {
        id: "a1",
        type: "action",
        position: { x: 100, y: 400 },
        data: { actionType: "send_email", subject: "Sentimos sua falta!", htmlContent: "<h1>Ola {{firstName}}!</h1><p>Faz tempo que voce nao nos visita...</p>" },
      },
      {
        id: "a2",
        type: "action",
        position: { x: 400, y: 400 },
        data: { actionType: "remove_tag", tagName: "inactive" },
      },
    ],
    edges: [
      { id: "e1", source: "t1", target: "d1", animated: true, style: { stroke: "#6b7280" } },
      { id: "e2", source: "d1", target: "c1", animated: true, style: { stroke: "#6b7280" } },
      { id: "e3", source: "c1", sourceHandle: "true", target: "a1", animated: true, style: { stroke: "#22c55e" } },
      { id: "e4", source: "c1", sourceHandle: "false", target: "a2", animated: true, style: { stroke: "#ef4444" } },
    ],
  };
}
