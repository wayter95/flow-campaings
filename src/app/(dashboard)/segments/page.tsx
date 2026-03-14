import { getSegments, getSegmentCount } from "@/services/segments";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SegmentDeleteButton } from "@/components/segments/segment-delete-button";

export default async function SegmentsPage() {
  const segments = await getSegments();

  const segmentsWithCounts = await Promise.all(
    segments.map(async (s) => ({
      ...s,
      contactCount: await getSegmentCount(s.id),
    }))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Segmentos</h1>
          <p className="text-muted-foreground">
            Crie grupos de contatos com base em regras
          </p>
        </div>
        <Link href="/segments/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo segmento
          </Button>
        </Link>
      </div>

      {segmentsWithCounts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Filter className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum segmento criado.</p>
            <Link href="/segments/new">
              <Button className="mt-4" variant="outline">
                Criar primeiro segmento
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
                  <TableHead>Contatos</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {segmentsWithCounts.map((segment) => (
                  <TableRow key={segment.id}>
                    <TableCell>
                      <Link
                        href={`/segments/${segment.id}`}
                        className="font-medium hover:underline"
                      >
                        {segment.name}
                      </Link>
                    </TableCell>
                    <TableCell>{segment.contactCount}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(segment.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <SegmentDeleteButton segmentId={segment.id} />
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
