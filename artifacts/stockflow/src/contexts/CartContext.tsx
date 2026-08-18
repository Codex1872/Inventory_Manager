import {
  createContext, useContext, useState, useEffect, useCallback, type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";

export type CartItem = {
  variantId:   number;
  productId:   number;
  productName: string;
  sku:         string;
  size:        string | null;
  color:       string | null;
  imageUrl:    string | null;
  priceHt:     number;
  priceTtc:    number;
  vatRate:     number;
  quantity:    number;
  stock:       number;
  lineTtc:     number;
};

export type CartState = {
  items:      CartItem[];
  totalTtc:   number;
  itemCount:  number;
};

type CartCtx = CartState & {
  loading:   boolean;
  addItem:   (variantId: number, quantity?: number) => Promise<void>;
  updateQty: (variantId: number, quantity: number)  => Promise<void>;
  removeItem:(variantId: number)                    => Promise<void>;
  clearCart: ()                                     => Promise<void>;
  reload:    ()                                     => Promise<void>;
};

const Ctx = createContext<CartCtx | null>(null);
const EMPTY: CartState = { items: [], totalTtc: 0, itemCount: 0 };

async function cartApi<T>(path: string, options: RequestInit, token: string): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "Erreur panier"); }
  return res.json() as Promise<T>;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, token } = useAuth();
  const [state,   setState]   = useState<CartState>(EMPTY);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!token || !user) { setState(EMPTY); return; }
    setLoading(true);
    try {
      const data = await cartApi<CartState>("/cart", { method: "GET" }, token);
      setState(data);
    } catch { setState(EMPTY); }
    finally   { setLoading(false); }
  }, [token, user]);

  // Recharger le panier à chaque connexion/déconnexion
  useEffect(() => { reload(); }, [reload]);

  const addItem = async (variantId: number, quantity = 1) => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await cartApi<CartState>("/cart/items",
        { method: "POST", body: JSON.stringify({ variantId, quantity }) }, token);
      setState(data);
    } finally { setLoading(false); }
  };

  const updateQty = async (variantId: number, quantity: number) => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await cartApi<CartState>(`/cart/items/${variantId}`,
        { method: "PUT", body: JSON.stringify({ quantity }) }, token);
      setState(data);
    } finally { setLoading(false); }
  };

  const removeItem = async (variantId: number) => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await cartApi<CartState>(`/cart/items/${variantId}`,
        { method: "DELETE" }, token);
      setState(data);
    } finally { setLoading(false); }
  };

  const clearCart = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await cartApi<CartState>("/cart", { method: "DELETE" }, token);
      setState(data);
    } finally { setLoading(false); }
  };

  return (
    <Ctx.Provider value={{ ...state, loading, addItem, updateQty, removeItem, clearCart, reload }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
