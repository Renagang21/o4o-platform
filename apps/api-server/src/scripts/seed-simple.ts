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

// 카테고리 데이터
const categories = [
  { name: '전체상품', slug: 'all-products', description: '모든 상품 카테고리', parent_slug: null },
  { name: '미분류', slug: 'uncategorized', description: '카테고리가 지정되지 않은 상품', parent_slug: 'all-products' },
  { name: '건강기능식품', slug: 'health-supplements', description: '건강기능식품 및 영양제', parent_slug: 'all-products' },
  { name: '화장품', slug: 'cosmetics', description: '화장품 및 뷰티 제품', parent_slug: 'all-products' },
  { name: '의료기기', slug: 'medical-devices', description: '의료기기 및 건강용품', parent_slug: 'all-products' },
  { name: '공산품', slug: 'consumer-goods', description: '일반 공산품 및 생활용품', parent_slug: 'all-products' },
  { name: '의약외품', slug: 'quasi-drugs', description: '의약외품 및 관련 제품', parent_slug: 'all-products' }
];

// 상품 데이터 생성기
function generateProducts(categoryId: string, categorySlug: string, count: number, supplierId: string) {
  const products = [];
  const baseNames: any = {
    'health-supplements': ['오메가3', '비타민D', '유산균', '콜라겐', '마그네슘'],
    'cosmetics': ['세럼', '크림', '선크림', '클렌징폼', '토너'],
    'medical-devices': ['혈압계', '체온계', '혈당계', '산소측정기', '네뷸라이저'],
    'consumer-goods': ['선풍기', '가습기', '공기청정기필터', 'LED스탠드', '이어폰'],
    'quasi-drugs': ['손소독제', '마스크', '구강청결제', '파스', '연고'],
    'uncategorized': ['만능클리너', '정리함', '실리콘매트', '휴대용가방', '멀티툴']
  };

  const names = baseNames[categorySlug] || baseNames['uncategorized'];

  for (let i = 0; i < count && i < names.length; i++) {
    const price = Math.floor(Math.random() * 50000 + 10000);
    const product = {
      supplierId: supplierId,
      categoryId: categoryId,
      name: names[i],
      description: `${names[i]} 상품입니다.`,
      sku: `SKU-${categorySlug.substring(0,3).toUpperCase()}-${String(i+1).padStart(3,'0')}`,
      slug: `${categorySlug}-product-${i+1}`,
      supplierPrice: Math.floor(price * 0.6),
      recommendedPrice: price,
      partnerCommissionRate: [0, 5, 8, 12][Math.floor(Math.random() * 4)],
      inventory: Math.floor(Math.random() * 500 + 100),
      tierPricing: {
        silver: price,
        gold: Math.floor(price * 0.9),
        platinum: Math.floor(price * 0.8)
      },
      status: 'active',
      isActive: true
    };
    products.push(product);
  }

  return products;
}

async function seed() {
  try {
    console.log('Starting seed...');

    // 1. Get first supplier
    const supplierResult = await pool.query(`
      SELECT id FROM suppliers
      WHERE status = 'approved' OR status = 'active'
      LIMIT 1
    `);

    if (supplierResult.rows.length === 0) {
      // Update existing suppliers to approved
      await pool.query(`UPDATE suppliers SET status = 'approved'`);
      const retryResult = await pool.query(`SELECT id FROM suppliers LIMIT 1`);
      if (retryResult.rows.length === 0) {
        console.error('No suppliers found');
        return;
      }
      supplierResult.rows = retryResult.rows;
    }

    const supplierId = supplierResult.rows[0].id;
    console.log('Using supplier:', supplierId);

    // 2. Create categories (using raw SQL to avoid TypeORM issues)
    let rootCategoryId = null;

    for (const cat of categories) {
      // Check if exists
      const existingCat = await pool.query(
        `SELECT id FROM categories WHERE slug = $1`,
        [cat.slug]
      );

      if (existingCat.rows.length === 0) {
        const insertResult = await pool.query(`
          INSERT INTO categories (id, name, slug, description, "sortOrder", "isActive", "createdAt", "updatedAt")
          VALUES (gen_random_uuid(), $1, $2, $3, 0, true, NOW(), NOW())
          RETURNING id
        `, [cat.name, cat.slug, cat.description]);

        const categoryId = insertResult.rows[0].id;
        console.log(`Created category: ${cat.name}`);

        if (cat.slug === 'all-products') {
          rootCategoryId = categoryId;
        }
      } else {
        console.log(`Category exists: ${cat.name}`);
        if (cat.slug === 'all-products') {
          rootCategoryId = existingCat.rows[0].id;
        }
      }
    }

    // 3. Create products for each category
    const productCounts: any = {
      'uncategorized': 5,
      'health-supplements': 5,
      'cosmetics': 5,
      'medical-devices': 5,
      'consumer-goods': 5,
      'quasi-drugs': 4
    };

    let totalProducts = 0;

    for (const [slug, count] of Object.entries(productCounts)) {
      const catResult = await pool.query(
        `SELECT id FROM categories WHERE slug = $1`,
        [slug]
      );

      if (catResult.rows.length > 0) {
        const categoryId = catResult.rows[0].id;
        const products = generateProducts(categoryId, slug, count as number, supplierId);

        for (const product of products) {
          // Check if SKU exists
          const existingProduct = await pool.query(
            `SELECT id FROM products WHERE sku = $1`,
            [product.sku]
          );

          if (existingProduct.rows.length === 0) {
            await pool.query(`
              INSERT INTO products (
                id, "supplierId", "categoryId", name, description, sku, slug,
                "supplierPrice", "recommendedPrice", "partnerCommissionRate",
                inventory, "tierPricing", status, "isActive", type,
                "trackInventory", "allowBackorder", "hasVariants",
                "createdAt", "updatedAt"
              ) VALUES (
                gen_random_uuid(), $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10, $11, $12, $13, 'physical',
                true, false, false, NOW(), NOW()
              )
            `, [
              product.supplierId, product.categoryId, product.name,
              product.description, product.sku, product.slug,
              product.supplierPrice, product.recommendedPrice,
              product.partnerCommissionRate, product.inventory,
              JSON.stringify(product.tierPricing), product.status, product.isActive
            ]);

            totalProducts++;
            console.log(`Created product: ${product.name}`);
          } else {
            console.log(`Product exists: ${product.sku}`);
          }
        }
      }
    }

    console.log(`\nSeeding completed! Created ${totalProducts} products.`);

    // Verify data
    const categoryCount = await pool.query(`SELECT COUNT(*) FROM categories`);
    const productCount = await pool.query(`SELECT COUNT(*) FROM products`);

    console.log(`\nTotal categories: ${categoryCount.rows[0].count}`);
    console.log(`Total products: ${productCount.rows[0].count}`);

  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await pool.end();
  }
}

seed();