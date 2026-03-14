import { SegmentBuilder } from "@/components/segments/segment-builder";

export default function NewSegmentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Novo segmento</h1>
        <p className="text-muted-foreground">
          Defina regras para segmentar seus contatos
        </p>
      </div>
      <SegmentBuilder />
    </div>
  );
}
