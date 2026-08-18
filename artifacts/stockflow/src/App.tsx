import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import NotFound from "@/pages/not-found";

// Auth
import Login    from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";

// Admin
import Dashboard    from "@/pages/admin/Dashboard";
import Products     from "@/pages/admin/Products";
import ProductDetail from "@/pages/admin/ProductDetail";
import Stock        from "@/pages/admin/Stock";
import Movements    from "@/pages/admin/Movements";
import Orders       from "@/pages/admin/Orders";
import Suppliers    from "@/pages/admin/Suppliers";
import Locations    from "@/pages/admin/Locations";
import Categories   from "@/pages/admin/Categories";
import Tickets      from "@/pages/admin/Tickets";
import Printers     from "@/pages/admin/Printers";
import Banners      from "@/pages/admin/Banners";
import Social       from "@/pages/admin/Social";
import Pos          from "@/pages/admin/Pos";
import AdminUsers   from "@/pages/admin/Users";

// Storefront
import Home         from "@/pages/storefront/Home";
import Shop         from "@/pages/storefront/Shop";
import StorePD      from "@/pages/storefront/ProductDetail";
import Contact      from "@/pages/storefront/Contact";
import Account      from "@/pages/storefront/Account";
import Checkout     from "@/pages/storefront/Checkout";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 30_000 } },
});

function Router() {
  return (
    <Switch>
      {/* Auth */}
      <Route path="/login"    component={Login} />
      <Route path="/register" component={Register} />

      {/* Storefront */}
      <Route path="/"          component={Home} />
      <Route path="/shop"      component={Shop} />
      <Route path="/shop/:id"  component={StorePD} />
      <Route path="/contact"   component={Contact} />
      <Route path="/account"   component={Account} />
      <Route path="/checkout"  component={Checkout} />

      {/* Admin */}
      <Route path="/app"              component={Dashboard} />
      <Route path="/app/pos"          component={Pos} />
      <Route path="/app/users"        component={AdminUsers} />
      <Route path="/app/products"     component={Products} />
      <Route path="/app/products/:id" component={ProductDetail} />
      <Route path="/app/stock"        component={Stock} />
      <Route path="/app/movements"    component={Movements} />
      <Route path="/app/orders"       component={Orders} />
      <Route path="/app/suppliers"    component={Suppliers} />
      <Route path="/app/locations"    component={Locations} />
      <Route path="/app/categories"   component={Categories} />
      <Route path="/app/tickets"      component={Tickets} />
      <Route path="/app/printers"     component={Printers} />
      <Route path="/app/banners"      component={Banners} />
      <Route path="/app/social"       component={Social} />

      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
            <SonnerToaster richColors position="top-right" />
          </TooltipProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
