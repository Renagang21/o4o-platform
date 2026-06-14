# CHECK-O4O-KPA-PRODUCT-APPLICATIONS-MENU-EXPOSURE-V1

> **WO:** WO-O4O-KPA-PRODUCT-APPLICATIONS-MENU-EXPOSURE-V1
> **작성일:** 2026-06-14
> **상태:** ✅ **완료** — 전제 정정(메뉴 이미 노출 중) 후 메뉴명을 GP/KCos 와 정렬. KPA tsc 0 errors.

## 1. 목적

KPA operator 사이드바의 공급 상품 신청 승인 메뉴를 GP/KCos 와 정렬. route/page/backend/DB 무변경.

## 2. 선행 기준

- `WO-O4O-PRODUCT-APPROVAL-APPROVE-IMPL-UNIFY-V1`
- `WO-O4O-PRODUCT-APPROVAL-OPERATOR-SURFACE-ENABLE-GP-KCOS-V1` (GP/KCos 메뉴 '공급 상품 신청 승인' 노출 완료)

## 3. Phase 1 — 기존 route/page 확인 (+ 전제 정정)

| 항목 | 결과 |
|---|---|
| `/operator/product-applications` route | ✅ 존재 (KPA App routes) |
| 페이지 | ✅ `ProductApplicationManagementPage` (Phase 4 에서 공통 `ProductApplicationManagementConsole` 로 전환) |
| **사이드바 메뉴** | ⚠️ **이미 노출 중** — `operatorMenuGroups.ts` `UNIFIED_MENU.approvals` 에 `{ label: '상품 신청 관리', path: '/operator/product-applications' }` 존재 (line 37). `filterMenuByRole` 은 `adminOnly` 만 숨김 → 본 항목은 모든 operator 에게 표시. |

> **전제 정정:** WO 는 "KPA 사이드바 메뉴 미노출" 을 전제했으나, 코드상 메뉴는 **이미 노출**되어 있었다(라벨 '상품 신청 관리'). GP/KCos 와의 실제 차이는 **메뉴명**뿐. 따라서 본 작업은 "메뉴 추가" 가 아니라 **메뉴명 정렬**로 귀결.

## 4. Phase 2 — 사이드바 메뉴 정렬

`services/web-kpa-society/src/config/operatorMenuGroups.ts`:
- `UNIFIED_MENU.approvals` (활성) 와 `OPERATOR_MENU_ITEMS.approvals` (@deprecated, 미소비) 양쪽의
  `'상품 신청 관리'` → **`'공급 상품 신청 승인'`** (path `/operator/product-applications` 유지, group `approvals` 유지).
- GP/KCos 와 메뉴명·그룹·path 동일 정렬. icon/그룹 위치 무변경(approvals 그룹 내 기존 위치 유지).

## 5. Phase 3 — 명칭 잔재 확인

- `판매자 모집` / `B2B 승인` / `B2C 상품 승인` / `상품 판매 승인` in `operatorMenuGroups.ts` → **0건**.

## 6. 제외/무변경 항목

backend / DB / migration / ProductApprovalV2Service / operator-product-applications controller / GP/KCos / Neture / EventOffer / storefront·channel·OPC / checkout·order·cart / 유통참여형 펀딩·Market Trial — 전부 무변경.
KPA route/page 동작 무변경(메뉴 라벨 문자열만 변경). KPA 페이지 H1('상품 판매 신청 관리')은 기존 유지(무회귀).

## 7. 검증 결과

- ✅ `pnpm --filter @o4o/web-kpa-society exec tsc --noEmit` → **0 errors**.
- ✅ diff = `operatorMenuGroups.ts` 단일 파일, 2개 라벨 정렬(+주석).
- ✅ 금지 명칭 0건.
- ✅ GP/KCos 무변경(본 작업 파일 단일).
- 주의: 동시 세션 LMS WIP(`OperatorLmsCoursesPage` ×3, `operator-core-ui/modules/lms-courses`) 존재 — 본 WO 파일과 무관/무중복, path-specific staging 으로 격리.
- Browser smoke(배포 후 권장): KPA operator 사이드바 '공급 상품 신청 승인' 클릭 → `/operator/product-applications` 정상 진입/렌더.

## 8. 완료 판정

✅ **완료.** KPA 사이드바 메뉴명을 '공급 상품 신청 승인'으로 GP/KCos 와 정렬(메뉴는 기존부터 노출 중이었음 — 전제 정정). route/page/backend/DB 무변경, tsc PASS.

## 9. 후속 작업

1. `IR-O4O-STORE-ORDERABLE-PRODUCT-ACTIVATION-POLICY-V1` — OPL active vs storefront channel gate 분리 정책 문서화.
2. `WO-O4O-SUPPLY-CATALOG-APPROVAL-FLOW-DOCUMENTATION-V1` — 신청→승인→주문 가능 편입→진열 운영자 가이드.

---
*End of CHECK-O4O-KPA-PRODUCT-APPLICATIONS-MENU-EXPOSURE-V1*
