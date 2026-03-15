import { getTagsWithCount } from "@/services/tags";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TagsManager } from "@/components/tags/tags-manager";

export default async function TagsPage() {
  const tags = await getTagsWithCount();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tags</h1>
        <p className="text-muted-foreground">
          Gerencie as tags para organizar seus contatos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todas as tags</CardTitle>
        </CardHeader>
        <CardContent>
          <TagsManager tags={tags} />
        </CardContent>
      </Card>
    </div>
  );
}
