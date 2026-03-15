import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Mail, Tag, MessageCircle } from "lucide-react";

const actionLabels: Record<string, string> = {
  send_email: "Enviar email",
  send_whatsapp: "Enviar WhatsApp",
  add_tag: "Adicionar tag",
  remove_tag: "Remover tag",
};

const actionIcons: Record<string, typeof Mail> = {
  send_email: Mail,
  send_whatsapp: MessageCircle,
  add_tag: Tag,
  remove_tag: Tag,
};

function ActionNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as { actionType?: string; label?: string; subject?: string; tagName?: string; whatsappMessage?: string };
  const actionType = nodeData.actionType || "";
  const Icon = actionIcons[actionType] || Mail;
  const isWhatsApp = actionType === "send_whatsapp";

  const borderClass = selected
    ? isWhatsApp
      ? "border-green-500 ring-2 ring-green-200 dark:ring-green-900"
      : "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900"
    : isWhatsApp
      ? "border-green-300 dark:border-green-700"
      : "border-blue-300 dark:border-blue-700";

  const headerBg = isWhatsApp ? "bg-green-50 dark:bg-green-950" : "bg-blue-50 dark:bg-blue-950";
  const headerBorder = isWhatsApp ? "border-green-200 dark:border-green-800" : "border-blue-200 dark:border-blue-800";
  const iconClass = isWhatsApp ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400";
  const labelClass = isWhatsApp ? "text-green-700 dark:text-green-300" : "text-blue-700 dark:text-blue-300";
  const handleColor = isWhatsApp ? "!bg-green-500" : "!bg-blue-500";

  const displayText = nodeData.label
    || nodeData.subject
    || nodeData.tagName
    || (nodeData.whatsappMessage
      ? nodeData.whatsappMessage.substring(0, 40) + (nodeData.whatsappMessage.length > 40 ? "..." : "")
      : null)
    || "Configurar...";

  return (
    <div className={`rounded-lg border-2 bg-card shadow-sm min-w-[180px] ${borderClass}`}>
      <Handle
        type="target"
        position={Position.Top}
        className={`${handleColor} !w-3 !h-3 !border-2 !border-card`}
      />
      <div className={`${headerBg} px-3 py-1.5 rounded-t-md flex items-center gap-2 border-b ${headerBorder}`}>
        <Icon className={`h-3.5 w-3.5 ${iconClass}`} />
        <span className={`text-xs font-semibold ${labelClass}`}>
          {actionLabels[actionType] || "ACAO"}
        </span>
      </div>
      <div className="px-3 py-2">
        <p className="text-sm font-medium text-foreground">
          {displayText}
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className={`${handleColor} !w-3 !h-3 !border-2 !border-card`}
      />
    </div>
  );
}

export const ActionNode = memo(ActionNodeComponent);
