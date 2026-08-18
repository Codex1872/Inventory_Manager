import { useParams, Link } from "wouter";
import {
  useGetProduct,
  useListMovements,
  useDeleteVariant,
  useCreateVariant,
  getGetProductQueryKey,
  getListMovementsQueryKey,
  getListProductsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  ArrowLeft,
  Package,
  Plus,
  Trash2,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRightLeft,
  Star,
} from "lucide-react";
import { eur, dateTime, movementLabel } from "@/lib/format";

export default function ProductDetail() {
  const params = useParams();
  const id = Number(params.id);
  const queryClient = useQueryClient();
  const { data: product, isLoading } = useGetProduct(id, {
    query: { enabled: !!id, queryKey: getGetProductQueryKey(id) },
  });

  const deleteVariant = useDeleteVariant();
  const [activeImg, setActiveImg] = useState<string | null>(null);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="text-muted-foreground">Chargement…</div>
      </AdminLayout>
    );
  }

  if (!product) {
    return (
      <AdminLayout>
        <EmptyState
          icon={Package}
          title="Produit introuvable"
          actions={
            <Link href="/app/products">
              <Button variant="outline">Retour aux produits</Button>
            </Link>
          }
        />
      </AdminLayout>
    );
  }

  // Build full image list: main + gallery
  const allImages = [product.imageUrl, ...(product.gallery ?? [])].filter(Boolean) as string[];
  const displayImg = activeImg ?? allImages[0] ?? null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Link
          href="/app/products"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Tous les produits
        </Link>

        <PageHeader
          title={product.name}
          description={`Référence ${product.reference}`}
          actions={
            <NewVariantDialog productId={product.id} />
          }
        />

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <Card>
            <CardContent className="p-4 space-y-3">
              {/* Main image viewer */}
              <div className="aspect-square rounded-lg bg-muted overflow-hidden flex items-center justify-center border">
                {displayImg ? (
                  <img
                    src={displayImg}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Package className="h-10 w-10 text-muted-foreground" />
                )}
              </div>

              {/* Thumbnail strip */}
              {allImages.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {allImages.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImg(url)}
                      className={`relative h-14 w-14 rounded-md overflow-hidden border-2 shrink-0 transition-all ${
                        (activeImg ?? allImages[0]) === url
                          ? "border-primary shadow-sm scale-105"
                          : "border-transparent hover:border-muted-foreground/40"
                      }`}
                    >
                      <img src={url} alt={`Photo ${idx + 1}`} className="h-full w-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute bottom-0 left-0 right-0 bg-primary/80 flex items-center justify-center py-0.5">
                          <Star className="h-2.5 w-2.5 text-white fill-white" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {allImages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center">Aucune photo — modifiez le produit pour en ajouter.</p>
              )}

              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prix HT</span>
                  <span className="font-mono">{eur(product.priceHt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TVA</span>
                  <span className="font-mono">{product.vatRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prix TTC</span>
                  <span className="font-mono font-semibold">
                    {eur(product.priceTtc)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t mt-2">
                  <span className="text-muted-foreground">Catégorie</span>
                  <span>{product.categoryName ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fournisseur</span>
                  <span>{product.supplierName ?? "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Visibilité</span>
                  <span>
                    {product.visibleOnStorefront ? (
                      <Badge variant="secondary">Boutique</Badge>
                    ) : (
                      <Badge variant="outline">Interne</Badge>
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stock total</span>
                  <span className="font-semibold">{product.totalOnHand}</span>
                </div>
              </div>
              {product.description ? (
                <p className="text-sm text-muted-foreground border-t pt-3 leading-relaxed">
                  {product.description}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Variantes ({product.variants.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {product.variants.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Code-barres</TableHead>
                        <TableHead>Taille</TableHead>
                        <TableHead>Couleur</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Seuil</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {product.variants.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-mono text-xs">
                            {v.sku}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {v.barcode ?? "—"}
                          </TableCell>
                          <TableCell>{v.size ?? "—"}</TableCell>
                          <TableCell>{v.color ?? "—"}</TableCell>
                          <TableCell className="text-right font-mono tabular-nums">
                            {v.onHand <= v.threshold ? (
                              <Badge
                                variant={
                                  v.onHand <= 0 ? "destructive" : "outline"
                                }
                              >
                                {v.onHand}
                              </Badge>
                            ) : (
                              v.onHand
                            )}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground tabular-nums">
                            {v.threshold}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                if (
                                  confirm(`Supprimer la variante ${v.sku} ?`)
                                ) {
                                  deleteVariant.mutate(
                                    { id: v.id },
                                    {
                                      onSuccess: () => {
                                        toast.success("Variante supprimée");
                                        queryClient.invalidateQueries({
                                          queryKey: getGetProductQueryKey(id),
                                        });
                                        queryClient.invalidateQueries({
                                          queryKey: getListProductsQueryKey(),
                                        });
                                      },
                                    },
                                  );
                                }
                              }}
                              className="text-destructive"
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
                    icon={Package}
                    title="Aucune variante"
                    description="Ajoutez la première déclinaison de ce produit."
                  />
                )}
              </CardContent>
            </Card>

            <ProductMovements variantIds={product.variants.map((v) => v.id)} />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function ProductMovements({ variantIds }: { variantIds: number[] }) {
  const { data: allMovements } = useListMovements(undefined, {
    query: { queryKey: getListMovementsQueryKey() },
  });
  const filtered = (allMovements ?? []).filter((m) =>
    variantIds.includes(m.variantId),
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des mouvements</CardTitle>
      </CardHeader>
      <CardContent>
        {filtered.length > 0 ? (
          <div className="divide-y">
            {filtered.slice(0, 12).map((m) => (
              <div key={m.id} className="flex items-center gap-3 py-3">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                    m.type === "in"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                      : m.type === "out"
                        ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                        : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
                  }`}
                >
                  {m.type === "in" ? (
                    <ArrowDownRight className="h-4 w-4" />
                  ) : m.type === "out" ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowRightLeft className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{movementLabel(m.type)}</p>
                  <p className="text-xs text-muted-foreground">
                    {dateTime(m.createdAt)} · {m.operator}
                  </p>
                </div>
                <div className="text-sm font-mono font-semibold">
                  {m.type === "out" ? "-" : "+"}
                  {m.quantity}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={ArrowRightLeft} title="Aucun mouvement enregistré" />
        )}
      </CardContent>
    </Card>
  );
}

function NewVariantDialog({ productId }: { productId: number }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    sku: "",
    barcode: "",
    size: "",
    color: "",
    threshold: "5",
    initialQuantity: "0",
  });
  const create = useCreateVariant();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.sku) {
      toast.error("SKU requis");
      return;
    }
    create.mutate(
      {
        id: productId,
        data: {
          sku: form.sku,
          barcode: form.barcode || null,
          size: form.size || null,
          color: form.color || null,
          threshold: Number(form.threshold) || 5,
          initialQuantity: Number(form.initialQuantity) || 0,
          locationId: null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Variante créée");
          queryClient.invalidateQueries({
            queryKey: getGetProductQueryKey(productId),
          });
          queryClient.invalidateQueries({
            queryKey: getListProductsQueryKey(),
          });
          setOpen(false);
          setForm({
            sku: "",
            barcode: "",
            size: "",
            color: "",
            threshold: "5",
            initialQuantity: "0",
          });
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
          Ajouter une variante
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle variante</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>SKU</Label>
              <Input
                value={form.sku}
                onChange={(e) => setForm({ ...form, sku: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Code-barres</Label>
              <Input
                value={form.barcode}
                onChange={(e) =>
                  setForm({ ...form, barcode: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Taille</Label>
              <Input
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Couleur</Label>
              <Input
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Seuil d'alerte</Label>
              <Input
                type="number"
                value={form.threshold}
                onChange={(e) =>
                  setForm({ ...form, threshold: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Stock initial</Label>
              <Input
                type="number"
                value={form.initialQuantity}
                onChange={(e) =>
                  setForm({ ...form, initialQuantity: e.target.value })
                }
              />
            </div>
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
              Créer la variante
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
