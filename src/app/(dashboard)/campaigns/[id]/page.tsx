import { getCampaign } from "@/services/campaigns";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Users, Mail, MousePointer } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CampaignSendButton } from "@/components/campaigns/campaign-send-button";
import { CampaignEditor } from "@/components/campaigns/campaign-editor";

const statusLabels: Record<string, string> = {
  draft: "Rascunho",
  scheduled: "Agendada",
  sending: "Enviando",
  sent: "Enviada",
};

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const { id } = await params;
  const campaign = await getCampaign(id);

  if (!campaign) notFound();

  const totalSent = campaign.emailLogs.filter((l) => l.status !== "queued").length;
  const totalOpened = campaign.emailLogs.filter((l) => l.openedAt).length;
  const totalClicked = campaign.emailLogs.filter((l) => l.clickedAt).length;
  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "0";
  const clickRate = totalSent > 0 ? ((totalClicked / totalSent) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/campaigns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <Badge>{statusLabels[campaign.status] || campaign.status}</Badge>
          </div>
          {campaign.subject && (
            <p className="text-muted-foreground">Assunto: {campaign.subject}</p>
          )}
        </div>
        {campaign.status === "draft" && (
          <CampaignSendButton campaignId={campaign.id} />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Emails enviados
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de abertura
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de cliques
            </CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clickRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={campaign.status === "draft" ? "edit" : "logs"}>
        <TabsList>
          {campaign.status === "draft" && (
            <TabsTrigger value="edit">Editar</TabsTrigger>
          )}
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="logs">
            Envios ({campaign.emailLogs.length})
          </TabsTrigger>
        </TabsList>

        {campaign.status === "draft" && (
          <TabsContent value="edit" className="mt-4">
            <CampaignEditor campaign={campaign} />
          </TabsContent>
        )}

        <TabsContent value="preview" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {campaign.htmlContent ? (
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: campaign.htmlContent }}
                />
              ) : (
                <p className="text-muted-foreground">
                  Nenhum conteudo definido.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {campaign.emailLogs.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground">
                  Nenhum email enviado.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contato</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Enviado em</TableHead>
                      <TableHead>Aberto em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {campaign.emailLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Link
                            href={`/contacts/${log.contact.id}`}
                            className="hover:underline"
                          >
                            {log.contact.email}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{log.status}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.sentAt
                            ? new Date(log.sentAt).toLocaleString("pt-BR")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {log.openedAt
                            ? new Date(log.openedAt).toLocaleString("pt-BR")
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
