# CHECK-O4O-KPA-STORE-MULTILINGUAL-PRODUCT-CONTENT-ENTRY-LINK-V1

> WO: `WO-O4O-KPA-STORE-MULTILINGUAL-PRODUCT-CONTENT-ENTRY-LINK-V1`
> 근거 IR: `docs/investigations/IR-O4O-KPA-MY-STORE-FULL-STRUCTURE-AUDIT-V1.md` (G1 첫 항목)
> 상태: **DONE**
> 일자: 2026-07-27

---

## 1. 작업 요약 (한 줄)

인바운드 진입점이 없어 **UNREACHABLE** 상태였던 기존 매장 다국어 상품콘텐츠 저작 화면
(`StoreProductMultilingualContentPage`, `/store/products/multilingual/:targetKind/:targetId`)을
**매장 경영활용 제품**(`/store/handled-products`)의 단건 선택 액션에 진입 버튼으로 연결했다.
신규 저작/AI/번역 기능은 만들지 않았고, 진입점(link)만 추가했다.

---

## 2. 조사·확정 (Investigation)

### 2.1 진입점 후보 선정 (WO §6.1)

- 우선순위 1 = **매장 경영활용 제품**(`StoreHandledProductsPage`) 단건 선택 ActionBar.
- 근거: 해당 화면 부제가 이미 *"실제 작업(매장용 상세설명 보기 / 콘텐츠 만들기 / 다국어 QR)은 제품을 선택한 뒤 수행합니다"* 를 약속하고 있고, 형제 액션(`매장용 상세설명서 보기`, `상품 QR 출력`)이 이미 단건 선택 컨텍스트에 존재한다.

### 2.2 route 계약 정합성 (WO §12 중단조건 검사)

| 항목 | handled-products | 대상 route param | 판정 |
|------|------------------|------------------|------|
| kind | `HandledProductSource = 'listing' \| 'local'` | `StoreMlcTargetKind = 'local' \| 'listing'` (`isTargetKind`) | **완전 일치** |
| id | `HandledProduct.sourceId` | `targetId` | 그대로 전달 가능 |
| 표시명 | `HandledProduct.name` | `?name=` (표시 + 신규 제목 prefill) | 전달 |

- 현재 handled-products 는 `source:'listing'` 만 조회하므로 실 데이터는 전부 `sourceType='listing'`.
- 코드는 `singleSelected.sourceType` 을 하드코딩하지 않고 그대로 route param 에 넣으므로, 향후 local 행이 노출되어도 정상 동작.
- **§12 중단조건(식별자 불일치) 미해당** → 강제 매핑 없이 진행 확정.

### 2.3 권한 정합성 (WO §8)

- 진입 출발지(`/store/handled-products`)·도착지(`/store/products/multilingual/*`) 모두 `PharmacyOwnerOnlyGuard` 하위(App.tsx). 권한 낙차 없음.
- `PharmacyOwnerOnlyGuard` 는 제거/확장하지 않음 (G10 별도 작업).

---

## 3. 변경 내용 (Implementation)

**단일 파일**: `services/web-kpa-society/src/pages/pharmacy/StoreHandledProductsPage.tsx`

1. import: `useNavigate` (react-router-dom), `Languages` (lucide-react) 추가.
2. `const navigate = useNavigate();` 추가.
3. 단건 선택(`singleSelected`) ActionBar 에 **다국어 콘텐츠** 버튼 추가:
   ```
   navigate(`/store/products/multilingual/${sourceType}/${sourceId}?name=${encodeURIComponent(name)}`)
   ```
   배치: `매장용 상세설명서 보기`(조회) → **`다국어 콘텐츠`(저작)** → `상품 QR 출력`(고정 QR).
4. `styles.langBtn` (indigo `#EEF2FF`/`#4338CA`) 추가 — 기존 보라색 `mlcBtn`(고정 QR 버튼 사용중)과 시각 구분.

기존 `상품 QR 출력`(ProductMaster 기준 고정 QR)과 신규 `다국어 콘텐츠`(store_created 다국어 그룹 저작)는 목적이 다르며 공존.

---

## 4. WO 준수 확인 (경계 준수)

| WO 항목 | 준수 |
|---------|------|
| §6.2 신규 사이드바 메뉴/섹션 없음 | ✅ storeMenuConfig / store-ui-core 무변경 |
| §8 신규 테이블·migration·데이터 복사 없음 | ✅ 코드 진입점만 |
| §8 OwnerOnlyGuard 변경 없음 | ✅ |
| §9 Shared Module 무변경 (KPA-only 처리) | ✅ 단일 KPA 페이지 파일만 수정 |
| §11 신규 다국어 엔진/AI/번역/언어 없음 | ✅ |
| 저장 후 워크플로 미파손 | ✅ 대상 화면 back-nav 가 이미 `/store/handled-products` 로 복귀 |

---

## 5. 검증

- `npx tsc --noEmit` (web-kpa-society): **PASS** (에러 0).
- 정적 경로 검증: 생성 URL `/store/products/multilingual/{listing|local}/{id}?name=` → 대상 route `isTargetKind` 통과 + `targetId` 존재 → 정상 로드 경로.

> 브라우저 smoke: 배포 후 store-owner 계정으로 handled-products → 단건 선택 → `다국어 콘텐츠` → 저작 화면 진입/저장/복귀 확인 권장(배포 파이프라인 후속).

---

## 6. 후속 (본 WO 범위 외)

- G1 잔여: `/store/execution/product-info`(StoreProductInfoCreatorPage) UNREACHABLE 처리 — **곧바로 노출하지 않고**, 기존 상품 설명 / 제작 자료 / 상품별 마케팅과 역할 중복 여부를 먼저 판정하는 read-only 조사 (사용자 확인 후 착수).
- G10: `PharmacyOwnerOnlyGuard` 일관화 (공통 store-ui-core = Shared Module Protocol, GP/K-Cos 동시영향).
