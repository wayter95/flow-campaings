import { getWhatsAppTemplates, deleteWhatsAppTemplate } from "@/services/whatsapp-templates";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, MessageCircle, ArrowLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function WhatsAppTemplatesPage() {
  const templates = await getWhatsAppTemplates();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/templates">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Templates de WhatsApp</h1>
            <p className="text-muted-foreground">
              Crie templates reutilizaveis para campanhas de WhatsApp
            </p>
          </div>
        </div>
        <Link href="/templates/whatsapp/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo template
          </Button>
        </Link>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum template de WhatsApp criado.</p>
            <Link href="/templates/whatsapp/new">
              <Button className="mt-4" variant="outline">
                Criar primeiro template
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
                  <TableHead>Mensagem</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Atualizado em</TableHead>
                  <TableHead className="w-[80px]">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <Link
                        href={`/templates/whatsapp/${template.id}`}
                        className="font-medium hover:underline"
                      >
                        {template.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {template.message.length > 80
                        ? template.message.substring(0, 80) + "..."
                        : template.message}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(template.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(template.updatedAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <form
                        action={async () => {
                          "use server";
                          await deleteWhatsAppTemplate(template.id);
                        }}
                      >
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </form>
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
