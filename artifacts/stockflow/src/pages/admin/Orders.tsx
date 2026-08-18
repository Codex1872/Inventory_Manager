import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListPurchaseOrders,
  useListSuppliers,
  useListProducts,
  useCreatePurchaseOrder,
  useUpdatePurchaseOrderStatus,
  getListPurchaseOrdersQueryKey,
  getListMovementsQueryKey,
  getListStockLevelsQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, ShoppingCart, Trash2 } from "lucide-react";
import { eur, dateShort, orderStatusLabel } from "@/lib/format";
import { toast } from "sonner";

const STATUS_VARIANT: Record<
  "draft" | "sent" | "received" | "cancelled",
  "outline" | "secondary" | "default" | "destructive"
> = {
  draft: "outline",
  sent: "default",
  received: "secondary",
  cancelled: "destructive",
};

export default function Orders() {
  const queryClient = useQueryClient();
  const { data: orders, isLoading } = useListPurchaseOrders();
  const updateStatus = useUpdatePurchaseOrderStatus();

  const handleStatus = (
    id: number,
    status: "draft" | "sent" | "received" | "cancelled",
  ) => {
    updateStatus.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          toast.success(`Statut mis à jour : ${orderStatusLabel(status)}`);
          queryClient.invalidateQueries({
            queryKey: getListPurchaseOrdersQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getListMovementsQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getListStockLevelsQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetDashboardSummaryQueryKey(),
          });
        },
      },
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Commandes fournisseurs"
          description="Bons de commande, suivi de réception et impact stock."
          actions={<NewOrderDialog />}
        />

        {isLoading ? (
          <div className="text-muted-foreground">Chargement…</div>
        ) : orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((o) => (
              <Card key={o.id}>
                <CardContent className="p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold font-display text-lg">
                          {o.reference}
                        </h3>
                        <Badge variant={STATUS_VARIANT[o.status]}>
                          {orderStatusLabel(o.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {o.supplierName} · créée le {dateShort(o.createdAt)}
                        {o.expectedAt
                          ? ` · prévue le ${dateShort(o.expectedAt)}`
                          : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Total HT</p>
                      <p className="font-mono font-semibold text-lg">
                        {eur(o.totalHt)}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-md border bg-muted/40 divide-y">
                    {o.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between px-3 py-2 text-sm"
                      >
                        <span className="font-medium">{item.productName}</span>
                        <span className="text-muted-foreground font-mono">
                          {item.quantity} × {eur(item.unitPriceHt)}
                        </span>
                      </div>
                    ))}
                  </div>
                  {o.notes ? (
                    <p className="text-sm text-muted-foreground">{o.notes}</p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {o.status === "draft" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatus(o.id, "sent")}
                      >
                        Marquer envoyée
                      </Button>
                    )}
                    {(o.status === "draft" || o.status === "sent") && (
                      <Button
                        size="sm"
                        onClick={() => handleStatus(o.id, "received")}
                      >
                        Réception (entrée stock)
                      </Button>
                    )}
                    {o.status !== "cancelled" && o.status !== "received" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleStatus(o.id, "cancelled")}
                      >
                        Annuler
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ShoppingCart}
            title="Aucune commande pour l'instant"
            description="Créez un bon de commande pour réapprovisionner votre stock."
          />
        )}
      </div>
    </AdminLayout>
  );
}

function NewOrderDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: suppliers } = useListSuppliers();
  const { data: products } = useListProducts({});
  const create = useCreatePurchaseOrder();

  const variants = (products ?? []).flatMap((p) =>
    p.variants.map((v) => ({
      id: v.id,
      label: `${p.name} · ${v.sku}`,
      defaultPrice: p.priceHt,
    })),
  );

  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<
    Array<{ variantId: string; quantity: string; unitPriceHt: string }>
  >([{ variantId: "", quantity: "1", unitPriceHt: "" }]);

  const addLine = () =>
    setItems([...items, { variantId: "", quantity: "1", unitPriceHt: "" }]);
  const updateLine = (
    index: number,
    field: "variantId" | "quantity" | "unitPriceHt",
    value: string,
  ) => {
    setItems(
      items.map((it, i) => {
        if (i !== index) return it;
        const next = { ...it, [field]: value };
        if (field === "variantId") {
          const found = variants.find((v) => String(v.id) === value);
          if (found && !it.unitPriceHt)
            next.unitPriceHt = String(found.defaultPrice);
        }
        return next;
      }),
    );
  };
  const removeLine = (index: number) =>
    setItems(items.filter((_, i) => i !== index));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      toast.error("Sélectionnez un fournisseur");
      return;
    }
    const validItems = items.filter(
      (i) => i.variantId && Number(i.quantity) > 0,
    );
    if (validItems.length === 0) {
      toast.error("Ajoutez au moins une ligne");
      return;
    }
    create.mutate(
      {
        data: {
          supplierId: Number(supplierId),
          notes: notes || null,
          expectedAt: null,
          items: validItems.map((it) => ({
            variantId: Number(it.variantId),
            quantity: Number(it.quantity),
            unitPriceHt: Number(it.unitPriceHt) || 0,
          })),
        },
      },
      {
        onSuccess: () => {
          toast.success("Commande créée");
          queryClient.invalidateQueries({
            queryKey: getListPurchaseOrdersQueryKey(),
          });
          setOpen(false);
          setSupplierId("");
          setNotes("");
          setItems([{ variantId: "", quantity: "1", unitPriceHt: "" }]);
        },
        onError: () => toast.error("Création impossible"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle commande
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouvelle commande fournisseur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Fournisseur</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {(suppliers ?? []).map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Lignes de commande</Label>
            {items.map((line, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-6">
                  <Select
                    value={line.variantId}
                    onValueChange={(v) => updateLine(idx, "variantId", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Produit..." />
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
                <Input
                  className="col-span-2"
                  type="number"
                  min="1"
                  value={line.quantity}
                  onChange={(e) => updateLine(idx, "quantity", e.target.value)}
                  placeholder="Qté"
                />
                <Input
                  className="col-span-3"
                  type="number"
                  step="0.01"
                  value={line.unitPriceHt}
                  onChange={(e) =>
                    updateLine(idx, "unitPriceHt", e.target.value)
                  }
                  placeholder="Prix HT"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLine(idx)}
                  disabled={items.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLine}
            >
              <Plus className="h-4 w-4 mr-2" /> Ajouter une ligne
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              Créer la commande
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
