"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContactRowActions } from "./contact-row-actions";

interface Contact {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  source: string | null;
  createdAt: Date;
  tags: { tag: { id: string; name: string; color: string | null } }[];
}

interface AllTag {
  id: string;
  name: string;
}

interface ContactsTableProps {
  contacts: Contact[];
  allTags: AllTag[];
}

export function ContactsTable({ contacts, allTags }: ContactsTableProps) {
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
              <ContactRowActions contact={contact} allTags={allTags} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
