import { getContact } from "@/services/contacts";
import { getContactActivities } from "@/services/activities";
import { getActivityLabel } from "@/lib/activity-labels";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import { ContactTagManager } from "@/components/contacts/contact-tag-manager";

interface ContactDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
  const { id } = await params;
  const [contact, activities] = await Promise.all([
    getContact(id),
    getContactActivities(id, 30),
  ]);

  if (!contact) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/contacts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {contact.firstName || contact.lastName
              ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
              : contact.email}
          </h1>
          <p className="text-muted-foreground">{contact.email}</p>
          {contact.unsubscribed && (
            <Badge variant="destructive" className="mt-1">Descadastrado</Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Informacoes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{contact.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p className="font-medium">{contact.firstName || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sobrenome</p>
              <p className="font-medium">{contact.lastName || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Origem</p>
              <p className="font-medium">{contact.source || "—"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Criado em</p>
              <p className="font-medium">
                {new Date(contact.createdAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <ContactTagManager
              contactId={contact.id}
              tags={contact.tags.map((ct) => ct.tag)}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Timeline de atividades
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 border-b pb-3 last:border-0"
                >
                  <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {getActivityLabel(activity.type)}
                    </p>
                    {activity.metadata && (
                      <p className="text-xs text-muted-foreground">
                        {typeof activity.metadata === "object" &&
                          Object.entries(activity.metadata as Record<string, unknown>)
                            .filter(([k]) => k.endsWith("Name") || k === "tagName")
                            .map(([, v]) => String(v))
                            .join(", ")}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(activity.createdAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historico de emails</CardTitle>
        </CardHeader>
        <CardContent>
          {contact.emailLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum email enviado.</p>
          ) : (
            <div className="space-y-3">
              {contact.emailLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">{log.campaign.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Badge variant="secondary">{log.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
