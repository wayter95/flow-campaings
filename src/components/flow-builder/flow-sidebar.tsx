"use client";

import { Zap, Mail, MessageCircle, Clock, GitBranch } from "lucide-react";

const nodeItems = [
  { type: "trigger", label: "Trigger", icon: Zap, color: "bg-green-100 border-green-300 text-green-700 dark:bg-green-950 dark:border-green-700 dark:text-green-300" },
  { type: "action", label: "Email", icon: Mail, color: "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-300", defaultData: "send_email" },
  { type: "action_whatsapp", label: "WhatsApp", icon: MessageCircle, color: "bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-700 dark:text-emerald-300", defaultData: "send_whatsapp" },
  { type: "delay", label: "Delay", icon: Clock, color: "bg-amber-100 border-amber-300 text-amber-700 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-300" },
  { type: "condition", label: "Condicao", icon: GitBranch, color: "bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-950 dark:border-orange-700 dark:text-orange-300" },
];

export function FlowSidebar() {
  function onDragStart(event: React.DragEvent, nodeType: string, defaultData?: string) {
    event.dataTransfer.setData("application/reactflow-type", nodeType);
    if (defaultData) {
      event.dataTransfer.setData("application/reactflow-default", defaultData);
    }
    event.dataTransfer.effectAllowed = "move";
  }

  return (
    <div className="w-48 border-r bg-card p-3 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Arrastar para o canvas
      </p>
      {nodeItems.map((item) => (
        <div
          key={item.type}
          className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-grab active:cursor-grabbing ${item.color} transition-shadow hover:shadow-md`}
          draggable
          onDragStart={(e) => onDragStart(e, item.type, item.defaultData)}
        >
          <item.icon className="h-4 w-4" />
          <span className="text-sm font-medium">{item.label}</span>
        </div>
      ))}

      <div className="border-t pt-3 mt-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Templates
        </p>
        <div
          className="p-2.5 rounded-lg border border-purple-300 bg-purple-100 text-purple-700 cursor-grab active:cursor-grabbing text-sm font-medium hover:shadow-md transition-shadow"
          draggable
          onDragStart={(e) => {
            // We'll handle template creation as a special drop
            e.dataTransfer.setData("application/reactflow-type", "template:welcome");
            e.dataTransfer.effectAllowed = "move";
          }}
        >
          Welcome Series
        </div>
        <div
          className="p-2.5 rounded-lg border border-purple-300 bg-purple-100 text-purple-700 cursor-grab active:cursor-grabbing text-sm font-medium hover:shadow-md transition-shadow mt-2"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("application/reactflow-type", "template:reengagement");
            e.dataTransfer.effectAllowed = "move";
          }}
        >
          Re-engagement
        </div>
      </div>
    </div>
  );
}
