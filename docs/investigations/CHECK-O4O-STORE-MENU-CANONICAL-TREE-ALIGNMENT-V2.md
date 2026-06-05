# CHECK-O4O-STORE-MENU-CANONICAL-TREE-ALIGNMENT-V2

> `WO-O4O-STORE-MENU-CANONICAL-TREE-ALIGNMENT-V2` 수행 결과
> (선행: `WO-O4O-MY-STORE-PRODUCT-CENTERED-ACTIVATION-V1` 1차)

- **작업일:** 2026-06-05
- **분류:** CHECK (구현 검증)
- **상태:** 1차 완료 (메뉴 재배치 한정)
- **상위:** `docs/baseline/O4O-STORE-MENU-CANONICAL-TREE-V1.md` §9.3 W9

---

## 1. 목적

V1(`...PRODUCT-CENTERED-ACTIVATION-V1`)이 운영/활성화 축을 1차 분리했으나,
실사용 검토에서 (a) 상품·거래 그룹이 최상단 핵심으로 정렬되지 않았고,
(b) "상품"(거래·주문 대상)과 "제품"(활성화 자료 제작 기준 데이터) 용어가 섞여 있었음.
V2는 이를 최신 canonical tree 기준으로 바로잡는 **메뉴 재배치·라벨 정리 한정** 작업.

## 2. 재실측 결과 (핵심)

3개 서비스 `/store` 라우트 정의(App.tsx)와 메뉴 config 대조. 핵심 발견:

| 항목 | KPA | GlycoPharm | K-Cosmetics |
|------|-----|-----------|-------------|
| 공급자/거래 상품 라우트 | `/commerce/products` ✅ (PharmacyB2BPage) | `/products` ❌ 미마운트 · 실 화면 `/management/b2b` ✅ | ❌ 없음 |
| 거래 신청 라우트 | ❌ (`/requests`=상담요청만) | `/b2b-order` ✅ | ❌ 없음 |
| 상품 설명 | `/marketing/product-descriptions` ✅ | `/library/product-descriptions` ✅ | `/library/product-descriptions` ✅ |
| 매출/정산 | ❌ 없음 | `/billing` ✅ | `/commerce/billing` ✅ |
| 분석 상품성과/콘텐츠·채널성과 | ❌ 없음 | ❌ 없음 | ❌ 없음 |
| 노출 설정 | ❌ 없음 | ❌ 없음 | ❌ 없음 |
| 실기능 보존 대상 | 태블릿·상담요청 | 퍼널·약국 경영·정산·콘텐츠 가져오기·태블릿 | 태블릿 |

→ **원칙 확정: 데드링크 생성 0 / 실기능 메뉴 은폐 0.** 라우트 없는 항목은 미추가,
실기능 메뉴는 가까운 그룹에 보존(WO §9 기능 제거 금지 · §12.3 금지목록 미포함).

## 3. 적용 결과 (config: `packages/store-ui-core/src/config/storeMenuConfig.ts`)

### 3.1 KPA-Society (내 약국)
```
홈 / 약국 상품·거래[상품(/commerce/products)·주문 관리]
  / 약국 활성화[내 약국 제품·상품 설명·블로그·POP·QR-code]
  / 약국 자료함[콘텐츠·자료·제작 자료] / 디지털 사이니지[4]
  / 채널[채널 관리·태블릿·상담 요청] / 분석[마케팅 분석] / 설정[약국 정보·매장 설정]
```

### 3.2 GlycoPharm (내 약국)
```
대시보드 / 약국 상품·거래[상품(/management/b2b)·거래 신청(/b2b-order)·주문 관리]
  / 약국 활성화[내 약국 제품·자체 상품·상품 설명·블로그·POP·QR 코드]
  / 약국 자료함[콘텐츠·자료·제작 자료] / 디지털 사이니지[4]
  / 마케팅·채널[전환 퍼널·콘텐츠 가져오기·채널 관리] / 분석[마케팅 분석]
  / 경영[약국 경영·정산/인보이스] / 설정[약국/사업자 정보·설정]
```
- **데드링크 정리:** `/products`, `/market-trial`(둘 다 미마운트) 메뉴 제거.

### 3.3 K-Cosmetics (내 매장)
```
홈 / 매장 상품·거래[주문 관리]  (공급자 상품/거래 신청 라우트 부재)
  / 매장 활성화[내 매장 제품·자체 상품·상품 설명·블로그·POP·QR 코드]
  / 내 자료함[콘텐츠·자료·매장 제작 자료] / 디지털 사이니지[4]
  / 채널[채널 관리·태블릿] / 분석[마케팅 분석·매출 요약] / 설정[매장/사업자 정보·매장 설정]
```
- 매출 요약을 상품·거래 → **분석**으로 이동(§2.6).

### 3.4 사이드바 컴포넌트 보강
- `StoreSidebar.tsx`: NavLink active 판정에 `management` 키를 `end`(정확 일치) 처리 추가 —
  GP `상품(/management/b2b)` 과 `약국 경영(/management)` 의 prefix 중복 하이라이트 방지.

## 4. WO 트리와의 의도적 편차 (사유 명시)

| 편차 | 사유 |
|------|------|
| 거래 신청 = GP만 | KPA/KC 전용 라우트 부재 → 데드링크 방지 |
| 분석에 상품 성과·콘텐츠/채널 성과 미추가 | 3개 서비스 모두 라우트 없음 |
| 노출 설정 미추가 | 라우트 없음 → 기존 "설정/매장 설정" 유지 |
| 채널/경영/마케팅 그룹 보존 | 퍼널·경영·정산·태블릿·상담요청은 실기능(은폐 금지) |
| KC 상품·거래 = 주문 관리만 | KC는 공급자 거래 상품 화면 자체가 없음 |

## 5. 검증

### 5.1 정적
- `store-ui-core` TypeScript: **PASS** (`npx tsc --noEmit`, EXIT 0)
- 모든 메뉴 subPath = 마운트된 라우트와 1:1 (재실측 §2 기준). 신규 데드링크 0.

### 5.2 메뉴 (배포 후 brower smoke 권장)
- [ ] KPA/GP `약국 상품·거래` 최상단 노출
- [ ] 활성화 앵커가 `내 매장/약국 제품`(제품 용어)으로 표기
- [ ] 사이드 상위에 `O4O 제품 운영`/`상품 카탈로그`/`이벤트 상품`/`신청 내역`/`거래처·공급자` 미노출
- [ ] 디지털 사이니지 별도 그룹 유지(제품 하위 미이동)
- [ ] GP `상품`·`약국 경영` 동시 하이라이트 없음

## 5.3 배포 후 smoke 실패 → 공통 capability 필터 문제 (2026-06-05)

배포·시크릿 모드 확인에도 KPA `/store` 에 `약국 상품·거래` 그룹이 렌더되지 않음. 캐시/배포가 아닌 **렌더링 경로 문제**로 판정.

**근본 원인 (KPA 개별이 아닌 공통 정책 문제):**
- `약국 상품·거래` 그룹의 item 은 `products` / `orders` 둘뿐.
- `packages/store-ui-core/src/config/menuCapabilityMap.ts` 에서 `products`/`orders` → `B2C_COMMERCE` 매핑.
- 매장에 `B2C_COMMERCE` capability row 가 없으면 `resolveStoreMenu` 가 두 item 을 필터 → 빈 섹션 → 그룹 통째로 제거.
- 이는 qr/pop/library 가 이미 동일 사유(capability row 누락)로 de-map 된 선례와 같은 클래스의 문제.
- **상품·거래는 KPA/GlycoPharm/K-Cosmetics 모두에서 최상단 핵심 업무축** → capability 필터로 숨겨선 안 됨.

**수정 (공통 정책 — KPA 단독/ DB backfill/ 특수 예외 로직 미사용):**
- `MENU_CAPABILITY_MAP` 에서 `products` / `orders` 매핑 제거(de-map) → 3개 서비스 공통으로 항상 표시.
- 서비스별 실제 노출 차이는 각 config 의 items(라우트 존재분)로 유지. KPA=상품·주문 관리, GP=상품(/management/b2b)·거래 신청·주문 관리, KC=주문 관리.
- DB backfill / migration 없음. 후속: `store_capabilities` row backfill 시 재매핑 검토.
- `store-ui-core` TypeScript: **PASS** (EXIT 0).

**배포 후 재-smoke 필요 (3개 서비스 공통):**
- [ ] KPA `/store` — 홈 아래 `약국 상품·거래` 표시, `약국 활성화`보다 위
- [ ] GlycoPharm `/store` — `약국 상품·거래` 최상단 유지 + `상품(/management/b2b)`·`약국 경영`·`정산`·`콘텐츠 가져오기` 실기능 미은폐
- [ ] K-Cosmetics `/store` — `매장 상품·거래` 최상단 유지 + 상품/주문/분석 메뉴 미소실

## 6. 범위 외 (후속)
- 제품 row action(상품설명/POP/QR/블로그/활용자료) 통일 — 화면 로직
- 상품/거래신청 화면 내부 탭·필터·배지(거래 가능/이벤트/공급자별 등)
- 자료함 출처/용도 탭 정리
- 디지털 사이니지 내부 탭(동영상/플레이리스트/방영 설정)
- KC 공급자 상품·거래 신청 화면 신설 여부 결정

---

**작성:** O4O Platform Team · 2026-06-05
