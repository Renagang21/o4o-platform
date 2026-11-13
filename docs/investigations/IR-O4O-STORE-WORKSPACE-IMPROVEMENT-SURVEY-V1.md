# 내 매장 전반 개선 조사

> **상태**: ACTIVE
> **작성일**: 2026-11-13
> **실행 위치**: CLOUD (조사 · 코드 읽기만. 운영 DB · 실제 화면 확인 없음)
> **인계**: claude/wizardly-bardeen-ldq332
> **근거**: 사용자 지시 「내 매장 전반을 조사해서 개선이 필요한 부분을 정리하고, 우선순위 높은 것부터 진행」(2026-11-13)

## 0. 방법

네 갈래로 나눠 읽기 전용 조사를 하고, 대표 주장은 이 세션에서 다시 확인했다.

1. 화면 구조 — `services/web-store/src` 경로 · 메뉴 · 레이아웃
2. 리스트 표준 — [O4O 표준 리스트](../architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md) · `AGENTS.md` §3-1
3. 매장 API — `CLAUDE.md` §7 Guard Rules · §8 진단 경로 규칙
4. 최근 바뀐 상담 · 태블릿 · QR 영역의 잔재와 지시서 상태

## 1. 우선순위와 진행 상태

### P0 — 보안 · 매장 경계 (완료 · 이 branch)

| # | 내용 | 조치 |
|---|---|---|
| P0-1 | 공개 게시 자산 API 의 입력값 처리 보강 | 바인딩 · 형식 검사 · 공개 응답의 내부 오류 문구 제거 (`published-assets.controller.ts` · `asset-render-filter.ts`) |
| P0-2 | 매장 계정의 공용 상품(master) 이미지 쓰기 범위가 공급자 영역 기준 문서의 이미지 보호와 맞지 않음 | 취급 상품에만 추가 · 본인이 매장에서 올린 이미지만 정렬 · 삭제 · 대표 지정 · 다른 출처 대표 보호 · 외부 주소 제한 (`store-product-image-guard.ts`) — **장기 방향(매장별 이미지 여부)은 사용자 결정 필요** |
| P0-3 | 플레이리스트 항목의 매장 경계 보강 | 같은 매장 자료만 추가 · 공개 조회도 같은 매장 자료만 (`store-playlist.repository.ts`) |

### P1 — 데이터 경계 · 규칙 위반 (일부 완료)

| # | 내용 | 위치 | 방향 |
|---|---|---|---|
| P1-1 | **완료** — GET 이 QR 행을 만들고 고쳤다(§8-4) | `routes/platform/store-tablet.routes.ts` `GET /screen-sets/:id` | GET 은 있는 QR 만 읽는다. 모든 저장 경로가 QR 을 만들므로 QR 없던 예전 세트는 다음 저장 때 생긴다 |
| P1-2 | **완료** — 상품 마케팅 연결의 매장 경계 | `product-marketing.controller.ts` | 연결은 이 매장 소유 QR · 자료함 자산만(자산이 매장 소유이므로 중복 키 충돌도 사라짐 — migration 불필요). 같은 파일 조회의 매개변수 오류도 수정 |
| P1-3 | 콘텐츠 공개 · 채널 변경 API — 매장이 없는 사용자는 예전 KPA 소속 조직으로 넘어간다(의도된 동작으로 보임) | `store-asset-control.controller.ts` · `kpa-content-organization.ts` `resolveKpaContentOrganization` | **로컬 DB 확인 필요**: 약국 매장이 아닌 조직이 가진 공개 자료(`kpa_store_asset_controls`) 수. 0 이면 넘김 규칙을 쓰기 경로에서 빼고, 있으면 역할 확인 추가 |
| P1-4 | serviceKey 를 경로가 아닌 query · body 에서 받음(Guard Rule 4) | `store-membership.routes.ts` · `pharmacy-products.controller.ts`(문서화된 예외) | 경로 파라미터로 이동 또는 예외 기록 |
| P1-5 | 500 응답에 내부 오류 문구를 그대로 싣는 곳 약 100곳, 오류 응답 형식 혼재 | o4o-store 컨트롤러 다수 | 표준 `{ success:false, error, code }` · 일반 문구 |
| P1-6 | UUID 단독 후속 조회(앞 단계에서 매장 확인은 함) | 여러 컨트롤러 · 서비스 | 문장 자체에 매장 조건 추가 |
| P1-7 | 정적 검사 보강 — SQL 템플릿 안 요청 값 · GET 안의 쓰기 helper · query/body serviceKey | `scripts/check-unsafe-routes.mjs` | 규칙 추가(CI 변경 — 통합 담당 판단) |

### P2 — 화면 정리 (일부 완료 · 2026-11-13)

- **완료:** 상담 메뉴 용어(상담 태블릿 · 근무자 현장 지원), 예전 상담 메뉴 경로를 매장 화면 안 상담 태블릿 목록으로, 상담 화면 방향 · 말하기 버튼을 태블릿 종류(약사 · 근무자)로, 쓰지 않는 페이지 3개 삭제, 관리자 일반/대형 배치 설정 제거.
- **보류:** 「상담 요청」 이름 변경 — QR · 태블릿의 고객 상담 요청 기능 이름으로 일관되게 쓰여 바꾸지 않았다.
- **로컬 확인 후:** 상담 2대 연결 잔재 코드 제거 — [`WO-O4O-STORE-BOUNDARY-READONLY-CHECK-V1`](../work-orders/WO-O4O-STORE-BOUNDARY-READONLY-CHECK-V1.md) Q4.

남은 항목:

- 메뉴에 없는 실제 기능: 제품 진열 설정 · 매장 직접 상품 · POP/영상 사본 · 만성질환관리 · 협력사업 · QR AI 설명 · 자료함 하위 화면.
- 메뉴 체계가 둘(`storeMenu.ts` 섹션 vs `storeWorkspace.ts` 묶음) — 하나로.
- 서비스 경로(`/work/kpa-society/store`) 안에서 `/store/...` 고정 링크 약 40곳.
- 상담 메뉴 용어: 「다국어 상담」 · 「직원 현장 지원」 · 「상담 요청」(실제로는 상품 문의 요청) — 2026-11-13 용어(약사 · 근무자 · 소비자 상담)로.
- 상담 메뉴가 예전 경로를 거쳐 매장 화면 밖으로 나감.
- 퇴역 · 중복 메뉴(온라인 판매 주문 · 판매자 모집 둘).
- 상담 2대 연결 · 관리자 배치 설정 잔재 코드(지시서 `WO-O4O-STORE-CONSULTATION-TABLET-ROLES-V1` 3단계).
- 어디서도 가져다 쓰지 않는 페이지 3개: `StoreCartPage` · `StoreRecruitmentApplicationsPage` · `KpaEventOfferPage`.
- 같은 화면 다른 경로(`my-products` · `handled-products` 등), 오래된 이동 경로 약 20개.
- 다국어 제품 콘텐츠 작성 진입점이 남아 있음 — [소비자 다국어 정책](../baseline/O4O-CONSUMER-MULTILINGUAL-POLICY-V1.md) §3 별도 WO(운영 데이터 확인 필요).

### P3 — 표준 · 구조

- 리스트 표준: 40개 리스트 중 표준 6 · 일부 12 · 미준수 26. 우선 대상 — 매장 구성원(`StoreMembersPage`) · 주문 목록 2개(`StoreOrdersPage` · `StoreOrderWorktablePage`) · neture-pharmacy 목록 6개. 페이지 이동 때 선택이 남는 화면(POP · 영상).
- 용어 사전: 같은 곳(`/workspace/use`)을 가리키는 링크 이름 7개, 내 자료함 이름 5개, 제품/상품 혼용, 매장/약국 혼용.
- 800줄 넘는 페이지 8개(최대 `StoreTabletDisplaysPage` 1705줄).

## 2. 확인하지 못한 것

- 운영 DB(공용 상품 이미지 중 매장 업로드 비율 · 다른 매장 자료가 든 플레이리스트 유무 · 상담 짝짓기 사용 흔적)는 로컬 세션 조회가 필요하다.
- 실제 화면 · 접근 기록은 보지 않았다.

## 3. 문서 정합

해당 없음(기록물).
