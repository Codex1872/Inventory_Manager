import { sql } from "drizzle-orm";
import { db, movementsTable } from "@workspace/db";

export async function getOnHandForVariant(variantId: number): Promise<number> {
  const rows = await db
    .select({
      total: sql<string>`
        COALESCE(SUM(
          CASE
            WHEN ${movementsTable.type} = 'in' THEN ${movementsTable.quantity}
            WHEN ${movementsTable.type} = 'out' THEN -${movementsTable.quantity}
            WHEN ${movementsTable.type} = 'adjust' THEN ${movementsTable.quantity}
            ELSE 0
          END
        ), 0)
      `,
    })
    .from(movementsTable)
    .where(sql`${movementsTable.variantId} = ${variantId}`);

  return Number(rows[0]?.total ?? 0);
}

export async function getOnHandMap(): Promise<Map<number, number>> {
  const rows = await db
    .select({
      variantId: movementsTable.variantId,
      total: sql<string>`
        COALESCE(SUM(
          CASE
            WHEN ${movementsTable.type} = 'in' THEN ${movementsTable.quantity}
            WHEN ${movementsTable.type} = 'out' THEN -${movementsTable.quantity}
            WHEN ${movementsTable.type} = 'adjust' THEN ${movementsTable.quantity}
            ELSE 0
          END
        ), 0)
      `,
    })
    .from(movementsTable)
    .groupBy(movementsTable.variantId);

  const map = new Map<number, number>();
  for (const row of rows) {
    map.set(row.variantId, Number(row.total));
  }
  return map;
}

export async function getOnHandPerLocation(): Promise<
  Map<string, number>
> {
  // key = `${variantId}:${locationId ?? 'null'}`
  const rows = await db
    .select({
      variantId: movementsTable.variantId,
      locationId: movementsTable.toLocationId,
      qty: movementsTable.quantity,
      type: movementsTable.type,
      fromLocationId: movementsTable.fromLocationId,
    })
    .from(movementsTable);

  const map = new Map<string, number>();
  const add = (variantId: number, locId: number | null, delta: number) => {
    const key = `${variantId}:${locId ?? "null"}`;
    map.set(key, (map.get(key) ?? 0) + delta);
  };
  for (const r of rows) {
    if (r.type === "in" || r.type === "adjust") {
      add(r.variantId, r.locationId, r.qty);
    } else if (r.type === "out") {
      add(r.variantId, r.fromLocationId, -r.qty);
    } else if (r.type === "transfer") {
      add(r.variantId, r.fromLocationId, -r.qty);
      add(r.variantId, r.locationId, r.qty);
    }
  }
  return map;
}
