import { useState, useRef, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertCircle,
  CheckCircle2,
  Minus,
  Package,
  Plus,
  Scan,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import { eur } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────

type CartItem = {
  variantId:   number;
  productName: string;
  sku:         string;
  size:        string | null;
  color:       string | null;
  imageUrl:    string | null;
  priceHt:     number;
  priceTtc:    number;
  vatRate:     number;
  quantity:    number;
  stock:       number;
};

type ScannedProduct = {
  productName: string;
  sku:         string;
  size:        string | null;
  color:       string | null;
  imageUrl:    string | null;
  priceHt:     number;
  priceTtc:    number;
  vatRate:     number;
  stock:       number;
  variantId:   number;
};

type SaleResult = {
  reference: string;
  totalHt:   number;
  totalTtc:  number;
  cashier:   string;
  createdAt: string;
};

// ─── API helpers ─────────────────────────────────────────────────────────────

async function apiScan(code: string): Promise<ScannedProduct | null> {
  const res = await fetch("/api/pos/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = await res.json() as {
    matched: boolean;
    product?: { name: string; priceHt: number; vatRate: number; priceTtc: number; imageUrl: string | null };
    variant?: { id: number; sku: string; size: string | null; color: string | null; onHand: number };
  };
  if (!data.matched || !data.product || !data.variant) return null;
  return {
    variantId:   data.variant.id,
    productName: data.product.name,
    sku:         data.variant.sku,
    size:        data.variant.size,
    color:       data.variant.color,
    imageUrl:    data.product.imageUrl,
    priceHt:     data.product.priceHt,
    priceTtc:    data.product.priceTtc,
    vatRate:     data.product.vatRate,
    stock:       data.variant.onHand,
  };
}

async function apiCheckout(
  cart: CartItem[],
  cashier: string,
): Promise<SaleResult> {
  const res = await fetch("/api/pos/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      cashier,
      items: cart.map((i) => ({
        variantId:   i.variantId,
        productName: i.productName,
        sku:         i.sku,
        size:        i.size,
        color:       i.color,
        quantity:    i.quantity,
        unitPriceHt: i.priceHt,
        vatRate:     i.vatRate,
      })),
    }),
  });
  if (!res.ok) throw new Error("Erreur lors de la validation");
  return res.json() as Promise<SaleResult>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function variantLabel(item: { size?: string | null; color?: string | null }) {
  return [item.size, item.color].filter(Boolean).join(" · ") || null;
}

function cartTotals(cart: CartItem[]) {
  const totalHt  = cart.reduce((s, i) => s + i.priceHt  * i.quantity, 0);
  const totalTtc = cart.reduce((s, i) => s + i.priceTtc * i.quantity, 0);
  const totalTva = totalTtc - totalHt;
  return { totalHt, totalTtc, totalTva };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Pos() {
  const [code,        setCode]        = useState("");
  const [scanning,    setScanning]    = useState(false);
  const [scanError,   setScanError]   = useState<string | null>(null);
  const [lastProduct, setLastProduct] = useState<ScannedProduct | null>(null);
  const [cart,        setCart]        = useState<CartItem[]>([]);
  const [cashier,     setCashier]     = useState("Admin");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paying,      setPaying]      = useState(false);
  const [receipt,     setReceipt]     = useState<SaleResult | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Toujours focus sur le champ de saisie
  const focusInput = useCallback(() => inputRef.current?.focus(), []);
  useEffect(() => { focusInput(); }, [focusInput]);

  // ── Scan ──────────────────────────────────────────────────────────────────
  const handleScan = useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setScanning(true);
    setScanError(null);

    try {
      const product = await apiScan(trimmed);
      if (!product) {
        setScanError(`Produit introuvable : "${trimmed}"`);
        setLastProduct(null);
      } else {
        setLastProduct(product);
        setCart((prev) => {
          const existing = prev.find((i) => i.variantId === product.variantId);
          if (existing) {
            return prev.map((i) =>
              i.variantId === product.variantId
                ? { ...i, quantity: i.quantity + 1 }
                : i,
            );
          }
          return [
            ...prev,
            { ...product, quantity: 1 },
          ];
        });
      }
    } catch {
      setScanError("Erreur réseau. Vérifiez la connexion.");
    } finally {
      setScanning(false);
      setCode("");
      setTimeout(focusInput, 50);
    }
  }, [code, focusInput]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleScan();
    if (e.key === "Escape") {
      setCode("");
      setScanError(null);
    }
  };

  // ── Panier ────────────────────────────────────────────────────────────────
  const updateQty = (variantId: number, delta: number) =>
    setCart((prev) =>
      prev
        .map((i) => i.variantId === variantId ? { ...i, quantity: i.quantity + delta } : i)
        .filter((i) => i.quantity > 0),
    );

  const removeItem = (variantId: number) =>
    setCart((prev) => prev.filter((i) => i.variantId !== variantId));

  const clearCart = () => {
    setCart([]);
    setLastProduct(null);
    setScanError(null);
    focusInput();
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const handleCheckout = async () => {
    setPaying(true);
    try {
      const result = await apiCheckout(cart, cashier);
      setReceipt(result);
      setCart([]);
      setLastProduct(null);
      setConfirmOpen(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setPaying(false);
    }
  };

  const { totalHt, totalTtc, totalTva } = cartTotals(cart);
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Caisse"
          description="Scannez ou saisissez un code-barre, SKU ou référence pour ajouter un article."
        />

        {/* ── Zone de scan ────────────────────────────────────────────────── */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={code}
              onChange={(e) => { setCode(e.target.value); setScanError(null); }}
              onKeyDown={handleKeyDown}
              placeholder="Code-barre / SKU / Référence — Appuyez sur Entrée"
              className="pl-9 h-12 text-base font-mono"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>
          <Button
            onClick={handleScan}
            disabled={scanning || !code.trim()}
            className="h-12 px-6"
          >
            {scanning ? "Recherche…" : "Scanner"}
          </Button>
          <div className="flex items-center gap-2 border rounded-md px-3">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Caissier :</span>
            <input
              value={cashier}
              onChange={(e) => setCashier(e.target.value)}
              className="w-24 bg-transparent text-sm outline-none"
              placeholder="Nom"
            />
          </div>
        </div>

        {/* ── Erreur scan ─────────────────────────────────────────────────── */}
        {scanError && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-4 py-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {scanError}
          </div>
        )}

        {/* ── Grille principale ───────────────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">

          {/* ── Dernier article scanné ────────────────────────────────────── */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-6 py-4 border-b bg-muted/30">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Dernier article scanné
              </h2>
            </div>

            {lastProduct ? (
              <div className="p-6 flex gap-6 items-start">
                {/* Image */}
                <div className="h-28 w-28 rounded-lg border bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                  {lastProduct.imageUrl ? (
                    <img src={lastProduct.imageUrl} alt={lastProduct.productName}
                      className="h-full w-full object-cover" />
                  ) : (
                    <Package className="h-10 w-10 text-muted-foreground/40" />
                  )}
                </div>

                {/* Infos */}
                <div className="flex-1 min-w-0 space-y-3">
                  <div>
                    <h3 className="text-xl font-semibold">{lastProduct.productName}</h3>
                    {variantLabel(lastProduct) && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {variantLabel(lastProduct)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {lastProduct.sku}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-2xl font-bold">{eur(lastProduct.priceTtc)}</p>
                      <p className="text-xs text-muted-foreground">
                        {eur(lastProduct.priceHt)} HT · TVA {lastProduct.vatRate}%
                      </p>
                    </div>
                    <Badge
                      variant={lastProduct.stock <= 0 ? "destructive" : lastProduct.stock <= 5 ? "outline" : "secondary"}
                      className="h-6"
                    >
                      {lastProduct.stock <= 0 ? "Rupture" : `${lastProduct.stock} en stock`}
                    </Badge>
                  </div>

                  {/* Confirmation visuelle */}
                  <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Ajouté au panier
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <Scan className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">
                  Scannez un article pour le voir apparaître ici
                </p>
              </div>
            )}
          </div>

          {/* ── Panier ────────────────────────────────────────────────────── */}
          <div className="rounded-xl border bg-card flex flex-col">
            <div className="px-4 py-4 border-b bg-muted/30 flex items-center justify-between">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                Panier
                {itemCount > 0 && (
                  <Badge className="rounded-full h-5 px-1.5 text-xs">{itemCount}</Badge>
                )}
              </h2>
              {cart.length > 0 && (
                <button onClick={clearCart}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
                  <X className="h-3 w-3" /> Vider
                </button>
              )}
            </div>

            {/* Articles */}
            <div className="flex-1 overflow-y-auto divide-y max-h-80">
              {cart.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Le panier est vide
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.variantId} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.productName}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {item.sku}
                        {variantLabel(item) ? ` · ${variantLabel(item)}` : ""}
                      </p>
                      <p className="text-xs font-semibold text-primary mt-0.5">
                        {eur(item.priceTtc)} × {item.quantity} = {eur(item.priceTtc * item.quantity)}
                      </p>
                    </div>

                    {/* Contrôle quantité */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => updateQty(item.variantId, -1)}
                        className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted transition-colors">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-mono font-medium">
                        {item.quantity}
                      </span>
                      <button onClick={() => updateQty(item.variantId, +1)}
                        disabled={item.quantity >= item.stock}
                        className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40">
                        <Plus className="h-3 w-3" />
                      </button>
                      <button onClick={() => removeItem(item.variantId)}
                        className="h-6 w-6 rounded flex items-center justify-center hover:text-destructive transition-colors ml-1">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totaux + bouton */}
            <div className="border-t p-4 space-y-3">
              {cart.length > 0 ? (
                <>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Sous-total HT</span>
                      <span className="font-mono">{eur(totalHt)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>TVA</span>
                      <span className="font-mono">{eur(totalTva)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-base pt-1 border-t mt-1">
                      <span>Total TTC</span>
                      <span className="font-mono text-primary">{eur(totalTtc)}</span>
                    </div>
                  </div>

                  <Button
                    className="w-full h-11 text-base font-semibold"
                    onClick={() => setConfirmOpen(true)}
                  >
                    Valider la vente · {eur(totalTtc)}
                  </Button>
                </>
              ) : (
                <p className="text-xs text-center text-muted-foreground">
                  Scannez des articles pour démarrer une vente
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Dialog confirmation ─────────────────────────────────────────────── */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmer la vente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-muted/50 p-3 space-y-1 text-sm">
              {cart.map((i) => (
                <div key={i.variantId} className="flex justify-between">
                  <span className="truncate flex-1 pr-2">
                    {i.productName}
                    {variantLabel(i) ? ` (${variantLabel(i)})` : ""} ×{i.quantity}
                  </span>
                  <span className="font-mono shrink-0">{eur(i.priceTtc * i.quantity)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-lg font-bold px-1">
              <span>Total TTC</span>
              <span className="text-primary font-mono">{eur(totalTtc)}</span>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={paying}>
              Annuler
            </Button>
            <Button onClick={handleCheckout} disabled={paying} className="flex-1">
              {paying ? "Validation…" : "Confirmer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog reçu ─────────────────────────────────────────────────────── */}
      <Dialog open={!!receipt} onOpenChange={() => { setReceipt(null); focusInput(); }}>
        <DialogContent className="max-w-xs text-center">
          <div className="py-4 space-y-3">
            <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Vente enregistrée</h2>
              {receipt && (
                <>
                  <p className="text-sm text-muted-foreground font-mono mt-1">
                    {receipt.reference}
                  </p>
                  <p className="text-3xl font-bold text-primary mt-3">
                    {eur(receipt.totalTtc)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(receipt.createdAt).toLocaleString("fr-FR")}
                  </p>
                </>
              )}
            </div>
          </div>
          <Button className="w-full" onClick={() => { setReceipt(null); focusInput(); }}>
            Nouvelle vente
          </Button>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
