import { getWorkspaceId } from "@/lib/session";
import { getDashboardMetrics, getContactsOverTime } from "@/services/analytics";
import { getRecentActivities } from "@/services/activities";
import { getActivityLabel } from "@/lib/activity-labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Mail, MousePointer, TrendingUp, FileText, Filter } from "lucide-react";
import Link from "next/link";
import { ContactsChart } from "@/components/dashboard/contacts-chart";

export default async function DashboardPage() {
  const workspaceId = await getWorkspaceId();

  const [metrics, contactsOverTime, recentActivities] = await Promise.all([
    getDashboardMetrics(),
    getContactsOverTime(30),
    getRecentActivities(workspaceId, 10),
  ]);

  const stats = [
    {
      name: "Total de Contatos",
      value: metrics.totalContacts,
      sub: `+${metrics.newContactsWeek} esta semana`,
      icon: Users,
    },
    {
      name: "Campanhas Enviadas",
      value: metrics.sentCampaigns,
      sub: `${metrics.totalCampaigns} no total (email + WhatsApp)`,
      icon: Mail,
    },
    {
      name: "Taxa de Abertura",
      value: `${metrics.openRate}%`,
      sub: `${metrics.totalOpened} aberturas (apenas email)`,
      icon: TrendingUp,
    },
    {
      name: "Taxa de Cliques",
      value: `${metrics.clickRate}%`,
      sub: `${metrics.totalClicked} cliques (apenas email)`,
      icon: MousePointer,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Visao geral da sua plataforma</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Novos contatos (ultimos 30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <ContactsChart data={contactsOverTime} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contatos por origem</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.contactsBySource.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum dado.</p>
            ) : (
              <div className="space-y-3">
                {metrics.contactsBySource.map((source) => (
                  <div key={source.source} className="flex items-center justify-between">
                    <span className="text-sm capitalize">{source.source}</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{
                          width: `${Math.max(
                            20,
                            (source.count / metrics.totalContacts) * 200
                          )}px`,
                        }}
                      />
                      <span className="text-sm font-medium">{source.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atividade recente</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma atividade recente.</p>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 border-b pb-3 last:border-0"
                >
                  <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm">
                      <Link
                        href={`/contacts/${activity.contactId}`}
                        className="font-medium hover:underline"
                      >
                        {activity.contact.firstName || activity.contact.email}
                      </Link>
                      {" — "}
                      {getActivityLabel(activity.type)}
                    </p>
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
    </div>
  );
}
