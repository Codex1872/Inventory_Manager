import { useParams, Link } from "wouter";
import { useState, useEffect } from "react";
import {
  useGetStorefrontProduct,
} from "@workspace/api-client-react";
import { StorefrontLayout } from "@/components/layout/StorefrontLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Check, ChevronLeft, ChevronRight,
  Loader2, Package, ShoppingBag, ZoomIn
} from "lucide-react";
import { eur } from "@/lib/format";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useLocation } from "wouter";

export default function ProductDetail() {
  const params = useParams();
  const id = Number(params.id);
  const { data: product, isLoading } = useGetStorefrontProduct(id, {
    query: { enabled: !!id },
  });

  const [selected, setSelected] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });

  const { user } = useAuth();
  const { addItem } = useCart();
  const [, navigate] = useLocation();

  // Build image list
  const allImages = product
    ? [product.imageUrl, ...(product.gallery ?? [])].filter(Boolean) as string[]
    : [];

  // Reset active index when product changes
  useEffect(() => { setActiveIdx(0); }, [id]);

  if (isLoading) {
    return (
      <StorefrontLayout>
        <div className="container mx-auto px-6 py-12">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Skeleton gallery */}
            <div className="space-y-3">
              <div className="aspect-square rounded-xl bg-muted animate-pulse" />
              <div className="flex gap-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-16 w-16 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`h-6 rounded bg-muted animate-pulse ${i === 0 ? "w-1/3" : i === 1 ? "w-2/3" : "w-1/2"}`} />
              ))}
            </div>
          </div>
        </div>
      </StorefrontLayout>
    );
  }

  if (!product) {
    return (
      <StorefrontLayout>
        <div className="container mx-auto px-6 py-20 text-center space-y-4">
          <Package className="h-12 w-12 text-muted-foreground mx-auto" />
          <p className="text-lg">Produit introuvable.</p>
          <Button asChild><Link href="/shop">Retour à la boutique</Link></Button>
        </div>
      </StorefrontLayout>
    );
  }

  const variants = product.variants ?? [];
  const selectedVariant = variants.find((v) => v.id === (selected ?? variants[0]?.id)) ?? variants[0];

  const handleAddToCart = async () => {
    if (!user) { navigate("/login"); return; }
    if (!selectedVariant) return;
    setAdding(true);
    try {
      await addItem(selectedVariant.id, 1);
      toast.success("Ajouté au panier", {
        description: `${product.name}${selectedVariant.size ? ` · ${selectedVariant.size}` : ""}`,
      });
    } catch {
      toast.error("Erreur lors de l'ajout au panier");
    } finally {
      setAdding(false);
    }
  };

  const prev = () => setActiveIdx((i) => (i - 1 + allImages.length) % allImages.length);
  const next = () => setActiveIdx((i) => (i + 1) % allImages.length);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPos({ x, y });
  };

  return (
    <StorefrontLayout>
      <div className="container mx-auto px-6 py-10">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Retour à la boutique
        </Link>

        <div className="grid lg:grid-cols-2 gap-12 xl:gap-16">

          {/* ── Left: Gallery ─────────────────────────────────────── */}
          <div className="space-y-3">
            {/* Main image */}
            <div
              className="relative aspect-square rounded-2xl overflow-hidden bg-muted border group cursor-zoom-in"
              onMouseMove={handleMouseMove}
              onMouseEnter={() => setZoomed(true)}
              onMouseLeave={() => setZoomed(false)}
            >
              {allImages.length > 0 ? (
                <>
                  {/* Base image */}
                  <img
                    src={allImages[activeIdx]}
                    alt={`${product.name} — photo ${activeIdx + 1}`}
                    className={`h-full w-full object-cover transition-opacity duration-200 ${zoomed ? "opacity-0" : "opacity-100"}`}
                  />
                  {/* Zoom layer */}
                  {zoomed && (
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(${allImages[activeIdx]})`,
                        backgroundSize: "250%",
                        backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                        backgroundRepeat: "no-repeat",
                      }}
                    />
                  )}
                </>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <Package className="h-16 w-16 text-muted-foreground/30" />
                </div>
              )}

              {/* Prev/next arrows — only if multiple images */}
              {allImages.length > 1 && (
                <>
                  <button
                    onClick={prev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={next}
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/90 hover:bg-white shadow-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 z-10"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>

                  {/* Dot indicators */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {allImages.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveIdx(i)}
                        className={`h-1.5 rounded-full transition-all ${i === activeIdx ? "w-5 bg-white" : "w-1.5 bg-white/50"}`}
                      />
                    ))}
                  </div>
                </>
              )}

              {/* Zoom hint */}
              {allImages.length > 0 && !zoomed && (
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/50 text-white rounded-md px-2 py-1 flex items-center gap-1 text-xs">
                    <ZoomIn className="h-3 w-3" /> Survoler pour zoomer
                  </div>
                </div>
              )}
            </div>

            {/* Thumbnail strip */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveIdx(idx)}
                    className={`relative h-16 w-16 lg:h-20 lg:w-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                      idx === activeIdx
                        ? "border-primary shadow-md scale-105"
                        : "border-transparent hover:border-muted-foreground/30 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={url} alt={`Miniature ${idx + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Right: Product info ────────────────────────────────── */}
          <div className="space-y-6 lg:py-2">
            {/* Category + Name */}
            <div>
              <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium">
                {product.categoryName ?? "Boutique"}
              </p>
              <h1 className="font-display text-4xl font-bold mt-2 leading-tight">{product.name}</h1>
            </div>

            {/* Price block */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">{eur(product.priceTtc)}</span>
              <span className="text-sm text-muted-foreground">
                TTC · {eur(product.priceHt)} HT · TVA {product.vatRate}%
              </span>
            </div>

            {/* Stock badge */}
            <div>
              {selectedVariant?.available !== false ? (
                <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700 dark:text-emerald-400">En stock</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="px-3 py-1 text-muted-foreground">
                  Bientôt disponible
                </Badge>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>
            )}

            {/* Separator */}
            <div className="h-px bg-border" />

            {/* Variants */}
            {variants.length > 1 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold">
                  Choisir une option
                  {selectedVariant && (
                    <span className="font-normal text-muted-foreground ml-2">
                      — {[selectedVariant.size, selectedVariant.color].filter(Boolean).join(" / ") || selectedVariant.sku}
                    </span>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => {
                    const label = [v.size, v.color].filter(Boolean).join(" / ");
                    const isSel = (selected ?? variants[0]?.id) === v.id;
                    return (
                      <button
                        key={v.id}
                        disabled={!v.available}
                        onClick={() => setSelected(v.id)}
                        className={`
                          px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all
                          ${isSel
                            ? "border-primary bg-primary text-primary-foreground shadow-md"
                            : "border-border hover:border-primary/50 bg-background"
                          }
                          ${!v.available ? "opacity-40 cursor-not-allowed line-through" : "cursor-pointer"}
                        `}
                      >
                        {label || v.sku}
                        {!v.available ? " (épuisé)" : ""}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="flex gap-3 pt-2">
              <Button
                size="lg"
                className="flex-1 gap-2 h-14 text-base font-semibold rounded-xl shadow-sm"
                disabled={!selectedVariant?.available || adding}
                onClick={handleAddToCart}
              >
                {adding ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <ShoppingBag className="h-5 w-5" />
                )}
                {adding ? "Ajout…" : user ? "Ajouter au panier" : "Se connecter pour acheter"}
              </Button>
            </div>

            {/* Meta */}
            <div className="border rounded-xl p-4 text-sm text-muted-foreground space-y-2 bg-muted/30">
              <div className="flex items-center justify-between">
                <span>Référence</span>
                <span className="font-mono text-foreground">{product.reference}</span>
              </div>
              <div className="flex items-center gap-2 pt-1 border-t">
                <span>🚚 Livraison gratuite</span>
                <span className="text-border">·</span>
                <span>🔒 Paiement sécurisé Stripe</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StorefrontLayout>
  );
}
