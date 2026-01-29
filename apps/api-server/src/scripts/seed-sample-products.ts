/**
 * Sample Product Dataset Seed Script
 *
 * WO-SAMPLE-PRODUCT-DATASET-V1
 * Purpose: Populate sample product data for operational validation
 * - 5 suppliers (S1-S5)
 * - ~65-70 products total
 * - Tests new Product DB Constitution v1 fields
 */

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

// ============================================================================
// Supplier Definitions
// ============================================================================

const SUPPLIERS = {
  S1: {
    name: '메디팜코리아',
    type: 'pharmaceutical',
    description: '의약외품 전문 공급사'
  },
  S2: {
    name: '헬스앤뉴트리션',
    type: 'health_supplement',
    description: '건강기능식품 전문 공급사'
  },
  S3: {
    name: '더마케어코스메틱',
    type: 'derma_cosmetic',
    description: '더마코스메틱 전문 공급사 (약국 유통)'
  },
  S4: {
    name: '라이프헬스케어',
    type: 'health_lifestyle',
    description: '헬스/라이프스타일 공통 상품'
  },
  S5: {
    name: '이노베이션랩',
    type: 'pilot_brand',
    description: '신규 브랜드 파일럿'
  }
};

// ============================================================================
// S1: Pharmaceutical Products (의약외품 - Glycopharm)
// ============================================================================

const S1_PRODUCTS = [
  {
    name: '후시딘 연고',
    subtitle: '항생제 연고 (의약외품)',
    sku: 'MED-S1-001',
    category: 'accessory',
    description: '<p>세균 감염에 의한 피부 질환 치료제</p>',
    short_description: '세균성 피부 감염 치료',
    price: 8500,
    sale_price: 7650,
    stock_quantity: 200,
    manufacturer: '동화약품',
    origin_country: '대한민국',
    legal_category: '의약외품',
    certification_ids: ['품목허가번호: 199900012'],
    usage_info: '1일 2-3회 환부에 적당량 도포',
    caution_info: '눈, 입에 들어가지 않도록 주의. 임산부는 사용 전 의사와 상담',
    barcodes: ['8801234567890'],
    status: 'active',
    is_featured: true
  },
  {
    name: '박테리신 살균소독제',
    subtitle: '손 살균 스프레이',
    sku: 'MED-S1-002',
    category: 'accessory',
    description: '<p>에탄올 70% 함유 손 소독제</p>',
    short_description: '휴대용 손 소독 스프레이',
    price: 5000,
    stock_quantity: 500,
    manufacturer: '유한양행',
    origin_country: '대한민국',
    legal_category: '의약외품',
    usage_info: '손에 적당량 분사 후 문지르기',
    caution_info: '화기 근처 사용 금지. 어린이 손이 닿지 않는 곳 보관',
    status: 'active',
    is_featured: false
  },
  {
    name: '마데카솔 연고',
    subtitle: '상처 치료 연고',
    sku: 'MED-S1-003',
    category: 'accessory',
    description: '<p>센텔라아시아티카 추출물 함유 상처 치료제</p>',
    short_description: '피부 재생 촉진 연고',
    price: 6500,
    sale_price: 5850,
    stock_quantity: 300,
    manufacturer: '동국제약',
    origin_country: '대한민국',
    legal_category: '의약외품',
    certification_ids: ['품목허가번호: 198800034'],
    usage_info: '1일 2-3회 환부에 얇게 도포',
    barcodes: ['8801234567891'],
    status: 'active',
    is_featured: true
  },
  {
    name: '겐타마이신 안연고',
    subtitle: '눈 감염 치료',
    sku: 'MED-S1-004',
    category: 'accessory',
    description: '<p>세균성 결막염 치료용 안과용 연고</p>',
    price: 7200,
    stock_quantity: 150,
    manufacturer: '삼일제약',
    origin_country: '대한민국',
    legal_category: '전문의약품',
    certification_ids: ['품목허가번호: 199200056'],
    caution_info: '의사 처방 필요. 임의 사용 금지',
    status: 'draft',
    is_featured: false
  },
  {
    name: '포비돈 소독약',
    subtitle: '상처 소독액',
    sku: 'MED-S1-005',
    category: 'accessory',
    description: '<p>요오드 함유 피부 소독제</p>',
    short_description: '상처 부위 소독용',
    price: 4500,
    stock_quantity: 400,
    manufacturer: '한국콜마',
    origin_country: '대한민국',
    legal_category: '의약외품',
    usage_info: '상처 부위에 도포 후 자연 건조',
    status: 'active',
    is_featured: false
  },
  {
    name: '밴드 멸균밴드 혼합형',
    subtitle: '다양한 크기 밴드 세트',
    sku: 'MED-S1-006',
    category: 'accessory',
    description: '<p>멸균 처리된 일회용 밴드 (20매입)</p>',
    price: 3500,
    stock_quantity: 800,
    manufacturer: '동인당',
    origin_country: '대한민국',
    legal_category: '의료기기',
    status: 'active',
    is_featured: false
  },
  {
    name: '히루도이드 크림',
    subtitle: '보습 및 흉터 개선',
    sku: 'MED-S1-007',
    category: 'accessory',
    description: '<p>헤파린나트륨 함유 피부 보습제</p>',
    short_description: '건조한 피부 보습 및 흉터 관리',
    price: 12000,
    sale_price: 10800,
    stock_quantity: 250,
    manufacturer: '한독약품',
    origin_country: '대한민국',
    legal_category: '전문의약품',
    certification_ids: ['품목허가번호: 199400078'],
    caution_info: '의사 처방 필요',
    status: 'active',
    is_featured: true
  },
  {
    name: '써모미터 비접촉 체온계',
    subtitle: '적외선 체온 측정기',
    sku: 'MED-S1-008',
    category: 'meter',
    description: '<p>비접촉식 적외선 체온계</p>',
    price: 45000,
    sale_price: 39000,
    stock_quantity: 100,
    manufacturer: '바이오랜드',
    origin_country: '중국',
    legal_category: '의료기기',
    certification_ids: ['의료기기허가번호: 제허18-1234호'],
    usage_info: '이마 중앙에서 3-5cm 거리에서 측정',
    status: 'active',
    is_featured: false
  },
  {
    name: '듀오덤 하이드로콜로이드 드레싱',
    subtitle: '습윤 밴드 (상처 치유)',
    sku: 'MED-S1-009',
    category: 'accessory',
    description: '<p>습윤환경 유지 상처 드레싱</p>',
    short_description: '빠른 상처 치유를 돕는 습윤밴드',
    price: 15000,
    stock_quantity: 180,
    manufacturer: '컨바텍',
    origin_country: '미국',
    legal_category: '의료기기',
    usage_info: '상처 부위 크기에 맞게 잘라 붙이기',
    caution_info: '감염된 상처에는 사용 금지',
    status: 'active',
    is_featured: false
  },
  {
    name: '뮤피로신 연고',
    subtitle: '피부 항생제',
    sku: 'MED-S1-010',
    category: 'accessory',
    description: '<p>세균 감염 치료용 항생제 연고</p>',
    price: 9500,
    stock_quantity: 220,
    manufacturer: 'GSK',
    origin_country: '영국',
    legal_category: '전문의약품',
    certification_ids: ['품목허가번호: 199700089'],
    caution_info: '의사 처방 필요. 장기 사용 금지',
    status: 'draft',
    is_featured: false
  }
];

// ============================================================================
// S2: Health Supplements (건강기능식품 - Neture)
// ============================================================================

const S2_PRODUCTS = [
  {
    name: '멀티비타민 미네랄 종합영양제',
    subtitle: '하루 1정으로 영양 보충',
    sku: 'HLT-S2-001',
    category: 'healthcare',
    description: '비타민 A, B, C, D, E와 주요 미네랄을 균형있게 배합한 종합 영양제',
    short_description: '13가지 비타민 & 미네랄',
    base_price: 28000,
    sale_price: 24000,
    stock: 500,
    manufacturer: '종근당건강',
    origin_country: '대한민국',
    legal_category: '건강기능식품',
    certification_ids: ['식품의약품안전처 고시 제2021-12호'],
    usage_info: '1일 1회, 1회 1정을 물과 함께 섭취',
    caution_info: '과량 섭취 시 설사, 복통 발생 가능. 의약품 복용 시 전문가 상담',
    barcodes: ['8809012345001'],
    status: 'active',
    is_featured: true
  },
  {
    name: '프로바이오틱스 10억 유산균',
    subtitle: '장 건강 케어',
    sku: 'HLT-S2-002',
    category: 'healthcare',
    description: '19종 복합 유산균 100억 CFU',
    short_description: '19종 프로바이오틱스 복합균',
    base_price: 35000,
    sale_price: 29000,
    stock: 600,
    manufacturer: '일동제약',
    origin_country: '대한민국',
    legal_category: '건강기능식품',
    certification_ids: ['건기식 제2020-34호'],
    usage_info: '1일 1회, 1회 1포를 물과 함께 섭취',
    caution_info: '냉장 보관 권장. 개봉 후 빠른 시일 내 섭취',
    barcodes: ['8809012345002'],
    status: 'active',
    is_featured: true
  },
  {
    name: '오메가3 EPA+DHA 고함량',
    subtitle: '혈행 개선 도움',
    sku: 'HLT-S2-003',
    category: 'healthcare',
    description: 'EPA+DHA 1,000mg 함유 rTG 오메가3',
    short_description: '고농도 rTG 오메가3',
    base_price: 42000,
    sale_price: 36000,
    stock: 400,
    manufacturer: 'GC녹십자',
    origin_country: '대한민국',
    legal_category: '건강기능식품',
    certification_ids: ['건기식 제2019-89호'],
    usage_info: '1일 1회, 1회 2캡슐을 식후 섭취',
    caution_info: '혈액 응고 저하제 복용자는 전문가 상담 필요',
    status: 'active',
    is_featured: false
  },
  {
    name: '루테인 지아잔틴 눈 영양제',
    subtitle: '눈 건강 지키기',
    sku: 'HLT-S2-004',
    category: 'healthcare',
    description: '루테인 20mg + 지아잔틴 4mg 함유',
    short_description: '눈 황반 색소 밀도 유지',
    base_price: 38000,
    stock: 350,
    manufacturer: '대웅제약',
    origin_country: '대한민국',
    legal_category: '건강기능식품',
    usage_info: '1일 1회, 1회 1캡슐 섭취',
    status: 'active',
    is_featured: false
  },
  {
    name: '밀크씨슬 간 건강',
    subtitle: '간 기능 개선 도움',
    sku: 'HLT-S2-005',
    category: 'healthcare',
    description: '실리마린 130mg 함유 밀크씨슬 추출물',
    short_description: '간 건강 기능성 원료',
    base_price: 32000,
    sale_price: 27000,
    stock: 450,
    manufacturer: '한미양행',
    origin_country: '대한민국',
    legal_category: '건강기능식품',
    certification_ids: ['건기식 제2018-67호'],
    usage_info: '1일 2회, 1회 1정을 식후 섭취',
    caution_info: '간 질환 약물 복용자는 의사와 상담',
    status: 'active',
    is_featured: false
  },
  {
    name: '비타민D 2000IU',
    subtitle: '뼈 건강 & 면역력',
    sku: 'HLT-S2-006',
    category: 'healthcare',
    description: '비타민D 2000IU 고함량',
    base_price: 18000,
    sale_price: 15000,
    stock: 700,
    manufacturer: '유한양행',
    origin_country: '대한민국',
    legal_category: '건강기능식품',
    usage_info: '1일 1회, 1캡슐 섭취',
    status: 'active',
    is_featured: false
  },
  {
    name: '홍삼진액 농축액',
    subtitle: '면역력 증진',
    sku: 'HLT-S2-007',
    category: 'healthcare',
    description: '6년근 고려홍삼 농축액 (진세노사이드 함유)',
    short_description: '면역력 증진, 피로 개선',
    base_price: 55000,
    sale_price: 48000,
    stock: 250,
    manufacturer: '정관장',
    origin_country: '대한민국',
    legal_category: '건강기능식품',
    certification_ids: ['건기식 제2017-45호'],
    usage_info: '1일 1회, 1포(20ml)를 그대로 또는 물에 희석하여 섭취',
    caution_info: '어린이, 임산부, 수유부는 섭취 전 전문가 상담',
    status: 'active',
    is_featured: true
  },
  {
    name: '콜라겐 저분자 피쉬 콜라겐',
    subtitle: '피부 탄력 관리',
    sku: 'HLT-S2-008',
    category: 'beauty',
    description: '저분자 피쉬 콜라겐 펩타이드 5,000mg',
    short_description: '피부 보습 및 탄력 개선',
    base_price: 45000,
    sale_price: 38000,
    stock: 300,
    manufacturer: '뉴트리원',
    origin_country: '대한민국',
    legal_category: '건강기능식품',
    usage_info: '1일 1회, 1포를 물 또는 음료에 타서 섭취',
    status: 'active',
    is_featured: false
  },
  {
    name: '마그네슘 산화마그네슘',
    subtitle: '근육·신경 기능',
    sku: 'HLT-S2-009',
    category: 'healthcare',
    description: '고함량 산화마그네슘 500mg',
    base_price: 22000,
    stock: 500,
    manufacturer: '한국오츠카',
    origin_country: '대한민국',
    legal_category: '건강기능식품',
    usage_info: '1일 1회, 1정 섭취',
    caution_info: '신장 질환자는 섭취 전 의사 상담',
    status: 'active',
    is_featured: false
  },
  {
    name: '아르기닌 L-아르기닌 5000',
    subtitle: '활력 에너지',
    sku: 'HLT-S2-010',
    category: 'healthcare',
    description: 'L-아르기닌 5,000mg 고함량',
    short_description: '운동 후 활력 보충',
    base_price: 35000,
    sale_price: 30000,
    stock: 350,
    manufacturer: '뉴트리코어',
    origin_country: '대한민국',
    legal_category: '건강기능식품',
    usage_info: '1일 1회, 1포를 물과 함께 섭취',
    status: 'active',
    is_featured: false
  },
  {
    name: '크릴오일 남극 크릴',
    subtitle: '인지질 오메가3',
    sku: 'HLT-S2-011',
    category: 'healthcare',
    description: '남극 크릴 추출 인지질 오메가3',
    short_description: '흡수율 높은 인지질형',
    base_price: 58000,
    sale_price: 52000,
    stock: 200,
    manufacturer: '뉴트리디데이',
    origin_country: '대한민국',
    legal_category: '건강기능식품',
    certification_ids: ['건기식 제2020-112호'],
    usage_info: '1일 2회, 1회 2캡슐 섭취',
    status: 'active',
    is_featured: true
  },
  {
    name: '코엔자임Q10 유비퀴놀',
    subtitle: '항산화 & 에너지',
    sku: 'HLT-S2-012',
    category: 'healthcare',
    description: '활성형 유비퀴놀 CoQ10 100mg',
    base_price: 48000,
    stock: 280,
    manufacturer: '내츄럴플러스',
    origin_country: '대한민국',
    legal_category: '건강기능식품',
    usage_info: '1일 1회, 1캡슐 섭취',
    status: 'active',
    is_featured: false
  }
];

// ============================================================================
// S3: Derma Cosmetics (더마코스메틱 - Cosmetics Service)
// ============================================================================

// Note: Cosmetics products need brand_id and line_id
// For seed data, we'll create minimal brand/line records first

const S3_PRODUCTS_DATA = [
  {
    name: '세라마이드 진정 크림',
    subtitle: '민감성 피부 보습 장벽 케어',
    description: '<p>세라마이드 5% 함유 진정 크림</p>',
    short_description: '손상된 피부 장벽 회복',
    base_price: 35000,
    sale_price: 28000,
    manufacturer: '더마케어코스메틱',
    origin_country: '대한민국',
    legal_category: '화장품',
    ingredients: ['세라마이드NP', '센텔라아시아티카추출물', '판테놀', '나이아신아마이드'],
    usage_info: '세안 후 적당량을 얼굴 전체에 부드럽게 펴 발라줍니다',
    caution_info: '눈에 들어갔을 경우 즉시 씻어내고, 이상 발생 시 사용 중지',
    sku: 'COS-S3-001',
    status: 'published',
    is_featured: true
  },
  {
    name: '히알루론산 수분 세럼',
    subtitle: '5겹 히알루론산 집중 보습',
    description: '<p>저분자~고분자 히알루론산 5단계 배합</p>',
    short_description: '피부 깊숙이 수분 공급',
    base_price: 42000,
    sale_price: 36000,
    manufacturer: '더마케어코스메틱',
    origin_country: '대한민국',
    legal_category: '화장품',
    ingredients: ['히알루론산나트륨', '베타글루칸', '트레할로스'],
    usage_info: '토너 후 2-3방울을 얼굴에 골고루 펴 발라줍니다',
    sku: 'COS-S3-002',
    barcodes: ['8801234500001'],
    status: 'published',
    is_featured: true
  },
  {
    name: '약산성 저자극 클렌징 폼',
    subtitle: 'pH 5.5 약산성 세안제',
    description: '<p>피부와 같은 약산성으로 자극 최소화</p>',
    short_description: '민감성 피부 순한 세안',
    base_price: 18000,
    manufacturer: '더마케어코스메틱',
    origin_country: '대한민국',
    legal_category: '화장품',
    ingredients: ['코코일글루타민산나트륨', '베타인', '알란토인'],
    usage_info: '적당량을 덜어 거품을 낸 후 얼굴을 마사지하듯 세안',
    caution_info: '눈에 들어가지 않도록 주의',
    sku: 'COS-S3-003',
    status: 'published',
    is_featured: false
  },
  {
    name: '나이아신아마이드 미백 에센스',
    subtitle: '피부 톤 개선 미백 기능성',
    description: '<p>식약처 인정 미백 기능성 원료 5% 함유</p>',
    short_description: '기미, 잡티 완화',
    base_price: 48000,
    sale_price: 42000,
    manufacturer: '더마케어코스메틱',
    origin_country: '대한민국',
    legal_category: '기능성화장품',
    certification_ids: ['기능성화장품 심사필 제2021-001호'],
    ingredients: ['나이아신아마이드', '알부틴', '비타민C유도체'],
    usage_info: '토너 후 얼굴 전체에 골고루 펴 발라줍니다',
    caution_info: '햇빛 노출 전 자외선차단제 사용 권장',
    sku: 'COS-S3-004',
    status: 'published',
    is_featured: true
  },
  {
    name: '레티놀 0.1% 주름 개선 세럼',
    subtitle: '주름 개선 기능성',
    description: '<p>레티놀 0.1% 함유 안티에이징 세럼</p>',
    short_description: '탄력 & 주름 케어',
    base_price: 55000,
    sale_price: 48000,
    manufacturer: '더마케어코스메틱',
    origin_country: '대한민국',
    legal_category: '기능성화장품',
    certification_ids: ['기능성화장품 심사필 제2021-002호'],
    ingredients: ['레티놀', '토코페롤', '아데노신'],
    usage_info: '저녁 세안 후 소량을 얼굴에 펴 발라줍니다. 처음 사용 시 2-3일 간격으로 사용',
    caution_info: '레티놀 초보자는 저농도부터 시작 권장. 임산부 사용 금지',
    sku: 'COS-S3-005',
    status: 'published',
    is_featured: true
  },
  {
    name: '센텔라 진정 토너',
    subtitle: '예민한 피부 진정 케어',
    description: '<p>센텔라아시아티카 추출물 80% 함유</p>',
    short_description: '피부 진정 & 수분 공급',
    base_price: 25000,
    sale_price: 22000,
    manufacturer: '더마케어코스메틱',
    origin_country: '대한민국',
    legal_category: '화장품',
    ingredients: ['센텔라아시아티카추출물', '판테놀', '알란토인'],
    usage_info: '세안 후 화장솜에 적셔 피부결을 따라 닦아내거나 손으로 가볍게 두드려 흡수',
    sku: 'COS-S3-006',
    status: 'published',
    is_featured: false
  },
  {
    name: '무기자차 선크림 SPF50+ PA++++',
    subtitle: '백탁 없는 산뜻한 자외선 차단',
    description: '<p>징크옥사이드, 티타늄디옥사이드 무기자차</p>',
    short_description: '민감성 피부 순한 자외선 차단',
    base_price: 28000,
    manufacturer: '더마케어코스메틱',
    origin_country: '대한민국',
    legal_category: '기능성화장품',
    certification_ids: ['기능성화장품 심사필 제2020-089호'],
    ingredients: ['징크옥사이드', '티타늄디옥사이드', '센텔라추출물'],
    usage_info: '외출 30분 전 얼굴 전체에 골고루 펴 바르고, 2-3시간마다 덧발라줍니다',
    caution_info: '눈 주위는 피해서 사용',
    sku: 'COS-S3-007',
    status: 'published',
    is_featured: false
  },
  {
    name: '아토피 케어 로션',
    subtitle: '아토피 피부 보습 관리',
    description: '<p>피부장벽 강화 성분 복합 배합</p>',
    short_description: '건조하고 예민한 피부',
    base_price: 32000,
    sale_price: 27000,
    manufacturer: '더마케어코스메틱',
    origin_country: '대한민국',
    legal_category: '화장품',
    ingredients: ['세라마이드NP', '콜레스테롤', '지방산', '오트밀추출물'],
    usage_info: '샤워 직후 물기가 남아있을 때 바르면 효과적',
    sku: 'COS-S3-008',
    barcodes: ['8801234500002'],
    status: 'published',
    is_featured: false
  },
  {
    name: '티트리 진정 앰플',
    subtitle: '트러블 진정 & 피지 케어',
    description: '<p>티트리 오일 5% 함유 트러블 케어</p>',
    short_description: '여드름성 피부 진정',
    base_price: 38000,
    sale_price: 33000,
    manufacturer: '더마케어코스메틱',
    origin_country: '대한민국',
    legal_category: '화장품',
    ingredients: ['티트리오일', '살리실산', '센텔라추출물'],
    usage_info: '토너 후 트러블 부위에 집중 발라줍니다',
    sku: 'COS-S3-009',
    status: 'published',
    is_featured: false
  },
  {
    name: 'AHA BHA 각질 제거 토너',
    subtitle: '죽은 각질 부드럽게 제거',
    description: '<p>AHA 2% + BHA 1% 복합 배합</p>',
    short_description: '매끄러운 피부 결',
    base_price: 30000,
    manufacturer: '더마케어코스메틱',
    origin_country: '대한민국',
    legal_category: '화장품',
    ingredients: ['글리콜산', '살리실산', '알란토인'],
    usage_info: '저녁 세안 후 화장솜에 적셔 피부결 따라 닦아내기. 주 2-3회 사용',
    caution_info: '각질 제거 후 보습제 필수. 햇빛 노출 시 자외선 차단제 사용',
    sku: 'COS-S3-010',
    status: 'published',
    is_featured: false
  },
  {
    name: '펩타이드 리프팅 아이크림',
    subtitle: '눈가 주름 & 탄력 케어',
    description: '<p>5가지 펩타이드 복합 배합</p>',
    short_description: '눈가 탄력 집중 관리',
    base_price: 45000,
    sale_price: 40000,
    manufacturer: '더마케어코스메틱',
    origin_country: '대한민국',
    legal_category: '기능성화장품',
    certification_ids: ['기능성화장품 심사필 제2021-034호'],
    ingredients: ['펩타이드복합체', '아데노신', '카페인'],
    usage_info: '아침 저녁 소량을 눈가에 두드려 흡수',
    sku: 'COS-S3-011',
    status: 'published',
    is_featured: false
  },
  {
    name: '비타민C 21.5% 세럼',
    subtitle: '브라이트닝 고농도 비타민',
    description: '<p>순수 비타민C 21.5% 고함량</p>',
    short_description: '피부 톤 개선 & 항산화',
    base_price: 52000,
    sale_price: 46000,
    manufacturer: '더마케어코스메틱',
    origin_country: '대한민국',
    legal_category: '화장품',
    ingredients: ['아스코르브산', '토코페롤', '페룰산'],
    usage_info: '토너 후 2-3방울 얼굴에 펴 바르기. 냉장 보관 권장',
    caution_info: '개봉 후 3개월 이내 사용. 산화 방지 위해 밀봉 보관',
    sku: 'COS-S3-012',
    status: 'published',
    is_featured: true
  },
  {
    name: '콜라겐 부스팅 크림',
    subtitle: '탄력 회복 영양 크림',
    description: '<p>콜라겐 생성 촉진 펩타이드 함유</p>',
    short_description: '피부 탄력 & 주름 개선',
    base_price: 58000,
    sale_price: 51000,
    manufacturer: '더마케어코스메틱',
    origin_country: '대한민국',
    legal_category: '기능성화장품',
    certification_ids: ['기능성화장품 심사필 제2021-045호'],
    ingredients: ['팔미토일펜타펩타이드-4', '레티놀', '세라마이드'],
    usage_info: '세안 후 마지막 단계에 얼굴 전체에 펴 바르기',
    sku: 'COS-S3-013',
    status: 'published',
    is_featured: true
  },
  {
    name: '수분 진정 수분크림',
    subtitle: '24시간 수분 유지',
    description: '<p>하이드로 워터 캡슐 기술 적용</p>',
    short_description: '건조한 피부 수분 충전',
    base_price: 36000,
    sale_price: 31000,
    manufacturer: '더마케어코스메틱',
    origin_country: '대한민국',
    legal_category: '화장품',
    ingredients: ['히알루론산', '베타글루칸', '트레할로스'],
    usage_info: '세안 후 얼굴 전체에 골고루 펴 바르기',
    sku: 'COS-S3-014',
    status: 'published',
    is_featured: false
  },
  {
    name: '시카 수딩 마스크팩',
    subtitle: '진정 & 보습 마스크 (10매)',
    description: '<p>센텔라 고농축 에센스 시트팩</p>',
    short_description: '자극받은 피부 빠른 진정',
    base_price: 25000,
    sale_price: 21000,
    manufacturer: '더마케어코스메틱',
    origin_country: '대한민국',
    legal_category: '화장품',
    ingredients: ['센텔라추출물', '판테놀', '알란토인'],
    usage_info: '세안 후 얼굴에 밀착시켜 15-20분 후 제거',
    sku: 'COS-S3-015',
    barcodes: ['8801234500003'],
    status: 'published',
    is_featured: false
  }
];

// ============================================================================
// S4: Health & Lifestyle Common Products (Neture)
// ============================================================================

const S4_PRODUCTS = [
  {
    name: '전자 체온계 디지털',
    subtitle: '빠른 측정 가정용 체온계',
    sku: 'LIF-S4-001',
    category: 'healthcare',
    description: '1분 내 빠른 측정 디지털 체온계',
    short_description: '가정용 겨드랑이/구강 측정',
    base_price: 12000,
    sale_price: 9900,
    stock: 600,
    manufacturer: '라이프헬스케어',
    origin_country: '중국',
    legal_category: '의료기기',
    certification_ids: ['의료기기신고번호: 제허20-1234호'],
    usage_info: '겨드랑이 또는 구강에 넣고 1분간 측정',
    caution_info: '측정 전 소독 필수. 37.5℃ 이상 시 의료기관 방문',
    barcodes: ['8801234400001'],
    status: 'active',
    is_featured: false
  },
  {
    name: '손목 보호대 양손세트',
    subtitle: '손목터널증후군 예방',
    sku: 'LIF-S4-002',
    category: 'healthcare',
    description: '탄력 밴드 손목 보호대 (양손 2개입)',
    short_description: '손목 통증 완화',
    base_price: 18000,
    sale_price: 15000,
    stock: 400,
    manufacturer: '라이프헬스케어',
    origin_country: '대한민국',
    legal_category: '의료기기',
    usage_info: '손목에 적당한 압력으로 착용',
    caution_info: '너무 조이면 혈액 순환 방해',
    status: 'active',
    is_featured: false
  },
  {
    name: '무릎 보호대 스포츠용',
    subtitle: '운동 시 무릎 보호',
    sku: 'LIF-S4-003',
    category: 'healthcare',
    description: '네오프렌 소재 무릎 보호대',
    base_price: 22000,
    stock: 350,
    manufacturer: '라이프헬스케어',
    origin_country: '대한민국',
    legal_category: '건강용품',
    usage_info: '운동 전 무릎에 착용',
    status: 'active',
    is_featured: false
  },
  {
    name: '파스 진통 소염 패치',
    subtitle: '근육통 완화 (10매)',
    sku: 'LIF-S4-004',
    category: 'healthcare',
    description: '멘톨 함유 진통 소염 패치',
    short_description: '근육통, 타박상 완화',
    base_price: 8000,
    sale_price: 6800,
    stock: 800,
    manufacturer: '라이프헬스케어',
    origin_country: '대한민국',
    legal_category: '의약외품',
    certification_ids: ['의약외품 제2020-1234호'],
    usage_info: '통증 부위에 1일 1-2회 부착',
    caution_info: '피부 발진 시 사용 중지',
    status: 'active',
    is_featured: false
  },
  {
    name: '혈압계 자동 전자혈압계',
    subtitle: '가정용 혈압 측정기',
    sku: 'LIF-S4-005',
    category: 'healthcare',
    description: '상완식 자동 혈압계',
    short_description: '혈압 & 맥박 측정',
    base_price: 65000,
    sale_price: 58000,
    stock: 200,
    manufacturer: '라이프헬스케어',
    origin_country: '일본',
    legal_category: '의료기기',
    certification_ids: ['의료기기허가번호: 제허19-5678호'],
    usage_info: '안정된 자세로 팔에 커프 착용 후 측정',
    caution_info: '부정확 시 재측정. 고혈압 의심 시 병원 방문',
    barcodes: ['8801234400002'],
    status: 'active',
    is_featured: true
  },
  {
    name: '발목 보호대 압박 밴드',
    subtitle: '발목 염좌 예방',
    sku: 'LIF-S4-006',
    category: 'healthcare',
    description: '탄력 압박 발목 보호대',
    base_price: 16000,
    sale_price: 13000,
    stock: 450,
    manufacturer: '라이프헬스케어',
    origin_country: '대한민국',
    legal_category: '건강용품',
    usage_info: '발목에 적당히 조여 착용',
    status: 'active',
    is_featured: false
  },
  {
    name: '냉온 찜질팩 다용도',
    subtitle: '냉찜질 & 온찜질 겸용',
    sku: 'LIF-S4-007',
    category: 'healthcare',
    description: '냉장고/전자레인지 사용 가능 젤팩',
    short_description: '부상 부위 응급 처치',
    base_price: 9000,
    stock: 600,
    manufacturer: '라이프헬스케어',
    origin_country: '대한민국',
    legal_category: '건강용품',
    usage_info: '냉찜질: 냉동 2시간 후 사용 / 온찜질: 전자레인지 30초',
    caution_info: '피부에 직접 닿지 않도록 수건으로 감싸기',
    status: 'active',
    is_featured: false
  },
  {
    name: '귀 체온계 적외선',
    subtitle: '1초 빠른 측정',
    sku: 'LIF-S4-008',
    category: 'healthcare',
    description: '적외선 귀 체온계',
    base_price: 38000,
    sale_price: 33000,
    stock: 280,
    manufacturer: '라이프헬스케어',
    origin_country: '중국',
    legal_category: '의료기기',
    certification_ids: ['의료기기신고번호: 제허21-2345호'],
    usage_info: '귀 안쪽에 삽입 후 버튼 누르기',
    caution_info: '귀지 제거 후 측정 권장',
    status: 'active',
    is_featured: false
  },
  {
    name: '허리 보호대 코르셋',
    subtitle: '요통 완화 보조',
    sku: 'LIF-S4-009',
    category: 'healthcare',
    description: '탄력 메쉬 허리 보호대',
    short_description: '장시간 앉아있을 때 착용',
    base_price: 35000,
    sale_price: 29000,
    stock: 300,
    manufacturer: '라이프헬스케어',
    origin_country: '대한민국',
    legal_category: '의료기기',
    usage_info: '허리에 착용 후 벨크로로 조절',
    caution_info: '장시간 착용 시 근육 약화 가능',
    status: 'active',
    is_featured: false
  },
  {
    name: '손 소독 젤 휴대용',
    subtitle: '알코올 70% 손 세정제',
    sku: 'LIF-S4-010',
    category: 'healthcare',
    description: '에탄올 70% 함유 휴대용 손 소독제 (60ml)',
    base_price: 3500,
    stock: 1000,
    manufacturer: '라이프헬스케어',
    origin_country: '대한민국',
    legal_category: '의약외품',
    usage_info: '손에 적당량 짜서 문지르기',
    caution_info: '화기 주의. 어린이 손이 닿지 않는 곳 보관',
    status: 'active',
    is_featured: false
  }
];

// ============================================================================
// S5: Pilot / New Brand Products (Neture)
// ============================================================================

const S5_PRODUCTS = [
  {
    name: '플랜트 베이스 프로틴 파우더',
    subtitle: '비건 단백질 보충제',
    sku: 'PIL-S5-001',
    category: 'food',
    description: '완두콩 단백질 기반 식물성 프로틴',
    short_description: '비건 고단백 쉐이크',
    base_price: 48000,
    sale_price: 42000,
    stock: 150,
    manufacturer: '이노베이션랩',
    origin_country: '대한민국',
    legal_category: '일반식품',
    usage_info: '1회 30g을 물 또는 우유 250ml에 섞어 섭취',
    caution_info: '단백질 알레르기 주의',
    barcodes: ['8801234500101'],
    status: 'active',
    is_featured: true
  },
  {
    name: 'MCT 오일 코코넛 유래',
    subtitle: '중쇄지방산 에너지',
    sku: 'PIL-S5-002',
    category: 'food',
    description: '코코넛 유래 중쇄지방산(MCT) 100%',
    short_description: '키토제닉 다이어트 보조',
    base_price: 38000,
    sale_price: 34000,
    stock: 200,
    manufacturer: '이노베이션랩',
    origin_country: '대한민국',
    legal_category: '일반식품',
    usage_info: '1일 1-2회, 1회 1스푼(15ml)을 음식이나 음료에 섞어 섭취',
    caution_info: '과량 섭취 시 복통, 설사 가능',
    status: 'active',
    is_featured: false
  },
  {
    name: '콤부차 발효 음료',
    subtitle: '프로바이오틱스 발효차',
    sku: 'PIL-S5-003',
    category: 'food',
    description: '유기농 홍차 발효 콤부차',
    short_description: '장 건강 발효 음료',
    base_price: 12000,
    stock: 300,
    manufacturer: '이노베이션랩',
    origin_country: '대한민국',
    legal_category: '일반식품',
    usage_info: '냉장 보관 후 섭취',
    status: 'active',
    is_featured: false
  },
  {
    name: '차가버섯 면역 추출물',
    subtitle: '시베리아 차가버섯',
    sku: 'PIL-S5-004',
    category: 'healthcare',
    description: '차가버섯 농축 추출 분말',
    short_description: '면역력 증진 슈퍼푸드',
    base_price: 52000,
    sale_price: 46000,
    stock: 120,
    manufacturer: '이노베이션랩',
    origin_country: '러시아',
    legal_category: '건강기능식품',
    certification_ids: ['건기식 제2022-123호'],
    usage_info: '1일 1회, 1포를 물에 타서 섭취',
    caution_info: '과민 반응 주의',
    status: 'active',
    is_featured: true
  },
  {
    name: '아슈와간다 스트레스 케어',
    subtitle: '아유르베다 허브',
    sku: 'PIL-S5-005',
    category: 'healthcare',
    description: '아슈와간다 뿌리 추출물 500mg',
    short_description: '스트레스 & 피로 완화',
    base_price: 35000,
    stock: 180,
    manufacturer: '이노베이션랩',
    origin_country: '인도',
    legal_category: '건강기능식품',
    usage_info: '1일 1회, 1캡슐 섭취',
    caution_info: '임산부, 수유부는 섭취 전 상담',
    status: 'active',
    is_featured: false
  },
  {
    name: '콜라겐 펩타이드 드링크',
    subtitle: '저분자 콜라겐 음료',
    sku: 'PIL-S5-006',
    category: 'beauty',
    description: '피쉬 콜라겐 10,000mg + 비타민C',
    short_description: '마시는 콜라겐 (10포)',
    base_price: 32000,
    sale_price: 28000,
    stock: 250,
    manufacturer: '이노베이션랩',
    origin_country: '대한민국',
    legal_category: '건강기능식품',
    usage_info: '1일 1포 섭취',
    status: 'active',
    is_featured: false
  },
  {
    name: '스피룰리나 클로렐라 혼합',
    subtitle: '녹색 슈퍼푸드',
    sku: 'PIL-S5-007',
    category: 'healthcare',
    description: '스피룰리나 + 클로렐라 복합 정제',
    short_description: '알칼리성 영양 보충',
    base_price: 28000,
    stock: 200,
    manufacturer: '이노베이션랩',
    origin_country: '대한민국',
    legal_category: '건강기능식품',
    usage_info: '1일 2회, 1회 3정 섭취',
    status: 'active',
    is_featured: false
  },
  {
    name: '라이온스 메인 버섯 추출물',
    subtitle: '노트로픽 버섯',
    sku: 'PIL-S5-008',
    category: 'healthcare',
    description: '노루궁뎅이버섯 농축 추출물',
    short_description: '집중력 & 인지 기능',
    base_price: 42000,
    sale_price: 38000,
    stock: 150,
    manufacturer: '이노베이션랩',
    origin_country: '대한민국',
    legal_category: '건강기능식품',
    usage_info: '1일 1회, 2캡슐 섭취',
    status: 'active',
    is_featured: false
  },
  {
    name: '전해질 파우더 스포츠',
    subtitle: '운동 중 수분 보충',
    sku: 'PIL-S5-009',
    category: 'healthcare',
    description: '나트륨, 칼륨, 마그네슘 전해질 복합',
    short_description: '운동 후 빠른 회복',
    base_price: 25000,
    stock: 300,
    manufacturer: '이노베이션랩',
    origin_country: '대한민국',
    legal_category: '일반식품',
    usage_info: '물 500ml에 1스틱 섞어 섭취',
    status: 'active',
    is_featured: false
  },
  {
    name: '애플 사이다 비니거 캡슐',
    subtitle: '사과식초 농축',
    sku: 'PIL-S5-010',
    category: 'healthcare',
    description: '유기농 사과식초 농축 캡슐',
    short_description: '체중 관리 보조',
    base_price: 22000,
    stock: 220,
    manufacturer: '이노베이션랩',
    origin_country: '대한민국',
    legal_category: '일반식품',
    usage_info: '1일 2회, 1회 2캡슐 식전 섭취',
    caution_info: '위장 장애 시 섭취 중지',
    status: 'active',
    is_featured: false
  }
];

// ============================================================================
// Seed Functions
// ============================================================================

async function seedGlycopharmProducts() {
  console.log('\n=== Seeding Glycopharm Products (S1) ===');

  for (const product of S1_PRODUCTS) {
    try {
      const result = await pool.query(`
        INSERT INTO public.glycopharm_products (
          name, subtitle, sku, barcodes, category, description, short_description,
          price, sale_price, stock_quantity,
          manufacturer, origin_country, legal_category, certification_ids,
          usage_info, caution_info,
          status, is_featured, sort_order
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        )
        ON CONFLICT (sku) DO NOTHING
        RETURNING id, name
      `,
        [
          product.name,
          product.subtitle || null,
          product.sku,
          product.barcodes ? JSON.stringify(product.barcodes) : null,
          product.category,
          product.description || null,
          product.short_description || null,
          product.price,
          product.sale_price || null,
          product.stock_quantity,
          product.manufacturer || null,
          product.origin_country || null,
          product.legal_category || null,
          product.certification_ids ? JSON.stringify(product.certification_ids) : null,
          product.usage_info || null,
          product.caution_info || null,
          product.status,
          product.is_featured,
          0
        ]
      );

      if (result.rows.length > 0) {
        console.log(`✓ Created: ${result.rows[0].name}`);
      } else {
        console.log(`⊙ Skipped (exists): ${product.name}`);
      }
    } catch (error: any) {
      console.error(`✗ Failed to create ${product.name}:`, error.message);
    }
  }
}

async function seedNetureProducts(products: any[]) {
  console.log('\n=== Seeding Neture Products ===');

  for (const product of products) {
    try {
      const result = await pool.query(`
        INSERT INTO neture.neture_products (
          name, subtitle, sku, barcodes, category, description, short_description,
          base_price, sale_price, stock,
          manufacturer, origin_country, legal_category, certification_ids,
          usage_info, caution_info,
          status, is_featured
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        )
        ON CONFLICT (sku) DO NOTHING
        RETURNING id, name
      `,
        [
          product.name,
          product.subtitle || null,
          product.sku,
          product.barcodes ? JSON.stringify(product.barcodes) : null,
          product.category,
          product.description || null,
          product.short_description || null,
          product.base_price,
          product.sale_price || null,
          product.stock,
          product.manufacturer || null,
          product.origin_country || null,
          product.legal_category || null,
          product.certification_ids ? JSON.stringify(product.certification_ids) : null,
          product.usage_info || null,
          product.caution_info || null,
          product.status,
          product.is_featured
        ]
      );

      if (result.rows.length > 0) {
        console.log(`✓ Created: ${result.rows[0].name}`);
      } else {
        console.log(`⊙ Skipped (exists): ${product.name}`);
      }
    } catch (error: any) {
      console.error(`✗ Failed to create ${product.name}:`, error.message);
    }
  }
}

async function seedCosmeticsProducts() {
  console.log('\n=== Seeding Cosmetics Products (S3) ===');

  // First, create a brand if not exists
  let brandId: string;
  try {
    const brandResult = await pool.query(`
      INSERT INTO cosmetics.cosmetics_brands (name, status)
      VALUES ('더마케어', 'active')
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);
    brandId = brandResult.rows[0].id;
    console.log(`✓ Brand created/found: ${brandId}`);
  } catch (error: any) {
    console.error('✗ Failed to create brand:', error.message);
    return;
  }

  for (const productData of S3_PRODUCTS_DATA) {
    try {
      const result = await pool.query(`
        INSERT INTO cosmetics.cosmetics_products (
          brand_id, name, subtitle, sku, barcodes,
          description, short_description, ingredients,
          manufacturer, origin_country, legal_category, certification_ids,
          usage_info, caution_info,
          base_price, sale_price, currency,
          status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
        )
        ON CONFLICT (sku) DO NOTHING
        RETURNING id, name
      `,
        [
          brandId,
          productData.name,
          productData.subtitle || null,
          productData.sku,
          productData.barcodes ? JSON.stringify(productData.barcodes) : null,
          productData.description || null,
          productData.short_description || null,
          productData.ingredients ? JSON.stringify(productData.ingredients) : null,
          productData.manufacturer || null,
          productData.origin_country || null,
          productData.legal_category || null,
          productData.certification_ids ? JSON.stringify(productData.certification_ids) : null,
          productData.usage_info || null,
          productData.caution_info || null,
          productData.base_price,
          productData.sale_price || null,
          'KRW',
          productData.status
        ]
      );

      if (result.rows.length > 0) {
        console.log(`✓ Created: ${result.rows[0].name}`);
      } else {
        console.log(`⊙ Skipped (exists): ${productData.name}`);
      }
    } catch (error: any) {
      console.error(`✗ Failed to create ${productData.name}:`, error.message);
    }
  }
}

async function main() {
  try {
    console.log('Starting sample product dataset seed...\n');
    console.log('WO-SAMPLE-PRODUCT-DATASET-V1');
    console.log('Purpose: Populate sample data for operational validation\n');

    // Seed Glycopharm (S1)
    await seedGlycopharmProducts();

    // Seed Neture (S2, S4, S5)
    console.log('\n=== Seeding S2: Health Supplements ===');
    await seedNetureProducts(S2_PRODUCTS);

    console.log('\n=== Seeding S4: Health & Lifestyle ===');
    await seedNetureProducts(S4_PRODUCTS);

    console.log('\n=== Seeding S5: Pilot/New Brands ===');
    await seedNetureProducts(S5_PRODUCTS);

    // Seed Cosmetics (S3)
    await seedCosmeticsProducts();

    console.log('\n=== Summary ===');
    const glycoCount = await pool.query('SELECT COUNT(*) FROM public.glycopharm_products');
    const netureCount = await pool.query('SELECT COUNT(*) FROM neture.neture_products');
    const cosmeticsCount = await pool.query('SELECT COUNT(*) FROM cosmetics.cosmetics_products');

    console.log(`Glycopharm products: ${glycoCount.rows[0].count}`);
    console.log(`Neture products: ${netureCount.rows[0].count}`);
    console.log(`Cosmetics products: ${cosmeticsCount.rows[0].count}`);
    console.log(`Total products: ${parseInt(glycoCount.rows[0].count) + parseInt(netureCount.rows[0].count) + parseInt(cosmeticsCount.rows[0].count)}`);

    console.log('\n✓ Sample product dataset seed completed successfully!');
  } catch (error) {
    console.error('\n✗ Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
