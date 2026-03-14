import { getSegment, evaluateSegment, type SegmentRules, type SegmentCondition } from "@/services/segments";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SegmentDetailPageProps {
  params: Promise<{ id: string }>;
}

const fieldLabels: Record<string, string> = {
  tag: "Tag",
  email: "Email",
  firstName: "Nome",
  lastName: "Sobrenome",
  source: "Origem",
  createdAt: "Data de criacao",
  unsubscribed: "Descadastrado",
};

const opLabels: Record<string, string> = {
  equals: "igual a",
  not_equals: "diferente de",
  contains: "contem",
  not_contains: "nao contem",
  gt: "maior que",
  lt: "menor que",
  after: "depois de",
  before: "antes de",
};

export default async function SegmentDetailPage({ params }: SegmentDetailPageProps) {
  const { id } = await params;
  const segment = await getSegment(id);

  if (!segment) notFound();

  const contacts = await evaluateSegment(id);
  const rules = segment.rules as unknown as SegmentRules;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/segments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{segment.name}</h1>
          <p className="text-muted-foreground">
            {contacts.length} contato{contacts.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Regras</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Combinar com: <Badge variant="secondary">{rules.operator}</Badge>
            </p>
            {rules.conditions.map((c: SegmentCondition, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Badge variant="outline">{fieldLabels[c.field] || c.field}</Badge>
                <span className="text-muted-foreground">{opLabels[c.op] || c.op}</span>
                <Badge>{c.value}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contatos ({contacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {contacts.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              Nenhum contato corresponde as regras.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Origem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id}>
                    <TableCell>
                      <Link
                        href={`/contacts/${contact.id}`}
                        className="font-medium hover:underline"
                      >
                        {contact.firstName || contact.lastName
                          ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
                          : "—"}
                      </Link>
                    </TableCell>
                    <TableCell>{contact.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {contact.tags.map(({ tag }) => (
                          <Badge key={tag.id} variant="secondary" className="text-xs">
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {contact.source || "—"}
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
