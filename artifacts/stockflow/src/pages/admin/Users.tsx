import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Plus, Pencil, Trash2, ShieldCheck, Store, UserIcon, Eye, EyeOff,
} from "lucide-react";
import { useAuthFetch } from "@/contexts/AuthContext";
import { dateShort } from "@/lib/format";

// ─── Types ────────────────────────────────────────────────────────────────────
type User = {
  id:        number;
  email:     string;
  name:      string;
  role:      "admin" | "seller" | "client";
  active:    boolean;
  createdAt: string;
};

type CreateForm = { name: string; email: string; password: string; role: string };
type EditForm   = { name: string; role: string; newPassword: string };

const EMPTY_CREATE: CreateForm = { name: "", email: "", password: "", role: "client" };
const EMPTY_EDIT:   EditForm   = { name: "", role: "client", newPassword: "" };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ROLE_ICON: Record<string, React.ElementType> = {
  admin:  ShieldCheck,
  seller: Store,
  client: UserIcon,
};
const ROLE_LABEL: Record<string, string> = {
  admin:  "Admin",
  seller: "Vendeur",
  client: "Client",
};
const ROLE_COLOR: Record<string, string> = {
  admin:  "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  seller: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400",
  client: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
};

function RoleSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Choisir un rôle" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-red-500" />
            Admin — accès complet
          </span>
        </SelectItem>
        <SelectItem value="seller">
          <span className="flex items-center gap-2">
            <Store className="h-3.5 w-3.5 text-blue-500" />
            Vendeur — caisse + stocks
          </span>
        </SelectItem>
        <SelectItem value="client">
          <span className="flex items-center gap-2">
            <UserIcon className="h-3.5 w-3.5 text-green-500" />
            Client — compte boutique
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminUsers() {
  const authFetch = useAuthFetch();
  const qc        = useQueryClient();

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn:  () => authFetch<User[]>("/admin/users"),
  });

  // ── État dialogs ──────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser,   setEditUser]   = useState<User | null>(null);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [editForm,   setEditForm]   = useState<EditForm>(EMPTY_EDIT);
  const [createErr,  setCreateErr]  = useState<string | null>(null);
  const [editErr,    setEditErr]    = useState<string | null>(null);
  const [showPwd,    setShowPwd]    = useState(false);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-users"] });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: (data: CreateForm) =>
      authFetch("/admin/users", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
      setCreateErr(null);
    },
    onError: (e: Error) => setCreateErr(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<EditForm & { active: boolean }> }) =>
      authFetch(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => {
      invalidate();
      setEditUser(null);
      setEditErr(null);
    },
    onError: (e: Error) => setEditErr(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) =>
      authFetch(`/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openCreate = () => {
    setCreateForm(EMPTY_CREATE);
    setCreateErr(null);
    setShowPwd(false);
    setCreateOpen(true);
  };

  const openEdit = (u: User) => {
    setEditForm({ name: u.name, role: u.role, newPassword: "" });
    setEditErr(null);
    setEditUser(u);
  };

  const handleCreate = () => {
    if (!createForm.name.trim())   { setCreateErr("Le nom est requis");    return; }
    if (!createForm.email.trim())  { setCreateErr("L'e-mail est requis");  return; }
    if (!createForm.password)      { setCreateErr("Le mot de passe est requis"); return; }
    if (createForm.password.length < 8) { setCreateErr("Mot de passe trop court (8 caractères min.)"); return; }
    createMut.mutate(createForm);
  };

  const handleUpdate = () => {
    if (!editUser) return;
    if (!editForm.name.trim()) { setEditErr("Le nom est requis"); return; }
    if (editForm.newPassword && editForm.newPassword.length < 8) {
      setEditErr("Nouveau mot de passe trop court (8 caractères min.)"); return;
    }
    const payload: Record<string, unknown> = { name: editForm.name, role: editForm.role };
    if (editForm.newPassword) payload.newPassword = editForm.newPassword;
    updateMut.mutate({ id: editUser.id, data: payload });
  };

  const toggleActive = (u: User) =>
    updateMut.mutate({ id: u.id, data: { active: !u.active } });

  const handleDelete = (u: User) => {
    if (window.confirm(`Supprimer définitivement le compte de ${u.name} ?`)) {
      deleteMut.mutate(u.id);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="space-y-6">
        <PageHeader
          title="Utilisateurs"
          description={`${users.length} compte${users.length !== 1 ? "s" : ""} enregistré${users.length !== 1 ? "s" : ""}.`}
          actions={
            <Button onClick={openCreate} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvel utilisateur
            </Button>
          }
        />

        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom / E-mail</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Créé le</TableHead>
                <TableHead className="text-right w-28">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    Chargement…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                    Aucun utilisateur trouvé.
                  </TableCell>
                </TableRow>
              )}
              {users.map((u) => {
                const Icon = ROLE_ICON[u.role] ?? UserIcon;
                return (
                  <TableRow key={u.id}>
                    {/* Nom / Email */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold text-sm">
                          {u.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{u.name}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>

                    {/* Rôle */}
                    <TableCell>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_COLOR[u.role]}`}>
                        <Icon className="h-3 w-3" />
                        {ROLE_LABEL[u.role] ?? u.role}
                      </span>
                    </TableCell>

                    {/* Statut (cliquable pour toggle) */}
                    <TableCell>
                      <button
                        onClick={() => toggleActive(u)}
                        title={u.active ? "Cliquer pour désactiver" : "Cliquer pour activer"}
                      >
                        <Badge variant={u.active ? "default" : "outline"}>
                          {u.active ? "Actif" : "Inactif"}
                        </Badge>
                      </button>
                    </TableCell>

                    {/* Date */}
                    <TableCell className="text-sm text-muted-foreground">
                      {dateShort(u.createdAt)}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(u)} title="Modifier">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => handleDelete(u)}
                          title="Supprimer"
                          disabled={deleteMut.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          Dialog CRÉATION — champs complets : nom, email, mot de passe, rôle
      ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) { setCreateOpen(false); setCreateErr(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nouvel utilisateur
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Nom */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nom complet <span className="text-destructive">*</span></label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Jean Dupont"
                autoFocus
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Adresse e-mail <span className="text-destructive">*</span></label>
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="jean@exemple.com"
                autoComplete="off"
              />
            </div>

            {/* Mot de passe */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Mot de passe <span className="text-destructive">*</span></label>
              <div className="relative">
                <Input
                  type={showPwd ? "text" : "password"}
                  value={createForm.password}
                  onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="Min. 8 caractères"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Rôle */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rôle <span className="text-destructive">*</span></label>
              <RoleSelect
                value={createForm.role}
                onChange={(v) => setCreateForm((f) => ({ ...f, role: v }))}
              />
            </div>

            {/* Erreur */}
            {createErr && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {createErr}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setCreateErr(null); }}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={createMut.isPending} className="gap-2">
              <Plus className="h-4 w-4" />
              {createMut.isPending ? "Création…" : "Créer l'utilisateur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════════
          Dialog MODIFICATION — nom, rôle, nouveau mot de passe (optionnel)
      ═══════════════════════════════════════════════════════════════════ */}
      <Dialog open={!!editUser} onOpenChange={(o) => { if (!o) { setEditUser(null); setEditErr(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Modifier — {editUser?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Email (lecture seule) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">E-mail</label>
              <Input value={editUser?.email ?? ""} disabled className="bg-muted/50 text-muted-foreground" />
            </div>

            {/* Nom */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nom complet <span className="text-destructive">*</span></label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                autoFocus
              />
            </div>

            {/* Rôle */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Rôle</label>
              <RoleSelect
                value={editForm.role}
                onChange={(v) => setEditForm((f) => ({ ...f, role: v }))}
              />
            </div>

            {/* Nouveau mot de passe */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nouveau mot de passe</label>
              <Input
                type="password"
                value={editForm.newPassword}
                onChange={(e) => setEditForm((f) => ({ ...f, newPassword: e.target.value }))}
                placeholder="Laisser vide pour ne pas changer"
              />
              <p className="text-xs text-muted-foreground">Min. 8 caractères si renseigné.</p>
            </div>

            {/* Erreur */}
            {editErr && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {editErr}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditUser(null); setEditErr(null); }}>
              Annuler
            </Button>
            <Button onClick={handleUpdate} disabled={updateMut.isPending}>
              {updateMut.isPending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
