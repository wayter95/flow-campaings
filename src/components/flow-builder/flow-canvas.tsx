"use client";

import { useCallback, useRef, useState, useMemo } from "react";
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type OnConnect,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { TriggerNode } from "./nodes/trigger-node";
import { ActionNode } from "./nodes/action-node";
import { DelayNode } from "./nodes/delay-node";
import { ConditionNode } from "./nodes/condition-node";
import { NodeConfigPanel } from "./node-config-panel";
import { FlowSidebar } from "./flow-sidebar";
import { Button } from "@/components/ui/button";
import { Save, AlertTriangle } from "lucide-react";
import { getWelcomeTemplate, getReengagementTemplate } from "@/lib/flow-utils";

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  delay: DelayNode,
  condition: ConditionNode,
};

interface FlowCanvasProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onSave: (nodes: Node[], edges: Edge[]) => Promise<{ error?: string }>;
  forms: { id: string; name: string }[];
  tags: { id: string; name: string }[];
  templates: { id: string; name: string; subject: string }[];
}

let nodeId = 0;
function getNodeId() {
  return `node_${++nodeId}_${Date.now()}`;
}

function FlowCanvasInner({ initialNodes = [], initialEdges = [], onSave, forms, tags, templates }: FlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reactFlowInstance, setReactFlowInstance] = useState<ReturnType<typeof useMemo> | null>(null);

  const onConnect: OnConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: "#6b7280" } }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onUpdateNodeData = useCallback((id: string, data: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data } : n))
    );
    setSelectedNode((prev) => (prev?.id === id ? { ...prev, data } : prev));
  }, [setNodes]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow-type");
      if (!type) return;

      // Handle template drops
      if (type.startsWith("template:")) {
        const templateName = type.split(":")[1];
        const template = templateName === "welcome"
          ? getWelcomeTemplate()
          : getReengagementTemplate();
        setNodes(template.nodes);
        setEdges(template.edges);
        return;
      }

      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      const position = {
        x: event.clientX - bounds.left - 90,
        y: event.clientY - bounds.top - 25,
      };

      // Map special types to base types with default data
      let nodeType = type;
      let nodeData: Record<string, unknown>;

      const defaultDataMap: Record<string, Record<string, unknown>> = {
        trigger: { triggerType: "form_submitted" },
        action: { actionType: "send_email" },
        action_whatsapp: { actionType: "send_whatsapp" },
        delay: { duration: 1, unit: "days" },
        condition: { field: "tag", op: "contains", value: "" },
      };

      nodeData = defaultDataMap[type] || {};

      // action_whatsapp should render as "action" node type
      if (type === "action_whatsapp") {
        nodeType = "action";
      }

      // Allow override from drag data
      const defaultOverride = event.dataTransfer.getData("application/reactflow-default");
      if (defaultOverride === "send_whatsapp" && nodeType === "action") {
        nodeData = { actionType: "send_whatsapp" };
      }

      const newNode: Node = {
        id: getNodeId(),
        type: nodeType,
        position,
        data: nodeData,
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  const validate = useCallback((): string | null => {
    const triggers = nodes.filter((n) => n.type === "trigger");
    if (triggers.length === 0) return "Adicione pelo menos um trigger";
    if (triggers.length > 1) return "Apenas um trigger e permitido";

    // Check all non-trigger nodes have incoming edges
    for (const node of nodes) {
      if (node.type === "trigger") continue;
      const hasIncoming = edges.some((e) => e.target === node.id);
      if (!hasIncoming) return `O node "${node.type}" nao esta conectado`;
    }

    // Check condition nodes have both outputs
    const conditionNodes = nodes.filter((n) => n.type === "condition");
    for (const cn of conditionNodes) {
      const trueEdge = edges.some((e) => e.source === cn.id && e.sourceHandle === "true");
      const falseEdge = edges.some((e) => e.source === cn.id && e.sourceHandle === "false");
      if (!trueEdge || !falseEdge) return "Nodes de condicao precisam ter ambas as saidas conectadas (Sim e Nao)";
    }

    return null;
  }, [nodes, edges]);

  const handleSave = useCallback(async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setSaving(true);
    const result = await onSave(nodes, edges);
    if (result.error) {
      setError(result.error);
    }
    setSaving(false);
  }, [nodes, edges, onSave, validate]);

  // Find the actual selected node from state (updated data)
  const currentSelectedNode = selectedNode
    ? nodes.find((n) => n.id === selectedNode.id) || null
    : null;

  return (
    <div className="flex h-[calc(100vh-200px)] border rounded-lg overflow-hidden bg-muted/50">
      <FlowSidebar />

      <div className="flex-1 flex flex-col">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-2 flex items-center gap-2 border-b">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onInit={setReactFlowInstance as never}
            nodeTypes={nodeTypes}
            fitView
            deleteKeyCode={["Backspace", "Delete"]}
            className="bg-muted/50"
          >
            <Controls />
            <MiniMap
              nodeStrokeWidth={3}
              className="!bg-card !border !border-border !rounded-lg"
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          </ReactFlow>
        </div>

        <div className="border-t bg-card p-3 flex justify-end gap-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Salvando..." : "Salvar fluxo"}
          </Button>
        </div>
      </div>

      {currentSelectedNode && (
        <NodeConfigPanel
          node={currentSelectedNode}
          onUpdate={onUpdateNodeData}
          onClose={() => setSelectedNode(null)}
          forms={forms}
          tags={tags}
          templates={templates}
        />
      )}
    </div>
  );
}

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
