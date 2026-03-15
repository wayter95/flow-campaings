"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateContact, deleteContact } from "@/services/contacts";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { useRouter } from "next/navigation";

interface ContactEditFormProps {
  contact: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    source: string | null;
    unsubscribed: boolean;
  };
}

export function ContactEditForm({ contact }: ContactEditFormProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [firstName, setFirstName] = useState(contact.firstName || "");
  const [lastName, setLastName] = useState(contact.lastName || "");

  async function handleSave() {
    setError("");
    setLoading(true);

    const formData = new FormData();
    formData.set("firstName", firstName);
    formData.set("lastName", lastName);

    const result = await updateContact(contact.id, formData);

    if (result && "error" in result && result.error) {
      setError(String(result.error));
    } else {
      setEditing(false);
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este contato? Esta acao nao pode ser desfeita.")) return;
    setDeleting(true);
    await deleteContact(contact.id);
    router.push("/contacts");
  }

  function handleCancel() {
    setFirstName(contact.firstName || "");
    setLastName(contact.lastName || "");
    setEditing(false);
    setError("");
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        <div>
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="font-medium">{contact.email}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Nome</p>
          <p className="font-medium">{contact.firstName || "—"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Sobrenome</p>
          <p className="font-medium">{contact.lastName || "—"}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Origem</p>
          <p className="font-medium">{contact.source || "—"}</p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1.5" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            {deleting ? "Excluindo..." : "Excluir"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="bg-destructive/10 text-destructive text-xs p-2 rounded-md">{error}</div>
      )}

      <div>
        <p className="text-sm text-muted-foreground">Email</p>
        <p className="font-medium">{contact.email}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-firstName" className="text-sm text-muted-foreground">Nome</Label>
        <Input
          id="edit-firstName"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Nome"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="edit-lastName" className="text-sm text-muted-foreground">Sobrenome</Label>
        <Input
          id="edit-lastName"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Sobrenome"
        />
      </div>

      <div>
        <p className="text-sm text-muted-foreground">Origem</p>
        <p className="font-medium">{contact.source || "—"}</p>
      </div>

      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={handleSave} disabled={loading}>
          <Check className="h-3.5 w-3.5 mr-1.5" />
          {loading ? "Salvando..." : "Salvar"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleCancel} disabled={loading}>
          <X className="h-3.5 w-3.5 mr-1.5" />
          Cancelar
        </Button>
      </div>
    </div>
  );
}
