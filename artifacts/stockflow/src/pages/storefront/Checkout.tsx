import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { StorefrontLayout } from "@/components/layout/StorefrontLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Package, ArrowLeft, Lock } from "lucide-react";
import { useAuth, useAuthFetch } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { eur } from "@/lib/format";

// ── Stripe init ─────────────────────────────────────────────────────────────
const stripePromise = loadStripe(
  (import.meta.env.VITE_STRIPE_PUBLIC_KEY as string) ?? "pk_test_placeholder"
);

// ── Formulaire de paiement (intérieur Stripe Elements) ─────────────────────
function PaymentForm({
  clientSecret, shipping, onSuccess,
}: {
  clientSecret: string;
  paymentIntentId: string;
  shipping: Record<string, string>;
  onSuccess: (ref: string) => void;
}) {
  const stripe     = useStripe();
  const elements   = useElements();
  const authFetch  = useAuthFetch();
  const { reload } = useCart();

  const [paying, setPaying] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError(null); setPaying(true);

    // 1. Confirmer le paiement côté Stripe
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Erreur de paiement");
      setPaying(false); return;
    }

    if (paymentIntent?.status !== "succeeded") {
      setError("Paiement non abouti"); setPaying(false); return;
    }

    // 2. Confirmer la commande côté serveur
    try {
      const order = await authFetch<{ reference: string }>("/checkout/confirm", {
        method: "POST",
        body: JSON.stringify({ paymentIntentId: paymentIntent.id, ...shipping }),
      });
      await reload();
      onSuccess(order.reference);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur serveur");
    } finally { setPaying(false); }
  };

  return (
    <form onSubmit={handlePay} className="space-y-4">
      {/* Stripe Elements injecte ici : card, Apple Pay, etc. */}
      <PaymentElement options={{ layout: "tabs" }} />

      {error && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
      )}

      <Button type="submit" disabled={!stripe || paying} className="w-full h-12 text-base gap-2">
        <Lock className="h-4 w-4" />
        {paying ? "Traitement du paiement…" : `Payer ${eur(0)}`}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        🔒 Paiement sécurisé par Stripe. Vos données bancaires ne nous parviennent jamais.
      </p>
    </form>
  );
}

// ── Page principale ─────────────────────────────────────────────────────────
export default function Checkout() {
  const [, navigate]    = useLocation();
  const { user, token } = useAuth();
  const { items, totalTtc, itemCount } = useCart();

  const [clientSecret,    setClientSecret]    = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [initError,       setInitError]       = useState<string | null>(null);
  const [confirmedRef,    setConfirmedRef]     = useState<string | null>(null);

  // Infos de livraison
  const [shipping, setShipping] = useState({
    shippingName:       user?.name ?? "",
    shippingAddress:    "",
    shippingCity:       "",
    shippingPostalCode: "",
    shippingCountry:    "FR",
  });
  const [step, setStep] = useState<"shipping" | "payment">("shipping");

  useEffect(() => {
    if (!user)           { navigate("/login");   return; }
    if (itemCount === 0) { navigate("/shop");    return; }
  }, [user, itemCount, navigate]);

  const handleShippingNext = (e: React.FormEvent) => {
    e.preventDefault();
    setStep("payment");
    // Créer le PaymentIntent
    fetch("/api/checkout/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setInitError(d.error); return; }
        setClientSecret(d.clientSecret);
        setPaymentIntentId(d.paymentIntentId);
      })
      .catch(() => setInitError("Impossible d'initialiser le paiement"));
  };

  // ── Succès ─────────────────────────────────────────────────────────────
  if (confirmedRef) {
    return (
      <StorefrontLayout>
        <div className="container mx-auto px-4 py-20 max-w-md text-center space-y-6">
          <div className="h-20 w-20 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Commande confirmée !</h1>
            <p className="text-muted-foreground mt-2">
              Merci pour votre achat. Votre commande <strong className="font-mono">{confirmedRef}</strong> est enregistrée.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button asChild><Link href="/account">Voir mes commandes</Link></Button>
            <Button asChild variant="outline"><Link href="/shop">Continuer les achats</Link></Button>
          </div>
        </div>
      </StorefrontLayout>
    );
  }

  return (
    <StorefrontLayout>
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate("/shop")}
            className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold">Commande</h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* ── Formulaires ── */}
          <div className="space-y-6">
            {/* Étapes */}
            <div className="flex gap-2 text-sm">
              {["shipping", "payment"].map((s, i) => (
                <div key={s} className={`flex items-center gap-2 ${step === s ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                  {i > 0 && <span className="text-muted-foreground mx-1">›</span>}
                  <span className={`h-5 w-5 rounded-full text-xs flex items-center justify-center font-bold
                    ${step === s ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{i + 1}</span>
                  {s === "shipping" ? "Livraison" : "Paiement"}
                </div>
              ))}
            </div>

            {/* Étape 1 : Livraison */}
            {step === "shipping" && (
              <form onSubmit={handleShippingNext} className="space-y-4 bg-card border rounded-xl p-6">
                <h2 className="font-semibold">Adresse de livraison</h2>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Nom complet</label>
                  <Input value={shipping.shippingName} required
                    onChange={(e) => setShipping((s) => ({ ...s, shippingName: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Adresse</label>
                  <Input value={shipping.shippingAddress} required placeholder="15 rue de la Paix"
                    onChange={(e) => setShipping((s) => ({ ...s, shippingAddress: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Code postal</label>
                    <Input value={shipping.shippingPostalCode} required placeholder="75001"
                      onChange={(e) => setShipping((s) => ({ ...s, shippingPostalCode: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Ville</label>
                    <Input value={shipping.shippingCity} required placeholder="Paris"
                      onChange={(e) => setShipping((s) => ({ ...s, shippingCity: e.target.value }))} />
                  </div>
                </div>
                <Button type="submit" className="w-full">Continuer vers le paiement →</Button>
              </form>
            )}

            {/* Étape 2 : Paiement */}
            {step === "payment" && (
              <div className="space-y-4 bg-card border rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Paiement sécurisé</h2>
                  <button type="button" onClick={() => setStep("shipping")}
                    className="text-xs text-muted-foreground hover:text-primary">
                    ← Modifier la livraison
                  </button>
                </div>

                {initError && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{initError}</p>
                )}

                {!clientSecret && !initError && (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    Initialisation du paiement…
                  </div>
                )}

                {clientSecret && paymentIntentId && (
                  <Elements stripe={stripePromise} options={{
                    clientSecret,
                    appearance: { theme: "stripe", labels: "floating" },
                    locale: "fr",
                  }}>
                    <PaymentForm
                      clientSecret={clientSecret}
                      paymentIntentId={paymentIntentId}
                      shipping={shipping}
                      onSuccess={setConfirmedRef}
                    />
                  </Elements>
                )}
              </div>
            )}
          </div>

          {/* ── Résumé commande ── */}
          <div className="rounded-xl border bg-card p-6 space-y-4 h-fit">
            <h2 className="font-semibold">Récapitulatif</h2>
            <div className="divide-y max-h-72 overflow-y-auto">
              {items.map((item) => (
                <div key={item.variantId} className="py-3 flex items-center gap-3">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.productName}
                      className="h-12 w-12 object-cover rounded border shrink-0" />
                  ) : (
                    <div className="h-12 w-12 rounded border bg-muted flex items-center justify-center shrink-0">
                      <Package className="h-5 w-5 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {[item.size, item.color].filter(Boolean).join(" · ")}
                    </p>
                    <div className="flex justify-between items-center mt-0.5">
                      <Badge variant="secondary" className="text-xs h-4 px-1.5">×{item.quantity}</Badge>
                      <span className="text-sm font-semibold font-mono">{eur(item.lineTtc)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Sous-total</span>
                <span className="font-mono">{eur(totalTtc)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Livraison</span>
                <span className="text-emerald-600 font-medium">Gratuite</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1 border-t">
                <span>Total TTC</span>
                <span className="font-mono text-primary">{eur(totalTtc)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StorefrontLayout>
  );
}
