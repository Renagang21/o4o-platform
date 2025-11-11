import 'reflect-metadata';
import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'o4o_platform',
  user: 'postgres',
  password: 'postgres',
  ssl: false
});

async function migrateAllOrdersToCPT() {
  try {
    console.log('Starting full order migration to CPT...\n');

    // 1. 마이그레이션 대상 확인
    console.log('=== Checking Migration Status ===');

    const ordersCount = await pool.query('SELECT COUNT(*) FROM orders');
    const cptCount = await pool.query(
      `SELECT COUNT(*) FROM custom_posts WHERE cpt_slug = 'order'`
    );

    console.log(`Total orders in legacy table: ${ordersCount.rows[0].count}`);
    console.log(`Already migrated to CPT: ${cptCount.rows[0].count}`);
    console.log(`To be migrated: ${ordersCount.rows[0].count - cptCount.rows[0].count}\n`);

    // 2. 마이그레이션 실행
    console.log('=== Starting Migration ===');

    const orders = await pool.query(`
      SELECT o.*
      FROM orders o
      LEFT JOIN custom_posts cp ON cp.slug = o."orderNumber"
      WHERE cp.slug IS NULL
      ORDER BY o."createdAt"
    `);

    console.log(`Found ${orders.rows.length} orders to migrate\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const order of orders.rows) {
      try {
        // custom_posts에 삽입
        await pool.query(`
          INSERT INTO custom_posts (
            id, cpt_slug, title, slug, content,
            status, author_id, fields, published_at,
            created_at, updated_at
          ) VALUES (
            gen_random_uuid(), 'order', $1, $2, $3,
            'publish', $4, $5::jsonb, $6,
            $7, $8
          )
        `, [
          `주문 #${order.orderNumber}`,
          order.orderNumber,
          `주문 번호: ${order.orderNumber}\n구매자: ${order.buyerName}`,
          order.buyerId,
          {
            order_number: order.orderNumber,
            buyer_id: order.buyerId,
            buyer_name: order.buyerName,
            buyer_email: order.buyerEmail,
            order_status: order.status,
            payment_status: order.paymentStatus,
            payment_method: order.paymentMethod,
            order_total: order.summary?.total || 0,
            order_items: order.items,
            shipping_address: order.shippingAddress,
            billing_address: order.billingAddress
          },
          order.orderDate || order.createdAt,
          order.createdAt,
          order.updatedAt || new Date()
        ]);

        successCount++;

        if (successCount % 10 === 0) {
          console.log(`  Migrated ${successCount} orders...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`  Error migrating order ${order.orderNumber}:`, error.message);
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);

    // 3. 검증
    console.log('\n=== Verification ===');

    const finalCptCount = await pool.query(
      `SELECT COUNT(*) FROM custom_posts WHERE cpt_slug = 'order'`
    );

    const sampleOrders = await pool.query(`
      SELECT
        cp.title,
        cp.fields->>'order_total' as total,
        cp.fields->>'order_status' as status
      FROM custom_posts cp
      WHERE cpt_slug = 'order'
      ORDER BY created_at DESC
      LIMIT 5
    `);

    console.log(`\nTotal orders in CPT: ${finalCptCount.rows[0].count}`);
    console.log('\nSample migrated orders:');
    sampleOrders.rows.forEach(order => {
      console.log(`  - ${order.title}: ₩${Number(order.total).toLocaleString()} (${order.status})`);
    });

    // 4. 정리 옵션
    console.log('\n=== Cleanup Options ===');
    console.log('The legacy orders table still exists with all data.');
    console.log('Options:');
    console.log('1. Keep as backup: ALTER TABLE orders RENAME TO orders_backup;');
    console.log('2. Drop if confident: DROP TABLE orders;');
    console.log('3. Create view for compatibility:');
    console.log(`
CREATE OR REPLACE VIEW orders AS
SELECT
  cp.id,
  cp.slug as "orderNumber",
  (cp.fields->>'buyer_id')::uuid as "buyerId",
  cp.fields->>'buyer_name' as "buyerName",
  cp.fields->>'buyer_email' as "buyerEmail",
  cp.fields->'order_items' as items,
  jsonb_build_object(
    'total', (cp.fields->>'order_total')::numeric,
    'subtotal', (cp.fields->>'order_total')::numeric
  ) as summary,
  cp.fields->>'order_status' as status,
  cp.fields->>'payment_status' as "paymentStatus",
  cp.fields->>'payment_method' as "paymentMethod",
  cp.fields->'shipping_address' as "shippingAddress",
  cp.published_at as "orderDate",
  cp.created_at as "createdAt",
  cp.updated_at as "updatedAt"
FROM custom_posts cp
WHERE cp.cpt_slug = 'order';
    `);

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await pool.end();
  }
}

migrateAllOrdersToCPT();