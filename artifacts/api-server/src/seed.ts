import {
  db,
  categoriesTable, suppliersTable, locationsTable,
  productsTable, variantsTable, movementsTable,
  bannersTable, usersTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logger } from "./lib/logger";

function slug(value: string): string {
  return value.toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function seedAdminUser(): Promise<void> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable);
  if (count > 0) return;

  const email    = process.env.ADMIN_EMAIL    ?? "admin@stockflow.com";
  const password = process.env.ADMIN_PASSWORD ?? "Admin1234!";
  const name     = process.env.ADMIN_NAME     ?? "Admin";

  await db.insert(usersTable).values({
    email,
    passwordHash: await bcrypt.hash(password, 10),
    name,
    role: "admin",
  });
  logger.info({ email }, "✔ Admin par défaut créé — changez le mot de passe !");
}

export async function runSeedIfEmpty(): Promise<void> {
  // 1. Compte admin par défaut
  await seedAdminUser();

  // 2. Données de démonstration (produits)
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productsTable);

  if (count > 0) {
    logger.info({ count }, "Seed produits ignoré (données déjà existantes)");
    return;
  }

  logger.info("Seed des données initiales…");

  // Catégories
  const categoryNames = ["Vêtements", "Chaussures", "Accessoires", "Électronique"];
  const categories = await db
    .insert(categoriesTable)
    .values(categoryNames.map((name) => ({ name, slug: slug(name) })))
    .returning();

  // Fournisseur
  const [supplier] = await db
    .insert(suppliersTable)
    .values({
      name:         "Fournisseur Démo",
      email:        "demo@fournisseur.com",
      phone:        "+33600000000",
      leadTimeDays: 7,
    })
    .returning();

  // Emplacement (zone/aisle/shelf — pas de 'code' dans le schéma)
  const [location] = await db
    .insert(locationsTable)
    .values({ name: "Entrepôt Principal", zone: "A" })
    .returning();

  // Produits
  const products = await db
    .insert(productsTable)
    .values([
      {
        name: "T-Shirt Premium", reference: "TSH-001",
        priceHt: "20.83", vatRate: "20",
        categoryId: categories[0].id, supplierId: supplier.id,
        description: "T-shirt 100% coton biologique, coupe droite.",
        imageUrl: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&auto=format",
        visibleOnStorefront: true,
      },
      {
        name: "Sneakers Classic", reference: "SNK-001",
        priceHt: "62.50", vatRate: "20",
        categoryId: categories[1].id, supplierId: supplier.id,
        description: "Sneakers confortables pour un usage quotidien.",
        imageUrl: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format",
        visibleOnStorefront: true,
      },
      {
        name: "Montre Minimaliste", reference: "MON-001",
        priceHt: "83.33", vatRate: "20",
        categoryId: categories[2].id, supplierId: supplier.id,
        description: "Montre élégante au design épuré.",
        imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format",
        visibleOnStorefront: true,
      },
      {
        name: "Casque Audio BT", reference: "CAS-001",
        priceHt: "58.33", vatRate: "20",
        categoryId: categories[3].id, supplierId: supplier.id,
        description: "Casque Bluetooth avec réduction de bruit active.",
        imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format",
        visibleOnStorefront: true,
      },
    ])
    .returning();

  // Variantes
  const variantDefs = [
    { productId: products[0].id, skus: ["TSH-001-S-BLK", "TSH-001-M-BLK", "TSH-001-L-BLK"], sizes: ["S", "M", "L"], color: "Noir" },
    { productId: products[1].id, skus: ["SNK-001-42", "SNK-001-43", "SNK-001-44"],            sizes: ["42", "43", "44"], color: "Blanc" },
    { productId: products[2].id, skus: ["MON-001-ARG"],                                        sizes: [null],            color: "Argent" },
    { productId: products[3].id, skus: ["CAS-001-NOI"],                                        sizes: [null],            color: "Noir" },
  ];

  const allVariants = await db
    .insert(variantsTable)
    .values(
      variantDefs.flatMap(({ productId, skus, sizes, color }) =>
        skus.map((sku, i) => ({ productId, sku, size: sizes[i], color, barcode: sku })),
      ),
    )
    .returning();

  // Stock initial (mouvements d'entrée — fromLocationId / toLocationId dans le schéma)
  await db.insert(movementsTable).values(
    allVariants.map((v) => ({
      variantId:    v.id,
      toLocationId: location.id,   // ← champ correct (pas locationId)
      type:         "in" as const,
      quantity:     50,
      operator:     "Seed",
      reason:       "Stock initial",
    })),
  );

  // Bannière de démo (imageUrl est NOT NULL dans le schéma → chaîne vide acceptable)
  await db.insert(bannersTable).values([
    {
      title:    "Nouvelle collection",
      subtitle: "Découvrez nos dernières nouveautés",
      imageUrl: "",           // ← pas null (champ NOT NULL dans le schéma)
      linkUrl:  "/shop",      // ← linkUrl (pas ctaUrl)
      active:   true,
    },
  ]);

  logger.info("✔ Seed terminé");
}
