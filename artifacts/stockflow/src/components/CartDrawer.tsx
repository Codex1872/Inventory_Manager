import { Link } from "wouter";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Minus, Package, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { eur } from "@/lib/format";

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user }  = useAuth();
  const { items, totalTtc, itemCount, updateQty, removeItem, loading } = useCart();

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Panier
            {itemCount > 0 && (
              <Badge className="rounded-full h-5 px-1.5 text-xs ml-1">{itemCount}</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Liste des articles */}
        <div className="flex-1 overflow-y-auto">
          {!user ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
              <ShoppingBag className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">
                Connectez-vous pour accéder à votre panier
              </p>
              <Button asChild onClick={onClose}>
                <Link href="/login">Se connecter</Link>
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
              <ShoppingBag className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">Votre panier est vide</p>
              <Button asChild variant="outline" onClick={onClose}>
                <Link href="/shop">Parcourir la boutique</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y px-6">
              {items.map((item) => (
                <div key={item.variantId} className="py-4 flex gap-3">
                  {/* Image */}
                  <div className="h-16 w-16 rounded-lg border bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName}
                        className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground/40" />
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium truncate">{item.productName}</p>
                    {(item.size || item.color) && (
                      <p className="text-xs text-muted-foreground">
                        {[item.size, item.color].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    <p className="text-sm font-semibold font-mono">{eur(item.priceTtc)}</p>

                    {/* Quantité */}
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.variantId, item.quantity - 1)}
                        disabled={loading}
                        className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-mono">{item.quantity}</span>
                      <button onClick={() => updateQty(item.variantId, item.quantity + 1)}
                        disabled={loading || item.quantity >= item.stock}
                        className="h-6 w-6 rounded border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-40">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end justify-between shrink-0">
                    <button onClick={() => removeItem(item.variantId)} disabled={loading}
                      className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-40">
                      <X className="h-4 w-4" />
                    </button>
                    <p className="text-sm font-semibold font-mono">{eur(item.lineTtc)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {user && items.length > 0 && (
          <div className="border-t p-6 space-y-4">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="font-mono text-primary">{eur(totalTtc)}</span>
            </div>
            <Button asChild className="w-full h-11 text-base" onClick={onClose}>
              <Link href="/checkout">Commander · {eur(totalTtc)}</Link>
            </Button>
            <Button asChild variant="outline" className="w-full" onClick={onClose}>
              <Link href="/shop">Continuer les achats</Link>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
