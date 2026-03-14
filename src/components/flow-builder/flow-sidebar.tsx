"use client";

import { Zap, Mail, Clock, GitBranch } from "lucide-react";

const nodeItems = [
  { type: "trigger", label: "Trigger", icon: Zap, color: "bg-green-100 border-green-300 text-green-700" },
  { type: "action", label: "Acao", icon: Mail, color: "bg-blue-100 border-blue-300 text-blue-700" },
  { type: "delay", label: "Delay", icon: Clock, color: "bg-amber-100 border-amber-300 text-amber-700" },
  { type: "condition", label: "Condicao", icon: GitBranch, color: "bg-orange-100 border-orange-300 text-orange-700" },
];

export function FlowSidebar() {
  function onDragStart(event: React.DragEvent, nodeType: string) {
    event.dataTransfer.setData("application/reactflow-type", nodeType);
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
          onDragStart={(e) => onDragStart(e, item.type)}
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
