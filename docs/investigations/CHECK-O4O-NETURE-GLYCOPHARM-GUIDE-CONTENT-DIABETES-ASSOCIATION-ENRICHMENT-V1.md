# CHECK-O4O-NETURE-GLYCOPHARM-GUIDE-CONTENT-DIABETES-ASSOCIATION-ENRICHMENT-V1

> **유형**: Content Enrichment (안내 페이지 사업 설명 정비)
> **WO**: WO-O4O-NETURE-GLYCOPHARM-GUIDE-CONTENT-DIABETES-ASSOCIATION-ENRICHMENT-V1
> **대상 페이지**: https://neture.co.kr/guide/services/glycopharm
> **성격**: 콘텐츠 변경 + UI 레이아웃 유지 (기능/구조 무변경)
> **작성일**: 2026-06-12

---

## 1. 작업 목적

Neture Guide의 GlycoPharm 서비스 소개 페이지에 한국당뇨협회 연계 내용을 보강한다.
기존에는 혈당관리약국 기본 성격만 설명했으나, 무료혈당기 사업 연계 · 회원약국 가치 · 제품/콘텐츠/서비스 지원 · CGM 연동 추진 등 핵심 가치가 드러나지 않았다.

## 2. 수정 파일 목록

- `packages/shared-space-ui/src/guide/copy/neture.ts`
  - `netureGuideServiceGlycopharmProps` 보강 (page: `/guide/services/glycopharm` → `GuideServiceGlycoPharmPage` → `GuideFeatureManualPage` 렌더)

> 페이지 컴포넌트(`services/web-neture/src/pages/guide/GuideServiceGlycoPharmPage.tsx`)는 props만 소비하므로 무변경.

## 3. 반영한 문안 요약

- **hero.description**: "O4O 기반 혈당관리약국 + 한국당뇨협회 무료혈당기 사업 연계 + 상담 거점화/기회 확장" 키워드 포함.
- **flowLabels**: 기존 5개에 `무료혈당기 연계 / 회원약국 / 제품·콘텐츠 지원 / CGM 연계` 추가.
- **Section 01 (서비스 개요)**: O4O 혈당관리약국 정의 + 한국당뇨협회 연계 항목 추가.
- **신규 Section 06 무료혈당기 사업 연계**: 의료기관 쿠폰 → 참여 약국 방문 → 상담 거점화 흐름.
- **신규 Section 07 한국당뇨협회 회원약국**: 회원약국 참여 · 전문성 홍보 · 협회 CI 활용 · 상담 기회 확대.
- **신규 Section 08 제품·콘텐츠·서비스 지원**: 샘플/무재고/구비 판매 · 동영상·간행물·카드뉴스 · 협회 채널 협력 · 협력 업체 지원.
- **신규 Section 09 CGM 연계 확장**: CGM 업체 협력 · 앱 API 연동 추진 · 환자관리 확장 · 제품/소모품 안내.

### sectionKey 보존
- `GuideFeatureManualPage`는 sectionKey를 배열 index(`section-${idx}-desc`)로 생성한다.
- 기존 섹션(index 0~4)은 **순서를 유지하고 신규 섹션을 뒤에 append**(index 5~8)하여, 운영자가 저장한 기존 편집 콘텐츠가 깨지지 않도록 했다.

## 4. 표현 점검 (과장/확정 표현 회피)

- 한국당뇨협회 관련: "연계 · 지원 · 활용 가능 · 강화" 수준 표현만 사용. "보증 · 완료" 등 확정 표현 없음.
- CGM API 연동: "추진 · 연계 가능"으로 표기하고 "(연동은 추진 단계로, 확정된 기능이 아닙니다.)" 명시.
- 진단·치료·복약 지시를 대신하지 않는다는 기존 안내 톤 유지.
- 명칭: `GlycoPharm` / `혈당관리약국` / `한국당뇨협회` / `무료혈당기 사업` / `CGM` / `연속혈당측정기` 정확 표기. (URL slug `glycopharm` 기존 코드 규칙 유지)

## 5. 검증 결과

- **Typecheck**: `pnpm --filter @o4o/shared-space-ui exec tsc --noEmit` → EXIT 0 (PASS)
- **타입 정합**: `GuideFeatureManualPageProps` 계약 준수 (신규 섹션도 동일 step/title/description/items 구조).
- **배포 후 smoke test**: main 배포 → CI/CD 빌드 후 `/guide/services/glycopharm` 렌더 확인 예정.

## 6. commit hash

- (커밋 후 기입)

## 7. 미변경 사항

```
페이지 컴포넌트 / 라우트 / 기능 / DB / API 무변경.
다른 세션 WIP(o4o_payments migration 등) 무접촉.
```
