import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListBanners,
  useCreateBanner,
  useDeleteBanner,
  getListBannersQueryKey,
  getListStorefrontBannersQueryKey,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ImageIcon, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const PRESET_IMAGES = [
  "/images/banner-collection.png",
  "/images/banner-shipping.png",
  "/images/banner-storefront.png",
  "/images/store-hero.png",
];

export default function Banners() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useListBanners();
  const remove = useDeleteBanner();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListBannersQueryKey() });
    queryClient.invalidateQueries({
      queryKey: getListStorefrontBannersQueryKey(),
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Bannières"
          description="Visuels affichés en haut de la boutique en ligne."
          actions={<NewBannerDialog onCreated={invalidate} />}
        />
        {isLoading ? (
          <div className="text-muted-foreground">Chargement…</div>
        ) : data && data.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {data.map((b) => (
              <Card key={b.id} className="overflow-hidden">
                <div className="aspect-[16/9] bg-muted overflow-hidden">
                  {b.imageUrl ? (
                    <img
                      src={b.imageUrl}
                      alt={b.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{b.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {b.subtitle ?? "—"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm(`Supprimer "${b.title}" ?`)) {
                          remove.mutate(
                            { id: b.id },
                            { onSuccess: () => { toast.success("Bannière supprimée"); invalidate(); } },
                          );
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      Lien : {b.linkUrl ?? "—"}
                    </span>
                    {b.active ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <Badge variant="outline">Désactivée</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={ImageIcon}
            title="Aucune bannière"
            description="Ajoutez un visuel pour mettre en avant vos collections."
          />
        )}
      </div>
    </AdminLayout>
  );
}

function NewBannerDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const create = useCreateBanner();
  const [form, setForm] = useState({
    title: "",
    subtitle: "",
    imageUrl: PRESET_IMAGES[0],
    linkUrl: "",
    active: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      toast.error("Titre requis");
      return;
    }
    create.mutate(
      {
        data: {
          title: form.title,
          subtitle: form.subtitle || null,
          imageUrl: form.imageUrl,
          linkUrl: form.linkUrl || null,
          active: form.active,
        },
      },
      {
        onSuccess: () => {
          toast.success("Bannière créée");
          onCreated();
          setOpen(false);
          setForm({
            title: "",
            subtitle: "",
            imageUrl: PRESET_IMAGES[0],
            linkUrl: "",
            active: true,
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle bannière
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nouvelle bannière</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Titre</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Sous-titre</Label>
            <Input
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Lien (optionnel)</Label>
            <Input
              value={form.linkUrl}
              onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
              placeholder="/shop"
            />
          </div>
          <div className="space-y-2">
            <Label>Image</Label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_IMAGES.map((src) => (
                <button
                  type="button"
                  key={src}
                  onClick={() => setForm({ ...form, imageUrl: src })}
                  className={`relative aspect-square overflow-hidden rounded-md border-2 ${
                    form.imageUrl === src
                      ? "border-primary"
                      : "border-transparent"
                  }`}
                >
                  <img
                    src={src}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.active}
              onCheckedChange={(v) => setForm({ ...form, active: v })}
            />
            <Label>Active</Label>
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
