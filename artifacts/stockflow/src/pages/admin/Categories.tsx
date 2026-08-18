import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListCategories,
  useCreateCategory,
  useDeleteCategory,
  getListCategoriesQueryKey,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tags, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Categories() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useListCategories();
  const create = useCreateCategory();
  const remove = useDeleteCategory();
  const [name, setName] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { data: { name: name.trim() } },
      {
        onSuccess: () => {
          toast.success("Catégorie créée");
          queryClient.invalidateQueries({
            queryKey: getListCategoriesQueryKey(),
          });
          setName("");
        },
      },
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Catégories"
          description="Familles utilisées pour ranger les produits."
        />
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleAdd} className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom de la catégorie"
              />
              <Button type="submit" disabled={create.isPending}>
                <Plus className="h-4 w-4 mr-2" />
                Ajouter
              </Button>
            </form>
          </CardContent>
        </Card>
        {isLoading ? (
          <div className="text-muted-foreground">Chargement…</div>
        ) : data && data.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 hover-elevate"
              >
                <div className="flex items-center gap-3">
                  <Tags className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{c.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => {
                    if (confirm(`Supprimer "${c.name}" ?`)) {
                      remove.mutate(
                        { id: c.id },
                        {
                          onSuccess: () => {
                            toast.success("Catégorie supprimée");
                            queryClient.invalidateQueries({
                              queryKey: getListCategoriesQueryKey(),
                            });
                          },
                        },
                      );
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Tags}
            title="Aucune catégorie"
            description="Créez une famille pour organiser vos produits."
          />
        )}
      </div>
    </AdminLayout>
  );
}
