import { TemplateEditor } from "@/components/templates/template-editor";

export default function NewTemplatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Novo template</h1>
        <p className="text-muted-foreground">Crie um template de email reutilizavel</p>
      </div>
      <TemplateEditor />
    </div>
  );
}
