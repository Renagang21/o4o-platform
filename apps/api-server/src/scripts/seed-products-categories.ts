import 'reflect-metadata';
import { AppDataSource } from '../database/connection.js';
import { Category } from '../entities/Category.js';
import { Product, ProductStatus, ProductType } from '../entities/Product.js';
import { Supplier, SupplierStatus } from '../entities/Supplier.js';
import { User } from '../entities/User.js';

// 카테고리 데이터 (루트 카테고리 포함)
const categoriesData = [
  {
    name: '전체상품',
    slug: 'all-products',
    description: '모든 상품 카테고리',
    sortOrder: 0,
    productCount: 0,
    isRoot: true
  },
  {
    name: '미분류',
    slug: 'uncategorized',
    description: '카테고리가 지정되지 않은 상품',
    sortOrder: 1,
    productCount: 5,
    isRoot: false
  },
  {
    name: '건강기능식품',
    slug: 'health-supplements',
    description: '건강기능식품 및 영양제',
    sortOrder: 2,
    productCount: 12,
    isRoot: false
  },
  {
    name: '화장품',
    slug: 'cosmetics',
    description: '화장품 및 뷰티 제품',
    sortOrder: 3,
    productCount: 15,
    isRoot: false
  },
  {
    name: '의료기기',
    slug: 'medical-devices',
    description: '의료기기 및 건강용품',
    sortOrder: 4,
    productCount: 8,
    isRoot: false
  },
  {
    name: '공산품',
    slug: 'consumer-goods',
    description: '일반 공산품 및 생활용품',
    sortOrder: 5,
    productCount: 6,
    isRoot: false
  },
  {
    name: '의약외품',
    slug: 'quasi-drugs',
    description: '의약외품 및 관련 제품',
    sortOrder: 6,
    productCount: 4,
    isRoot: false
  }
];

// 상품명 생성 헬퍼
const productNames = {
  'health-supplements': [
    '오메가3 1000mg', '비타민D 2000IU', '유산균 프로바이오틱스', '콜라겐 펩타이드',
    '마그네슘 500mg', '아연 15mg', '비타민C 1000mg', '종합비타민',
    '루테인 20mg', '밀크씨슬', '글루코사민', '코엔자임Q10'
  ],
  'cosmetics': [
    '히알루론산 세럼', '레티놀 크림', '선크림 SPF50+', '클렌징폼',
    '토너패드', '아이크림', '슬리핑마스크', '비타민C 앰플',
    '페이셜 오일', '수분크림', '에센스', '미스트',
    '립밤', '핸드크림', '바디로션'
  ],
  'medical-devices': [
    '혈압측정기', '체온계', '혈당측정기', '산소포화도 측정기',
    '네뷸라이저', '보청기', '안마기', '온열찜질기'
  ],
  'consumer-goods': [
    '휴대용 선풍기', '가습기', '공기청정기 필터', 'LED 스탠드',
    '무선 이어폰', '보조배터리'
  ],
  'quasi-drugs': [
    '손소독제', '마스크 KF94', '구강청결제', '파스'
  ],
  'uncategorized': [
    '만능 클리너', '다목적 정리함', '실리콘 매트', '휴대용 가방', '멀티툴'
  ]
};

// SKU 코드 매핑
const skuCodes = {
  'uncategorized': 'UNC',
  'health-supplements': 'HEA',
  'cosmetics': 'COS',
  'medical-devices': 'MED',
  'consumer-goods': 'CON',
  'quasi-drugs': 'QUA'
};

// 가격 범위 설정 (카테고리별)
const priceRanges = {
  'health-supplements': { min: 15000, max: 80000 },
  'cosmetics': { min: 10000, max: 120000 },
  'medical-devices': { min: 30000, max: 200000 },
  'consumer-goods': { min: 5000, max: 50000 },
  'quasi-drugs': { min: 3000, max: 30000 },
  'uncategorized': { min: 8000, max: 40000 }
};

// 랜덤 가격 생성
function generateRandomPrice(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// 상품 설명 생성
function generateDescription(productName: string, category: string): string {
  const templates = {
    'health-supplements': `${productName}는 건강한 생활을 위한 필수 영양소를 제공합니다. GMP 인증 시설에서 제조되었으며, 엄격한 품질 관리를 거쳐 생산됩니다.`,
    'cosmetics': `${productName}는 피부 전문가들이 추천하는 제품입니다. 민감한 피부에도 사용 가능하며, 임상 테스트를 완료한 안전한 제품입니다.`,
    'medical-devices': `${productName}는 의료기기 인증을 받은 신뢰할 수 있는 제품입니다. 정확한 측정과 편리한 사용성을 제공합니다.`,
    'consumer-goods': `${productName}는 일상생활에 편의를 제공하는 실용적인 제품입니다. 뛰어난 내구성과 품질을 자랑합니다.`,
    'quasi-drugs': `${productName}는 식약처 인증을 받은 안전한 제품입니다. 효과적이고 안전하게 사용할 수 있습니다.`,
    'uncategorized': `${productName}는 다양한 용도로 활용 가능한 실용적인 제품입니다.`
  };
  return templates[category] || templates['uncategorized'];
}

// 상품 특징 생성
function generateFeatures(category: string): string[] {
  const features = {
    'health-supplements': [
      'GMP 인증 제조시설',
      '고순도 원료 사용',
      '체내 흡수율 최적화',
      '안전성 검증 완료'
    ],
    'cosmetics': [
      '피부 임상 테스트 완료',
      '저자극 포뮬러',
      '파라벤 무첨가',
      '동물실험 미실시'
    ],
    'medical-devices': [
      '의료기기 인증',
      '정확한 측정',
      '간편한 사용법',
      '내구성 우수'
    ],
    'consumer-goods': [
      'KC 안전인증',
      '친환경 소재',
      'A/S 가능',
      '사용 편의성'
    ],
    'quasi-drugs': [
      '식약처 인증',
      '안전성 검증',
      '효과 입증',
      '부작용 최소화'
    ],
    'uncategorized': [
      '다용도 활용',
      '실용적 디자인',
      '품질 보증',
      '합리적 가격'
    ]
  };
  return features[category] || features['uncategorized'];
}

async function seedProductsAndCategories() {
  try {
    console.log('Initializing database connection...');
    await AppDataSource.initialize();
    console.log('Database connected successfully');

    const categoryRepo = AppDataSource.getRepository(Category);
    const productRepo = AppDataSource.getRepository(Product);
    const supplierRepo = AppDataSource.getRepository(Supplier);

    // 기존 공급자 조회
    // status를 먼저 업데이트
    await supplierRepo.update({}, { status: SupplierStatus.APPROVED });

    const suppliers = await supplierRepo.find({
      where: { status: SupplierStatus.APPROVED }
    });

    if (suppliers.length === 0) {
      console.error('No active suppliers found. Please create suppliers first.');
      process.exit(1);
    }

    console.log(`Found ${suppliers.length} active suppliers`);

    // 트랜잭션 시작
    await AppDataSource.manager.transaction(async (transactionalEntityManager) => {
      // 1. 카테고리 생성
      console.log('\n--- Creating Categories ---');
      const createdCategories = [];
      let rootCategory = null;

      for (const catData of categoriesData) {
        // 기존 카테고리 확인
        let category = await transactionalEntityManager.findOne(Category, {
          where: { slug: catData.slug }
        });

        if (!category) {
          const categoryData: any = {
            name: catData.name,
            slug: catData.slug,
            description: catData.description,
            sortOrder: catData.sortOrder,
            isActive: true
          };

          // 루트가 아닌 카테고리는 부모 설정
          if (!catData.isRoot && rootCategory) {
            categoryData.parent = rootCategory;
          }

          category = transactionalEntityManager.create(Category, categoryData);
          category = await transactionalEntityManager.save(Category, category);
          console.log(`Created category: ${category.name}${!catData.isRoot ? ' (child of ' + rootCategory?.name + ')' : ' (root)'}`);
        } else {
          console.log(`Category already exists: ${category.name}`);
        }

        // 루트 카테고리 저장
        if (catData.isRoot) {
          rootCategory = category;
        }

        // 상품이 있는 카테고리만 저장
        if (catData.productCount > 0) {
          createdCategories.push({ ...category, productCount: catData.productCount });
        }
      }

      // 2. 상품 생성
      console.log('\n--- Creating Products ---');
      let totalProductsCreated = 0;

      for (const categoryData of createdCategories) {
        const category = categoryData;
        const productCount = categoryData.productCount;
        const categorySlug = category.slug;
        const skuCode = skuCodes[categorySlug];
        const priceRange = priceRanges[categorySlug];
        const names = productNames[categorySlug];

        console.log(`\nCreating ${productCount} products for ${category.name}...`);

        for (let i = 0; i < productCount; i++) {
          const productNumber = String(i + 1).padStart(3, '0');
          const productName = names[i] || `${category.name} 제품 ${i + 1}`;

          // 랜덤 공급자 선택
          const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];

          // 가격 생성
          const basePrice = generateRandomPrice(priceRange.min, priceRange.max);
          const costPrice = Math.floor(basePrice * 0.6); // 원가는 판매가의 60%

          // 등급별 가격 (할인율 적용)
          const silverPrice = basePrice;
          const goldPrice = Math.floor(basePrice * 0.9); // 10% 할인
          const platinumPrice = Math.floor(basePrice * 0.8); // 20% 할인

          // 파트너 수수료율 랜덤 선택
          const commissionRates = [0, 5, 8, 12];
          const partnerCommissionRate = commissionRates[Math.floor(Math.random() * commissionRates.length)];

          const product = transactionalEntityManager.create(Product, {
            name: productName,
            slug: `${categorySlug}-product-${i + 1}`,
            sku: `SKU-${skuCode}-${productNumber}`,
            description: generateDescription(productName, categorySlug),
            shortDescription: `${productName} - ${category.name}`,

            // 가격 정보
            supplierPrice: costPrice, // 공급가
            recommendedPrice: basePrice, // 권장 판매가
            comparePrice: Math.floor(basePrice * 1.2), // 정가
            tierPricing: {
              silver: silverPrice,
              gold: goldPrice,
              platinum: platinumPrice
            },
            partnerCommissionRate: partnerCommissionRate,

            // 재고 정보
            inventory: Math.floor(Math.random() * 500) + 100,
            lowStockThreshold: 10,
            trackInventory: true,
            allowBackorder: false,

            // 카테고리 및 공급자
            categoryId: category.id,
            supplierId: supplier.id,

            // 상태
            type: ProductType.PHYSICAL,
            status: ProductStatus.ACTIVE,
            isActive: true,

            // 이미지 (플레이스홀더)
            images: {
              main: `https://via.placeholder.com/400x400?text=${encodeURIComponent(productName)}`,
              gallery: [
                `https://via.placeholder.com/400x400?text=${encodeURIComponent(productName)}-1`,
                `https://via.placeholder.com/400x400?text=${encodeURIComponent(productName)}-2`
              ]
            },

            // 메타데이터
            tags: [category.name, '신상품', Math.random() > 0.5 ? '인기상품' : '추천상품'],
            features: generateFeatures(categorySlug),

            // SEO
            seo: {
              title: `${productName} | ${category.name}`,
              description: `${productName} 구매하기. ${category.description}`,
              keywords: [`${productName}`, `${category.name}`, `드롭쉬핑`]
            },

            publishedAt: new Date()
          });

          await transactionalEntityManager.save(Product, product);
          totalProductsCreated++;

          if ((i + 1) % 5 === 0) {
            console.log(`  Created ${i + 1}/${productCount} products`);
          }
        }

        console.log(`✓ Completed ${productCount} products for ${category.name}`);
      }

      console.log(`\n✅ Successfully created ${totalProductsCreated} products across ${createdCategories.length} categories`);
    });

    // 3. 데이터 검증
    console.log('\n--- Verifying Data ---');

    // 카테고리 수 확인
    const categoryCount = await categoryRepo.count();
    console.log(`Total categories: ${categoryCount}`);

    // 상품 수 확인
    const productCount = await productRepo.count();
    console.log(`Total products: ${productCount}`);

    // 카테고리별 상품 수
    const categoriesWithCount = await categoryRepo
      .createQueryBuilder('category')
      .leftJoin('category.products', 'product')
      .select('category.name', 'name')
      .addSelect('COUNT(product.id)', 'productCount')
      .groupBy('category.id')
      .getRawMany();

    console.log('\nProducts per category:');
    categoriesWithCount.forEach(cat => {
      console.log(`  ${cat.name}: ${cat.productCount} products`);
    });

    // 샘플 상품 출력
    const sampleProducts = await productRepo.find({
      take: 3,
      relations: ['category', 'supplier']
    });

    console.log('\n--- Sample Products ---');
    sampleProducts.forEach(product => {
      console.log(`\n${product.name}:`);
      console.log(`  SKU: ${product.sku}`);
      console.log(`  Category: ${product.category?.name}`);
      console.log(`  Supplier: ${product.supplierId}`);
      console.log(`  Price: ₩${product.recommendedPrice?.toLocaleString()}`);
      console.log(`  Tier Pricing: Silver: ₩${product.tierPricing?.silver}, Gold: ₩${product.tierPricing?.gold}, Platinum: ₩${product.tierPricing?.platinum}`);
      console.log(`  Partner Commission: ${product.partnerCommissionRate}%`);
      console.log(`  Stock: ${product.inventory}`);
    });

    console.log('\n✅ Seed data creation completed successfully!');

    await AppDataSource.destroy();

  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
}

// 실행
seedProductsAndCategories();