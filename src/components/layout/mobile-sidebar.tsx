"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import {
  LayoutDashboard,
  Users,
  Mail,
  FileText,
  Settings,
  Filter,
  Workflow,
  FileCode,
  MessageCircle,
  Tag,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Contatos", href: "/contacts", icon: Users },
  { name: "Segmentos", href: "/segments", icon: Filter },
  { name: "Tags", href: "/tags", icon: Tag },
  { name: "Formularios", href: "/forms", icon: FileText },
  { name: "Templates de E-mail", href: "/templates", icon: FileCode },
  { name: "Templates WhatsApp", href: "/templates/whatsapp", icon: MessageCircle },
  { name: "Campanhas", href: "/campaigns", icon: Mail },
  { name: "Automacoes", href: "/automations", icon: Workflow },
  { name: "Configuracoes", href: "/settings", icon: Settings },
];

export function MobileSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      <div className="flex h-16 items-center justify-center border-b px-4">
        <Logo href="/" height={40} className="w-full max-w-[180px]" />
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : item.href === "/templates"
              ? pathname === "/templates" || (pathname.startsWith("/templates/") && !pathname.startsWith("/templates/whatsapp"))
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
