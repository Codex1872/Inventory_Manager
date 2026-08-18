import {
  useGetDashboardSummary,
  useGetLowStockAlerts,
  useGetRecentMovements,
  useGetBestSellers,
  useGetStockByCategory,
  useGetMovementTrends,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  Boxes,
  Layers,
  MessageCircle,
  Package,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { eur, movementLabel, number } from "@/lib/format";

export default function Dashboard() {
  const { data: summary, isLoading: summaryLoading } = useGetDashboardSummary();
  const { data: alerts } = useGetLowStockAlerts();
  const { data: movements } = useGetRecentMovements();
  const { data: bestSellers } = useGetBestSellers();
  const { data: stockByCategory } = useGetStockByCategory();
  const { data: trends } = useGetMovementTrends();

  return (
    <AdminLayout>
      <div className="space-y-8">
        <PageHeader
          title="Tableau de bord"
          description="Vue d'ensemble de votre activité, du stock aux réseaux sociaux."
        />

        {summaryLoading || !summary ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="Valeur du stock"
              value={eur(summary.inventoryValue)}
              hint={`${number(summary.totalOnHand)} unités en rayon`}
            />
            <KpiCard
              icon={
                <AlertTriangle
                  className={`h-4 w-4 ${
                    summary.lowStockCount > 0 ? "text-destructive" : ""
                  }`}
                />
              }
              label="Alertes stock"
              value={number(summary.lowStockCount)}
              hint={`${summary.outOfStockCount} ruptures complètes`}
            />
            <KpiCard
              icon={<ArrowRightLeft className="h-4 w-4" />}
              label="Mouvements aujourd'hui"
              value={number(summary.movementsToday)}
              hint="Entrées, sorties, transferts"
            />
            <KpiCard
              icon={<MessageCircle className="h-4 w-4" />}
              label="Messages non lus"
              value={number(summary.unreadMessages)}
              hint={`${summary.scheduledPosts} publications planifiées`}
            />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Tendance des mouvements</CardTitle>
              <CardDescription>
                Entrées et sorties sur les 14 derniers jours.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              {trends && trends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="hsl(var(--chart-1))"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(var(--chart-1))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor="hsl(var(--chart-3))"
                          stopOpacity={0.4}
                        />
                        <stop
                          offset="95%"
                          stopColor="hsl(var(--chart-3))"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value: string) =>
                        value.slice(5).replace("-", "/")
                      }
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="inbound"
                      name="Entrées"
                      stroke="hsl(var(--chart-1))"
                      fillOpacity={1}
                      fill="url(#colorIn)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="outbound"
                      name="Sorties"
                      stroke="hsl(var(--chart-3))"
                      fillOpacity={1}
                      fill="url(#colorOut)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon={ArrowRightLeft}
                  title="Aucun mouvement enregistré"
                  description="Les mouvements apparaîtront ici dès la première opération."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stock par catégorie</CardTitle>
              <CardDescription>Valeur HT par famille de produits.</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              {stockByCategory && stockByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stockByCategory} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      opacity={0.2}
                      horizontal={false}
                    />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="categoryName"
                      width={100}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: number) => eur(value)}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                      }}
                    />
                    <Bar
                      dataKey="totalValue"
                      fill="hsl(var(--chart-1))"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon={Layers}
                  title="Aucune donnée"
                  description="Ajoutez des produits pour voir la répartition par catégorie."
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Alertes de stock</CardTitle>
                <CardDescription>
                  Variantes au seuil ou en dessous.
                </CardDescription>
              </div>
              <Link
                href="/app/stock"
                className="text-sm text-primary hover:underline"
              >
                Voir tout
              </Link>
            </CardHeader>
            <CardContent>
              {alerts && alerts.length > 0 ? (
                <div className="divide-y">
                  {alerts.slice(0, 6).map((a) => (
                    <div
                      key={a.variantId}
                      className="flex items-center gap-3 py-3"
                    >
                      <div className="h-10 w-10 rounded-md bg-muted overflow-hidden flex items-center justify-center shrink-0">
                        {a.productImageUrl ? (
                          <img
                            src={a.productImageUrl}
                            alt={a.productName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {a.productName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {a.sku}
                          {a.size ? ` · ${a.size}` : ""}
                          {a.color ? ` · ${a.color}` : ""}
                        </p>
                      </div>
                      <Badge
                        variant={a.onHand <= 0 ? "destructive" : "outline"}
                      >
                        {a.onHand} / {a.threshold}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Boxes}
                  title="Tous les seuils sont respectés"
                  description="Aucune variante n'est sous le seuil défini."
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Mouvements récents</CardTitle>
                <CardDescription>12 dernières opérations.</CardDescription>
              </div>
              <Link
                href="/app/movements"
                className="text-sm text-primary hover:underline"
              >
                Journal complet
              </Link>
            </CardHeader>
            <CardContent>
              {movements && movements.length > 0 ? (
                <div className="divide-y">
                  {movements.slice(0, 6).map((m) => (
                    <div key={m.id} className="flex items-center gap-3 py-3">
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
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
                        <p className="text-sm font-medium truncate">
                          {m.productName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {movementLabel(m.type)} · {m.operator}
                        </p>
                      </div>
                      <div className="text-sm font-mono font-semibold tabular-nums">
                        {m.type === "out" ? "-" : "+"}
                        {m.quantity}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={ArrowRightLeft}
                  title="Aucun mouvement"
                  description="Le journal apparaîtra ici dès qu'une opération sera enregistrée."
                />
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> Meilleures ventes
            </CardTitle>
            <CardDescription>
              Top produits par unités vendues sur la période.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bestSellers && bestSellers.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {bestSellers.slice(0, 4).map((b) => (
                  <div
                    key={b.productId}
                    className="rounded-lg border p-3 flex gap-3 hover-elevate"
                  >
                    <div className="h-14 w-14 rounded-md bg-muted overflow-hidden shrink-0">
                      {b.productImageUrl ? (
                        <img
                          src={b.productImageUrl}
                          alt={b.productName}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {b.productName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {number(b.unitsSold)} vendus
                      </p>
                      <p className="text-sm font-semibold mt-1">
                        {eur(b.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Sparkles}
                title="Pas encore de ventes"
                description="Enregistrez des sorties de stock pour faire émerger les meilleures ventes."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <span className="text-muted-foreground">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {hint ? (
          <p className="text-xs text-muted-foreground mt-1">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
