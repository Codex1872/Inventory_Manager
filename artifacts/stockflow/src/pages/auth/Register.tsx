import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Store, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

export default function Register() {
  const [, navigate] = useLocation();
  const { register } = useAuth();
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas"); return; }
    if (password.length < 8)  { setError("Le mot de passe doit contenir au moins 8 caractères"); return; }
    setError(null); setLoading(true);
    try {
      await register(email, password, name);
      navigate("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création du compte");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold font-display text-primary">
            <Store className="h-7 w-7" />
            StockFlow
          </Link>
          <p className="text-muted-foreground text-sm">Créez votre compte client</p>
        </div>

        <div className="bg-card rounded-xl border p-6 shadow-sm space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nom complet</label>
              <Input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Jean Dupont" required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Adresse e-mail</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com" required autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Mot de passe</label>
              <div className="relative">
                <Input type={showPwd ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 caractères" required className="pr-10" />
                <button type="button" onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Indicateur de force */}
              {password.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                      password.length >= (i + 1) * 3
                        ? ["bg-red-400","bg-orange-400","bg-yellow-400","bg-green-400"][i]
                        : "bg-muted"
                    }`} />
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Confirmer le mot de passe</label>
              <Input type="password" value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••" required />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Création…" : "Créer mon compte"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Déjà un compte ?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline">Se connecter</Link>
          </p>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:text-primary">← Retour à la boutique</Link>
        </p>
      </div>
    </div>
  );
}
