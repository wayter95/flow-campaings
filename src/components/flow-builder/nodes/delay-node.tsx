import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Clock } from "lucide-react";

const unitLabels: Record<string, string> = {
  minutes: "minuto(s)",
  hours: "hora(s)",
  days: "dia(s)",
};

function DelayNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as { duration?: number; unit?: string; label?: string };

  return (
    <div
      className={`rounded-lg border-2 bg-white shadow-sm min-w-[180px] ${
        selected ? "border-amber-500 ring-2 ring-amber-200" : "border-amber-300"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white"
      />
      <div className="bg-amber-50 px-3 py-1.5 rounded-t-md flex items-center gap-2 border-b border-amber-200">
        <Clock className="h-3.5 w-3.5 text-amber-600" />
        <span className="text-xs font-semibold text-amber-700">DELAY</span>
      </div>
      <div className="px-3 py-2">
        <p className="text-sm font-medium text-gray-800">
          {nodeData.label || (nodeData.duration
            ? `Aguardar ${nodeData.duration} ${unitLabels[nodeData.unit || "days"] || nodeData.unit}`
            : "Configurar...")}
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-amber-500 !w-3 !h-3 !border-2 !border-white"
      />
    </div>
  );
}

export const DelayNode = memo(DelayNodeComponent);
