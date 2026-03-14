import { FormBuilder } from "@/components/forms/form-builder";

export default function NewFormPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Novo formulario</h1>
        <p className="text-muted-foreground">
          Crie um formulario para capturar leads
        </p>
      </div>
      <FormBuilder />
    </div>
  );
}
