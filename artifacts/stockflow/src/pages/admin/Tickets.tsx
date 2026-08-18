import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListTicketTemplates,
  useCreateTicketTemplate,
  useDeleteTicketTemplate,
  usePreviewTicket,
  getListTicketTemplatesQueryKey,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Printer, Receipt, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Tickets() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useListTicketTemplates();
  const remove = useDeleteTicketTemplate();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = (data ?? []).find((t) => t.id === selectedId) ?? null;
  const render = usePreviewTicket();
  const [preview, setPreview] = useState<string>("");

  const handleRender = (id: number) => {
    render.mutate(
      {
        id,
        data: {
          variables: {
            productName: "Sneakers Daily Blanc",
            sku: "SNK-42-WHT",
            quantity: "1",
            type: "Sortie",
            operator: "Caisse",
            reference: "PO-DEMO-2026-001",
            supplier: "Maison Lefèvre",
            total: "240.00",
          },
        },
      },
      {
        onSuccess: (data) => setPreview(data.escPosPreview),
      },
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Modèles de tickets"
          description="Tickets ESC-POS 58/80mm pour caisse, étiquettes et bons."
          actions={<NewTemplateDialog />}
        />
        {isLoading ? (
          <div className="text-muted-foreground">Chargement…</div>
        ) : data && data.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
            <div className="space-y-3">
              {data.map((t) => (
                <Card
                  key={t.id}
                  className={`cursor-pointer hover-elevate ${
                    selectedId === t.id ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => {
                    setSelectedId(t.id);
                    setPreview("");
                  }}
                >
                  <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                        <Receipt className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{t.name}</p>
                          {t.isDefault ? (
                            <Badge variant="secondary">Par défaut</Badge>
                          ) : null}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {t.width} · {t.kind}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Supprimer "${t.name}" ?`)) {
                          remove.mutate(
                            { id: t.id },
                            {
                              onSuccess: () => {
                                toast.success("Modèle supprimé");
                                queryClient.invalidateQueries({
                                  queryKey: getListTicketTemplatesQueryKey(),
                                });
                              },
                            },
                          );
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">
                  Aperçu {selected ? `· ${selected.name}` : ""}
                </CardTitle>
                {selected ? (
                  <Button
                    size="sm"
                    onClick={() => handleRender(selected.id)}
                    disabled={render.isPending}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Générer aperçu
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent>
                {selected ? (
                  <div
                    className={`mx-auto bg-white text-black border shadow-sm font-mono text-[11px] leading-snug p-3 whitespace-pre-wrap ${
                      selected.width === "58mm" ? "w-[200px]" : "w-[280px]"
                    }`}
                  >
                    {preview || selected.body}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">
                    Sélectionnez un modèle pour voir l'aperçu.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <EmptyState
            icon={Receipt}
            title="Aucun modèle de ticket"
            description="Créez un modèle pour vos imprimantes ESC-POS."
          />
        )}
      </div>
    </AdminLayout>
  );
}

function NewTemplateDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const create = useCreateTicketTemplate();
  const [form, setForm] = useState({
    name: "",
    width: "80mm" as "58mm" | "80mm",
    kind: "movement",
    body: "",
    isDefault: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.body) {
      toast.error("Nom et contenu requis");
      return;
    }
    create.mutate(
      { data: form },
      {
        onSuccess: () => {
          toast.success("Modèle créé");
          queryClient.invalidateQueries({
            queryKey: getListTicketTemplatesQueryKey(),
          });
          setOpen(false);
          setForm({
            name: "",
            width: "80mm",
            kind: "movement",
            body: "",
            isDefault: false,
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Nouveau modèle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nouveau modèle de ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nom</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Largeur</Label>
              <Select
                value={form.width}
                onValueChange={(v) =>
                  setForm({ ...form, width: v as "58mm" | "80mm" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="58mm">58 mm</SelectItem>
                  <SelectItem value="80mm">80 mm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={form.kind}
                onValueChange={(v) => setForm({ ...form, kind: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="movement">Mouvement</SelectItem>
                  <SelectItem value="inventory">Étiquette</SelectItem>
                  <SelectItem value="order">Commande</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>
              Contenu (variables : {"{{productName}}, {{sku}}, {{quantity}}, {{Date}}"})
            </Label>
            <Textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              rows={8}
              className="font-mono text-xs"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={create.isPending}>
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
