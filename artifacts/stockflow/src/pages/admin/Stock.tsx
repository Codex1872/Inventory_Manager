import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListStockLevels,
  useListLocations,
  useScanBarcode,
  getListStockLevelsQueryKey,
  getGetDashboardSummaryQueryKey,
  getListMovementsQueryKey,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Boxes, Package, ScanBarcode } from "lucide-react";
import { toast } from "sonner";

export default function Stock() {
  const [locationId, setLocationId] = useState("all");
  const [lowOnly, setLowOnly] = useState(false);
  const queryClient = useQueryClient();

  const { data: locations } = useListLocations();
  const { data: levels, isLoading } = useListStockLevels({
    ...(locationId !== "all" ? { locationId: Number(locationId) } : {}),
    ...(lowOnly ? { lowOnly: true } : {}),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="État des stocks"
          description="Vue par variante et par emplacement, avec scanner intégré."
        />

        <Tabs defaultValue="levels">
          <TabsList>
            <TabsTrigger value="levels">
              <Boxes className="h-4 w-4 mr-2" />
              Niveaux
            </TabsTrigger>
            <TabsTrigger value="scanner">
              <ScanBarcode className="h-4 w-4 mr-2" />
              Scanner
            </TabsTrigger>
          </TabsList>
          <TabsContent value="levels" className="mt-6 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger className="md:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les emplacements</SelectItem>
                  {(locations ?? []).map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Switch checked={lowOnly} onCheckedChange={setLowOnly} />
                <Label>Stock bas uniquement</Label>
              </div>
            </div>

            <div className="rounded-lg border bg-card">
              {isLoading ? (
                <div className="p-12 text-center text-muted-foreground">
                  Chargement…
                </div>
              ) : levels && levels.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produit</TableHead>
                      <TableHead>Variante</TableHead>
                      <TableHead>Emplacement</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                      <TableHead className="text-right">Seuil</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {levels.map((l) => (
                      <TableRow key={`${l.variantId}:${l.locationId}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                              {l.productImageUrl ? (
                                <img
                                  src={l.productImageUrl}
                                  alt={l.productName}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <Package className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <span className="font-medium">{l.productName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-mono text-xs">{l.sku}</p>
                            <p className="text-xs text-muted-foreground">
                              {[l.size, l.color].filter(Boolean).join(" · ") ||
                                "—"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{l.locationName ?? "Sans emplacement"}</TableCell>
                        <TableCell className="text-right font-mono tabular-nums">
                          {l.onHand}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums">
                          {l.threshold}
                        </TableCell>
                        <TableCell>
                          {l.onHand <= 0 ? (
                            <Badge variant="destructive">Rupture</Badge>
                          ) : l.onHand <= l.threshold ? (
                            <Badge variant="outline">Stock bas</Badge>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  icon={Boxes}
                  title="Aucune ligne de stock"
                  description="Ajustez les filtres ou créez vos premiers mouvements."
                />
              )}
            </div>
          </TabsContent>
          <TabsContent value="scanner" className="mt-6">
            <ScannerPanel
              onMutated={() => {
                queryClient.invalidateQueries({
                  queryKey: getListStockLevelsQueryKey(),
                });
                queryClient.invalidateQueries({
                  queryKey: getListMovementsQueryKey(),
                });
                queryClient.invalidateQueries({
                  queryKey: getGetDashboardSummaryQueryKey(),
                });
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function ScannerPanel({ onMutated }: { onMutated: () => void }) {
  const [code, setCode] = useState("");
  const [mode, setMode] = useState<"lookup" | "in" | "out" | "adjust">(
    "lookup",
  );
  const [quantity, setQuantity] = useState("1");
  const [locationId, setLocationId] = useState<string>("none");
  const [operator, setOperator] = useState("Caisse");
  const [result, setResult] = useState<null | {
    matched: boolean;
    productName?: string;
    sku?: string;
    onHand?: number;
    message: string;
  }>(null);

  const { data: locations } = useListLocations();
  const scan = useScanBarcode();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    scan.mutate(
      {
        data: {
          code: code.trim(),
          mode,
          quantity: mode === "lookup" ? null : Number(quantity),
          locationId: locationId !== "none" ? Number(locationId) : null,
          operator,
        },
      },
      {
        onSuccess: (data) => {
          if (data.matched) {
            toast.success(data.message);
          } else {
            toast.error(data.message);
          }
          setResult({
            matched: data.matched,
            productName: data.product?.name,
            sku: data.variant?.sku,
            onHand: data.product?.totalOnHand,
            message: data.message,
          });
          if (mode !== "lookup") onMutated();
          setCode("");
        },
        onError: () => toast.error("Erreur lors du scan"),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanBarcode className="h-5 w-5" /> Scanner un code-barres ou un SKU
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <Label>Code à scanner</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Tapez ou collez un code-barres / SKU / référence"
                autoFocus
                className="text-lg font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Action</Label>
              <Select
                value={mode}
                onValueChange={(v) => setMode(v as typeof mode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lookup">Consulter</SelectItem>
                  <SelectItem value="in">Entrée de stock</SelectItem>
                  <SelectItem value="out">Sortie de stock</SelectItem>
                  <SelectItem value="adjust">Ajustement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Quantité</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={mode === "lookup"}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Emplacement</Label>
              <Select value={locationId} onValueChange={setLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Aucun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {(locations ?? []).map((l) => (
                    <SelectItem key={l.id} value={String(l.id)}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Opérateur</Label>
              <Input
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" disabled={scan.isPending} size="lg">
            <ScanBarcode className="h-4 w-4 mr-2" />
            Valider
          </Button>
        </form>
        {result ? (
          <div
            className={`mt-6 p-4 rounded-md border ${
              result.matched
                ? "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900"
                : "bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900"
            }`}
          >
            <p className="font-medium">{result.message}</p>
            {result.matched ? (
              <p className="text-sm mt-1 text-muted-foreground">
                {result.productName} — SKU {result.sku} — {result.onHand}{" "}
                en stock
              </p>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
