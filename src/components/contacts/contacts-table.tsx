"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2 } from "lucide-react";
import { deleteContact } from "@/services/contacts";
import { useRouter } from "next/navigation";

interface Contact {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  source: string | null;
  createdAt: Date;
  tags: { tag: { id: string; name: string; color: string | null } }[];
}

interface ContactsTableProps {
  contacts: Contact[];
}

export function ContactsTable({ contacts }: ContactsTableProps) {
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este contato?")) return;
    await deleteContact(id);
    router.refresh();
  }

  if (contacts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhum contato encontrado.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Tags</TableHead>
          <TableHead>Origem</TableHead>
          <TableHead>Data</TableHead>
          <TableHead className="w-12" />
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
            <TableCell className="text-muted-foreground">
              {new Date(contact.createdAt).toLocaleDateString("pt-BR")}
            </TableCell>
            <TableCell>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(contact.id)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
