import { getContacts } from "@/services/contacts";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { ContactForm } from "@/components/contacts/contact-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Upload } from "lucide-react";
import { ContactsSearch } from "@/components/contacts/contacts-search";
import Link from "next/link";

interface ContactsPageProps {
  searchParams: Promise<{ search?: string; page?: string }>;
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const params = await searchParams;
  const search = params.search || "";
  const page = parseInt(params.page || "1");

  const { contacts, total, totalPages } = await getContacts({
    search,
    page,
    limit: 20,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contatos</h1>
          <p className="text-muted-foreground">{total} contatos no total</p>
        </div>
        <div className="flex gap-2">
          <Link href="/contacts/import">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              Importar CSV
            </Button>
          </Link>
          <Dialog>
          <DialogTrigger render={<Button />}>
            <Plus className="h-4 w-4 mr-2" />
            Novo contato
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar contato</DialogTitle>
            </DialogHeader>
            <ContactForm />
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <ContactsSearch defaultValue={search} />
        </CardHeader>
        <CardContent className="p-0">
          <ContactsTable contacts={contacts} />
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/contacts?page=${p}${search ? `&search=${search}` : ""}`}
            >
              <Button variant={p === page ? "default" : "outline"} size="sm">
                {p}
              </Button>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
