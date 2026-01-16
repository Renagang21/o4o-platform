/**
 * AI Asset Package Standards
 * WO-AI-ASSET-PACKAGING-V1
 *
 * 서비스별 AI Context Asset 표준 패키지 정의
 * - 패키지는 '권장 기준'이지 강제 조건이 아님
 * - 운영 품질 기준선(벤치마크)으로 활용
 * - 품질 신호 해석 시 패키지 기준과 비교
 */

export type AssetType = 'brand' | 'product' | 'non_product' | 'content';

export interface AssetRequirement {
  type: AssetType;
  label: string;
  minCount: number;
  description: string;
}

export interface ServicePackage {
  serviceSlug: string;
  serviceName: string;
  description: string;
  requirements: AssetRequirement[];
  totalMinAssets: number;
  notes?: string[];
}

/**
 * 서비스별 AI Asset Package 표준 정의
 */
export const AI_ASSET_PACKAGE_STANDARDS: ServicePackage[] = [
  {
    serviceSlug: 'neture',
    serviceName: 'Neture',
    description: '유통 정보 플랫폼 - 공급자/콘텐츠 중심',
    requirements: [
      {
        type: 'brand',
        label: '브랜드',
        minCount: 3,
        description: '주요 공급자/브랜드 정보',
      },
      {
        type: 'product',
        label: '상품',
        minCount: 10,
        description: '대표 상품 정보',
      },
      {
        type: 'non_product',
        label: '비상품',
        minCount: 5,
        description: '공급자 정책, 배송 안내 등',
      },
      {
        type: 'content',
        label: '콘텐츠',
        minCount: 5,
        description: '공급자 소개, 뉴스, 가이드',
      },
    ],
    totalMinAssets: 23,
    notes: [
      '공급자 중심 플랫폼으로 브랜드/공급자 정보 품질이 중요',
      '콘텐츠 Asset을 통한 플랫폼 신뢰도 구축',
    ],
  },
  {
    serviceSlug: 'k-cosmetics',
    serviceName: 'K-Cosmetics',
    description: '화장품 유통 플랫폼 - 상품/브랜드 중심',
    requirements: [
      {
        type: 'brand',
        label: '브랜드',
        minCount: 5,
        description: '화장품 브랜드 정보',
      },
      {
        type: 'product',
        label: '상품',
        minCount: 20,
        description: '화장품 상품 정보',
      },
      {
        type: 'non_product',
        label: '비상품',
        minCount: 5,
        description: '성분 정보, 사용법, 주의사항',
      },
      {
        type: 'content',
        label: '콘텐츠',
        minCount: 3,
        description: '뷰티 트렌드, 브랜드 스토리',
      },
    ],
    totalMinAssets: 33,
    notes: [
      '상품 수가 많은 커머스 특성상 Product Asset 비중 높음',
      '브랜드 인지도가 중요한 뷰티 특성 반영',
    ],
  },
  {
    serviceSlug: 'glycopharm',
    serviceName: 'GlycoPharm',
    description: '건강기능식품/의약품 플랫폼 - 비상품 정보 중심',
    requirements: [
      {
        type: 'brand',
        label: '브랜드',
        minCount: 3,
        description: '제조사/브랜드 정보',
      },
      {
        type: 'product',
        label: '상품',
        minCount: 15,
        description: '건강기능식품/의약품 정보',
      },
      {
        type: 'non_product',
        label: '비상품',
        minCount: 10,
        description: '복용법, 주의사항, 상호작용 정보',
      },
      {
        type: 'content',
        label: '콘텐츠',
        minCount: 5,
        description: '건강 가이드, 영양 정보',
      },
    ],
    totalMinAssets: 33,
    notes: [
      '의약/건강 도메인 특성상 Non-Product(안전 정보) 비중 높음',
      '전문성 있는 콘텐츠로 신뢰도 확보 필요',
    ],
  },
  {
    serviceSlug: 'kpa-society',
    serviceName: 'KPA Society',
    description: '약사회 SaaS - 교육/회원 정보 중심',
    requirements: [
      {
        type: 'brand',
        label: '기관',
        minCount: 2,
        description: '협회/기관 정보',
      },
      {
        type: 'product',
        label: '교육과정',
        minCount: 10,
        description: '교육 프로그램, 세미나 정보',
      },
      {
        type: 'non_product',
        label: '비상품',
        minCount: 8,
        description: '회원 혜택, 가입 안내, 규정',
      },
      {
        type: 'content',
        label: '콘텐츠',
        minCount: 5,
        description: '뉴스레터, 공지사항, 가이드',
      },
    ],
    totalMinAssets: 25,
    notes: [
      '교육/자격 관련 Product Asset 중심',
      'Non-Product(회원 안내)와 Content(공지) 균형 필요',
    ],
  },
  {
    serviceSlug: 'glucoseview',
    serviceName: 'GlucoseView',
    description: '혈당 관리 서비스 - 콘텐츠/비상품 중심',
    requirements: [
      {
        type: 'brand',
        label: '브랜드',
        minCount: 2,
        description: 'CGM 기기 브랜드, 파트너사',
      },
      {
        type: 'product',
        label: '상품',
        minCount: 5,
        description: 'CGM 기기, 관련 용품',
      },
      {
        type: 'non_product',
        label: '비상품',
        minCount: 10,
        description: '혈당 관리법, 기기 사용법, FAQ',
      },
      {
        type: 'content',
        label: '콘텐츠',
        minCount: 8,
        description: '건강 가이드, 사용 팁, 사례',
      },
    ],
    totalMinAssets: 25,
    notes: [
      '헬스케어 서비스 특성상 교육적 콘텐츠 비중 높음',
      'Non-Product(사용 가이드) 품질이 서비스 만족도에 직결',
    ],
  },
];

/**
 * 서비스 슬러그로 패키지 정보 조회
 */
export function getPackageByService(serviceSlug: string): ServicePackage | undefined {
  return AI_ASSET_PACKAGE_STANDARDS.find((pkg) => pkg.serviceSlug === serviceSlug);
}

/**
 * Asset Type 라벨 조회 (한글)
 */
export function getAssetTypeLabel(type: AssetType): string {
  const labels: Record<AssetType, string> = {
    brand: '브랜드',
    product: '상품',
    non_product: '비상품',
    content: '콘텐츠',
  };
  return labels[type];
}

/**
 * 패키지 준수율 계산
 */
export interface AssetCount {
  brand: number;
  product: number;
  non_product: number;
  content: number;
}

export interface PackageComplianceResult {
  serviceSlug: string;
  serviceName: string;
  requirements: Array<{
    type: AssetType;
    label: string;
    minCount: number;
    currentCount: number;
    isMet: boolean;
    compliancePercent: number;
  }>;
  totalMinAssets: number;
  totalCurrentAssets: number;
  overallCompliancePercent: number;
  allRequirementsMet: boolean;
}

export function calculatePackageCompliance(
  serviceSlug: string,
  currentAssets: AssetCount
): PackageComplianceResult | null {
  const pkg = getPackageByService(serviceSlug);
  if (!pkg) return null;

  const requirements = pkg.requirements.map((req) => {
    const currentCount = currentAssets[req.type];
    const isMet = currentCount >= req.minCount;
    const compliancePercent = Math.min((currentCount / req.minCount) * 100, 100);
    return {
      type: req.type,
      label: req.label,
      minCount: req.minCount,
      currentCount,
      isMet,
      compliancePercent,
    };
  });

  const totalCurrentAssets = Object.values(currentAssets).reduce((sum, count) => sum + count, 0);
  const overallCompliancePercent = Math.min(
    (totalCurrentAssets / pkg.totalMinAssets) * 100,
    100
  );
  const allRequirementsMet = requirements.every((r) => r.isMet);

  return {
    serviceSlug: pkg.serviceSlug,
    serviceName: pkg.serviceName,
    requirements,
    totalMinAssets: pkg.totalMinAssets,
    totalCurrentAssets,
    overallCompliancePercent,
    allRequirementsMet,
  };
}
