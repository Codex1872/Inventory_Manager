export const eur = (value: number): string =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(
    value,
  );

export const number = (value: number): string =>
  new Intl.NumberFormat("fr-FR").format(value);

export const dateTime = (value: string | Date): string =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(typeof value === "string" ? new Date(value) : value);

export const dateShort = (value: string | Date): string =>
  new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
    typeof value === "string" ? new Date(value) : value,
  );

export const movementLabel = (
  type: "in" | "out" | "transfer" | "adjust",
): string =>
  ({
    in: "Entrée",
    out: "Sortie",
    transfer: "Transfert",
    adjust: "Ajustement",
  })[type];

export const orderStatusLabel = (
  status: "draft" | "sent" | "received" | "cancelled",
): string =>
  ({
    draft: "Brouillon",
    sent: "Envoyée",
    received: "Reçue",
    cancelled: "Annulée",
  })[status];

export const platformLabel = (
  platform: "facebook" | "instagram" | "linkedin" | "tiktok",
): string =>
  ({
    facebook: "Facebook",
    instagram: "Instagram",
    linkedin: "LinkedIn",
    tiktok: "TikTok",
  })[platform];

export const postStatusLabel = (
  status: "draft" | "scheduled" | "published" | "failed",
): string =>
  ({
    draft: "Brouillon",
    scheduled: "Planifiée",
    published: "Publiée",
    failed: "Échouée",
  })[status];

export const triggerEventLabel = (
  event: "new_product" | "low_stock" | "restock",
): string =>
  ({
    new_product: "Nouveau produit",
    low_stock: "Stock bas",
    restock: "Réassort",
  })[event];
