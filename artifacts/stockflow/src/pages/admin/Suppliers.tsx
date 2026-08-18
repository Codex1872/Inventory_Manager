import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSuppliers,
  useCreateSupplier,
  useDeleteSupplier,
  getListSuppliersQueryKey,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
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
import { Plus, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";

export default function Suppliers() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useListSuppliers();
  const remove = useDeleteSupplier();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Fournisseurs"
          description="Annuaire des partenaires d'approvisionnement."
          actions={<NewSupplierDialog />}
        />
        <div className="rounded-lg border bg-card">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">
              Chargement…
            </div>
          ) : data && data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead className="text-right">Délai (j)</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.contactName ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.email ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {s.phone ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.leadTimeDays}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`Supprimer "${s.name}" ?`)) {
                            remove.mutate(
                              { id: s.id },
                              {
                                onSuccess: () => {
                                  toast.success("Fournisseur supprimé");
                                  queryClient.invalidateQueries({
                                    queryKey: getListSuppliersQueryKey(),
                                  });
                                },
                              },
                            );
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={Truck}
              title="Aucun fournisseur"
              description="Ajoutez vos partenaires pour les associer aux produits et commandes."
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function NewSupplierDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const create = useCreateSupplier();
  const [form, setForm] = useState({
    name: "",
    contactName: "",
    email: "",
    phone: "",
    leadTimeDays: "7",
    notes: "",
  });

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
          contactName: form.contactName || null,
          email: form.email || null,
          phone: form.phone || null,
          leadTimeDays: Number(form.leadTimeDays) || 7,
          notes: form.notes || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Fournisseur ajouté");
          queryClient.invalidateQueries({
            queryKey: getListSuppliersQueryKey(),
          });
          setOpen(false);
          setForm({
            name: "",
            contactName: "",
            email: "",
            phone: "",
            leadTimeDays: "7",
            notes: "",
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau fournisseur
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau fournisseur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Raison sociale</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Contact</Label>
              <Input
                value={form.contactName}
                onChange={(e) =>
                  setForm({ ...form, contactName: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Délai (jours)</Label>
              <Input
                type="number"
                value={form.leadTimeDays}
                onChange={(e) =>
                  setForm({ ...form, leadTimeDays: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Téléphone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
            />
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
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
