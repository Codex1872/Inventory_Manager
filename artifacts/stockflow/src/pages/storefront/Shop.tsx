import { useMemo, useState } from "react";
import { Link } from "wouter";
import {
  useListStorefrontProducts,
  useListCategories,
} from "@workspace/api-client-react";
import { StorefrontLayout } from "@/components/layout/StorefrontLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Package, Search } from "lucide-react";
import { eur } from "@/lib/format";

export default function Shop() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const { data: categories } = useListCategories();

  const params = useMemo(
    () => ({
      ...(search ? { search } : {}),
      ...(categoryId !== "all" ? { categoryId: Number(categoryId) } : {}),
    }),
    [search, categoryId],
  );

  const { data: products, isLoading } = useListStorefrontProducts(params);

  return (
    <StorefrontLayout>
      <div className="container mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="font-display text-4xl font-bold">Boutique</h1>
          <p className="text-muted-foreground mt-2">
            Parcourez l'ensemble de notre sélection.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit..."
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={categoryId === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setCategoryId("all")}
            >
              Tout
            </Button>
            {(categories ?? []).map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={categoryId === String(c.id) ? "default" : "outline"}
                onClick={() => setCategoryId(String(c.id))}
              >
                {c.name}
              </Button>
            ))}
          </div>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="md:hidden">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes catégories</SelectItem>
              {(categories ?? []).map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground py-12 text-center">
            Chargement…
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((p) => (
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
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            Aucun produit ne correspond à votre recherche.
          </div>
        )}
      </div>
    </StorefrontLayout>
  );
}
