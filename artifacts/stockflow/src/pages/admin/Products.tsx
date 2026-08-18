import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  useListProducts, useListCategories, useListSuppliers,
  useCreateProduct, useDeleteProduct,
  getListProductsQueryKey, getGetDashboardSummaryQueryKey,
  type ProductWithDetails,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { GripVertical, ImagePlus, Package, Pencil, Plus, Search, Star, Trash2, Upload, X } from "lucide-react";
import { eur } from "@/lib/format";

// ─── Upload helper ────────────────────────────────────────────────────────────
async function uploadImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body });
  if (!res.ok) throw new Error("Échec de l'upload");
  return ((await res.json()) as { url: string }).url;
}

// ─── MAX GALLERY IMAGES ───────────────────────────────────────────────────────
const MAX_GALLERY = 4;

// ─── GalleryUpload – Shopify-style drag-and-drop gallery (max 4 images) ──────
function GalleryUpload({
  imageUrl,
  gallery,
  onImageUrlChange,
  onGalleryChange,
}: {
  imageUrl: string | null;
  gallery: string[];
  onImageUrlChange: (url: string | null) => void;
  onGalleryChange: (urls: string[]) => void;
}) {
  // All slots: main image is always index 0 (starred), rest are gallery
  const allImages: (string | null)[] = [imageUrl, ...gallery];
  // Pad to MAX_GALLERY slots
  const slots = Array.from({ length: MAX_GALLERY }, (_, i) => allImages[i] ?? null);

  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<number | null>(null); // slot index being uploaded
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [dragSrc, setDragSrc] = useState<number | null>(null);
  const [dropZoneActive, setDropZoneActive] = useState(false);

  const filledCount = slots.filter(Boolean).length;
  const canAdd = filledCount < MAX_GALLERY;

  // Commit slots back to parent: slot 0 = imageUrl, rest = gallery
  const commit = useCallback((newSlots: (string | null)[]) => {
    const filled = newSlots.filter(Boolean) as string[];
    onImageUrlChange(filled[0] ?? null);
    onGalleryChange(filled.slice(1));
  }, [onImageUrlChange, onGalleryChange]);

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const available = MAX_GALLERY - filledCount;
    const toUpload = files.slice(0, available);
    // Find first empty slot indices
    const emptySlots = slots.map((s, i) => s === null ? i : null).filter((i): i is number => i !== null);
    for (let fi = 0; fi < toUpload.length; fi++) {
      const slotIdx = emptySlots[fi];
      if (slotIdx === undefined) break;
      setUploading(slotIdx);
      try {
        const url = await uploadImage(toUpload[fi]);
        const newSlots = [...slots];
        newSlots[slotIdx] = url;
        commit(newSlots);
        // update local slots ref for next iteration
        slots[slotIdx] = url;
      } catch {
        toast.error(`Échec upload image ${fi + 1}`);
      }
    }
    setUploading(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleRemove = (idx: number) => {
    const newSlots = [...slots];
    newSlots[idx] = null;
    // Compact: shift filled images left
    const filled = newSlots.filter(Boolean) as string[];
    const compacted: (string | null)[] = Array.from({ length: MAX_GALLERY }, (_, i) => filled[i] ?? null);
    commit(compacted);
  };

  const handleSetMain = (idx: number) => {
    if (idx === 0 || !slots[idx]) return;
    const newSlots = [...slots];
    // Swap with slot 0
    [newSlots[0], newSlots[idx]] = [newSlots[idx], newSlots[0]];
    commit(newSlots);
  };

  // Drag & drop reorder
  const onDragStart = (idx: number) => setDragSrc(idx);
  const onDragEnd = () => { setDragSrc(null); setDragOver(null); };
  const onDragOverSlot = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOver(idx);
  };
  const onDropSlot = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragSrc === null || dragSrc === idx) { setDragOver(null); return; }
    const newSlots = [...slots];
    [newSlots[dragSrc], newSlots[idx]] = [newSlots[idx], newSlots[dragSrc]];
    commit(newSlots);
    setDragOver(null);
    setDragSrc(null);
  };

  // Global drop zone
  const onDropZone = async (e: React.DragEvent) => {
    e.preventDefault();
    setDropZoneActive(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (!files.length) return;
    const available = MAX_GALLERY - slots.filter(Boolean).length;
    if (!available) { toast.error(`Maximum ${MAX_GALLERY} images`); return; }
    const toUpload = files.slice(0, available);
    const emptySlots = slots.map((s, i) => s === null ? i : null).filter((i): i is number => i !== null);
    for (let fi = 0; fi < toUpload.length; fi++) {
      const slotIdx = emptySlots[fi];
      if (slotIdx === undefined) break;
      setUploading(slotIdx);
      try {
        const url = await uploadImage(toUpload[fi]);
        slots[slotIdx] = url;
        commit([...slots]);
      } catch {
        toast.error(`Échec upload`);
      }
    }
    setUploading(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Galerie photos <span className="text-muted-foreground font-normal">({filledCount}/{MAX_GALLERY})</span></Label>
        <span className="text-xs text-muted-foreground">Glisser pour réordonner · ⭐ = image principale</span>
      </div>

      {/* Drop zone wrapper */}
      <div
        className={`relative rounded-xl border-2 border-dashed p-3 transition-colors ${dropZoneActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 bg-muted/30"}`}
        onDragOver={(e) => { e.preventDefault(); setDropZoneActive(true); }}
        onDragLeave={() => setDropZoneActive(false)}
        onDrop={onDropZone}
      >
        {dropZoneActive && (
          <div className="absolute inset-0 rounded-xl flex items-center justify-center bg-primary/10 z-10 pointer-events-none">
            <div className="text-center">
              <Upload className="h-8 w-8 text-primary mx-auto mb-1" />
              <p className="text-sm font-medium text-primary">Déposer les images ici</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          {slots.map((url, idx) => (
            <div
              key={idx}
              draggable={!!url}
              onDragStart={() => onDragStart(idx)}
              onDragEnd={onDragEnd}
              onDragOver={(e) => onDragOverSlot(e, idx)}
              onDrop={(e) => onDropSlot(e, idx)}
              onClick={() => !url && canAdd && inputRef.current?.click()}
              className={`
                relative aspect-square rounded-lg border-2 overflow-hidden transition-all
                ${idx === 0 && url ? "ring-2 ring-primary ring-offset-1" : ""}
                ${dragOver === idx ? "border-primary scale-105 shadow-lg" : url ? "border-transparent" : "border-dashed border-muted-foreground/30"}
                ${!url && canAdd ? "cursor-pointer hover:border-primary/50 hover:bg-muted" : ""}
                ${dragSrc === idx ? "opacity-50" : ""}
                ${uploading === idx ? "animate-pulse" : ""}
                bg-muted
              `}
            >
              {url ? (
                <>
                  <img src={url} alt={`Photo ${idx + 1}`} className="h-full w-full object-cover" />

                  {/* Drag handle */}
                  <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 cursor-grab">
                    <GripVertical className="h-3 w-3 text-white drop-shadow" />
                  </div>

                  {/* Main badge */}
                  {idx === 0 && (
                    <div className="absolute bottom-1 left-1">
                      <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 bg-primary text-primary-foreground text-[9px] font-semibold leading-none">
                        <Star className="h-2 w-2 fill-current" /> Principale
                      </span>
                    </div>
                  )}

                  {/* Actions overlay */}
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-colors flex items-start justify-end gap-1 p-1">
                    {idx !== 0 && (
                      <button
                        type="button"
                        title="Définir comme image principale"
                        onClick={(e) => { e.stopPropagation(); handleSetMain(idx); }}
                        className="opacity-0 hover:opacity-100 group-hover:opacity-100 h-5 w-5 rounded bg-white/90 hover:bg-white flex items-center justify-center shadow transition-opacity"
                      >
                        <Star className="h-3 w-3 text-amber-500" />
                      </button>
                    )}
                    <button
                      type="button"
                      title="Supprimer"
                      onClick={(e) => { e.stopPropagation(); handleRemove(idx); }}
                      className="h-5 w-5 rounded bg-white/90 hover:bg-red-500 hover:text-white flex items-center justify-center shadow transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>

                  {uploading === idx && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-1 text-muted-foreground/50">
                  {uploading === idx ? (
                    <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : canAdd ? (
                    <>
                      <ImagePlus className="h-5 w-5" />
                      <span className="text-[9px] font-medium">{idx === 0 ? "Principale" : `Photo ${idx + 1}`}</span>
                    </>
                  ) : (
                    <Package className="h-5 w-5" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">JPEG, PNG, WebP · 5 Mo max · Glisser-déposer supporté</p>
          {canAdd && (
            <Button type="button" variant="outline" size="sm" className="gap-1.5 h-7 text-xs"
              onClick={() => inputRef.current?.click()}
              disabled={uploading !== null}>
              <ImagePlus className="h-3.5 w-3.5" />
              Ajouter {filledCount === 0 ? "des photos" : "une photo"}
            </Button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={handleFileInput}
      />
    </div>
  );
}

// ─── Type formulaire ──────────────────────────────────────────────────────────
type ProductForm = {
  name: string; reference: string; description: string;
  priceHt: string; vatRate: string;
  categoryId: string; supplierId: string;
  visibleOnStorefront: boolean; imageUrl: string | null;
  gallery: string[];
  sku: string; initialQuantity: string;
};
const EMPTY_FORM: ProductForm = {
  name: "", reference: "", description: "",
  priceHt: "", vatRate: "20", categoryId: "", supplierId: "",
  visibleOnStorefront: true, imageUrl: null, gallery: [],
  sku: "", initialQuantity: "",
};

// ─── Champs partagés create/edit ──────────────────────────────────────────────
function ProductFormFields({ form, setForm, showVariantFields, categories, suppliers }: {
  form: ProductForm; setForm: (f: ProductForm) => void; showVariantFields: boolean;
  categories?: { id: number; name: string }[]; suppliers?: { id: number; name: string }[];
}) {
  const set = (patch: Partial<ProductForm>) => setForm({ ...form, ...patch });
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <GalleryUpload
          imageUrl={form.imageUrl}
          gallery={form.gallery}
          onImageUrlChange={(url) => set({ imageUrl: url })}
          onGalleryChange={(gallery) => set({ gallery })}
        />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Nom du produit <span className="text-destructive">*</span></Label>
        <Input value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="T-Shirt Premium" />
      </div>
      <div className="space-y-1.5">
        <Label>Référence interne <span className="text-destructive">*</span></Label>
        <Input value={form.reference} onChange={(e) => set({ reference: e.target.value })} placeholder="PROD-001" />
      </div>
      <div className="space-y-1.5">
        <Label>Catégorie</Label>
        <Select value={form.categoryId} onValueChange={(v) => set({ categoryId: v })}>
          <SelectTrigger><SelectValue placeholder="Aucune" /></SelectTrigger>
          <SelectContent>
            {(categories ?? []).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Fournisseur</Label>
        <Select value={form.supplierId} onValueChange={(v) => set({ supplierId: v })}>
          <SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger>
          <SelectContent>
            {(suppliers ?? []).map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Prix HT (€) <span className="text-destructive">*</span></Label>
        <Input type="number" step="0.01" min="0" value={form.priceHt}
          onChange={(e) => set({ priceHt: e.target.value })} placeholder="0.00" />
      </div>
      <div className="space-y-1.5">
        <Label>TVA (%)</Label>
        <Input type="number" step="0.5" min="0" value={form.vatRate}
          onChange={(e) => set({ vatRate: e.target.value })} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Description</Label>
        <Textarea value={form.description} rows={3}
          onChange={(e) => set({ description: e.target.value })} />
      </div>
      {showVariantFields && <>
        <div className="space-y-1.5">
          <Label>SKU première variante <span className="text-destructive">*</span></Label>
          <Input value={form.sku} onChange={(e) => set({ sku: e.target.value })} placeholder="SKU-001" />
        </div>
        <div className="space-y-1.5">
          <Label>Quantité initiale</Label>
          <Input type="number" min="0" value={form.initialQuantity}
            onChange={(e) => set({ initialQuantity: e.target.value })} placeholder="0" />
        </div>
      </>}
      <div className="flex items-center gap-3 sm:col-span-2">
        <Switch id="visible" checked={form.visibleOnStorefront}
          onCheckedChange={(v) => set({ visibleOnStorefront: v })} />
        <Label htmlFor="visible">Visible sur la boutique en ligne</Label>
      </div>
    </div>
  );
}

// ─── Dialog création ──────────────────────────────────────────────────────────
function NewProductDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const { data: categories } = useListCategories();
  const { data: suppliers }  = useListSuppliers();
  const create = useCreateProduct();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.reference || !form.priceHt || !form.sku) {
      toast.error("Renseignez nom, référence, prix et SKU"); return;
    }
    create.mutate(
      { data: {
          name: form.name, reference: form.reference,
          description: form.description || null,
          priceHt: Number(form.priceHt), vatRate: Number(form.vatRate),
          imageUrl: form.imageUrl, gallery: form.gallery,
          categoryId: form.categoryId ? Number(form.categoryId) : null,
          supplierId: form.supplierId ? Number(form.supplierId) : null,
          visibleOnStorefront: form.visibleOnStorefront,
          firstVariant: {
            sku: form.sku, barcode: null, size: null, color: null, threshold: 5,
            initialQuantity: form.initialQuantity ? Number(form.initialQuantity) : 0,
            locationId: null,
          },
      }},
      { onSuccess: () => {
          toast.success("Produit créé");
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          setOpen(false); setForm(EMPTY_FORM);
        },
        onError: () => toast.error("Création impossible"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="new-product"><Plus className="h-4 w-4 mr-2" />Nouveau produit</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau produit</DialogTitle>
          <DialogDescription>Crée un produit avec sa première variante et le stock initial.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ProductFormFields form={form} setForm={setForm} showVariantFields
            categories={categories} suppliers={suppliers} />
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Création…" : "Créer le produit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog modification ──────────────────────────────────────────────────────
function EditProductDialog({ product, onClose }: { product: ProductWithDetails; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProductForm>({
    name: product.name, reference: product.reference,
    description: product.description ?? "",
    priceHt: String(product.priceHt), vatRate: String(product.vatRate),
    categoryId: product.categoryId ? String(product.categoryId) : "",
    supplierId: product.supplierId ? String(product.supplierId) : "",
    visibleOnStorefront: product.visibleOnStorefront,
    imageUrl: product.imageUrl ?? null,
    gallery: product.gallery ?? [],
    sku: "", initialQuantity: "",
  });
  const { data: categories } = useListCategories();
  const { data: suppliers }  = useListSuppliers();
  const [saving, setSaving]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.reference || !form.priceHt) {
      toast.error("Renseignez nom, référence et prix"); return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name, reference: form.reference,
          description: form.description || null,
          priceHt: Number(form.priceHt), vatRate: Number(form.vatRate),
          imageUrl: form.imageUrl,
          gallery: form.gallery,
          categoryId: form.categoryId ? Number(form.categoryId) : null,
          supplierId: form.supplierId ? Number(form.supplierId) : null,
          visibleOnStorefront: form.visibleOnStorefront,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Produit mis à jour");
      queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      onClose();
    } catch {
      toast.error("Modification impossible");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-4 w-4" />Modifier — {product.name}
          </DialogTitle>
          <DialogDescription>
            Les variantes se gèrent depuis la fiche produit.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ProductFormFields form={form} setForm={setForm} showVariantFields={false}
            categories={categories} suppliers={suppliers} />
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Products() {
  const [search,     setSearch]     = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [visible,    setVisible]    = useState<string>("all");
  const [editTarget, setEditTarget] = useState<ProductWithDetails | null>(null);
  const queryClient = useQueryClient();

  const params = useMemo(() => ({
    ...(search               ? { search }                          : {}),
    ...(categoryId !== "all" ? { categoryId: Number(categoryId) } : {}),
    ...(visible    !== "all" ? { visible: visible === "true" }    : {}),
  }), [search, categoryId, visible]);

  const { data: products, isLoading } = useListProducts(params);
  const { data: categories }          = useListCategories();
  const deleteMutation                = useDeleteProduct();

  const handleDelete = (product: ProductWithDetails) => {
    deleteMutation.mutate(
      { id: product.id },
      {
        onSuccess: () => {
          toast.success(`Produit "${product.name}" supprimé`);
          queryClient.invalidateQueries({ queryKey: getListProductsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        },
        onError: () => toast.error("Suppression impossible"),
      },
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Produits"
          description="Catalogue interne avec variantes, prix et visibilité boutique."
          actions={<NewProductDialog />}
        />

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit ou une référence…" className="pl-9" />
          </div>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="md:w-56"><SelectValue placeholder="Catégorie" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              {(categories ?? []).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={visible} onValueChange={setVisible}>
            <SelectTrigger className="md:w-48"><SelectValue placeholder="Visibilité" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="true">Visibles boutique</SelectItem>
              <SelectItem value="false">Masquées</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-lg border bg-card">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">Chargement…</div>
          ) : products && products.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead className="text-right">Prix TTC</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Variantes</TableHead>
                  <TableHead>Visibilité</TableHead>
                  <TableHead className="w-28 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link href={`/app/products/${p.id}`} className="flex items-center gap-3 hover:underline">
                        <div className="h-10 w-10 rounded-md bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                          {p.imageUrl
                            ? <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                            : <Package className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{p.reference}</p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.categoryName ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{eur(p.priceTtc)}</TableCell>
                    <TableCell className="text-right tabular-nums">{p.totalOnHand}</TableCell>
                    <TableCell className="text-right">{p.variants.length}</TableCell>
                    <TableCell>
                      {p.visibleOnStorefront
                        ? <Badge variant="secondary">Boutique</Badge>
                        : <Badge variant="outline">Interne</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Modifier" onClick={() => setEditTarget(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive"
                              data-testid={`delete-product-${p.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer le produit ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est définitive. Le produit «&nbsp;{p.name}&nbsp;» et ses variantes seront supprimés.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(p)}>Supprimer</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState icon={Package} title="Aucun produit ne correspond"
              description="Ajustez vos filtres ou créez un nouveau produit pour commencer." />
          )}
        </div>
      </div>

      {editTarget && (
        <EditProductDialog product={editTarget} onClose={() => setEditTarget(null)} />
      )}
    </AdminLayout>
  );
}
