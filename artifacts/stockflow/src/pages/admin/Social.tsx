import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListSocialAccounts,
  useToggleSocialAccount,
  useListSocialPosts,
  useCreateSocialPost,
  usePublishSocialPost,
  useListSocialMessages,
  useReplySocialMessage,
  useListSocialTriggers,
  useCreateSocialTrigger,
  useDeleteSocialTrigger,
  useListProducts,
  getListSocialAccountsQueryKey,
  getListSocialPostsQueryKey,
  getListSocialMessagesQueryKey,
  getListSocialTriggersQueryKey,
  getGetDashboardSummaryQueryKey,
} from "@workspace/api-client-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import {
  Facebook,
  Instagram,
  Linkedin,
  MessageCircle,
  Plus,
  Send,
  Share2,
  Sparkles,
  Trash2,
  Music2,
  Inbox,
  CalendarClock,
} from "lucide-react";
import {
  dateTime,
  platformLabel,
  postStatusLabel,
  triggerEventLabel,
} from "@/lib/format";
import { toast } from "sonner";

const PLATFORM_ICONS: Record<
  "facebook" | "instagram" | "linkedin" | "tiktok",
  typeof Facebook
> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  tiktok: Music2,
};

export default function Social() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Réseaux sociaux"
          description="Comptes connectés, planification, boîte de réception et déclencheurs."
        />
        <Tabs defaultValue="accounts">
          <TabsList>
            <TabsTrigger value="accounts">Comptes</TabsTrigger>
            <TabsTrigger value="posts">Publications</TabsTrigger>
            <TabsTrigger value="inbox">Inbox</TabsTrigger>
            <TabsTrigger value="triggers">Déclencheurs</TabsTrigger>
          </TabsList>
          <TabsContent value="accounts" className="mt-6">
            <AccountsTab />
          </TabsContent>
          <TabsContent value="posts" className="mt-6">
            <PostsTab />
          </TabsContent>
          <TabsContent value="inbox" className="mt-6">
            <InboxTab />
          </TabsContent>
          <TabsContent value="triggers" className="mt-6">
            <TriggersTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function AccountsTab() {
  const queryClient = useQueryClient();
  const { data } = useListSocialAccounts();
  const toggle = useToggleSocialAccount();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(data ?? []).map((a) => {
        const Icon = PLATFORM_ICONS[a.platform];
        return (
          <Card key={a.id}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center">
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{platformLabel(a.platform)}</p>
                <p className="text-sm text-muted-foreground">
                  {a.handle ?? "Non configuré"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {a.followers.toLocaleString("fr-FR")} abonnés
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {a.connected ? (
                  <Badge variant="secondary">Connecté</Badge>
                ) : (
                  <Badge variant="outline">Non connecté</Badge>
                )}
                <Switch
                  checked={a.connected}
                  onCheckedChange={(v) =>
                    toggle.mutate(
                      { id: a.id, data: { connected: v } },
                      {
                        onSuccess: () => {
                          toast.success(
                            v ? "Compte connecté" : "Compte déconnecté",
                          );
                          queryClient.invalidateQueries({
                            queryKey: getListSocialAccountsQueryKey(),
                          });
                        },
                      },
                    )
                  }
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function PostsTab() {
  const queryClient = useQueryClient();
  const { data } = useListSocialPosts();
  const publish = usePublishSocialPost();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <NewPostDialog />
      </div>
      {data && data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => {
            const Icon = PLATFORM_ICONS[p.platform];
            return (
              <Card key={p.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {platformLabel(p.platform)}
                      </span>
                    </div>
                    <Badge
                      variant={
                        p.status === "published"
                          ? "secondary"
                          : p.status === "scheduled"
                            ? "default"
                            : "outline"
                      }
                    >
                      {postStatusLabel(p.status)}
                    </Badge>
                  </div>
                  {p.imageUrl ? (
                    <div className="aspect-square rounded-md overflow-hidden bg-muted">
                      <img
                        src={p.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : null}
                  <p className="text-sm whitespace-pre-wrap line-clamp-4">
                    {p.message}
                  </p>
                  <div className="text-xs text-muted-foreground border-t pt-2 flex items-center gap-3">
                    {p.scheduledFor ? (
                      <span className="flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        {dateTime(p.scheduledFor)}
                      </span>
                    ) : null}
                    {p.publishedAt ? (
                      <span>Publié le {dateTime(p.publishedAt)}</span>
                    ) : null}
                    {p.engagementCount > 0 ? (
                      <span>· {p.engagementCount} interactions</span>
                    ) : null}
                  </div>
                  {p.status !== "published" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        publish.mutate(
                          { id: p.id },
                          {
                            onSuccess: () => {
                              toast.success("Publication diffusée");
                              queryClient.invalidateQueries({
                                queryKey: getListSocialPostsQueryKey(),
                              });
                              queryClient.invalidateQueries({
                                queryKey: getGetDashboardSummaryQueryKey(),
                              });
                            },
                          },
                        )
                      }
                      disabled={publish.isPending}
                    >
                      <Share2 className="h-4 w-4 mr-1" />
                      Publier maintenant
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          title="Aucune publication"
          description="Créez votre première publication pour la programmer ou la publier."
        />
      )}
    </div>
  );
}

function NewPostDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const create = useCreateSocialPost();
  const { data: products } = useListProducts({});
  const [form, setForm] = useState({
    platform: "instagram" as "facebook" | "instagram" | "linkedin" | "tiktok",
    message: "",
    productId: "none",
    status: "draft" as "draft" | "scheduled" | "published",
    scheduledFor: "",
    imageUrl: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.message.trim()) {
      toast.error("Message requis");
      return;
    }
    const product = (products ?? []).find(
      (p) => String(p.id) === form.productId,
    );
    create.mutate(
      {
        data: {
          platform: form.platform,
          message: form.message,
          imageUrl: form.imageUrl || product?.imageUrl || null,
          productId: product?.id ?? null,
          status: form.status,
          scheduledFor:
            form.status === "scheduled" && form.scheduledFor
              ? new Date(form.scheduledFor).toISOString()
              : null,
        },
      },
      {
        onSuccess: () => {
          toast.success("Publication créée");
          queryClient.invalidateQueries({
            queryKey: getListSocialPostsQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetDashboardSummaryQueryKey(),
          });
          setOpen(false);
          setForm({
            platform: "instagram",
            message: "",
            productId: "none",
            status: "draft",
            scheduledFor: "",
            imageUrl: "",
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Nouvelle publication
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouvelle publication</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Plateforme</Label>
              <Select
                value={form.platform}
                onValueChange={(v) =>
                  setForm({ ...form, platform: v as typeof form.platform })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="facebook">Facebook</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as typeof form.status })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Brouillon</SelectItem>
                  <SelectItem value="scheduled">Planifiée</SelectItem>
                  <SelectItem value="published">Publiée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Produit associé</Label>
            <Select
              value={form.productId}
              onValueChange={(v) => setForm({ ...form, productId: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {(products ?? []).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={4}
            />
          </div>
          {form.status === "scheduled" ? (
            <div className="space-y-1.5">
              <Label>Date de publication</Label>
              <Input
                type="datetime-local"
                value={form.scheduledFor}
                onChange={(e) =>
                  setForm({ ...form, scheduledFor: e.target.value })
                }
              />
            </div>
          ) : null}
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

function InboxTab() {
  const queryClient = useQueryClient();
  const { data } = useListSocialMessages();
  const reply = useReplySocialMessage();
  const [replyTexts, setReplyTexts] = useState<Record<number, string>>({});

  const handleReply = (id: number) => {
    const text = (replyTexts[id] ?? "").trim();
    if (!text) {
      toast.error("Saisissez une réponse");
      return;
    }
    reply.mutate(
      { id, data: { reply: text } },
      {
        onSuccess: () => {
          toast.success("Réponse envoyée");
          setReplyTexts({ ...replyTexts, [id]: "" });
          queryClient.invalidateQueries({
            queryKey: getListSocialMessagesQueryKey(),
          });
          queryClient.invalidateQueries({
            queryKey: getGetDashboardSummaryQueryKey(),
          });
        },
      },
    );
  };

  return data && data.length > 0 ? (
    <div className="space-y-3">
      {data.map((m) => {
        const Icon = PLATFORM_ICONS[m.platform];
        return (
          <Card key={m.id}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{m.author}</p>
                      <Badge variant="outline" className="text-xs">
                        {m.kind === "dm"
                          ? "Message direct"
                          : m.kind === "comment"
                            ? "Commentaire"
                            : "Mention"}
                      </Badge>
                      {m.unread ? (
                        <Badge variant="default">Non lu</Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {platformLabel(m.platform)} · {dateTime(m.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-sm pl-13">{m.body}</p>
              {m.reply ? (
                <div className="ml-13 pl-3 border-l-2 border-primary text-sm">
                  <p className="text-xs text-muted-foreground mb-1">
                    Votre réponse · {m.replyAt ? dateTime(m.replyAt) : ""}
                  </p>
                  <p>{m.reply}</p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={replyTexts[m.id] ?? ""}
                    onChange={(e) =>
                      setReplyTexts({ ...replyTexts, [m.id]: e.target.value })
                    }
                    placeholder="Tapez votre réponse..."
                  />
                  <Button
                    onClick={() => handleReply(m.id)}
                    disabled={reply.isPending}
                  >
                    <Send className="h-4 w-4 mr-2" /> Répondre
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  ) : (
    <EmptyState
      icon={Inbox}
      title="Boîte de réception vide"
      description="Les messages directs, commentaires et mentions apparaîtront ici."
    />
  );
}

function TriggersTab() {
  const queryClient = useQueryClient();
  const { data } = useListSocialTriggers();
  const remove = useDeleteSocialTrigger();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <NewTriggerDialog />
      </div>
      {data && data.length > 0 ? (
        <div className="space-y-3">
          {data.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{t.name}</p>
                    <Badge variant="outline">
                      {triggerEventLabel(t.event)}
                    </Badge>
                    {t.platforms.map((pf) => (
                      <Badge key={pf} variant="secondary">
                        {platformLabel(pf)}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 italic">
                    « {t.template} »
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {t.active ? (
                    <Badge variant="secondary">Actif</Badge>
                  ) : (
                    <Badge variant="outline">Inactif</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm(`Supprimer "${t.name}" ?`)) {
                        remove.mutate(
                          { id: t.id },
                          {
                            onSuccess: () => {
                              toast.success("Déclencheur supprimé");
                              queryClient.invalidateQueries({
                                queryKey: getListSocialTriggersQueryKey(),
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
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={MessageCircle}
          title="Aucun déclencheur"
          description="Configurez l'automatisation des annonces (nouveaux produits, ruptures, réassorts)."
        />
      )}
    </div>
  );
}

function NewTriggerDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const create = useCreateSocialTrigger();
  const [form, setForm] = useState({
    name: "",
    event: "new_product" as "new_product" | "low_stock" | "restock",
    template: "",
    facebook: true,
    instagram: true,
    linkedin: false,
    tiktok: false,
    active: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const platforms: Array<"facebook" | "instagram" | "linkedin" | "tiktok"> =
      [];
    if (form.facebook) platforms.push("facebook");
    if (form.instagram) platforms.push("instagram");
    if (form.linkedin) platforms.push("linkedin");
    if (form.tiktok) platforms.push("tiktok");
    if (!form.name || !form.template || platforms.length === 0) {
      toast.error("Renseignez nom, modèle et au moins une plateforme");
      return;
    }
    create.mutate(
      {
        data: {
          name: form.name,
          event: form.event,
          template: form.template,
          platforms,
          active: form.active,
        },
      },
      {
        onSuccess: () => {
          toast.success("Déclencheur créé");
          queryClient.invalidateQueries({
            queryKey: getListSocialTriggersQueryKey(),
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
          <Plus className="h-4 w-4 mr-2" /> Nouveau déclencheur
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nouveau déclencheur</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nom</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Événement</Label>
            <Select
              value={form.event}
              onValueChange={(v) =>
                setForm({ ...form, event: v as typeof form.event })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new_product">Nouveau produit</SelectItem>
                <SelectItem value="low_stock">Stock bas</SelectItem>
                <SelectItem value="restock">Réassort</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Modèle de message</Label>
            <Textarea
              value={form.template}
              onChange={(e) => setForm({ ...form, template: e.target.value })}
              rows={3}
              placeholder="Utilisez {{productName}} pour insérer le nom du produit"
            />
          </div>
          <div className="space-y-2">
            <Label>Plateformes</Label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["facebook", "Facebook"],
                  ["instagram", "Instagram"],
                  ["linkedin", "LinkedIn"],
                  ["tiktok", "TikTok"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <Switch
                    checked={form[key]}
                    onCheckedChange={(v) => setForm({ ...form, [key]: v })}
                  />
                  <Label>{label}</Label>
                </div>
              ))}
            </div>
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
