import pg from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set before backfilling inventory openings");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  const result = await pool.query(`
    INSERT INTO tager_inventory_movements (
      owner_id,
      product_id,
      product_name,
      type,
      quantity,
      reason,
      balance_before,
      balance_after
    )
    SELECT
      product.owner_id,
      product.id,
      product.name,
      'opening',
      product.quantity,
      'رصيد قائم قبل تفعيل سجل الحركة',
      0,
      product.quantity
    FROM tager_products AS product
    WHERE product.quantity > 0
      AND NOT EXISTS (
        SELECT 1
        FROM tager_inventory_movements AS movement
        WHERE movement.product_id = product.id
      )
  `);
  process.stdout.write(`Added opening records for ${result.rowCount ?? 0} products.\n`);
} finally {
  await pool.end();
}
