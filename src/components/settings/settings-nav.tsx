"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { User, Plug } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/settings/account",
    label: "Conta",
    description: "Dados pessoais, senha e workspace",
    icon: User,
  },
  {
    href: "/settings/integrations",
    label: "Integrações",
    description: "Email, WhatsApp e outras conexões",
    icon: Plug,
  },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <Card>
      <CardContent className="p-0">
        <nav className="flex flex-wrap gap-1 p-2" aria-label="Configurações">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3 transition-colors min-w-0",
                  "hover:bg-muted/80",
                  isActive
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <div className="min-w-0">
                  <span className="font-medium block">{item.label}</span>
                  <span
                    className={cn(
                      "text-xs block truncate",
                      isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}
                  >
                    {item.description}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </CardContent>
    </Card>
  );
}
