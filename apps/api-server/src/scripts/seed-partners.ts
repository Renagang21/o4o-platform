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

// 랜덤 추천 코드 생성
function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 파트너 프로필 생성
function generatePartnerProfile(type: string) {
  const profiles: any = {
    influencer: {
      bio: '뷰티 & 라이프스타일 인플루언서입니다. 정직한 리뷰와 유용한 정보를 공유합니다.',
      website: 'https://blog.example.com',
      socialMedia: {
        youtube: 'https://youtube.com/@influencer',
        instagram: 'https://instagram.com/influencer',
        blog: 'https://blog.naver.com/influencer'
      },
      audience: {
        size: Math.floor(Math.random() * 50000 + 10000),
        demographics: '20-40대 여성 위주',
        interests: ['뷰티', '건강', '라이프스타일']
      },
      marketingChannels: ['youtube', 'instagram', 'blog']
    },
    blogger: {
      bio: '건강 정보와 제품 리뷰를 전문으로 하는 블로거입니다.',
      website: 'https://healthblog.example.com',
      socialMedia: {
        blog: 'https://blog.naver.com/healthblogger',
        instagram: 'https://instagram.com/healthblogger'
      },
      audience: {
        size: Math.floor(Math.random() * 20000 + 5000),
        demographics: '30-50대 건강 관심층',
        interests: ['건강', '웰빙', '건강기능식품']
      },
      marketingChannels: ['blog', 'instagram']
    },
    affiliate: {
      bio: '온라인 쇼핑몰 운영 및 제휴 마케팅 전문가입니다.',
      website: 'https://shopping.example.com',
      socialMedia: {
        facebook: 'https://facebook.com/shoppingmall'
      },
      audience: {
        size: Math.floor(Math.random() * 30000 + 8000),
        demographics: '전 연령층',
        interests: ['쇼핑', '할인정보', '신제품']
      },
      marketingChannels: ['website', 'email', 'facebook']
    }
  };

  const types = Object.keys(profiles);
  return profiles[type] || profiles[types[Math.floor(Math.random() * types.length)]];
}

// 파트너 메트릭 생성
function generateMetrics(tier: string) {
  const baseMetrics: any = {
    bronze: { clicks: 100, orders: 5, revenue: 500000, commission: 25000 },
    silver: { clicks: 500, orders: 30, revenue: 3000000, commission: 180000 },
    gold: { clicks: 2000, orders: 120, revenue: 15000000, commission: 1200000 },
    platinum: { clicks: 5000, orders: 300, revenue: 50000000, commission: 5000000 }
  };

  const base = baseMetrics[tier] || baseMetrics.bronze;
  const variance = 0.3; // ±30% 변동

  return {
    totalClicks: Math.floor(base.clicks * (1 + (Math.random() - 0.5) * variance)),
    totalOrders: Math.floor(base.orders * (1 + (Math.random() - 0.5) * variance)),
    totalRevenue: Math.floor(base.revenue * (1 + (Math.random() - 0.5) * variance)),
    totalCommission: Math.floor(base.commission * (1 + (Math.random() - 0.5) * variance)),
    conversionRate: (base.orders / base.clicks * 100).toFixed(2),
    averageOrderValue: Math.floor(base.revenue / base.orders),
    clicksThisMonth: Math.floor(base.clicks * 0.2),
    ordersThisMonth: Math.floor(base.orders * 0.2),
    revenueThisMonth: Math.floor(base.revenue * 0.2),
    commissionThisMonth: Math.floor(base.commission * 0.2)
  };
}

// 지급 정보 생성
function generatePayoutInfo() {
  const methods = ['bank', 'paypal'];
  const method = methods[Math.floor(Math.random() * methods.length)];

  if (method === 'bank') {
    const banks = ['국민은행', '신한은행', '우리은행', '하나은행', '농협은행'];
    return {
      method: 'bank',
      bankName: banks[Math.floor(Math.random() * banks.length)],
      accountNumber: `${Math.floor(Math.random() * 900000000000 + 100000000000)}`,
      accountHolder: '홍길동',
      currency: 'KRW'
    };
  } else {
    return {
      method: 'paypal',
      paypalEmail: `partner${Math.floor(Math.random() * 1000)}@example.com`,
      currency: 'USD'
    };
  }
}

async function seedPartners() {
  try {
    console.log('Starting partner data seed...\n');

    // 1. 기존 사용자와 판매자 조회
    console.log('=== Step 1: Getting Users and Sellers ===');

    const usersResult = await pool.query(`
      SELECT u.id, u.email, u.name, u.role
      FROM users u
      LEFT JOIN partners p ON p."userId" = u.id
      LEFT JOIN sellers s ON s."userId" = u.id
      WHERE p.id IS NULL
        AND s.id IS NULL
        AND u.role IN ('customer', 'user')
      LIMIT 10
    `);

    if (usersResult.rows.length === 0) {
      console.error('No available users for partner conversion');
      return;
    }

    console.log(`Found ${usersResult.rows.length} users available for partner conversion`);

    const sellersResult = await pool.query(`
      SELECT s.id, s.tier, u.name, u.email
      FROM sellers s
      JOIN users u ON s."userId" = u.id
      WHERE s.status = 'active'
    `);

    if (sellersResult.rows.length === 0) {
      console.error('No active sellers found');
      return;
    }

    console.log(`Found ${sellersResult.rows.length} active sellers\n`);

    // 2. 파트너 생성
    console.log('=== Step 2: Creating Partners ===');

    const tiers = ['bronze', 'silver', 'gold', 'platinum'];
    const statuses = ['active', 'active', 'active', 'pending']; // 75% active
    const partnerTypes = ['influencer', 'blogger', 'affiliate'];

    let createdCount = 0;

    for (let i = 0; i < Math.min(8, usersResult.rows.length); i++) {
      const user = usersResult.rows[i];
      const seller = sellersResult.rows[Math.floor(Math.random() * sellersResult.rows.length)];
      const tier = tiers[Math.floor(Math.random() * tiers.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const type = partnerTypes[Math.floor(Math.random() * partnerTypes.length)];

      const referralCode = generateReferralCode();
      const profile = generatePartnerProfile(type);
      const metrics = generateMetrics(tier);
      const payoutInfo = generatePayoutInfo();

      // 잔액 계산
      const totalEarnings = metrics.totalCommission;
      const paidOut = Math.floor(totalEarnings * 0.7); // 70% 지급 완료
      const availableBalance = Math.floor((totalEarnings - paidOut) * 0.6); // 나머지의 60%는 출금 가능
      const pendingBalance = totalEarnings - paidOut - availableBalance; // 나머지는 대기 중

      try {
        // partners 테이블에 삽입
        const partnerResult = await pool.query(`
          INSERT INTO partners (
            id, "userId", "sellerId", status, tier, "isActive",
            "referralCode", "referralLink", profile, metrics,
            "totalEarnings", "availableBalance", "pendingBalance", "paidOut",
            "payoutInfo", "minPayout", "lastPayoutDate", "nextPayoutDate",
            "notificationSettings", "agreementAcceptedAt",
            "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5,
            $6, $7, $8::json, $9::json,
            $10, $11, $12, $13,
            $14::json, 50000, $15, $16,
            '{"email": true, "sms": false}'::json, NOW(),
            NOW(), NOW()
          ) RETURNING id
        `, [
          user.id,
          seller.id,
          status,
          tier,
          status === 'active',
          referralCode,
          `https://neture.co.kr/ref/${referralCode}`,
          JSON.stringify(profile),
          JSON.stringify(metrics),
          totalEarnings,
          availableBalance,
          pendingBalance,
          paidOut,
          JSON.stringify(payoutInfo),
          paidOut > 0 ? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) : null, // 30일 전
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30일 후
        ]);

        // partner_profiles 테이블에도 삽입 (있는 경우)
        await pool.query(`
          INSERT INTO partner_profiles (
            id, "partnerId", bio, website, "socialLinks",
            "marketingChannels", "audienceSize", "audienceDemographics",
            specialties, achievements, "mediaKit", preferences,
            verified, "verifiedAt", rating, "reviewCount",
            "createdAt", "updatedAt"
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4::json,
            $5::simple_array, $6, $7,
            $8::simple_array, NULL, NULL, '{"language": "ko"}'::json,
            $9, $10, $11, $12,
            NOW(), NOW()
          ) ON CONFLICT DO NOTHING
        `, [
          partnerResult.rows[0].id,
          profile.bio,
          profile.website,
          JSON.stringify(profile.socialMedia || {}),
          profile.marketingChannels || [],
          profile.audience?.size || 0,
          profile.audience?.demographics || '',
          profile.audience?.interests || [],
          tier === 'gold' || tier === 'platinum',
          tier === 'gold' || tier === 'platinum' ? new Date() : null,
          4.5 + Math.random() * 0.5, // 4.5~5.0 평점
          Math.floor(Math.random() * 50 + 10) // 10~60개 리뷰
        ]);

        createdCount++;
        console.log(`Created partner: ${user.email} (${tier}, ${status}) -> Seller: ${seller.name}`);

        // 사용자 role 업데이트 (role_assignments SSOT)
        await pool.query(`
          INSERT INTO role_assignments (id, user_id, role, is_active, valid_from, assigned_at, scope_type)
          VALUES (gen_random_uuid(), $1, 'neture:partner', true, NOW(), NOW(), 'global')
          ON CONFLICT ON CONSTRAINT "unique_active_role_per_user" DO NOTHING
        `, [user.id]);

      } catch (error) {
        console.error(`Failed to create partner for ${user.email}:`, error.message);
      }
    }

    console.log(`\n✅ Created ${createdCount} partners`);

    // 3. 파트너 커미션 데이터 생성
    console.log('\n=== Step 3: Creating Partner Commissions ===');

    const partnersResult = await pool.query(`
      SELECT p.id, p."referralCode", p.tier
      FROM partners p
      WHERE p.status = 'active'
    `);

    let commissionCount = 0;

    for (const partner of partnersResult.rows) {
      // 각 파트너당 5-15개의 커미션 기록 생성
      const recordCount = Math.floor(Math.random() * 11 + 5);

      for (let i = 0; i < recordCount; i++) {
        const orderAmount = Math.floor(Math.random() * 500000 + 50000);
        const commissionRate = partner.tier === 'platinum' ? 12 :
                               partner.tier === 'gold' ? 10 :
                               partner.tier === 'silver' ? 8 : 5;
        const commissionAmount = Math.floor(orderAmount * commissionRate / 100);
        const status = Math.random() > 0.1 ? 'confirmed' : 'pending';

        const orderDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000); // 최근 90일

        try {
          await pool.query(`
            INSERT INTO partner_commissions (
              id, "partnerId", "orderId", "orderAmount",
              "commissionRate", "commissionAmount", status,
              "clickId", "ipAddress", "userAgent",
              "referralSource", "conversionTime", "confirmedAt",
              "paidAt", "payoutId", notes,
              "createdAt", "updatedAt"
            ) VALUES (
              gen_random_uuid(), $1, gen_random_uuid(), $2,
              $3, $4, $5,
              $6, '127.0.0.1', 'Mozilla/5.0',
              'direct', $7, $8,
              $9, NULL, NULL,
              $7, NOW()
            )
          `, [
            partner.id,
            orderAmount,
            commissionRate,
            commissionAmount,
            status,
            `CLICK-${partner.referralCode}-${Date.now()}`,
            orderDate,
            status === 'confirmed' ? new Date(orderDate.getTime() + 7 * 24 * 60 * 60 * 1000) : null,
            status === 'confirmed' && Math.random() > 0.3 ? new Date(orderDate.getTime() + 30 * 24 * 60 * 60 * 1000) : null
          ]);

          commissionCount++;
        } catch (error) {
          console.error('Failed to create commission:', error.message);
        }
      }
    }

    console.log(`✅ Created ${commissionCount} commission records`);

    // 4. 통계 확인
    console.log('\n=== Step 4: Verification ===');

    const stats = await pool.query(`
      SELECT
        COUNT(DISTINCT p.id) as total_partners,
        COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_partners,
        COUNT(DISTINCT p.tier) as unique_tiers,
        SUM(p."totalEarnings") as total_earnings,
        AVG(p."totalEarnings") as avg_earnings
      FROM partners p
    `);

    const commissionStats = await pool.query(`
      SELECT
        COUNT(*) as total_commissions,
        SUM("commissionAmount") as total_commission_amount,
        AVG("commissionAmount") as avg_commission,
        COUNT(DISTINCT "partnerId") as partners_with_commissions
      FROM partner_commissions
    `);

    console.log('\n📊 Partner Statistics:');
    console.log(`  Total Partners: ${stats.rows[0].total_partners}`);
    console.log(`  Active Partners: ${stats.rows[0].active_partners}`);
    console.log(`  Total Earnings: ₩${Number(stats.rows[0].total_earnings).toLocaleString()}`);
    console.log(`  Average Earnings: ₩${Number(stats.rows[0].avg_earnings).toLocaleString()}`);

    console.log('\n💰 Commission Statistics:');
    console.log(`  Total Commissions: ${commissionStats.rows[0].total_commissions}`);
    console.log(`  Total Amount: ₩${Number(commissionStats.rows[0].total_commission_amount).toLocaleString()}`);
    console.log(`  Average Commission: ₩${Number(commissionStats.rows[0].avg_commission).toLocaleString()}`);

    // Top 3 파트너
    const topPartners = await pool.query(`
      SELECT
        u.name,
        p.tier,
        p."totalEarnings",
        p."referralCode"
      FROM partners p
      JOIN users u ON p."userId" = u.id
      ORDER BY p."totalEarnings" DESC
      LIMIT 3
    `);

    console.log('\n🏆 Top 3 Partners:');
    topPartners.rows.forEach((partner, idx) => {
      console.log(`  ${idx + 1}. ${partner.name} (${partner.tier}): ₩${Number(partner.totalEarnings).toLocaleString()} [${partner.referralCode}]`);
    });

    console.log('\n✅ Partner data seeding completed successfully!');

  } catch (error) {
    console.error('Error seeding partner data:', error);
  } finally {
    await pool.end();
  }
}

seedPartners();