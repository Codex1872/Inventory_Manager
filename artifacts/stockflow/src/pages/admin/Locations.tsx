import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListLocations,
  useCreateLocation,
  useDeleteLocation,
  getListLocationsQueryKey,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Locations() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useListLocations();
  const remove = useDeleteLocation();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Emplacements"
          description="Zones, allées et étagères de votre dépôt."
          actions={<NewLocationDialog />}
        />
        {isLoading ? (
          <div className="text-muted-foreground">Chargement…</div>
        ) : data && data.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((l) => (
              <Card key={l.id}>
                <CardContent className="p-5 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{l.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[l.zone, l.aisle && `Allée ${l.aisle}`, l.shelf && `Étagère ${l.shelf}`]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm(`Supprimer "${l.name}" ?`)) {
                        remove.mutate(
                          { id: l.id },
                          {
                            onSuccess: () => {
                              toast.success("Emplacement supprimé");
                              queryClient.invalidateQueries({
                                queryKey: getListLocationsQueryKey(),
                              });
                            },
                          },
                        );
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={MapPin}
            title="Aucun emplacement"
            description="Définissez vos zones de stockage pour suivre où sont vos produits."
          />
        )}
      </div>
    </AdminLayout>
  );
}

function NewLocationDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const create = useCreateLocation();
  const [form, setForm] = useState({ name: "", zone: "", aisle: "", shelf: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error("Nom requis");
      return;
    }
    create.mutate(
      {
        data: {
          name: form.name,
          zone: form.zone || null,
          aisle: form.aisle || null,
          shelf: form.shelf || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Emplacement créé");
          queryClient.invalidateQueries({
            queryKey: getListLocationsQueryKey(),
          });
          setOpen(false);
          setForm({ name: "", zone: "", aisle: "", shelf: "" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouvel emplacement
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel emplacement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nom</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Zone</Label>
              <Input
                value={form.zone}
                onChange={(e) => setForm({ ...form, zone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Allée</Label>
              <Input
                value={form.aisle}
                onChange={(e) => setForm({ ...form, aisle: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Étagère</Label>
              <Input
                value={form.shelf}
                onChange={(e) => setForm({ ...form, shelf: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={create.isPending}>
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
