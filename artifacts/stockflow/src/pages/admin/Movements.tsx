import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListMovements,
  useListProducts,
  useListLocations,
  useCreateMovement,
  getListMovementsQueryKey,
  getListStockLevelsQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import { dateTime, movementLabel } from "@/lib/format";
import { toast } from "sonner";

export default function Movements() {
  const [type, setType] = useState("all");
  const { data, isLoading } = useListMovements(
    type !== "all" ? { type: type as "in" | "out" | "transfer" | "adjust" } : undefined,
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Mouvements de stock"
          description="Journal complet des entrées, sorties, transferts et ajustements."
          actions={<NewMovementDialog />}
        />

        <div className="flex gap-3">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="in">Entrées</SelectItem>
              <SelectItem value="out">Sorties</SelectItem>
              <SelectItem value="transfer">Transferts</SelectItem>
              <SelectItem value="adjust">Ajustements</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border bg-card">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">
              Chargement…
            </div>
          ) : data && data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>De</TableHead>
                  <TableHead>Vers</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                  <TableHead>Opérateur</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {dateTime(m.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          m.type === "in"
                            ? "secondary"
                            : m.type === "out"
                              ? "destructive"
                              : "outline"
                        }
                        className="gap-1"
                      >
                        {m.type === "in" ? (
                          <ArrowDownRight className="h-3 w-3" />
                        ) : m.type === "out" ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowRightLeft className="h-3 w-3" />
                        )}
                        {movementLabel(m.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {m.productName}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{m.sku}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.fromLocationName ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.toLocationName ?? "—"}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {m.type === "out" ? "-" : "+"}
                      {m.quantity}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {m.operator}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={ArrowRightLeft}
              title="Aucun mouvement"
              description="Le journal s'enrichira dès qu'une opération sera enregistrée."
            />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function NewMovementDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: products } = useListProducts({});
  const { data: locations } = useListLocations();
  const create = useCreateMovement();
  const [form, setForm] = useState({
    variantId: "",
    type: "in" as "in" | "out" | "transfer" | "adjust",
    quantity: "1",
    fromLocationId: "none",
    toLocationId: "none",
    operator: "Admin",
    reason: "",
  });

  const variants = (products ?? []).flatMap((p) =>
    p.variants.map((v) => ({
      id: v.id,
      label: `${p.name} · ${v.sku}${v.size ? ` (${v.size})` : ""}`,
    })),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.variantId) {
      toast.error("Sélectionnez une variante");
      return;
    }
    create.mutate(
      {
        data: {
          variantId: Number(form.variantId),
          type: form.type,
          quantity: Number(form.quantity),
          fromLocationId:
            form.fromLocationId !== "none"
              ? Number(form.fromLocationId)
              : null,
          toLocationId:
            form.toLocationId !== "none" ? Number(form.toLocationId) : null,
          operator: form.operator,
          reason: form.reason || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Mouvement enregistré");
          queryClient.invalidateQueries({
            queryKey: getListMovementsQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getListStockLevelsQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetDashboardSummaryQueryKey(),
          });
          setOpen(false);
        },
        onError: () => toast.error("Enregistrement impossible"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau mouvement
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau mouvement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select
              value={form.type}
              onValueChange={(v) =>
                setForm({ ...form, type: v as typeof form.type })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in">Entrée</SelectItem>
                <SelectItem value="out">Sortie</SelectItem>
                <SelectItem value="transfer">Transfert</SelectItem>
                <SelectItem value="adjust">Ajustement</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Variante</Label>
            <Select
              value={form.variantId}
              onValueChange={(v) => setForm({ ...form, variantId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {variants.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quantité</Label>
              <Input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Opérateur</Label>
              <Input
                value={form.operator}
                onChange={(e) => setForm({ ...form, operator: e.target.value })}
              />
            </div>
          </div>
          {(form.type === "out" || form.type === "transfer") && (
            <div className="space-y-1.5">
              <Label>Emplacement source</Label>
              <Select
                value={form.fromLocationId}
                onValueChange={(v) =>
                  setForm({ ...form, fromLocationId: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non spécifié</SelectItem>
                  {(locations ?? []).map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {(form.type === "in" ||
            form.type === "transfer" ||
            form.type === "adjust") && (
            <div className="space-y-1.5">
              <Label>Emplacement destination</Label>
              <Select
                value={form.toLocationId}
                onValueChange={(v) => setForm({ ...form, toLocationId: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non spécifié</SelectItem>
                  {(locations ?? []).map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Motif</Label>
            <Input
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Vente, livraison, casse..."
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
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
