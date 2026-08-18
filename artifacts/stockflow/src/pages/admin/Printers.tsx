import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListPrinters,
  useCreatePrinter,
  useDeletePrinter,
  getListPrintersQueryKey,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { Bluetooth, Network, Plus, Printer, Trash2, Usb } from "lucide-react";
import { toast } from "sonner";

const ICONS: Record<"network" | "bluetooth" | "usb", typeof Network> = {
  network: Network,
  bluetooth: Bluetooth,
  usb: Usb,
};
const LABELS = { network: "Réseau", bluetooth: "Bluetooth", usb: "USB" };

export default function Printers() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useListPrinters();
  const remove = useDeletePrinter();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Imprimantes"
          description="Imprimantes thermiques associées à la caisse et à la réserve."
          actions={<NewPrinterDialog />}
        />
        {isLoading ? (
          <div className="text-muted-foreground">Chargement…</div>
        ) : data && data.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((p) => {
              const Icon = ICONS[p.connection];
              return (
                <Card key={p.id}>
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                          <Printer className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                            <Icon className="h-3 w-3" />
                            {LABELS[p.connection]} · {p.width}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm(`Supprimer "${p.name}" ?`)) {
                            remove.mutate(
                              { id: p.id },
                              {
                                onSuccess: () => {
                                  toast.success("Imprimante supprimée");
                                  queryClient.invalidateQueries({
                                    queryKey: getListPrintersQueryKey(),
                                  });
                                },
                              },
                            );
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground break-all">
                      {p.address ?? "Adresse non renseignée"}
                    </p>
                    {p.isDefault ? <Badge variant="secondary">Par défaut</Badge> : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Printer}
            title="Aucune imprimante"
            description="Connectez vos imprimantes thermiques pour imprimer les tickets."
          />
        )}
      </div>
    </AdminLayout>
  );
}

function NewPrinterDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const create = useCreatePrinter();
  const [form, setForm] = useState({
    name: "",
    connection: "network" as "network" | "bluetooth" | "usb",
    address: "",
    width: "80mm" as "58mm" | "80mm",
    isDefault: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      toast.error("Nom requis");
      return;
    }
    create.mutate(
      { data: { ...form, address: form.address || null } },
      {
        onSuccess: () => {
          toast.success("Imprimante ajoutée");
          queryClient.invalidateQueries({
            queryKey: getListPrintersQueryKey(),
          });
          setOpen(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle imprimante
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle imprimante</DialogTitle>
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
              <Label>Connexion</Label>
              <Select
                value={form.connection}
                onValueChange={(v) =>
                  setForm({ ...form, connection: v as typeof form.connection })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="network">Réseau</SelectItem>
                  <SelectItem value="bluetooth">Bluetooth</SelectItem>
                  <SelectItem value="usb">USB</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          </div>
          <div className="space-y-1.5">
            <Label>Adresse</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="192.168.1.50:9100 ou MAC ou /dev/usb/lp0"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.isDefault}
              onCheckedChange={(v) => setForm({ ...form, isDefault: v })}
            />
            <Label>Imprimante par défaut</Label>
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
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
