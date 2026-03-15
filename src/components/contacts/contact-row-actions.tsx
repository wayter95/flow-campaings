"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Tags, X, Plus } from "lucide-react";
import {
  updateContact,
  deleteContact,
  addTagToContact,
  removeTagFromContact,
} from "@/services/contacts";

interface ContactTag {
  id: string;
  name: string;
  color: string | null;
}

interface Contact {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  source: string | null;
  tags: { tag: ContactTag }[];
}

interface AllTag {
  id: string;
  name: string;
}

interface ContactRowActionsProps {
  contact: Contact;
  allTags: AllTag[];
}

export function ContactRowActions({ contact, allTags }: ContactRowActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);

  return (
    <div className="flex items-center justify-end gap-1">
      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar contato</DialogTitle>
          </DialogHeader>
          <EditContactForm
            contact={contact}
            onDone={() => {
              setEditOpen(false);
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Tags dialog */}
      <Dialog open={tagsOpen} onOpenChange={setTagsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tags — {contact.email}</DialogTitle>
          </DialogHeader>
          <InlineTagManager
            contactId={contact.id}
            currentTags={contact.tags.map((ct) => ct.tag)}
            allTags={allTags}
            onDone={() => router.refresh()}
          />
        </DialogContent>
      </Dialog>

      {/* Actions dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
            />
          }
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTagsOpen(true)}>
            <Tags className="h-4 w-4 mr-2" />
            Gerenciar tags
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={async () => {
              if (!confirm("Tem certeza que deseja excluir este contato?")) return;
              await deleteContact(contact.id);
              router.refresh();
            }}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* ─── Edit form inside modal ─── */

function EditContactForm({
  contact,
  onDone,
}: {
  contact: Contact;
  onDone: () => void;
}) {
  const [email, setEmail] = useState(contact.email);
  const [firstName, setFirstName] = useState(contact.firstName || "");
  const [lastName, setLastName] = useState(contact.lastName || "");
  const [phone, setPhone] = useState(contact.phone || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.set("email", email);
    formData.set("firstName", firstName);
    formData.set("lastName", lastName);
    formData.set("phone", phone);

    const result = await updateContact(contact.id, formData);
    if (result && "error" in result && result.error) {
      setError(String(result.error));
      setLoading(false);
      return;
    }

    onDone();
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-2 rounded-md">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="modal-email">Email</Label>
        <Input
          id="modal-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@exemplo.com"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="modal-firstName">Nome</Label>
        <Input
          id="modal-firstName"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Nome"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="modal-lastName">Sobrenome</Label>
        <Input
          id="modal-lastName"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Sobrenome"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="modal-phone">Telefone</Label>
        <Input
          id="modal-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(11) 99999-9999"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

/* ─── Tag manager inside modal ─── */

function InlineTagManager({
  contactId,
  currentTags,
  allTags,
  onDone,
}: {
  contactId: string;
  currentTags: ContactTag[];
  allTags: AllTag[];
  onDone: () => void;
}) {
  const [tags, setTags] = useState(currentTags);
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(false);

  // Tags that the contact doesn't have yet
  const availableTags = allTags.filter(
    (t) => !tags.some((ct) => ct.id === t.id)
  );

  async function handleAdd(tagName: string) {
    if (!tagName.trim()) return;
    setLoading(true);
    await addTagToContact(contactId, tagName.trim());
    // Optimistically update local state
    setTags((prev) => [...prev, { id: `temp-${Date.now()}`, name: tagName.trim(), color: null }]);
    setNewTag("");
    setLoading(false);
    onDone();
  }

  async function handleRemove(tagId: string) {
    await removeTagFromContact(contactId, tagId);
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    onDone();
  }

  return (
    <div className="space-y-4">
      {/* Current tags */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Tags atuais</p>
        <div className="flex flex-wrap gap-2">
          {tags.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma tag.</p>
          )}
          {tags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="flex items-center gap-1 pr-1">
              {tag.name}
              <button
                onClick={() => handleRemove(tag.id)}
                className="ml-0.5 rounded-full hover:bg-destructive/20 hover:text-destructive p-0.5 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Quick add from existing tags */}
      {availableTags.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Adicionar tag existente</p>
          <div className="flex flex-wrap gap-1.5">
            {availableTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleAdd(tag.name)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-dashed text-xs hover:bg-accent transition-colors"
              >
                <Plus className="h-3 w-3" />
                {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add new tag */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Criar nova tag</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAdd(newTag);
          }}
          className="flex gap-2"
        >
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Nome da nova tag"
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={loading || !newTag.trim()}>
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </form>
      </div>
    </div>
  );
}
