import { getForm } from "@/services/forms";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormEmbedCode } from "@/components/forms/form-embed-code";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface FormDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function FormDetailPage({ params }: FormDetailPageProps) {
  const { id } = await params;
  const form = await getForm(id);

  if (!form) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/forms">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{form.name}</h1>
            <Badge variant={form.status === "active" ? "default" : "secondary"}>
              {form.status === "active" ? "Ativo" : "Inativo"}
            </Badge>
          </div>
          {form.description && (
            <p className="text-muted-foreground">{form.description}</p>
          )}
        </div>
      </div>

      <Tabs defaultValue="fields">
        <TabsList>
          <TabsTrigger value="fields">Campos</TabsTrigger>
          <TabsTrigger value="submissions">
            Submissions ({form.submissions.length})
          </TabsTrigger>
          <TabsTrigger value="embed">Embed</TabsTrigger>
        </TabsList>

        <TabsContent value="fields" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {form.fields.length === 0 ? (
                <p className="text-muted-foreground">Nenhum campo definido.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Label</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Obrigatorio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.fields.map((field) => (
                      <TableRow key={field.id}>
                        <TableCell className="font-medium">{field.label}</TableCell>
                        <TableCell>{field.type}</TableCell>
                        <TableCell>
                          <Badge variant={field.required ? "default" : "secondary"}>
                            {field.required ? "Sim" : "Nao"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="submissions" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {form.submissions.length === 0 ? (
                <p className="text-muted-foreground">Nenhuma submission.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Dados</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.submissions.map((sub) => (
                      <TableRow key={sub.id}>
                        <TableCell>
                          {new Date(sub.createdAt).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell>
                          {sub.contact ? (
                            <Link
                              href={`/contacts/${sub.contact.id}`}
                              className="hover:underline"
                            >
                              {sub.contact.email}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="max-w-md">
                          <pre className="text-xs whitespace-pre-wrap">
                            {JSON.stringify(sub.data, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="embed" className="mt-4">
          <FormEmbedCode formId={form.id} fields={form.fields} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
