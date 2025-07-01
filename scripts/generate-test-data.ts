#!/usr/bin/env tsx

/**
 * O4O Platform v0.1.0 테스트 데이터 생성 스크립트
 * 
 * 이 스크립트는 다음 데이터를 생성합니다:
 * - 테스트 사용자 계정 (4가지 역할)
 * - 제품 카테고리
 * - 샘플 제품 (다양한 가격대)
 * - 디지털 사이니지 콘텐츠
 * - 기본 CMS 페이지
 */

import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../services/api-server/src/database/connection';
import { User, UserRole, UserStatus, BusinessType } from '../services/api-server/src/entities/User';
import { Product, ProductStatus, ProductType } from '../services/api-server/src/entities/Product';
import { Category } from '../services/api-server/src/entities/Category';
import { SignageContent } from '../services/api-server/src/entities/SignageContent';
import { Store } from '../services/api-server/src/entities/Store';
import { Page } from '../services/api-server/src/entities/Page';

const SALT_ROUNDS = 10;

interface TestUserData {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  businessInfo?: any;
}

const TEST_USERS: TestUserData[] = [
  {
    email: 'test@customer.com',
    password: 'pw123',
    name: '테스트 고객',
    role: UserRole.CUSTOMER
  },
  {
    email: 'test@business.com',
    password: 'pw123',
    name: '테스트 비즈니스',
    role: UserRole.BUSINESS,
    businessInfo: {
      businessName: '테스트 약국',
      businessType: BusinessType.PHARMACY,
      businessNumber: '123-45-67890',
      address: '서울시 강남구 테스트로 123',
      phone: '02-1234-5678'
    }
  },
  {
    email: 'test@affiliate.com',
    password: 'pw123',
    name: '테스트 어필리에이트',
    role: UserRole.AFFILIATE
  },
  {
    email: 'test@admin.com',
    password: 'pw123',
    name: '테스트 관리자',
    role: UserRole.ADMIN
  }
];

const TEST_CATEGORIES = [
  {
    name: '건강기능식품',
    slug: 'health-supplements',
    description: '비타민, 미네랄, 프로바이오틱스 등 건강기능식품'
  },
  {
    name: '스킨케어',
    slug: 'skincare',
    description: '자연성분 기반 스킨케어 제품'
  },
  {
    name: '헬스케어 디바이스',
    slug: 'healthcare-devices',
    description: '혈압계, 혈당측정기 등 헬스케어 기기'
  },
  {
    name: '뷰티 & 코스메틱',
    slug: 'beauty-cosmetics',
    description: '메이크업, 코스메틱 제품'
  }
];

const TEST_PRODUCTS = [
  {
    name: '프리미엄 비타민 D3',
    slug: 'premium-vitamin-d3',
    description: '고농도 비타민 D3 1000IU, 면역력 강화와 뼈 건강에 도움',
    shortDescription: '면역력 강화 비타민 D3',
    sku: 'VIT-D3-1000',
    retailPrice: 29000,
    wholesalePrice: 23000,
    affiliatePrice: 25000,
    stockQuantity: 100,
    categorySlug: 'health-supplements',
    tags: ['비타민', '면역력', '뼈건강'],
    featured: true
  },
  {
    name: '히알루론산 세럼',
    slug: 'hyaluronic-acid-serum',
    description: '고분자 히알루론산으로 깊은 수분 공급, 민감성 피부에도 안전',
    shortDescription: '수분 충전 히알루론산 세럼',
    sku: 'HYA-SER-30ML',
    retailPrice: 45000,
    wholesalePrice: 36000,
    affiliatePrice: 40000,
    stockQuantity: 75,
    categorySlug: 'skincare',
    tags: ['히알루론산', '수분', '민감성피부'],
    featured: true
  },
  {
    name: '스마트 혈압계',
    slug: 'smart-blood-pressure-monitor',
    description: 'Bluetooth 연동 스마트 혈압계, 앱으로 기록 관리',
    shortDescription: 'Bluetooth 스마트 혈압계',
    sku: 'BP-SMART-001',
    retailPrice: 89000,
    wholesalePrice: 75000,
    affiliatePrice: 80000,
    stockQuantity: 30,
    categorySlug: 'healthcare-devices',
    tags: ['혈압계', '스마트', 'bluetooth'],
    featured: false
  },
  {
    name: '내추럴 립밤',
    slug: 'natural-lip-balm',
    description: '천연 시어버터와 코코넛오일로 만든 보습 립밤',
    shortDescription: '천연 보습 립밤',
    sku: 'LIP-NAT-4G',
    retailPrice: 12000,
    wholesalePrice: 9000,
    affiliatePrice: 10000,
    stockQuantity: 200,
    categorySlug: 'beauty-cosmetics',
    tags: ['천연', '립밤', '보습'],
    featured: false
  },
  {
    name: '프로바이오틱스 30캡슐',
    slug: 'probiotics-30caps',
    description: '100억 유산균 프로바이오틱스, 장 건강 개선',
    shortDescription: '장 건강 프로바이오틱스',
    sku: 'PROB-30CAP',
    retailPrice: 35000,
    wholesalePrice: 28000,
    affiliatePrice: 31000,
    stockQuantity: 120,
    categorySlug: 'health-supplements',
    tags: ['프로바이오틱스', '유산균', '장건강'],
    featured: true
  }
];

const TEST_SIGNAGE_CONTENT = [
  {
    title: '신제품 프로모션',
    description: '이번 달 신제품 프로모션 영상',
    type: 'video',
    videoId: 'dQw4w9WgXcQ', // YouTube 샘플 ID
    duration: 180,
    isPublic: true
  },
  {
    title: '건강 정보 슬라이드',
    description: '비타민 D의 중요성에 대한 정보',
    type: 'image',
    videoId: '',
    duration: 60,
    isPublic: true
  }
];

const TEST_PAGES = [
  {
    title: '회사 소개',
    slug: 'about-us',
    content: '<h1>O4O Platform 소개</h1><p>건강과 웰빙을 위한 통합 플랫폼입니다.</p>',
    status: 'published'
  },
  {
    title: '개인정보처리방침',
    slug: 'privacy-policy',
    content: '<h1>개인정보처리방침</h1><p>개인정보 보호에 관한 정책입니다.</p>',
    status: 'published'
  }
];

async function createTestUsers(): Promise<User[]> {
  console.log('👥 Creating test users...');
  
  const userRepository = AppDataSource.getRepository(User);
  const createdUsers: User[] = [];

  for (const userData of TEST_USERS) {
    // 기존 사용자 확인
    const existingUser = await userRepository.findOne({
      where: { email: userData.email }
    });

    if (existingUser) {
      console.log(`   ⚠️  User ${userData.email} already exists, skipping...`);
      createdUsers.push(existingUser);
      continue;
    }

    // 패스워드 해싱
    const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);

    // 사용자 생성
    const user = userRepository.create({
      email: userData.email,
      password: hashedPassword,
      name: userData.name,
      role: userData.role,
      status: UserStatus.APPROVED,
      businessInfo: userData.businessInfo,
      approvedAt: new Date()
    });

    const savedUser = await userRepository.save(user);
    console.log(`   ✅ Created user: ${userData.email} (${userData.role})`);
    createdUsers.push(savedUser);
  }

  return createdUsers;
}

async function createTestCategories(): Promise<Category[]> {
  console.log('📁 Creating test categories...');
  
  const categoryRepository = AppDataSource.getRepository(Category);
  const createdCategories: Category[] = [];

  for (const categoryData of TEST_CATEGORIES) {
    // 기존 카테고리 확인
    const existingCategory = await categoryRepository.findOne({
      where: { slug: categoryData.slug }
    });

    if (existingCategory) {
      console.log(`   ⚠️  Category ${categoryData.slug} already exists, skipping...`);
      createdCategories.push(existingCategory);
      continue;
    }

    const category = categoryRepository.create({
      name: categoryData.name,
      slug: categoryData.slug,
      description: categoryData.description,
      isActive: true,
      sortOrder: createdCategories.length
    });

    const savedCategory = await categoryRepository.save(category);
    console.log(`   ✅ Created category: ${categoryData.name}`);
    createdCategories.push(savedCategory);
  }

  return createdCategories;
}

async function createTestProducts(adminUser: User, categories: Category[]): Promise<Product[]> {
  console.log('🛍️  Creating test products...');
  
  const productRepository = AppDataSource.getRepository(Product);
  const createdProducts: Product[] = [];

  for (const productData of TEST_PRODUCTS) {
    // 기존 제품 확인
    const existingProduct = await productRepository.findOne({
      where: { slug: productData.slug }
    });

    if (existingProduct) {
      console.log(`   ⚠️  Product ${productData.slug} already exists, skipping...`);
      createdProducts.push(existingProduct);
      continue;
    }

    // 카테고리 찾기
    const category = categories.find(cat => cat.slug === productData.categorySlug);
    
    const product = productRepository.create({
      name: productData.name,
      slug: productData.slug,
      description: productData.description,
      shortDescription: productData.shortDescription,
      sku: productData.sku,
      retailPrice: productData.retailPrice,
      wholesalePrice: productData.wholesalePrice,
      affiliatePrice: productData.affiliatePrice,
      stockQuantity: productData.stockQuantity,
      manageStock: true,
      categoryId: category?.id,
      tags: productData.tags,
      status: ProductStatus.ACTIVE,
      type: ProductType.PHYSICAL,
      featured: productData.featured,
      requiresShipping: true,
      createdBy: adminUser.id,
      metaTitle: productData.name,
      metaDescription: productData.shortDescription
    });

    const savedProduct = await productRepository.save(product);
    console.log(`   ✅ Created product: ${productData.name} (₩${productData.retailPrice.toLocaleString()})`);
    createdProducts.push(savedProduct);
  }

  return createdProducts;
}

async function createTestSignageContent(adminUser: User): Promise<SignageContent[]> {
  console.log('📺 Creating test signage content...');
  
  const signageRepository = AppDataSource.getRepository(SignageContent);
  const createdContent: SignageContent[] = [];

  for (const contentData of TEST_SIGNAGE_CONTENT) {
    // 기존 콘텐츠 확인
    const existingContent = await signageRepository.findOne({
      where: { title: contentData.title }
    });

    if (existingContent) {
      console.log(`   ⚠️  Signage content "${contentData.title}" already exists, skipping...`);
      createdContent.push(existingContent);
      continue;
    }

    const content = signageRepository.create({
      title: contentData.title,
      description: contentData.description,
      type: contentData.type,
      videoId: contentData.videoId,
      duration: contentData.duration,
      status: 'approved',
      isPublic: contentData.isPublic,
      createdBy: adminUser.id,
      approvedBy: adminUser.id
    });

    const savedContent = await signageRepository.save(content);
    console.log(`   ✅ Created signage content: ${contentData.title}`);
    createdContent.push(savedContent);
  }

  return createdContent;
}

async function createTestStore(adminUser: User): Promise<Store> {
  console.log('🏪 Creating test store...');
  
  const storeRepository = AppDataSource.getRepository(Store);
  
  // 기존 스토어 확인
  const existingStore = await storeRepository.findOne({
    where: { name: '테스트 매장' }
  });

  if (existingStore) {
    console.log(`   ⚠️  Store already exists, skipping...`);
    return existingStore;
  }

  const store = storeRepository.create({
    name: '테스트 매장',
    managerId: adminUser.id,
    displaySettings: {
      resolution: '1920x1080',
      orientation: 'landscape',
      brightness: 80
    },
    status: 'active'
  });

  const savedStore = await storeRepository.save(store);
  console.log(`   ✅ Created store: 테스트 매장`);
  
  return savedStore;
}

async function createTestPages(): Promise<Page[]> {
  console.log('📄 Creating test pages...');
  
  const pageRepository = AppDataSource.getRepository(Page);
  const createdPages: Page[] = [];

  for (const pageData of TEST_PAGES) {
    // 기존 페이지 확인
    const existingPage = await pageRepository.findOne({
      where: { slug: pageData.slug }
    });

    if (existingPage) {
      console.log(`   ⚠️  Page ${pageData.slug} already exists, skipping...`);
      createdPages.push(existingPage);
      continue;
    }

    const page = pageRepository.create({
      title: pageData.title,
      slug: pageData.slug,
      content: pageData.content,
      status: pageData.status
    });

    const savedPage = await pageRepository.save(page);
    console.log(`   ✅ Created page: ${pageData.title}`);
    createdPages.push(savedPage);
  }

  return createdPages;
}

async function printTestAccountInfo(users: User[]) {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 O4O Platform v0.1.0 테스트 계정 정보');
  console.log('='.repeat(60));
  
  users.forEach(user => {
    console.log(`\n👤 ${user.role.toUpperCase()}`);
    console.log(`   이메일: ${user.email}`);
    console.log(`   비밀번호: pw123`);
    console.log(`   이름: ${user.name}`);
    
    if (user.businessInfo) {
      console.log(`   사업장: ${user.businessInfo.businessName} (${user.businessInfo.businessType})`);
    }
  });

  console.log('\n📍 테스트 URL:');
  console.log('   메인 사이트: http://localhost:3011');
  console.log('   로그인: http://localhost:3011/login');
  console.log('   드롭시핑: http://localhost:3011/dropshipping');
  console.log('   관리자: http://localhost:3011/admin');
  
  console.log('\n🔗 API 엔드포인트:');
  console.log('   API 서버: http://localhost:4000');
  console.log('   로그인: POST /api/auth/login');
  console.log('   제품 목록: GET /api/ecommerce/products');
  
  console.log('\n' + '='.repeat(60));
}

async function main() {
  try {
    console.log('🚀 O4O Platform v0.1.0 테스트 데이터 생성 시작');
    console.log('='.repeat(60));

    // 데이터베이스 연결
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected successfully');

    // 테스트 데이터 생성
    const users = await createTestUsers();
    const adminUser = users.find(u => u.role === UserRole.ADMIN)!;
    
    const categories = await createTestCategories();
    const products = await createTestProducts(adminUser, categories);
    const signageContent = await createTestSignageContent(adminUser);
    const store = await createTestStore(adminUser);
    const pages = await createTestPages();

    // 결과 출력
    console.log('\n✅ 테스트 데이터 생성 완료!');
    console.log(`   사용자: ${users.length}명`);
    console.log(`   카테고리: ${categories.length}개`);
    console.log(`   제품: ${products.length}개`);
    console.log(`   사이니지 콘텐츠: ${signageContent.length}개`);
    console.log(`   매장: 1개`);
    console.log(`   페이지: ${pages.length}개`);

    // 테스트 계정 정보 출력
    await printTestAccountInfo(users);

    console.log('\n🎉 모든 테스트 데이터가 성공적으로 생성되었습니다!');
    
  } catch (error) {
    console.error('❌ Error generating test data:', error);
    process.exit(1);
  } finally {
    // 데이터베이스 연결 종료
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('👋 Database connection closed');
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  main();
}

export { main as generateTestData };