import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Store, ShoppingBag, Menu, User, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CartDrawer } from "@/components/CartDrawer";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";

export function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user }   = useAuth();
  const { itemCount } = useCart();
  const [cartOpen, setCartOpen] = useState(false);

  const navItems = [
    { href: "/",       label: "Accueil" },
    { href: "/shop",   label: "Boutique" },
    { href: "/contact",label: "Contact" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold font-display tracking-tight text-primary">
              <Store className="h-6 w-6" />
              <span>StockFlow</span>
            </Link>
            <nav className="hidden md:flex gap-6">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}
                  className={`text-sm font-medium transition-colors hover:text-primary ${location === item.href ? "text-primary" : "text-muted-foreground"}`}>
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild variant="ghost" size="sm" className="hidden md:flex gap-2">
                <Link href="/account"><User className="h-4 w-4" />{user.name.split(" ")[0]}</Link>
              </Button>
            ) : (
              <Button asChild variant="ghost" size="sm" className="hidden md:flex gap-2">
                <Link href="/login"><LogIn className="h-4 w-4" />Connexion</Link>
              </Button>
            )}

            <Button variant="outline" size="icon" className="relative"
              onClick={() => setCartOpen(true)}>
              <ShoppingBag className="h-4 w-4" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </Button>

            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <nav className="flex flex-col gap-4 mt-8">
                  {navItems.map((item) => (
                    <Link key={item.href} href={item.href}
                      className={`text-lg font-medium ${location === item.href ? "text-primary" : "text-muted-foreground"}`}>
                      {item.label}
                    </Link>
                  ))}
                  <div className="h-px bg-border my-4" />
                  {user ? (
                    <Link href="/account" className="text-lg font-medium text-muted-foreground">Mon compte</Link>
                  ) : (
                    <Link href="/login" className="text-lg font-medium text-muted-foreground">Se connecter</Link>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-muted/20 py-12">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xl font-bold font-display text-primary">
                <Store className="h-6 w-6" /><span>StockFlow</span>
              </div>
              <p className="text-sm text-muted-foreground">Produits de qualité, expédition rapide.</p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Liens</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/" className="hover:text-primary">Accueil</Link></li>
                <li><Link href="/shop" className="hover:text-primary">Boutique</Link></li>
                <li><Link href="/contact" className="hover:text-primary">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Compte</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {user ? (
                  <li><Link href="/account" className="hover:text-primary">Mon compte</Link></li>
                ) : (
                  <>
                    <li><Link href="/login"    className="hover:text-primary">Connexion</Link></li>
                    <li><Link href="/register" className="hover:text-primary">Créer un compte</Link></li>
                  </>
                )}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>hello@stockflow.com</li>
                <li>+33 1 23 45 67 89</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} StockFlow. Tous droits réservés.
          </div>
        </div>
      </footer>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
}
