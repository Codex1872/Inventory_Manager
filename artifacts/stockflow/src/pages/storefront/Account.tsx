import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { StorefrontLayout } from "@/components/layout/StorefrontLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, User, LogOut, ShoppingBag } from "lucide-react";
import { useAuth, useAuthFetch } from "@/contexts/AuthContext";
import { eur, dateShort } from "@/lib/format";

type OrderItem = { productName: string; sku: string; size: string | null; color: string | null; imageUrl: string | null; quantity: number; unitPriceTtc: number; };
type Order     = { id: number; reference: string; status: string; totalTtc: number; createdAt: string; items: OrderItem[]; };

const STATUS_LABELS: Record<string, string> = {
  pending_payment: "En attente de paiement",
  paid:            "Payée",
  processing:      "En préparation",
  shipped:         "Expédiée",
  delivered:       "Livrée",
  cancelled:       "Annulée",
  refunded:        "Remboursée",
};
const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending_payment: "outline",
  paid:            "default",
  processing:      "secondary",
  shipped:         "secondary",
  delivered:       "default",
  cancelled:       "destructive",
  refunded:        "outline",
};

export default function Account() {
  const [, navigate]    = useLocation();
  const { user, logout, refresh } = useAuth();
  const authFetch       = useAuthFetch();

  const [orders,  setOrders]  = useState<Order[]>([]);
  const [ordLoad, setOrdLoad] = useState(true);

  // Profil
  const [name,        setName]        = useState(user?.name ?? "");
  const [curPwd,      setCurPwd]      = useState("");
  const [newPwd,      setNewPwd]      = useState("");
  const [profMsg,     setProfMsg]     = useState<{ ok: boolean; msg: string } | null>(null);
  const [profLoading, setProfLoading] = useState(false);

  useEffect(() => { if (!user) navigate("/login"); }, [user, navigate]);
  useEffect(() => { setName(user?.name ?? ""); }, [user]);

  useEffect(() => {
    authFetch<Order[]>("/orders/me")
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setOrdLoad(false));
  }, [authFetch]);

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfLoading(true); setProfMsg(null);
    try {
      await authFetch("/auth/me", {
        method: "PUT",
        body: JSON.stringify({ name, ...(newPwd ? { currentPassword: curPwd, newPassword: newPwd } : {}) }),
      });
      await refresh();
      setCurPwd(""); setNewPwd("");
      setProfMsg({ ok: true, msg: "Profil mis à jour avec succès" });
    } catch (err) {
      setProfMsg({ ok: false, msg: err instanceof Error ? err.message : "Erreur" });
    } finally { setProfLoading(false); }
  };

  if (!user) return null;

  return (
    <StorefrontLayout>
      <div className="container mx-auto px-4 md:px-6 py-10 max-w-3xl space-y-6">
        {/* En-tête */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Mon compte</h1>
            <p className="text-muted-foreground text-sm">{user.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { logout(); navigate("/"); }}
            className="gap-2">
            <LogOut className="h-4 w-4" /> Déconnexion
          </Button>
        </div>

        <Tabs defaultValue="orders">
          <TabsList className="w-full">
            <TabsTrigger value="orders" className="flex-1 gap-2">
              <ShoppingBag className="h-4 w-4" /> Mes commandes
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex-1 gap-2">
              <User className="h-4 w-4" /> Mon profil
            </TabsTrigger>
          </TabsList>

          {/* ── Commandes ── */}
          <TabsContent value="orders" className="space-y-4 pt-4">
            {ordLoad ? (
              <p className="text-center text-muted-foreground py-8">Chargement…</p>
            ) : orders.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/30" />
                <p className="text-muted-foreground">Aucune commande pour le moment</p>
                <Button asChild variant="outline"><Link href="/shop">Découvrir la boutique</Link></Button>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="border rounded-xl p-4 space-y-3 bg-card">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-mono text-sm font-semibold">{order.reference}</p>
                      <p className="text-xs text-muted-foreground">{dateShort(order.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={STATUS_VARIANT[order.status] ?? "outline"}>
                        {STATUS_LABELS[order.status] ?? order.status}
                      </Badge>
                      <span className="font-semibold font-mono">{eur(order.totalTtc)}</span>
                    </div>
                  </div>
                  <div className="divide-y border rounded-lg overflow-hidden">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-muted/20">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.productName}
                            className="h-10 w-10 object-cover rounded border shrink-0" />
                        ) : (
                          <div className="h-10 w-10 rounded border bg-muted flex items-center justify-center shrink-0">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.sku}{item.size ? ` · ${item.size}` : ""}{item.color ? ` · ${item.color}` : ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-mono">{eur(item.unitPriceTtc)}</p>
                          <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          {/* ── Profil ── */}
          <TabsContent value="profile" className="pt-4">
            <form onSubmit={handleProfile} className="space-y-4 max-w-md">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nom complet</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Adresse e-mail</label>
                <Input value={user.email} disabled className="bg-muted/50" />
                <p className="text-xs text-muted-foreground">L'e-mail ne peut pas être modifié.</p>
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium">Changer le mot de passe</p>
                <Input type="password" placeholder="Mot de passe actuel" value={curPwd}
                  onChange={(e) => setCurPwd(e.target.value)} />
                <Input type="password" placeholder="Nouveau mot de passe (8 car. min.)" value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)} />
              </div>

              {profMsg && (
                <p className={`text-sm rounded-md px-3 py-2 ${
                  profMsg.ok ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400"
                             : "text-destructive bg-destructive/10"
                }`}>{profMsg.msg}</p>
              )}

              <Button type="submit" disabled={profLoading}>
                {profLoading ? "Enregistrement…" : "Enregistrer les modifications"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </StorefrontLayout>
  );
}
