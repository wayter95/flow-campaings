"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus } from "lucide-react";
import { addTagToContact, removeTagFromContact } from "@/services/contacts";

interface Tag {
  id: string;
  name: string;
  color: string | null;
}

interface ContactTagManagerProps {
  contactId: string;
  tags: Tag[];
}

export function ContactTagManager({ contactId, tags }: ContactTagManagerProps) {
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAddTag(e: React.FormEvent) {
    e.preventDefault();
    if (!newTag.trim()) return;

    setLoading(true);
    await addTagToContact(contactId, newTag.trim());
    setNewTag("");
    setLoading(false);
    router.refresh();
  }

  async function handleRemoveTag(tagId: string) {
    await removeTagFromContact(contactId, tagId);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma tag.</p>
        )}
        {tags.map((tag) => (
          <Badge key={tag.id} variant="secondary" className="flex items-center gap-1">
            {tag.name}
            <button
              onClick={() => handleRemoveTag(tag.id)}
              className="ml-1 hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <form onSubmit={handleAddTag} className="flex gap-2">
        <Input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="Nome da tag"
          className="flex-1"
        />
        <Button type="submit" size="sm" disabled={loading || !newTag.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
