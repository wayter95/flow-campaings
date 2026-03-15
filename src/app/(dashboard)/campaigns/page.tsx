import { getCampaignsWithMetrics } from "@/services/campaigns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CampaignDeleteButton } from "@/components/campaigns/campaign-delete-button";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  scheduled: { label: "Agendada", variant: "outline" },
  sending: { label: "Enviando", variant: "default" },
  sent: { label: "Enviada", variant: "default" },
};

const PAGE_SIZE = 10;

interface CampaignsPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function CampaignsPage({ searchParams }: CampaignsPageProps) {
  const { page: pageParam } = await searchParams;
  const allCampaigns = await getCampaignsWithMetrics();

  const currentPage = Math.max(1, parseInt(pageParam || "1", 10));
  const totalPages = Math.max(1, Math.ceil(allCampaigns.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const campaigns = allCampaigns.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campanhas</h1>
          <p className="text-muted-foreground">
            Crie e envie campanhas de email e WhatsApp
          </p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova campanha
          </Button>
        </Link>
      </div>

      {allCampaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma campanha criada.</p>
            <Link href="/campaigns/new">
              <Button className="mt-4" variant="outline">
                Criar primeira campanha
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enviados</TableHead>
                    <TableHead>Taxa de abertura</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => {
                    const status = statusLabels[campaign.status] || statusLabels.draft;
                    return (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <Link
                            href={`/campaigns/${campaign.id}`}
                            className="font-medium hover:underline"
                          >
                            {campaign.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>{campaign.totalSent}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {campaign.openRate !== null ? `${campaign.openRate}%` : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {campaign.sentAt
                            ? new Date(campaign.sentAt).toLocaleDateString("pt-BR")
                            : new Date(campaign.createdAt).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          <CampaignDeleteButton campaignId={campaign.id} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {safePage > 1 ? (
                <Link href={`/campaigns?page=${safePage - 1}`}>
                  <Button variant="outline" size="icon">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="icon" disabled>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                Pagina {safePage} de {totalPages}
              </span>
              {safePage < totalPages ? (
                <Link href={`/campaigns?page=${safePage + 1}`}>
                  <Button variant="outline" size="icon">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="icon" disabled>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
