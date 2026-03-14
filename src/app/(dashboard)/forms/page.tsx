import { getForms } from "@/services/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Trash2 } from "lucide-react";
import Link from "next/link";
import { FormsDeleteButton } from "@/components/forms/forms-delete-button";

export default async function FormsPage() {
  const forms = await getForms();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Formularios</h1>
          <p className="text-muted-foreground">
            Crie formularios para capturar leads
          </p>
        </div>
        <Link href="/forms/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo formulario
          </Button>
        </Link>
      </div>

      {forms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum formulario criado.</p>
            <Link href="/forms/new">
              <Button className="mt-4" variant="outline">
                Criar primeiro formulario
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Card key={form.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <Link href={`/forms/${form.id}`}>
                    <CardTitle className="text-lg hover:underline">
                      {form.name}
                    </CardTitle>
                  </Link>
                  {form.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {form.description}
                    </p>
                  )}
                </div>
                <Badge variant={form.status === "active" ? "default" : "secondary"}>
                  {form.status === "active" ? "Ativo" : "Inativo"}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{form.fields.length} campos</span>
                  <span>{form._count.submissions} submissions</span>
                </div>
                <div className="flex justify-end mt-3">
                  <FormsDeleteButton formId={form.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
