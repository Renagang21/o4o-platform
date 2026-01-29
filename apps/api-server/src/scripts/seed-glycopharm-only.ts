/**
 * Seed Glycopharm Products Only (Production)
 * Inserts sample products into existing glycopharm_products table
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

const pool = new Pool({
  host: process.env.DB_HOST || '34.64.96.252',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'o4o_platform',
  user: process.env.DB_USERNAME || 'o4o_api',
  password: process.env.DB_PASSWORD,
  ssl: false
});

interface ProductImage {
  url: string;
  alt?: string;
  is_primary: boolean;
  order?: number;
}

function generatePlaceholderImage(productName: string, category: string): ProductImage[] {
  const text = encodeURIComponent(productName.substring(0, 15));
  const bgColor = 'FFE4E1';
  const fgColor = '8B0000';

  return [{
    url: `https://placehold.co/600x400/${bgColor}/${fgColor}/png?text=${text}`,
    alt: productName,
    is_primary: true,
    order: 1
  }];
}

const glycopharmProducts = [
  {
    name: '후시딘 연고',
    sku: 'GLY-PHR-001',
    category: 'pharmaceutical',
    description: '상처 치료용 항생제 연고',
    price: 8500,
    sale_price: 7650,
    stock_quantity: 50,
    manufacturer: '동화약품',
    status: 'active',
    is_featured: true,
    sort_order: 1
  },
  {
    name: '박테리신 살균소독제',
    sku: 'GLY-PHR-002',
    category: 'pharmaceutical',
    description: '넓은 범위의 살균 소독제',
    price: 12000,
    sale_price: 10800,
    stock_quantity: 40,
    manufacturer: '한국존슨앤드존슨',
    status: 'active',
    is_featured: true,
    sort_order: 2
  },
  {
    name: '마데카솔 연고',
    sku: 'GLY-PHR-003',
    category: 'pharmaceutical',
    description: '상처 치유 촉진 연고',
    price: 9000,
    sale_price: null,
    stock_quantity: 60,
    manufacturer: '동국제약',
    status: 'active',
    is_featured: false,
    sort_order: 3
  },
  {
    name: '겐타마이신 안연고',
    sku: 'GLY-PHR-004',
    category: 'pharmaceutical',
    description: '눈 감염 치료 항생제',
    price: 6500,
    sale_price: null,
    stock_quantity: 30,
    manufacturer: '일동제약',
    status: 'active',
    is_featured: false,
    sort_order: 4
  },
  {
    name: '포비돈 소독약',
    sku: 'GLY-PHR-005',
    category: 'pharmaceutical',
    description: '의료용 피부 소독약',
    price: 5500,
    sale_price: 4950,
    stock_quantity: 80,
    manufacturer: '한국화이자',
    status: 'active',
    is_featured: false,
    sort_order: 5
  },
  {
    name: '밴드 멸균밴드 혼합형',
    sku: 'GLY-PHR-006',
    category: 'device',
    description: '다양한 크기의 멸균 밴드 세트',
    price: 3500,
    sale_price: null,
    stock_quantity: 100,
    manufacturer: '3M',
    status: 'active',
    is_featured: false,
    sort_order: 6
  },
  {
    name: '히루도이드 크림',
    sku: 'GLY-PHR-007',
    category: 'pharmaceutical',
    description: '흉터 및 켈로이드 치료',
    price: 15000,
    sale_price: 13500,
    stock_quantity: 25,
    manufacturer: '한국메디칼',
    status: 'active',
    is_featured: true,
    sort_order: 7
  },
  {
    name: '써모미터 비접촉 체온계',
    sku: 'GLY-DEV-001',
    category: 'device',
    description: '적외선 비접촉식 체온계',
    price: 45000,
    sale_price: null,
    stock_quantity: 15,
    manufacturer: 'Braun',
    status: 'active',
    is_featured: false,
    sort_order: 8
  },
  {
    name: '듀오덤 하이드로콜로이드 드레싱',
    sku: 'GLY-DEV-002',
    category: 'device',
    description: '습윤 환경 상처 드레싱',
    price: 18000,
    sale_price: 16200,
    stock_quantity: 35,
    manufacturer: 'ConvaTec',
    status: 'active',
    is_featured: false,
    sort_order: 9
  },
  {
    name: '뮤피로신 연고',
    sku: 'GLY-PHR-008',
    category: 'pharmaceutical',
    description: '피부 감염 항생제 연고',
    price: 7200,
    sale_price: null,
    stock_quantity: 45,
    manufacturer: '글락소스미스클라인',
    status: 'active',
    is_featured: false,
    sort_order: 10
  }
];

async function seedProducts() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting Glycopharm product seed...\n');

    let successCount = 0;
    let failCount = 0;

    for (const product of glycopharmProducts) {
      try {
        const images = generatePlaceholderImage(product.name, product.category);

        await client.query(`
          INSERT INTO glycopharm_products (
            id,
            name,
            sku,
            category,
            description,
            price,
            sale_price,
            stock_quantity,
            manufacturer,
            status,
            is_featured,
            sort_order,
            images,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
          ON CONFLICT (sku) DO NOTHING
        `, [
          uuidv4(),
          product.name,
          product.sku,
          product.category,
          product.description,
          product.price,
          product.sale_price,
          product.stock_quantity,
          product.manufacturer,
          product.status,
          product.is_featured,
          product.sort_order,
          JSON.stringify(images)
        ]);

        console.log(`✓ ${product.name}`);
        successCount++;
      } catch (error: any) {
        console.error(`✗ Failed to insert ${product.name}:`, error.message);
        failCount++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Success: ${successCount}`);
    console.log(`   Failed: ${failCount}`);
    console.log(`\n✅ Seed completed!`);

  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedProducts();
