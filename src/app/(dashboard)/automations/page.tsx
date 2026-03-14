import { getAutomations } from "@/services/automations";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Zap } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const statusLabels: Record<string, string> = {
  active: "Ativa",
  inactive: "Inativa",
  paused: "Pausada",
};

const statusVariants: Record<string, "default" | "secondary" | "outline"> = {
  active: "default",
  inactive: "secondary",
  paused: "outline",
};

export default async function AutomationsPage() {
  const automations = await getAutomations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Automacoes</h1>
          <p className="text-muted-foreground">
            Crie fluxos automaticos de marketing
          </p>
        </div>
        <Link href="/automations/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova automacao
          </Button>
        </Link>
      </div>

      {automations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma automacao criada.</p>
            <Link href="/automations/new">
              <Button className="mt-4" variant="outline">
                Criar primeira automacao
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Passos</TableHead>
                  <TableHead>Inscritos</TableHead>
                  <TableHead>Criada em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {automations.map((automation) => (
                  <TableRow key={automation.id}>
                    <TableCell>
                      <Link
                        href={`/automations/${automation.id}`}
                        className="font-medium hover:underline"
                      >
                        {automation.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[automation.status] || "secondary"}>
                        {statusLabels[automation.status] || automation.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{automation._count.steps}</TableCell>
                    <TableCell>{automation._count.enrollments}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(automation.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
