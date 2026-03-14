import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { GitBranch } from "lucide-react";

function ConditionNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as { field?: string; op?: string; value?: string; label?: string };

  return (
    <div
      className={`rounded-lg border-2 bg-white shadow-sm min-w-[200px] ${
        selected ? "border-orange-500 ring-2 ring-orange-200" : "border-orange-300"
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-orange-500 !w-3 !h-3 !border-2 !border-white"
      />
      <div className="bg-orange-50 px-3 py-1.5 rounded-t-md flex items-center gap-2 border-b border-orange-200">
        <GitBranch className="h-3.5 w-3.5 text-orange-600" />
        <span className="text-xs font-semibold text-orange-700">CONDICAO</span>
      </div>
      <div className="px-3 py-2">
        <p className="text-sm font-medium text-gray-800">
          {nodeData.label || (nodeData.field
            ? `Se ${nodeData.field} ${nodeData.op} "${nodeData.value}"`
            : "Configurar...")}
        </p>
      </div>
      <div className="flex justify-between px-3 pb-2">
        <div className="relative">
          <span className="text-[10px] font-medium text-green-600">Sim</span>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            className="!bg-green-500 !w-3 !h-3 !border-2 !border-white !left-2"
          />
        </div>
        <div className="relative">
          <span className="text-[10px] font-medium text-red-500">Nao</span>
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            className="!bg-red-500 !w-3 !h-3 !border-2 !border-white !left-2"
          />
        </div>
      </div>
    </div>
  );
}

export const ConditionNode = memo(ConditionNodeComponent);
