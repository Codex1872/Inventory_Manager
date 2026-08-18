import { Link, useLocation } from "wouter";
import {
  ArrowRightLeft, Boxes, Image as ImageIcon, LayoutDashboard,
  LogOut, MapPin, MessageCircle, Package, ShoppingCart,
  Tags, Ticket, Truck, ScanLine, Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

// Tous les menus — visibles pour tous les rôles admin/seller
// L'admin voit aussi la gestion des utilisateurs
const NAV = [
  { href: "/app",            icon: LayoutDashboard, label: "Tableau de bord"  },
  { href: "/app/pos",        icon: ScanLine,        label: "Caisse (POS)",     highlight: true },
  { href: "/app/products",   icon: Package,         label: "Produits"          },
  { href: "/app/stock",      icon: Boxes,           label: "État des stocks"   },
  { href: "/app/movements",  icon: ArrowRightLeft,  label: "Mouvements"        },
  { href: "/app/orders",     icon: ShoppingCart,    label: "Commandes"         },
  { href: "/app/suppliers",  icon: Truck,           label: "Fournisseurs"      },
  { href: "/app/locations",  icon: MapPin,          label: "Emplacements"      },
  { href: "/app/categories", icon: Tags,            label: "Catégories"        },
  { href: "/app/tickets",    icon: Ticket,          label: "Étiquettes"        },
  { href: "/app/banners",    icon: ImageIcon,       label: "Bannières"         },
  { href: "/app/social",     icon: MessageCircle,   label: "Réseaux Sociaux"   },
];

const ADMIN_NAV = [
  { href: "/app/users", icon: Users, label: "Utilisateurs" },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === "admin";

  const allNav = isAdmin ? [...NAV, ...ADMIN_NAV] : NAV;

  return (
    <div className="flex h-screen bg-muted/40">
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border">
          <Link href="/app" className="flex items-center gap-2 text-xl font-bold font-display text-sidebar-primary">
            <Package className="h-6 w-6" />
            <span>StockFlow</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {allNav.map(({ href, icon: Icon, label, highlight }) => {
            const isActive =
              location === href ||
              (href !== "/app" && location.startsWith(href + "/"));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : highlight
                    ? "text-emerald-600 dark:text-emerald-400 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
                {highlight && !isActive && (
                  <span className="ml-auto text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                    POS
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Utilisateur connecté */}
        <div className="p-4 border-t border-sidebar-border">
          <div className="px-3 py-1 mb-1">
            <p className="text-xs text-sidebar-foreground/50 font-medium uppercase tracking-wide">
              {user?.role === "admin"
                ? "Administrateur"
                : user?.role === "seller"
                ? "Vendeur"
                : "Client"}
            </p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent transition-colors text-sidebar-foreground/80 text-sm"
          >
            <div className="h-7 w-7 rounded-full bg-sidebar-primary/20 flex items-center justify-center text-sidebar-primary font-bold text-sm shrink-0">
              {(user?.name?.[0] ?? "?").toUpperCase()}
            </div>
            <span className="flex-1 text-left truncate">{user?.name ?? "—"}</span>
            <LogOut className="h-4 w-4 opacity-50 shrink-0" />
          </button>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  );
}
