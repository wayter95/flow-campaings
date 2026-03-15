"use client";

import { useState } from "react";
import { createTag, updateTag, deleteTag } from "@/services/tags";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { useRouter } from "next/navigation";

interface TagData {
  id: string;
  name: string;
  color: string | null;
  contactCount: number;
  createdAt: Date;
}

const TAG_COLORS = [
  { label: "Roxo", value: "#7C3AED" },
  { label: "Azul", value: "#3B82F6" },
  { label: "Verde", value: "#22C55E" },
  { label: "Amarelo", value: "#EAB308" },
  { label: "Vermelho", value: "#EF4444" },
  { label: "Rosa", value: "#EC4899" },
  { label: "Laranja", value: "#F97316" },
  { label: "Cinza", value: "#6B7280" },
];

export function TagsManager({ tags }: { tags: TagData[] }) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [editingTag, setEditingTag] = useState<TagData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(formData: FormData) {
    setLoading(true);
    setError("");
    const result = await createTag(formData);
    if (result.error) {
      setError(result.error);
    } else {
      setIsCreating(false);
      router.refresh();
    }
    setLoading(false);
  }

  async function handleUpdate(id: string, formData: FormData) {
    setLoading(true);
    setError("");
    const result = await updateTag(id, formData);
    if (result.error) {
      setError(result.error);
    } else {
      setEditingTag(null);
      router.refresh();
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir esta tag? Ela sera removida de todos os contatos.")) return;
    setLoading(true);
    await deleteTag(id);
    router.refresh();
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isCreating} onOpenChange={(v) => { setIsCreating(v); setError(""); }}>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" />
            Nova tag
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar nova tag</DialogTitle>
            </DialogHeader>
            <form action={handleCreate} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="tag-name">Nome</Label>
                <Input id="tag-name" name="name" placeholder="Ex: Cliente VIP" required />
              </div>
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2 flex-wrap">
                  {TAG_COLORS.map((c) => (
                    <label key={c.value} className="cursor-pointer">
                      <input type="radio" name="color" value={c.value} className="sr-only peer" />
                      <div
                        className="w-8 h-8 rounded-full border-2 border-transparent peer-checked:border-foreground peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-primary transition-all"
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    </label>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Criando..." : "Criar tag"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {tags.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">Nenhuma tag criada</p>
          <p className="text-sm mt-1">Crie tags para organizar seus contatos em grupos.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tag</TableHead>
              <TableHead>Contatos</TableHead>
              <TableHead className="text-right">Acoes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.map((tag) => (
              <TableRow key={tag.id}>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className="text-sm"
                    style={tag.color ? { backgroundColor: tag.color + "20", color: tag.color, borderColor: tag.color + "40" } : {}}
                  >
                    <span
                      className="w-2 h-2 rounded-full mr-1.5 inline-block"
                      style={{ backgroundColor: tag.color || "#6B7280" }}
                    />
                    {tag.name}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {tag.contactCount}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Dialog open={editingTag?.id === tag.id} onOpenChange={(v) => { if (!v) setEditingTag(null); setError(""); }}>
                      <DialogTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingTag(tag)} />}>
                        <Pencil className="h-3.5 w-3.5" />
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar tag</DialogTitle>
                        </DialogHeader>
                        <form action={(formData) => handleUpdate(tag.id, formData)} className="space-y-4">
                          {error && (
                            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                              {error}
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label htmlFor="edit-tag-name">Nome</Label>
                            <Input id="edit-tag-name" name="name" defaultValue={tag.name} required />
                          </div>
                          <div className="space-y-2">
                            <Label>Cor</Label>
                            <div className="flex gap-2 flex-wrap">
                              {TAG_COLORS.map((c) => (
                                <label key={c.value} className="cursor-pointer">
                                  <input
                                    type="radio"
                                    name="color"
                                    value={c.value}
                                    defaultChecked={tag.color === c.value}
                                    className="sr-only peer"
                                  />
                                  <div
                                    className="w-8 h-8 rounded-full border-2 border-transparent peer-checked:border-foreground peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-primary transition-all"
                                    style={{ backgroundColor: c.value }}
                                    title={c.label}
                                  />
                                </label>
                              ))}
                            </div>
                          </div>
                          <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Salvando..." : "Salvar"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(tag.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
