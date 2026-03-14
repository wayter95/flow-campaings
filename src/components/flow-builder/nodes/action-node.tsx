import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Mail, Tag } from "lucide-react";

const actionLabels: Record<string, string> = {
  send_email: "Enviar email",
  add_tag: "Adicionar tag",
  remove_tag: "Remover tag",
};

const actionIcons: Record<string, typeof Mail> = {
  send_email: Mail,
  add_tag: Tag,
  remove_tag: Tag,
};

function ActionNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as { actionType?: string; label?: string; subject?: string; tagName?: string };
  const Icon = actionIcons[nodeData.actionType || ""] || Mail;

  return (
    <div
      className={`rounded-lg border-2 bg-white shadow-sm min-w-[180px] ${
        selected ? "border-blue-500 ring-2 ring-blue-200" : "border-blue-300"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white"
      />
      <div className="bg-blue-50 px-3 py-1.5 rounded-t-md flex items-center gap-2 border-b border-blue-200">
        <Icon className="h-3.5 w-3.5 text-blue-600" />
        <span className="text-xs font-semibold text-blue-700">
          {actionLabels[nodeData.actionType || ""] || "ACAO"}
        </span>
      </div>
      <div className="px-3 py-2">
        <p className="text-sm font-medium text-gray-800">
          {nodeData.label || nodeData.subject || nodeData.tagName || "Configurar..."}
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-blue-500 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  );
}

export const ActionNode = memo(ActionNodeComponent);
