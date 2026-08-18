# CHECK-O4O-STORE-HUB-MAIN-INDEPENDENT-PRODUCTION-VERIFICATION-V1

- **WO**: `WO-O4O-STORE-HUB-MAIN-INDEPENDENT-PRODUCTION-VERIFICATION-V1`
- **수행**: Agent A (독립 재검증)
- **일자**: 2026-08-18
- **대상**: KPA-Society / K-Cosmetics / GlycoPharm / Pharmacy-Hub (+ Neture = 공급자→매장 backend 계약 회귀 한정)
- **성격**: 이전 Agent D 의 CHECK/완료 보고를 **근거로 쓰지 않고**, main 코드 · route · production 을 다시 확인했다.

---

## 1. main 기준 확정 (§1)

| 항목 | 값 |
|---|---|
| 검증 시작 base | `origin/main` fast-forward 동기화 후 |
| 작업 트리 | 시작 시 clean (다른 세션 dirty/staged 없음) |
| 수정 반영 커밋 | `114f7d0d4` `fix(store-hub): close independent production verification findings` |
| push | `origin/main` (0e6902dc4 → 114f7d0d4) |

---

## 2. 독립 census (§2)

이전 보고의 "32 기능" 수치는 근거로 쓰지 않았다. **매장 HUB 진입 이후 매장이 실제로 수행하는 흐름**을
축으로 다시 세었다. 모집단은 `축 × 서비스` 셀이다.

판정값: `FULLY_COMMON` / `CORE_ONLY` / `VIEW_DUPLICATED` / `SERVICE_SPECIFIC` / `NOT_IMPLEMENTED` / `OUT_OF_SCOPE`

| # | 축 | KPA | K-Cos | GlycoPharm | Pharmacy-Hub |
|---|---|---|---|---|---|
| 1 | Store Hub 랜딩(진입 카드) | FULLY_COMMON | FULLY_COMMON | FULLY_COMMON | FULLY_COMMON |
| 2 | B2B 공급 카탈로그 탐색 | FULLY_COMMON | FULLY_COMMON | FULLY_COMMON | FULLY_COMMON |
| 3 | 상품 상세 · 신청/담기 | FULLY_COMMON | FULLY_COMMON | FULLY_COMMON | SERVICE_SPECIFIC |
| 4 | 장바구니 | FULLY_COMMON | FULLY_COMMON | FULLY_COMMON | SERVICE_SPECIFIC |
| 5 | 주문(buyer ledger) 목록 | FULLY_COMMON | FULLY_COMMON | FULLY_COMMON | SERVICE_SPECIFIC |
| 6 | 주문 상세 | CORE_ONLY | CORE_ONLY | CORE_ONLY | SERVICE_SPECIFIC |
| 7 | 결제 전 주문 취소 | FULLY_COMMON | FULLY_COMMON | FULLY_COMMON | SERVICE_SPECIFIC |
| 8 | 이벤트 오퍼(HUB) | FULLY_COMMON | FULLY_COMMON | FULLY_COMMON | NOT_IMPLEMENTED |
| 9 | HUB 콘텐츠(설명서) 라이브러리 | FULLY_COMMON | FULLY_COMMON | FULLY_COMMON | SERVICE_SPECIFIC |
| 10 | HUB 블로그 라이브러리 | FULLY_COMMON | FULLY_COMMON | FULLY_COMMON | SERVICE_SPECIFIC |
| 11 | HUB POP 라이브러리 | FULLY_COMMON | FULLY_COMMON | FULLY_COMMON | SERVICE_SPECIFIC |
| 12 | HUB QR 라이브러리 | FULLY_COMMON | FULLY_COMMON | FULLY_COMMON | SERVICE_SPECIFIC |
| 13 | HUB 사이니지 라이브러리 | FULLY_COMMON | FULLY_COMMON | FULLY_COMMON | SERVICE_SPECIFIC |
| 14 | 매장 legal/footer 노출 | FULLY_COMMON | FULLY_COMMON | FULLY_COMMON | CORE_ONLY |
| 15 | HUB 확장 자산(영상 · Screen Set · 다국어) | SERVICE_SPECIFIC | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED |

**전체 모집단: 60** (15 축 × 4 서비스)
**미조사: 0**

판정 근거(요약):

- **FULLY_COMMON** — 화면 뼈대·표현이 공통 패키지 소유이고 서비스 파일은 config·adapter·slot 만 가진다.
  근거 컴포넌트: `StoreHubTemplate`(shared-space-ui), `SupplyCatalogHub` · `StoreCartView` ·
  `BuyerOrderLedgerView` · `EventOfferHubView` / `EventOffersHubList` · `HubImportLibraryView` ·
  `SignageLibraryView` · `ContentHubTemplate` · `StoreFacingFooter`.
  예: KCos/GP 이벤트 오퍼 페이지 33L, HUB 블로그/POP/QR 각 100L 전후 = 전부 config 파일이다.
- **CORE_ONLY** — 계약(API·훅)은 공통인데 표현은 서비스가 소유한다. 6번(주문 상세)은 목록 본문이
  `renderList` slot 이라 KPA 표/GP 확장 카드/KCos 표+패널로 형태가 다르다. 14번 PH 는 legal 값 계약
  (`PublicLegalFooterInfo`)만 공통이고 푸터 마크업은 PH 자체다(다른 서비스 inline style 사본을 만들지 않음).
- **SERVICE_SPECIFIC (PH 3~13)** — PH 는 **결제 우선(paymentGroup)** 계약이다. 결제 전 주문을
  "접수됨"으로 표현하지 않는 고유 규칙이 있어 buyer ledger 와 합치지 않는다(`BuyerOrderLedgerView` 주석에 명문화).
  9~13 은 PH 의 "내 매장 실행 자산 관리"이고 HUB 가져오기 라이브러리와 업무가 다르다.
- **SERVICE_SPECIFIC (15 KPA)** — 영상 · Screen Set · 다국어 상품 콘텐츠는 KPA 에만 있는 축이라
  공통화 대상 counterpart 가 없다.

### VIEW_DUPLICATED = 0 근거

`VIEW_DUPLICATED` 판정은 **같은 업무를 하는 화면이 서비스마다 따로 구현된 경우**에만 준다.
15 축 전수에서 해당 사례를 찾지 못했다. 확인 방식:

- 각 서비스 hub 페이지 파일 전수 확인 → 전부 공통 View import + config (KPA `HubB2BCatalogPage` 94L,
  KCos `HubContentPage` 124L, GP `HubContentListPage` 125L, KCos/GP `HubSignage*` 108L 동일 구조 등).
- 남은 대형 파일 3개(KPA `HubVideoLibraryPage` 368L, `HubScreenSetLibraryPage` 519L,
  `KpaEventOfferPage` 546L)를 개별 확인 — 앞 2개는 counterpart 없는 KPA 전용 축이고,
  `KpaEventOfferPage` 는 이미 `EventOfferHubView` 를 쓰고 KPA 고유 업무(4탭 · 공급업체 묶음 담기 ·
  운영자 통계)를 slot 으로 유지한다.

---

## 3. Core/API 중복 (§3)

- 정리 가능한 Core 중복: **0**
- 정리 가능한 API 중복: **0**
- 이번 WO 에서 오히려 **공통 조각을 하나 추가**했다 — `useBuyerOrderCancel` + `BuyerOrderCancelButton`.
  3 서비스가 각자 취소 UI 를 만들면 그 자체가 새 `VIEW_DUPLICATED` 가 되기 때문이다.
- 삭제: `services/web-kpa-society/src/pages/pharmacy/StoreOrderDetailDrawer.tsx` (참조 0 · seller 관점 잔재).

> 다음은 완료 근거로 쓰지 않았다: route 존재 / build PASS / CHECK 문서 존재 / 이전 에이전트의 COMPLETE 선언.

---

## 4. 발견 결함 (§9 · §10)

| ID | 결함 | 영향 서비스 | 분류 | 처리 |
|---|---|---|---|---|
| F-A | 결제 전 주문 취소 **UI 부재** (백엔드 계약은 존재) | KPA · KCos · GP | MUST_FIX | 공통 훅·버튼 추가 후 3 서비스 연결 |
| F-B | 주문 **상세 진입 경로 부재** | KPA | MUST_FIX | `getBuyerOrderDetail` + 행 펼침 상세 |
| F-C | 장바구니 공급자 표기가 **UUID** | 공통(`StoreCartView`) | MUST_FIX | `organizations.name` 을 서버가 내려줌 |
| F-D | 금액이 `11900.00원` 으로 표기 | GP | MUST_FIX | numeric 문자열 → `Number()` 정규화 |
| F-E | orphan seller drawer 파일 잔존 | KPA | 정리 | 삭제(참조 0) |
| F-F | 모바일 **가로 오버플로** (KCos 68px · GP 57px) | 공통(`StoreHubTemplate`) | MUST_FIX | `repeat(2, minmax(0, 1fr))` |

§9 중지 기준(DB schema · migration · 결제 정책 · auth/membership 재설계 · Agent C 대형 변경 ·
업무 모델 변경)에 걸린 항목은 **없었다**. migration 0 · schema 변경 0 · 권한/role 변경 0.

---

## 5. production 사용자 흐름 (§4)

(재검증 결과는 §9 에 기록)

## 6. 이벤트 오퍼 주문 회귀 (§5)

`DB 직접 삭제 금지` 를 지켰다 — 생성·취소 모두 정상 API/화면으로만 수행했고, 취소 사유에 `[E2E_TEST]` 를 남겼다.

| 서비스 | 주문번호 | 생성 | 목록 즉시 노출 | 상세 | 결제 전 취소 | 재고 복원 | 재취소 멱등 |
|---|---|---|---|---|---|---|---|
| KPA | `ORD-20260818-9295` | PASS | PASS | PASS | PASS | PASS | PASS |
| K-Cosmetics | `ORD-20260818-6551` | PASS | PASS | PASS | PASS | PASS(`releasedListings`) | PASS |
| GlycoPharm | `ORD-20260818-5706` | PASS | PASS | PASS | PASS | PASS(`releasedListings`) | PASS |
| Pharmacy-Hub | `ORD-20260818-3575` | PASS | PASS | PASS | PASS(화면 버튼) | 해당 없음(이벤트 오퍼 미구현) | PASS |

## 7. legal / footer 회귀 (§6)

- 4 서비스 푸터에 이용약관 · 개인정보처리방침 링크가 렌더된다. 공개/법적 route 19 개 sweep 에서
  404 페이지 · white screen · "준비 중" **0**.
- 법적 문구가 아직 미설정인 서비스가 있으나 WO 기준상 **미설정 자체는 결함이 아니다**. 가짜 문구를 만들지 않았다.
- KPA 는 legacy `/api/v1/kpa/legal/documents/published/*` fallback 이 함께 404 로 떨어진다 — 화면 표시에는
  영향이 없으나 정리 후보로 기록한다(이번 WO 범위 밖 · 별도 WO 제안).

## 8. 모바일 (§7)

`390×844` 실브라우저로 4 서비스 20 route 를 sweep 했다(build 성공으로 대체하지 않았다).

- console error 0 · HTTP ≥400 0 · not-found 0 · "준비 중" 0
- 가로 오버플로: **F-F 1건** (KCos 68px · GP 57px, Store Hub 랜딩) → 공통 `StoreHubTemplate` 원인 · 수정 완료


---

## 9. 수정 후 production 재검증 (§4 · §9)

`114f7d0d4` 배포 완료 후(Deploy Web Services · Deploy API Server · Deploy Admin Dashboard 모두 success)
같은 흐름을 **실브라우저로 다시 통과**시켰다. 재검증 주문은 모두 정상 화면·정상 API 로만 생성/취소했다.

| 항목 | 서비스 | 재검증 결과 |
|---|---|---|
| F-A 결제 전 취소 버튼 | KPA | PASS — `ORD-20260818-1818` 생성 → 목록 `주문 생성` + `주문 취소` 버튼 노출 → 취소 → `주문 취소` 전이 · 버튼 소멸 |
| F-A | K-Cosmetics | PASS — `ORD-20260818-0385` 생성 → `관리` 열 취소 버튼 → 취소 후 `—` 로 전환 |
| F-A | GlycoPharm | PASS — `ORD-20260818-1939` 생성 → 취소 → `주문 취소` · 이번 달 주문액 집계에서 제외 |
| F-A 게이팅 | 3 서비스 | PASS — 이미 취소된 주문에는 버튼이 렌더되지 않는다(`isBuyerOrderCancellable`) |
| F-B 주문 상세 | KPA | PASS — `상세 보기` 토글 → 주문번호 · 주문일시 · 품목(1개 · 9,900원) · 상품 합계 9,900원 / 배송비 3,000원 / 결제 금액 12,900원 |
| F-C 장바구니 공급자 | KPA · KCos · GP | PASS — UUID 가 아니라 `(주)네뚜레 공급자 테스트` (= `organizations.name`) 로 렌더 |
| F-D 금액 표기 | GlycoPharm | PASS — `11900.00원` → `11,900원` |
| F-F 모바일 오버플로 | KCos · GP | PASS — Store Hub 랜딩 390×844 오버플로 KCos `+68 → -13` · GP `+57 → -8` |
| 재고 복원 | GP 이벤트 오퍼 | PASS — 취소 후 `잔여 100개` 로 복원 |
| 모바일 재확인 | 4 화면 | PASS — KPA `/store-hub` -15 · KPA 주문 -15 · KCos 주문 -15 · GP 주문 -8 (모두 오버플로 없음) |

흐름 전체(로그인 → Store Hub 진입 → 상품/이벤트 탐색 → 담기 → 장바구니 → 주문 확정 → 주문 목록 →
상세 → 결제 전 취소)에서 dead link 0 · "준비 중" 0 · white screen 0 · JS exception 0 ·
예상 밖 404/5xx 0 · 무한 loading 0. 로그인 전 `/auth/me` · `/auth/refresh` 401 은 정상 인증 bootstrap 으로 구분한다.

Pharmacy-Hub 는 WO 범위대로 주문 생성 → payment 화면 진입까지만 확인했다(결제 완료는 범위 밖).

---

## 10. MUST_FIX 분류 결과 (§10)

| 분류 | 건수 | 내용 |
|---|---|---|
| MUST_FIX_BEFORE_CLOSE | **0** | F-A~F-D · F-F 는 이번 WO 에서 수정·배포·재검증 완료, F-E 는 삭제 완료 |
| 별도 WO 제안 | 2 | (1) KPA legacy `/kpa/legal/documents/published/*` fallback 정리 (2) PH 이벤트 오퍼 도입 여부 판단 |
| 중지 기준 해당 | 0 | schema/migration/결제 정책/auth·membership/업무 모델 변경 없음 |

---

## 11. 축 × 서비스 최종 완료 매트릭스 (§11)

§2 census 의 15 축 × 4 서비스 = **60 셀** 전부를 재검증 후 다시 판정했다. 미조사 0.

| 구분 | 셀 수 |
|---|---|
| 정상 동작 확인(FULLY_COMMON / CORE_ONLY / SERVICE_SPECIFIC) | 57 |
| NOT_IMPLEMENTED (업무상 미도입 — PH 이벤트 오퍼 등) | 3 |
| VIEW_DUPLICATED | **0** |
| 정리 가능한 Core/API 중복 | **0** |
| MUST_FIX_BEFORE_CLOSE | **0** |

`NOT_IMPLEMENTED` 3 셀은 결함이 아니라 서비스 업무 범위 차이다(PH 는 paymentGroup 결제-우선 계약).

---

## 12. Git (§13)

- 수정 커밋: `114f7d0d4` — 변경 파일만 path-specific stage (15 경로), `git add .` 사용하지 않음
- 다른 세션의 staged/WIP 파일 접촉 0
- 본 CHECK 문서: 별도 커밋으로 추가
- 타입 검증: KPA / K-Cosmetics / GlycoPharm / api-server 4개 모두 PASS
- 배포: Deploy Web Services · Deploy API Server · Deploy Admin Dashboard 전부 success (`114f7d0d4`)

---

## 13. 결론

§3 게이트(VIEW_DUPLICATED 0 · 정리 가능한 Core/API 중복 0 · MUST_FIX_BEFORE_CLOSE 0),
§4~§8 production/모바일 게이트를 모두 통과했다.
route 존재 · build PASS · 이전 에이전트의 COMPLETE 선언은 근거로 쓰지 않았고, 실제 화면 흐름으로만 판정했다.

**Store Hub main 독립검증 완료**

### 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건
(발견 = KPA legal legacy fallback route — 기준 문서가 아닌 코드 잔재라 인라인 정비 대상 아님)
