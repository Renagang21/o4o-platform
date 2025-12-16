# Cosmetics Design Core v1.0 전환 로드맵

> **Status**: ACTIVE
> **Version**: 1.0.0
> **Date**: 2025-12-16
> **Service**: Cosmetics (화장품 서비스)

---

## 1. 서비스 개요

Cosmetics 서비스는 화장품 관련 기능을 담당하며 다음 하위 영역을 포함한다:

| 영역 | 설명 | 화면 수 |
|------|------|---------|
| cosmetics | 기본 관리 (사전, 필터, 루틴, 사이니지) | 4 |
| cosmetics-partner | 파트너 대시보드/관리 | 8 |
| cosmetics-products | 제품/브랜드 관리 | 4 |
| cosmetics-sample | 샘플 관리/분석 | 4 |
| cosmetics-supplier | 공급사 관리 | 6 |

**총 대상 화면**: 26개

---

## 2. 전환 원칙

### 2.1 기본 규칙

```
신규 화면 → Design Core v1.0 필수
기존 화면 → Variant 방식으로 단계적 전환
```

### 2.2 금지 사항

- 기존 UI 즉시 제거 ❌
- Variant 없이 직접 교체 ❌
- 앱별 커스텀 컴포넌트 생성 ❌

---

## 3. 전환 단계

### Stage 1: Low Risk (우선 적용)

대시보드 및 읽기 위주 화면을 우선 전환한다.

| 파일 | 화면명 | 상태 |
|------|--------|------|
| `cosmetics-partner/CosmeticsPartnerDashboard.tsx` | 파트너 대시보드 | ✅ Variant 완료 |
| `cosmetics-supplier/CosmeticsSupplierDashboard.tsx` | 공급사 대시보드 | ⬜ 대기 |
| `cosmetics-sample/SampleDashboard.tsx` | 샘플 대시보드 | ⬜ 대기 |
| `cosmetics-sample/ConversionAnalyticsPage.tsx` | 전환 분석 | ⬜ 대기 |

### Stage 2: Medium Risk (중순위)

목록/조회 중심 화면을 전환한다.

| 파일 | 화면명 | 상태 |
|------|--------|------|
| `cosmetics-products/ProductListPage.tsx` | 제품 목록 | ✅ Design Core 사용중 |
| `cosmetics-products/BrandListPage.tsx` | 브랜드 목록 | ⬜ 대기 |
| `cosmetics-partner/CosmeticsPartnerLinks.tsx` | 파트너 링크 관리 | ⬜ 대기 |
| `cosmetics-partner/CosmeticsPartnerEarnings.tsx` | 수익 현황 | ⬜ 대기 |
| `cosmetics-partner/CosmeticsPartnerCampaigns.tsx` | 캠페인 관리 | ⬜ 대기 |
| `cosmetics-supplier/CosmeticsSupplierCampaigns.tsx` | 공급사 캠페인 | ⬜ 대기 |
| `cosmetics-supplier/CosmeticsSupplierApprovals.tsx` | 승인 관리 | ⬜ 대기 |
| `cosmetics-supplier/CosmeticsSupplierSamples.tsx` | 샘플 관리 | ⬜ 대기 |
| `cosmetics-sample/SampleTrackingPage.tsx` | 샘플 추적 | ⬜ 대기 |
| `cosmetics-sample/DisplayManagementPage.tsx` | 디스플레이 관리 | ⬜ 대기 |
| `cosmetics/dictionary/index.tsx` | 성분 사전 | ⬜ 대기 |
| `cosmetics/filters/index.tsx` | 필터 관리 | ⬜ 대기 |
| `cosmetics/routines/index.tsx` | 루틴 관리 | ⬜ 대기 |
| `cosmetics/signage/index.tsx` | 사이니지 관리 | ⬜ 대기 |

### Stage 3: High Risk (후순위)

상세/편집 폼 및 복잡한 CRUD 화면을 전환한다.

| 파일 | 화면명 | 상태 |
|------|--------|------|
| `cosmetics-products/ProductDetailPage.tsx` | 제품 상세 | ⬜ 대기 |
| `cosmetics-products/BrandDetailPage.tsx` | 브랜드 상세 | ⬜ 대기 |
| `cosmetics-partner/CosmeticsPartnerStorefront.tsx` | 스토어프론트 | ⬜ 대기 |
| `cosmetics-partner/CosmeticsPartnerRoutines.tsx` | 파트너 루틴 | ⬜ 대기 |
| `cosmetics-partner/CosmeticsPartnerAITools.tsx` | AI 도구 | ⬜ 대기 |
| `cosmetics-partner/CosmeticsPartnerCommissionPolicies.tsx` | 수수료 정책 | ⬜ 대기 |
| `cosmetics-supplier/CosmeticsSupplierPricePolicies.tsx` | 가격 정책 | ⬜ 대기 |

---

## 4. 컴포넌트 전용 파일

다음 파일은 페이지가 아닌 공용 컴포넌트이므로 전환 대상에서 제외:

| 파일 | 설명 |
|------|------|
| `cosmetics/components/CosmeticsFilterEditor.tsx` | 필터 에디터 |
| `cosmetics/components/RoutineTemplateEditor.tsx` | 루틴 템플릿 에디터 |
| `cosmetics-partner/CosmeticsPartnerLayout.tsx` | 레이아웃 |
| `cosmetics-partner/CosmeticsPartnerRouter.tsx` | 라우터 |
| `cosmetics-products/CosmeticsProductsRouter.tsx` | 라우터 |
| `cosmetics-sample/CosmeticsSampleRouter.tsx` | 라우터 |
| `cosmetics-supplier/CosmeticsSupplierRouter.tsx` | 라우터 |

---

## 5. 완료된 전환

### Phase 4-A: 파트너 대시보드 Variant

- **대상**: `CosmeticsPartnerDashboard.tsx`
- **결과**: `CosmeticsPartnerDashboardDesignCoreV1.tsx` 생성
- **상태**: Variant 병렬 운영 중

### 기존 Design Core 사용 화면

- **대상**: `ProductListPage.tsx`
- **상태**: 이미 Design Core 컴포넌트 사용 중

---

## 6. Variant 운영 규칙

### 6.1 Variant 구현 패턴

```tsx
// 1. 타입 정의
type ViewVariant = 'default' | 'design-core-v1';

// 2. Props 추가
interface PageProps {
  variant?: ViewVariant;
}

// 3. 분기 처리
const Page: React.FC<PageProps> = ({ variant = 'default' }) => {
  if (variant === 'design-core-v1') {
    return <PageDesignCoreV1 />;
  }
  return <PageDefault />;
};
```

### 6.2 Variant 활성화

- 개발/테스트: Props로 직접 전달
- 프로덕션: 플랫폼 총괄 승인 후 활성화

---

## 7. 확장 요청 처리

Cosmetics 서비스에서 Design Core 확장이 필요한 경우:

```
즉시 확장 ❌
    ↓
요구사항 수집
    ↓
별도 Work Order 작성
    ↓
Phase 6+ 에서 처리
```

---

## 8. 참조 문서

- Design Core 운영 규칙: `docs/app-guidelines/design-core-governance.md`
- CLAUDE.md: `CLAUDE.md` (플랫폼 헌법)

---

*Cosmetics Design Core Transition Roadmap v1.0.0*
