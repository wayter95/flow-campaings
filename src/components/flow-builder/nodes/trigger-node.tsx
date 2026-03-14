import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Zap } from "lucide-react";

const triggerLabels: Record<string, string> = {
  form_submitted: "Formulario enviado",
  tag_added: "Tag adicionada",
  contact_created: "Contato criado",
  manual: "Manual",
};

function TriggerNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as { triggerType?: string; label?: string };
  return (
    <div
      className={`rounded-lg border-2 bg-white shadow-sm min-w-[180px] ${
        selected ? "border-green-500 ring-2 ring-green-200" : "border-green-300"
      }`}
    >
      <div className="bg-green-50 px-3 py-1.5 rounded-t-md flex items-center gap-2 border-b border-green-200">
        <Zap className="h-3.5 w-3.5 text-green-600" />
        <span className="text-xs font-semibold text-green-700">TRIGGER</span>
      </div>
      <div className="px-3 py-2">
        <p className="text-sm font-medium text-gray-800">
          {nodeData.label || triggerLabels[nodeData.triggerType || ""] || "Selecionar trigger"}
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-green-500 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  );
}

export const TriggerNode = memo(TriggerNodeComponent);
