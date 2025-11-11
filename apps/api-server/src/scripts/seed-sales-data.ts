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

// 판매 가격 생성 (공급가 기반으로 마진 추가)
function calculateSellerPrice(supplierPrice: number, tier: string): number {
  const marginRates: any = {
    bronze: 1.4,    // 40% 마진
    silver: 1.35,   // 35% 마진
    gold: 1.3,      // 30% 마진
    platinum: 1.25  // 25% 마진
  };
  return Math.floor(supplierPrice * (marginRates[tier] || 1.35));
}

// 주문 번호 생성
function generateOrderNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ORD-${year}${month}${day}-${random}`;
}

// 랜덤 날짜 생성 (최근 3개월)
function randomDate(): Date {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 3);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// 랜덤 주소 생성
function generateAddress() {
  const cities = ['서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시'];
  const districts = ['강남구', '서초구', '송파구', '강동구', '마포구'];
  const streets = ['테헤란로', '강남대로', '올림픽로', '한강대로', '도산대로'];

  return {
    recipientName: `고객${Math.floor(Math.random() * 100)}`,
    phone: `010-${Math.floor(Math.random() * 9000 + 1000)}-${Math.floor(Math.random() * 9000 + 1000)}`,
    email: `customer${Math.floor(Math.random() * 100)}@test.com`,
    zipCode: String(Math.floor(Math.random() * 90000 + 10000)),
    address: `${cities[Math.floor(Math.random() * cities.length)]} ${districts[Math.floor(Math.random() * districts.length)]} ${streets[Math.floor(Math.random() * streets.length)]} ${Math.floor(Math.random() * 500 + 1)}`,
    detailAddress: `${Math.floor(Math.random() * 20 + 1)}층 ${Math.floor(Math.random() * 10 + 101)}호`,
    city: cities[Math.floor(Math.random() * cities.length)],
    country: '대한민국'
  };
}

async function seedSalesData() {
  try {
    console.log('Starting sales data seed...\n');

    // 1. 기존 사용자 중 일부를 판매자로 만들기
    console.log('=== Step 1: Creating Sellers from existing Users ===');

    // 일반 사용자 조회
    const usersResult = await pool.query(`
      SELECT id, email, name
      FROM users
      WHERE role IN ('customer', 'user')
      LIMIT 5
    `);

    if (usersResult.rows.length === 0) {
      console.error('No users found to convert to sellers');
      return;
    }

    const sellerTiers = ['bronze', 'silver', 'gold', 'platinum'];
    const createdSellers = [];

    // 사용자를 판매자로 전환
    for (let i = 0; i < Math.min(3, usersResult.rows.length); i++) {
      const user = usersResult.rows[i];
      const tier = sellerTiers[Math.floor(Math.random() * sellerTiers.length)];

      // 판매자 존재 확인
      const existingSeller = await pool.query(
        `SELECT id FROM sellers WHERE "userId" = $1`,
        [user.id]
      );

      if (existingSeller.rows.length === 0) {
        const branding = {
          storeName: `${user.name || 'Seller'} Store`,
          description: 'Welcome to our store',
          logo: null
        };

        const sellerResult = await pool.query(`
          INSERT INTO sellers (
            id, "userId", tier, "isActive", status,
            "storeSlug", branding,
            "productCount", "totalRevenue", "averageRating",
            "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), $1, $2, true, 'active',
            $3, $4::json,
            0, 0, 0, NOW(), NOW()
          ) RETURNING id, "userId", tier
        `, [user.id, tier, `seller-${user.id.substring(0, 8)}`, JSON.stringify(branding)]);

        createdSellers.push(sellerResult.rows[0]);
        console.log(`Created seller: ${user.email} (${tier})`);

        // 사용자 role 업데이트
        await pool.query(
          `UPDATE users SET role = 'seller' WHERE id = $1`,
          [user.id]
        );
      } else {
        createdSellers.push(existingSeller.rows[0]);
        console.log(`Seller already exists: ${user.email}`);
      }
    }

    console.log(`\nTotal sellers: ${createdSellers.length}\n`);

    // 2. 공급자의 상품들 조회
    console.log('=== Step 2: Getting Products from Suppliers ===');

    const productsResult = await pool.query(`
      SELECT
        p.id, p.name, p.sku, p."supplierId",
        p."supplierPrice", p."recommendedPrice",
        p."tierPricing", p."partnerCommissionRate",
        p."categoryId"
      FROM products p
      WHERE p.status = 'active'
      LIMIT 30
    `);

    console.log(`Found ${productsResult.rows.length} products\n`);

    // 3. 판매자별로 상품 등록 (seller_products)
    console.log('=== Step 3: Creating Seller Products ===');

    let totalSellerProducts = 0;
    const sellerProductMap = new Map();

    for (const seller of createdSellers) {
      // 각 판매자가 10-15개 상품을 판매
      const productCount = Math.floor(Math.random() * 6) + 10;
      const shuffled = [...productsResult.rows].sort(() => 0.5 - Math.random());
      const selectedProducts = shuffled.slice(0, Math.min(productCount, shuffled.length));

      for (const product of selectedProducts) {
        // seller_products 테이블이 없으므로 임시 맵에 저장
        const sellerPrice = calculateSellerPrice(product.supplierPrice, seller.tier || 'silver');
        const profit = sellerPrice - product.supplierPrice - (sellerPrice * product.partnerCommissionRate / 100);
        const profitMargin = (profit / sellerPrice) * 100;

        const sellerProductKey = `${seller.id}_${product.id}`;
        sellerProductMap.set(sellerProductKey, {
          sellerId: seller.id,
          productId: product.id,
          sellerPrice: sellerPrice,
          costPrice: product.supplierPrice,
          profit: profit,
          profitMargin: profitMargin,
          product: product
        });

        totalSellerProducts++;
      }
    }

    console.log(`Created ${totalSellerProducts} seller-product mappings\n`);

    // 4. 주문 데이터 생성
    console.log('=== Step 4: Generating Order History ===');

    // 구매자 조회
    const buyersResult = await pool.query(`
      SELECT id, email, name
      FROM users
      WHERE role IN ('customer', 'user')
      LIMIT 10
    `);

    let totalOrders = 0;
    const orderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    const paymentMethods = ['card', 'transfer', 'kakao_pay', 'naver_pay'];

    // 각 판매자별로 주문 생성
    for (const seller of createdSellers) {
      // 판매자당 30-50개 주문 생성
      const orderCount = Math.floor(Math.random() * 21) + 30;

      for (let i = 0; i < orderCount; i++) {
        // 랜덤 구매자 선택
        const buyer = buyersResult.rows[Math.floor(Math.random() * buyersResult.rows.length)];
        if (!buyer) continue;

        // 해당 판매자의 상품 중 1-3개 선택
        const sellerProducts = Array.from(sellerProductMap.entries())
          .filter(([key, value]) => value.sellerId === seller.id)
          .map(([key, value]) => value);

        if (sellerProducts.length === 0) continue;

        const itemCount = Math.min(Math.floor(Math.random() * 3) + 1, sellerProducts.length);
        const selectedItems = [...sellerProducts].sort(() => 0.5 - Math.random()).slice(0, itemCount);

        // 주문 아이템 생성
        const items = selectedItems.map(sp => {
          const quantity = Math.floor(Math.random() * 3) + 1;
          return {
            productId: sp.productId,
            productName: sp.product.name,
            productSku: sp.product.sku,
            sellerId: sp.sellerId,
            quantity: quantity,
            unitPrice: sp.sellerPrice,
            totalPrice: sp.sellerPrice * quantity,
            supplierPrice: sp.costPrice,
            commission: sp.sellerPrice * sp.product.partnerCommissionRate / 100
          };
        });

        // 주문 요약 계산
        const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
        const shipping = subtotal >= 50000 ? 0 : 3000; // 5만원 이상 무료배송
        const total = subtotal + shipping;

        const summary = {
          subtotal: subtotal,
          discount: 0,
          shipping: shipping,
          tax: 0,
          total: total
        };

        // 주문 상태 결정 (최근 주문일수록 pending/processing, 오래된 주문일수록 delivered)
        const orderDate = randomDate();
        const daysSinceOrder = Math.floor((new Date().getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
        let status = 'delivered';
        if (daysSinceOrder < 7) {
          status = orderStatuses[Math.floor(Math.random() * 3)]; // pending, confirmed, processing
        } else if (daysSinceOrder < 14) {
          status = Math.random() > 0.3 ? 'shipped' : 'delivered';
        }

        const paymentStatus = status === 'cancelled' ? 'refunded' : 'completed';

        // 주문 생성
        const orderResult = await pool.query(`
          INSERT INTO orders (
            id, "orderNumber", "buyerId", "buyerName", "buyerEmail",
            items, summary, status, "paymentStatus", "paymentMethod",
            "shippingAddress", "billingAddress",
            "orderDate", "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4,
            $5::jsonb, $6::jsonb, $7, $8, $9,
            $10::jsonb, $10::jsonb,
            $11, $11, NOW()
          ) RETURNING id
        `, [
          generateOrderNumber(),
          buyer.id,
          buyer.name || buyer.email,
          buyer.email,
          JSON.stringify(items),
          JSON.stringify(summary),
          status,
          paymentStatus,
          paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          JSON.stringify(generateAddress()),
          orderDate
        ]);

        totalOrders++;

        if (totalOrders % 10 === 0) {
          console.log(`Created ${totalOrders} orders...`);
        }
      }
    }

    console.log(`\n✅ Sales data seeding completed!`);
    console.log(`   - Created ${createdSellers.length} sellers`);
    console.log(`   - Created ${totalSellerProducts} seller-product mappings`);
    console.log(`   - Created ${totalOrders} orders\n`);

    // 5. 통계 확인
    console.log('=== Step 5: Verifying Data ===');

    const statsResult = await pool.query(`
      SELECT
        COUNT(DISTINCT o."buyerId") as unique_buyers,
        COUNT(*) as total_orders,
        SUM((o.summary->>'total')::numeric) as total_revenue,
        AVG((o.summary->>'total')::numeric) as avg_order_value,
        MIN(o."orderDate") as first_order,
        MAX(o."orderDate") as last_order
      FROM orders o
    `);

    const stats = statsResult.rows[0];
    console.log('\n📊 Sales Statistics:');
    console.log(`   Unique Buyers: ${stats.unique_buyers}`);
    console.log(`   Total Orders: ${stats.total_orders}`);
    console.log(`   Total Revenue: ₩${Number(stats.total_revenue).toLocaleString()}`);
    console.log(`   Average Order Value: ₩${Number(stats.avg_order_value).toLocaleString()}`);
    console.log(`   Date Range: ${stats.first_order?.toLocaleDateString()} ~ ${stats.last_order?.toLocaleDateString()}`);

    // 주문 상태별 통계
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM orders
      GROUP BY status
      ORDER BY count DESC
    `);

    console.log('\n📦 Orders by Status:');
    statusResult.rows.forEach(row => {
      console.log(`   ${row.status}: ${row.count} orders`);
    });

    // Top 5 베스트셀러
    const bestSellersResult = await pool.query(`
      SELECT
        item->>'productName' as product_name,
        SUM((item->>'quantity')::int) as total_sold,
        SUM((item->>'totalPrice')::numeric) as total_revenue
      FROM orders o,
           jsonb_array_elements(o.items) as item
      GROUP BY item->>'productName'
      ORDER BY total_sold DESC
      LIMIT 5
    `);

    console.log('\n🏆 Top 5 Best Sellers:');
    bestSellersResult.rows.forEach((row, idx) => {
      console.log(`   ${idx + 1}. ${row.product_name}: ${row.total_sold}개 판매 (₩${Number(row.total_revenue).toLocaleString()})`);
    });

  } catch (error) {
    console.error('Error seeding sales data:', error);
  } finally {
    await pool.end();
  }
}

seedSalesData();