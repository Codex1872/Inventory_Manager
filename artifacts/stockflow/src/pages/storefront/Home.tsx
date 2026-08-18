import { Link } from "wouter";
import {
  useListStorefrontBanners,
  useListStorefrontProducts,
} from "@workspace/api-client-react";
import { StorefrontLayout } from "@/components/layout/StorefrontLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Package, Truck, Shield, Sparkles } from "lucide-react";
import { eur } from "@/lib/format";

export default function Home() {
  const { data: banners } = useListStorefrontBanners();
  const { data: products } = useListStorefrontProducts({ limit: 6 });

  const hero = banners?.[0];
  const restBanners = (banners ?? []).slice(1, 3);

  return (
    <StorefrontLayout>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-[hsl(214,72%,18%)] text-primary-foreground">
        <div className="container mx-auto px-6 py-20 md:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 max-w-xl">
            <p className="text-sm uppercase tracking-widest opacity-80">
              {hero?.subtitle ?? "Votre boutique de confiance"}
            </p>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight">
              {hero?.title ?? "Une sélection pensée pour durer"}
            </h1>
            <p className="text-lg opacity-90">
              Découvrez notre sélection de produits, du prêt-à-porter à
              l'électronique, soigneusement choisis par notre atelier.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/shop">
                <Button size="lg" variant="secondary">
                  Découvrir la boutique
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/10"
                >
                  Nous contacter
                </Button>
              </Link>
            </div>
          </div>
          {hero ? (
            <div className="rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 aspect-[4/3]">
              <img
                src={hero.imageUrl}
                alt={hero.title}
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}
        </div>
      </section>

      <section className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-6">
          <FeatureCard
            icon={<Truck className="h-5 w-5" />}
            title="Livraison soignée"
            description="Expédition sous 48h depuis Paris, suivi inclus."
          />
          <FeatureCard
            icon={<Shield className="h-5 w-5" />}
            title="Paiement sécurisé"
            description="Vos transactions sont chiffrées et protégées."
          />
          <FeatureCard
            icon={<Sparkles className="h-5 w-5" />}
            title="Sélection exigeante"
            description="Chaque produit est validé par notre équipe."
          />
        </div>
      </section>

      <section className="container mx-auto px-6 py-12">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="font-display text-3xl font-bold">
              Sélection du moment
            </h2>
            <p className="text-muted-foreground mt-1">
              Les pièces préférées de notre boutique.
            </p>
          </div>
          <Link
            href="/shop"
            className="text-sm font-medium hover:underline hidden sm:inline-flex items-center"
          >
            Tout voir <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
          {(products ?? []).map((p) => (
            <Link key={p.id} href={`/shop/${p.id}`}>
              <Card className="overflow-hidden hover-elevate cursor-pointer h-full">
                <div className="aspect-square bg-muted overflow-hidden">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {p.categoryName ?? "Boutique"}
                  </p>
                  <p className="font-medium mt-1 line-clamp-1">{p.name}</p>
                  <p className="font-semibold mt-2">{eur(p.priceTtc)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {restBanners.length > 0 && (
        <section className="container mx-auto px-6 py-12 grid md:grid-cols-2 gap-6">
          {restBanners.map((b) => (
            <Link key={b.id} href={b.linkUrl ?? "/shop"}>
              <Card className="overflow-hidden hover-elevate cursor-pointer">
                <div className="aspect-[16/9] bg-muted overflow-hidden">
                  <img
                    src={b.imageUrl}
                    alt={b.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <CardContent className="p-5">
                  <p className="font-display font-semibold text-xl">
                    {b.title}
                  </p>
                  {b.subtitle ? (
                    <p className="text-muted-foreground text-sm mt-1">
                      {b.subtitle}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      )}
    </StorefrontLayout>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-start gap-4">
        <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
