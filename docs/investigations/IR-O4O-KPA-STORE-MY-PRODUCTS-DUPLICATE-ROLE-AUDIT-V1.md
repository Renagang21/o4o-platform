# IR-O4O-KPA-STORE-MY-PRODUCTS-DUPLICATE-ROLE-AUDIT-V1

> 유형: read-only 조사 (코드 변경 0 / DB write 0 / route·메뉴 변경 0 / 배포 0)
> 근거 상위 IR: `docs/investigations/IR-O4O-KPA-MY-STORE-FULL-STRUCTURE-AUDIT-V1.md` (G3 / P2 "my-products DUPLICATE")
> 일자: 2026-07-27

---

## 1. 한 줄 판정

**판정 = C (별도 업무 역할 존재).**
`/store/my-products`(StoreProductsManagerPage)와 `/store/handled-products`(StoreHandledProductsPage)는 **같은 데이터(OPL, `organization_product_listings`)를 공유하지만 서로 다른 관리 기능 집합을 가진 상보적 화면**이다.
상위 감사(FULL-STRUCTURE-AUDIT)의 **"DUPLICATE" 판정은 데이터 중복 휴리스틱에 근거한 것으로, 기능 관점에서는 뒤집힌다**:
- **가격 편집 · 활성/비활성 토글 · 채널 노출 관리 · 이미지 관리**는 **오직 my-products에만** 존재한다.
- **상품 제거(unlink) · STORE 상세설명서 조회 · 다국어 콘텐츠 · 상품 QR · 신규 상품 등록 요청**은 **오직 handled-products에만** 존재한다.
→ my-products를 은퇴하고 handled-products로 redirect 하면 **OPL 가격·상태·채널·이미지 관리 기능이 사용자에게서 사라지는 회귀(regression)** 가 발생한다. 따라서 **A(완전 중복 은퇴)·B(흡수 후 은퇴) 불가**. 외부 URL 계약·앱 딥링크 의존은 없어 **D 아님**. → **C**.

---

## 2. 두 화면 현재 계약

| 항목 | handled-products | my-products |
|---|---|---|
| Route | `/store/handled-products` (사이드바 노출: "매장 경영활용 제품") | `/store/my-products` (사이드바 미노출 — hidden-but-reachable) |
| Component | `services/web-kpa-society/.../StoreHandledProductsPage.tsx` (**KPA 전용**) | `packages/store-products-ui/src/StoreProductsManagerPage.tsx` (**공유 `@o4o/store-products-ui`, 4서비스**) |
| Route guard | `PharmacyOwnerOnlyGuard` (App.tsx:986) | `PharmacyOwnerOnlyGuard` (App.tsx:977) |
| KPA 라벨 | 고정 | prop 주입: title="취급 중인 O4O 제품", registerButtonLabel="O4O 제품 취급 등록" (App.tsx:978-983) |

---

## 3. 인바운드 전수 조사

저장소 전체 검색(`/store/my-products`, `my-products`, `StoreProductsManagerPage`, `navigate(...)`, `route:`) 결과.

| 참조 위치 | 유형 | 활성 | 사용자 도달 | 대체 route |
|---|---|---|---|---|
| `StoreTabletDisplaysPage.tsx:1429` | 페이지 내부 버튼 "취급 중인 O4O 제품 관리 →" | ✅ | ✅ | 없음(등록·관리 진입) |
| `StoreTabletDisplaysPage.tsx:1473` | 페이지 내부 버튼 "취급 중인 O4O 제품 등록"(빈 풀 CTA) | ✅ | ✅ | 없음 |
| `shared-space-ui/guide/copy/kpa.ts:1735` | 가이드 설명 텍스트("상품 마스터 — 취급 상품 정보·가격·재고") | 부분 | 표시만 | — |
| `MobileBottomNav.tsx:51` | 경로 매칭 정규식(슬러그 판별용) | ✕ | ✕ | 링크 아님 |
| `AuthContext.tsx:77` | 주석 | ✕ | ✕ | — |
| `storeMenuConfig.ts:274` | 주석("흡수" 경위 설명) | ✕ | ✕ | 사이드바 메뉴는 이미 제거됨 |
| `docs/**` 다수 IR | 문서 참조 | ✕ | ✕ | (활성 인바운드 아님) |

**KPA 활성 인바운드 = 2건**(둘 다 태블렛 진열 편집 화면에서 "취급 O4O 제품 관리·등록" 진입). → my-products는 고립 route가 아니라 **태블렛 워크플로가 의존하는 등록·관리 진입점**이다.

**교차 서비스(KPA 범위 외, 그러나 컴포넌트 삭제 불가 근거):**
- Neture `web-neture/App.tsx:921` — `/store/my-products` + guideSlot
- K-Cosmetics `web-k-cosmetics/App.tsx:789` — title "O4O 주문 가능 상품"
- GlycoPharm `web-glycopharm/App.tsx:994` — title "O4O 주문 가능 상품"
→ `StoreProductsManagerPage`는 **4서비스 공유 컴포넌트**. handled-products는 KPA 전용 로컬 페이지.

---

## 4. API·데이터 계약 비교

| 항목 | handled-products | my-products |
|---|---|---|
| List API | `GET /api/v1/store/handled-products` (source='listing' 고정) | `GET /api/v1/store/products` |
| 응답 entity | `HandledProduct` | `StoreListingItem` |
| 기준 테이블 | OPL (서버는 OPL+local 통합 가능하나 화면은 listing만) | OPL |
| sourceType | `'listing'` 하드코딩 (local 정책 폐기) | 단일 OPL |
| ProductMaster 연결 | O(masterId) | O(masterId) |
| OPL 연결 | O | O(id=OPL.id) |
| store_local_products | 서버 지원하나 화면 미사용 | ✕ |
| 등록(register) API | `POST /api/v1/store/products/list` (AddO4oStandardProductModal) | `POST /api/v1/store/products/list` (RegisterModal) — **동일 엔드포인트** |
| 검색 API | debounced `search` param(list) | `GET /store/products/search` (등록 모달 내부) |
| 페이지네이션 | 서버 page+limit(20/50/100) | 서버 page, PAGE_SIZE=20 |
| 정렬 | 없음 | 없음 |
| 권한(backend) | route OwnerOnly | `requireAuth + requireStoreOwner` (api.ts:14) |

**핵심 확인:**
- 둘 다 실제로 OPL을 조회·기록한다(**둘 다 read-only 아님**).
- **List API는 서로 다르다**(`/handled-products` vs `/products`). 단 **등록·검색 엔드포인트는 공유**(`POST /store/products/list`, `GET /store/products/search`).
- my-products가 legacy/다른 entity를 섞지 않는다 — 순수 OPL.

---

## 5. 기능 비교

| 기능 | handled-products | my-products | 고유 |
|---|:--:|:--:|:--|
| 상품 목록 | ✅ | ✅ | 공통 |
| 상품 검색(list) | ✅(debounced) | ✕(등록 모달 내부만) | **handled 고유** |
| 상품 추가(register OPL) | ✅ | ✅ | 공통(동일 엔드포인트, 모달만 상이) |
| 상품 제거(unlink) | ✅ (`POST /handled-products/remove`) | ✕ | **handled 고유** |
| 가격 변경 | ✕ | ✅ (`PATCH /store/products/{id}`) | **my-products 고유** |
| 활성·비활성 | ✕ | ✅ (`PATCH {isActive}`) | **my-products 고유** |
| 설명 편집 | ✕(조회 전용) | ✅ (`PATCH /store/products/{offerId}/description`) | **my-products 고유** |
| 채널 노출 설정 | ✕(각 채널 메뉴 안내) | ✅ (`/store/channel-products/*`) | **my-products 고유** |
| 이미지 관리 | ✕ | ✅ (`/store/products/master/{id}/images`) | **my-products 고유** |
| STORE 상세설명서 조회 | ✅(모달) | ✕ | **handled 고유** |
| 다국어 콘텐츠 진입 | ✅(`/products/multilingual/...`) | ✕ | **handled 고유** |
| 상품 QR 출력·export | ✅(`/handled-products/qr`) | ✕ | **handled 고유** |
| 신규 상품 등록 요청 | ✅ | ✕ | **handled 고유** |
| POP / marketing | ✕ | ✕ | (둘 다 없음) |

판정 기준 적용:
- **상품 추가**: 같은 엔드포인트·같은 결과 → **중복(통합 후보)**. 단 모달 UX만 상이.
- **가격/활성/설명/채널/이미지**: my-products에만 존재하는 **실 데이터 변경 필수 기능** → **고유**.
- **제거/설명서/다국어/QR/신규요청**: handled-products에만 존재 → **고유**.
→ 두 화면은 **register만 겹치고 나머지 관리 기능은 상보적으로 분리**돼 있다.

---

## 6. 권한 비교

- 두 route 모두 `/store` 하위(PharmacyGuard) + 추가 `PharmacyOwnerOnlyGuard`. 권한 낙차 없음.
- backend: my-products = `requireAuth + requireStoreOwner`. handled-products = OwnerOnly route.
- my-products는 사이드바 미노출이나 **인가된 hidden deep route**(태블렛·가이드에서 진입) — 고립·과권한 route 아님.
- 분류: **인가된 hidden deep route** (legacy 호환 route도, 고립 중복 route도, 과권한 route도 아님).

---

## 7. 사용자 업무 목적

- **handled-products** = "우리 약국이 **경영에 활용할** O4O 제품은 무엇이며, 각 제품의 **상세설명서·다국어·QR·제거·신규요청**을 어떻게 다룰 것인가?" (경영활용·콘텐츠 축)
- **my-products** = "취급 등록한 O4O 제품의 **가격·판매 활성 상태·채널 노출·이미지**를 어떻게 **관리·설정**할 것인가?" (listing 상세 운영 축)

두 번째 질문에 대한 답(가격·상태·채널·이미지 write)이 **handled-products에는 존재하지 않는다** → 이름만 비슷할 뿐 **별개의 업무 목적**. "중복" 아님.

---

## 8. 프로덕션 확인 결과

- 본 조사는 **코드 확정** 범위로 수행(read-only 코드 근거). 프로덕션 DB/액세스 로그 조회는 판정에 불필요(기능 존재/부재는 코드로 확정됨).
- **프로덕션 확인 필요(완결성, 판정 불변)**:
  - `[프로덕션 확인 필요]` my-products의 가격/활성/채널/이미지 액션 실제 사용 빈도(access log) — 유지 우선순위 참고용.
  - `[구조상 추정]` OPL 가격·활성 편집이 다른 화면(예: `PharmacySellPage /commerce/products/b2c` 진열·채널 편집)에서도 부분 가능한지 — 만약 완전 대체 가능하면 B로 재판정 여지. 현재 감사 두 화면 범위에서는 my-products가 유일 surface.

---

## 9. 최종 판정 — C (별도 역할 존재)

§12 기준 대조:
- 다른 업무 목적: ✅ (listing 상세 운영 vs 경영활용·콘텐츠)
- 별도 사용자 진입 필요: ✅ (태블렛 등록·관리 진입 2건 활성)
- handled-products에 합치면 복잡도 증가: ✅ — my-products는 **공유 4서비스 컴포넌트**로 가격/활성/채널/이미지 write를 담당. KPA 전용 handled-products로 이 기능을 이식하면 (a) 공유 로직 KPA 전용 중복, (b) GP/KCos/Neture와의 cross-service parity 붕괴.
- A 제외(회귀 발생), B 제외(은퇴 종착 = 회귀), D 제외(외부 계약·딥링크 의존 없음).

---

## 10. 권장 유지·정리 방향

1. **`/store/my-products` route 유지** — 인가된 hidden deep route. 은퇴/ redirect 하지 않는다(회귀 방지).
2. **역할 명칭 유지** — 이미 "취급 중인 O4O 제품"으로 재프레이밍 완료(App.tsx:978). handled-products="매장 경영활용 제품"과 축이 구분됨.
3. **사이드바 재노출 불필요** — handled-products가 사이드바 진입점. my-products는 태블렛/handled-products에서 맥락 진입.
4. **잔여 실제 중복 = register 진입만** — 두 화면이 동일 `POST /store/products/list`로 OPL을 생성하되 모달(AddO4oStandardProductModal vs RegisterModal)이 별개. 이 **등록 진입 이원화**만 후속에서 정리 대상.
5. **상보 관계 명시(선택)** — handled-products(경영활용)에서 가격·채널·상태 관리로 넘어갈 때 my-products로 명시 링크(태블렛 화면과 동일 패턴)하면 "두 화면이 왜 따로인가"를 사용자에게 해소.

---

## 11. 후속 WO 1개 (제안 — 핸드오프 전용, 자동 실행 아님)

**`WO-O4O-KPA-STORE-HANDLED-VS-MYPRODUCTS-ROLE-CLARIFICATION-V1`**

- 목적: 두 화면을 **은퇴가 아닌 역할 명시**로 정리. (a) handled-products 행 액션/상세에서 **가격·채널·상태·이미지 관리가 필요하면 my-products("취급 중인 O4O 제품")로 진입**하도록 명시 링크 추가(태블렛 패턴 재사용), (b) 등록 진입 이원화(AddO4oStandardProductModal vs RegisterModal, 동일 엔드포인트) 통합 여부 별도 판단.
- 경계: 공유 `@o4o/store-products-ui` 무변경(또는 변경 시 Shared Module Protocol + GP/KCos/Neture 전 소비처 검증), route 삭제 0, OPL/API/DB 무변경, KPA StoreHandledProductsPage 링크 추가 수준.
- 중지 조건: 가격/활성 OPL 편집이 `PharmacySellPage(/commerce/products/b2c)` 등에서 완전 대체 가능함이 확인되면 → 본 IR을 **B로 재판정**하는 별도 조사 선행.

---

## 부록 — 하지 않은 것 (WO §14 준수)

StoreProductsManagerPage/StoreHandledProductsPage 수정·삭제 0 · route/redirect 0 · 사이드바/store-ui-core 0 · API 통합 0 · 데이터 이전 0 · OPL/store_local_products 0 · PharmacySellPage/OwnerOnlyGuard 0 · DB write 0 · migration 0 · 배포 0. **조사 문서만 작성.**
