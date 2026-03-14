import { getAutomation, getAutomationStats } from "@/services/automations";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowDown, Users, CheckCircle, AlertCircle, Clock, Mail, Tag, GitBranch, Pencil } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AutomationStatusToggle } from "@/components/automations/automation-status-toggle";
import { AutomationDeleteButton } from "@/components/automations/automation-delete-button";

interface AutomationDetailPageProps {
  params: Promise<{ id: string }>;
}

const stepLabels: Record<string, string> = {
  send_email: "Enviar email",
  delay: "Aguardar",
  add_tag: "Adicionar tag",
  remove_tag: "Remover tag",
  condition: "Condicao",
};

const stepIcons: Record<string, typeof Mail> = {
  send_email: Mail,
  delay: Clock,
  add_tag: Tag,
  remove_tag: Tag,
  condition: GitBranch,
};

const enrollmentStatusLabels: Record<string, string> = {
  active: "Ativo",
  completed: "Concluido",
  paused: "Pausado",
  failed: "Falhou",
};

export default async function AutomationDetailPage({ params }: AutomationDetailPageProps) {
  const { id } = await params;
  const automation = await getAutomation(id);

  if (!automation) notFound();

  const stats = await getAutomationStats(id);
  const trigger = automation.trigger as unknown as { type: string; formId?: string; tagId?: string };

  const triggerLabels: Record<string, string> = {
    form_submitted: "Formulario enviado",
    tag_added: "Tag adicionada",
    contact_created: "Contato criado",
    manual: "Manual",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/automations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{automation.name}</h1>
            <Badge variant={automation.status === "active" ? "default" : "secondary"}>
              {automation.status === "active" ? "Ativa" : automation.status === "paused" ? "Pausada" : "Inativa"}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Trigger: {triggerLabels[trigger.type] || trigger.type}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/automations/${automation.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="h-4 w-4 mr-2" />
              Editar fluxo
            </Button>
          </Link>
          <AutomationStatusToggle automationId={automation.id} currentStatus={automation.status} />
          <AutomationDeleteButton automationId={automation.id} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total inscritos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold">{stats.active}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-2xl font-bold">{stats.completed}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Concluidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-2xl font-bold">{stats.failed}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Falhas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Passos da automacao</CardTitle>
        </CardHeader>
        <CardContent>
          {automation.steps.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum passo configurado.</p>
          ) : (
            <div className="space-y-1">
              {automation.steps.map((step, index) => {
                const Icon = stepIcons[step.type] || Mail;
                return (
                  <div key={step.id}>
                    {index > 0 && (
                      <div className="flex justify-center py-1">
                        <ArrowDown className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex items-center gap-3 p-3 border rounded-lg">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {index + 1}. {stepLabels[step.type] || step.type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatStepConfig(step.type, step.config as Record<string, unknown>)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contatos inscritos ({automation._count.enrollments})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {automation.enrollments.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              Nenhum contato inscrito ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Passo atual</TableHead>
                  <TableHead>Inscrito em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {automation.enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      <Link
                        href={`/contacts/${enrollment.contact.id}`}
                        className="font-medium hover:underline"
                      >
                        {enrollment.contact.firstName || enrollment.contact.email}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={enrollment.status === "completed" ? "default" : enrollment.status === "failed" ? "destructive" : "secondary"}>
                        {enrollmentStatusLabels[enrollment.status] || enrollment.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {enrollment.currentStep + 1} / {automation.steps.length}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(enrollment.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatStepConfig(type: string, config: Record<string, unknown>): string {
  switch (type) {
    case "send_email":
      return config.templateId ? "Usando template" : (config.subject as string) || "Sem assunto";
    case "delay":
      return `${config.duration} ${config.unit === "minutes" ? "minuto(s)" : config.unit === "hours" ? "hora(s)" : "dia(s)"}`;
    case "add_tag":
    case "remove_tag":
      return `Tag ID: ${config.tagId}`;
    case "condition":
      return `Se ${config.field} ${config.op} "${config.value}"`;
    default:
      return "";
  }
}
