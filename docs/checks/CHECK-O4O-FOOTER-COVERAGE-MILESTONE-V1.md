# CHECK-O4O-FOOTER-COVERAGE-MILESTONE-V1

> **유형:** 마일스톤 고정 (Footer coverage 축 완료 상태 기록 — 코드/frontend/backend/API/DB/route 변경 없음, 문서 1개만 생성)
> **선행 IR:** [IR-CROSSSERVICE-FOOTER-CORE-STANDARDIZATION](../investigations/IR-O4O-CROSSSERVICE-FOOTER-CORE-STANDARDIZATION-V1.md) · [IR-FOOTER-COVERAGE-AUDIT](../investigations/IR-O4O-FOOTER-COVERAGE-AUDIT-V1.md)
> **작성일:** 2026-06-14
> **상태:** ✅ **마일스톤 — Footer coverage 축 완료.** 표준화 + store-facing + public-page 3단계 닫힘. 남은 건 선택 과제(§10).

## 0. 한 줄 결론
공개 Footer **법정정보·링크·loader 표준화**(이미 닫힘) 위에, **store-facing coverage 보강**과 **public-page outlier 정리**가 더해져 Footer coverage 축이 운영 구조상 완료됐다. 조사 중 storefront/404 관련 IR·WO 전제 오류를 코드로 정정해 **법적 회귀를 회피**한 것이 이번 축의 핵심 판단이다.

## 1. 고정된 Footer coverage 기준 (Standing Rules)
```txt
public/store-facing 사용자 화면은 Footer 포함이 기본이다.
admin/operator/supplier/auth/fullscreen 화면은 명시적 예외다.
Footer는 page별 직접 삽입이 아니라 layout 단위 coverage 보장이 원칙이다.
storefront의 판매자/매장 법정정보는 플랫폼 Footer로 대체하지 않는다.
404는 full Footer가 아니라 minimal 복귀 네비 기준을 따른다.
```

### 1.1 기본 포함 대상
공개 Home · 서비스안내/Guide · Contact · Terms/Privacy/Policy · 매장 HUB · 내 매장/내 약국 · store-facing 상품/자료실/주문/이벤트오퍼.

### 1.2 명시적 제외 대상
Admin/Operator dashboard · Supplier/Partner workspace · Auth flow(reset/verify 포함) · fullscreen editor/player · kiosk/tablet/signage · checkout/payment 집중 화면.

## 2. 완료된 정비 (3단계)

### 2.1 공개 Footer 표준화 (선행 — 이미 닫힘)
1. legal block = 공통 `PublicLegalFooterInfo` · 2. 실값 = `service_legal_profiles` 단독 · 3. 값 없으면 렌더 0(placeholder 금지) · 4. 공개 화면 사업자 법정정보 = Footer 단독 · 5. dead link 정리 · 6. `loadFooterLegal` factory(`createFooterLegalLoader`) 공통화.
- 근거: LINK-GUARD `58708e6e7`, LEGAL-GUARD `47c08e51f`, LOADER-CONSOLIDATION `26c3db249`, [STANDARDIZATION-MILESTONE](CHECK-O4O-PUBLIC-FOOTER-STANDARDIZATION-MILESTONE-V1.md) `a8b6ca227`.

### 2.2 Store-facing coverage 보강
1. GP/KCos/KPA 내 매장/내 약국 owner dashboard = coverage 대상 · 2. 공통 `StoreDashboardLayout`에 **additive `footer?` prop**(미주입 시 동작 불변) · 3. footer는 service wrapper가 주입(공통 `StoreFacingFooter`@shared-space-ui) · 4. `store-ui-core`에 서비스/footer 의존 추가 없음(레이어 방향 보존) · 5. GP/KCos hub layout(top-level)에 footer 추가 · 6. KPA store-hub는 공개 Layout 상속 → 무수정 · 7. Neture 내 매장 없음 → 대상 아님.
- 근거: [STORE-FACING-FOOTER-COVERAGE](CHECK-O4O-STORE-FACING-FOOTER-COVERAGE-V1.md) — 코드 `189fbc5ed`, CHECK `1b5cd3d72`, 배포결과 `716a73c90`. 4서비스 tsc 0, workflow_dispatch 4서비스 deploy success, root 200.

### 2.3 Public page coverage outlier 정리
1. storefront는 무수정(§3) · 2. 404는 minimal 복귀 네비 표준 유지 · 3. GP 404만 outlier였고 KCos/KPA 표준(홈/커뮤니티/문의)에 정합.
- 근거: [PUBLIC-PAGE-FOOTER-COVERAGE-FIX](CHECK-O4O-PUBLIC-PAGE-FOOTER-COVERAGE-FIX-V1.md) — `f1a82803e`(+`51a3ca274`). GP tsc 0, deploy-glycopharm success, 나머지 skip 정상.

## 3. 전제 정정 기록 (이번 축의 핵심 판단)

| 기존 전제(IR/WO) | 코드 확인 | 최종 판단 |
|------|------|------|
| KPA `/store/:slug` = bare, footer 없음 | self-contained 테마형 block-engine storefront, **자체 footer 보유** | IR Type-C **오분류 정정**, 무수정 |
| GP storefront custom footer → 공통 정렬 | **판매자(약국) 법정정보를 store 엔티티에서 동적 표시** | 플랫폼 footer 교체 = **법적 회귀**, 무수정 |
| 404 = Footer 추가 권장 | 선행 `WO-SERVICE-PAGE-FOOTER-COVERAGE-AUDIT-AND-FIX`가 minimal-nav로 표준화 | GP 404만 네비 정합, **footer 미추가** |
| Neture store-facing coverage 필요 | Neture 내 매장 기능 없음 | store-facing 범위 제외 |

> **핵심:** storefront(소비자 매장 페이지)에는 **실제 판매자/매장의 법정정보**가 표기돼야 하며(전자상거래법), 플랫폼 운영사 `PublicLegalFooterInfo`(serviceKey)로 대체하면 안 된다. 이 구분이 Footer 축의 영구 기준이다.

## 4. 서비스별 완료 상태

| 서비스 | public Footer | store-facing | storefront | 404 | 비고 |
|--------|:---:|:---:|------|------|------|
| GlycoPharm | ✅ | ✅ | 판매자 법정정보 동적 표시 유지 | 네비 정합 완료 | 약국 표현 유지 |
| K-Cosmetics | ✅ | ✅ | 소비자 storefront 없음 | 선행 표준 유지 | 내 매장 표현 유지 |
| KPA Society | ✅ | ✅ | 자체 block-engine footer 보유 | 선행 표준 유지 | `/policy` 의도된 차이 |
| Neture | ✅ | 대상 아님 | 대상 아님 | catch-all 404 부재(선택 과제) | supplier/admin Footer 제외 |

## 5. 검증 요약
- **표준화:** 4서비스 tsc 통과, dead link/하드코딩 법정정보 재등장 0, link/legal/loader 배포 완료.
- **store-facing:** GP/KCos/KPA footer 보강, `StoreDashboardLayout` additive, Shared Module Change Protocol(소비처 3개) 수행, 4서비스 tsc 0, 4서비스 deploy success, root 200.
- **public page:** GP NotFoundPage 정합, GP tsc 0, deploy-glycopharm success, KCos/KPA/Neture skip 정상, storefront 무수정 근거 기록.
- **브라우저 시각 smoke:** Playwright 점유로 보류(각 CHECK에 정적/배포 갈음 근거 기록). 가용 시 store-facing footer + GP 404 1회 확인 권장.

## 6. 남은 선택 과제 (기능 필수 아님)

| 과제 | 착수 조건 |
|------|----------|
| `WO-O4O-FOOTER-LAYOUT-STICKY-BASELINE-V1` | 브라우저 시각 확인에서 footer 하단 배치 불안정한 layout만. 정적 조사로 확정 금지 |
| `WO-O4O-NETURE-PUBLIC-404-CATCHALL-V1` | Neture public catch-all 404 필요 판단 시. admin/operator/supplier route 충돌 회피(footer 무관) |
| `WO-O4O-GLYCOPHARM-STOREFRONT-COPYRIGHT-LABEL-FIX-V1` | GP storefront `© 2025` 등 cosmetic 정리(Footer coverage 아님, storefront 표시 정리) |
| `WO-O4O-PUBLIC-FOOTER-CORE-GP-KCOS-V1` | GP/KCos 공개 Footer 구조 추가 축소 희망 시. 운영 필수 아님. 전면 4서비스 FooterCore는 여전히 비권장 |

## 7. 검증 (이 마일스톤 자체)
- [x] 문서 1개만 생성 (코드/UI/API/DB/route 변경 0)
- [x] coverage 기준 고정 (§1) + 포함/제외 명시 (§1.1·§1.2)
- [x] 3단계 완료 상태 + commit 근거 (§2)
- [x] storefront 오분류 정정 + GP 플랫폼 footer 교체 비대상 + KPA 자체 footer 기록 (§3)
- [x] 404 = minimal 복귀 네비 기준 명시 (§1·§3)
- [x] 서비스별 상태 (§4)
- [x] 남은 선택 과제 분리 (§6)

---

*End of CHECK-O4O-FOOTER-COVERAGE-MILESTONE-V1*
