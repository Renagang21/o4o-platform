# CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1

> **상태**: ACTIVE
> **작성일**: 2026-10-05 · **최종 갱신**: 2026-10-05
> **근거 WO/IR**: [`WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1`](../work-orders/WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1.md) TODO 6-1 · 설계 [`DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1`](../design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md)

로컬 브라우저 흐름 검증 기록이다. **운영 DB · 실제 PG 는 사용하지 않았다.** 운영 배포 · 운영 실결제 검증이 아니다.

## 1. 환경

| 항목 | 값 |
|---|---|
| DB | docker `postgres:15` 일회용 컨테이너의 새 DB — baseline + incremental 15개 적용(`migrate.ts` · `POST_MIGRATION_SCHEMA_ASSERTION = PASS`) |
| API | branch HEAD 의 api-server tsup 번들(`NODE_ENV=development`) · `:3002` · `NETURE_PHARMACY_PAYMENT_MODE=test` |
| 화면 | web-store dev `:4210` · web-neture dev `:3000` (`VITE_API_BASE_URL` = 로컬 API) · Playwright |
| 계정 | 제품 API(`/auth/email/signup`)로 가입한 로컬 계정 4개(약국 A · 약국 B · Neture 운영자 · 공급자). 이메일 인증 표시 · 운영자/공급자 role · 공급자 조직 · 제품 2개(공급처 미지정 · 등록 승인)는 SQL 시드. 로그인 화면(Google 전용)은 범위 밖이라 `/auth/email/login` 토큰을 브라우저 저장소에 넣어 대체 |

## 2. 결과

| # | 흐름 | 결과 |
|---|---|---|
| 1 | 약국 A 매장 없음 → "약국 기본 가입 · 신청 상태" → 신청(약국명 · 사업자번호 · 면허번호 · 주소) → 승인 대기 표시 | PASS |
| 2 | 대기 상태 매장 API(`store/context` · `supply-options` · `cart`) | PASS — 403 `STORE_OWNER_REQUIRED` |
| 3 | 운영자 `/operator/pharmacy-memberships` 승인 → role `neture:store_owner` · 업무 영역 enrollment active · 매장 slug 생성 | PASS |
| 4 | 약국 A 내 매장 진입 — 상단 "매장 HUB" 없음 · 약국 메뉴(상품 · 주문 / 가입) | PASS |
| 5 | 세미프랜차이즈 미가입 상태 공급 상품 0건 · 매장 기본 화면 이용 | PASS |
| 6 | pharmacy 가입 신청 → 운영자 `/operator/semi-franchises` 승인 | PASS |
| 7 | 공급자 `/supplier/supply-proposals` 제안(11,000원) → 담당 운영자 승인 | PASS |
| 8 | 공급 상품에 기본 공급(12,000원)과 공급 제안(11,000원)이 같은 제품에 공존 · 가격 비교/자동 선택 없음 | PASS |
| 9 | 제안 10개 + 기본 공급 1개 담기 → 주문 확정 → 주문 1건 140,000원(무료배송) · 라인 metadata `supplyKind` = proposal · default | PASS |
| 10 | 테스트 결제("실제 결제 아님" 확인창) → 주문 paid · `o4o_payments` PAID(mode test) · 공급자 주문 1건(`neture-pharmacy`, 구매 약국명 · testPayment) | PASS |
| 11 | 공급자 목록 · 상세(구매 약국 · 배송지 스냅샷 · "테스트 결제" 배지) → 처리 시작 → 송장 → 배송 완료 → 재고 50→40 | PASS |
| 12 | 세미프랜차이즈 가입 정지 → 공급 상품 0 · 제안 담기 404 `SUPPLY_OPTION_NOT_AVAILABLE` · 매장 기본 기능 유지 | PASS |
| 13 | 기본 가입 정지 → 매장 API 403 · role 회수 · enrollment inactive · 매장 목록에서 제외 → "연결된 매장 없음" · 기본 가입 화면에 "정지" + 사유 | PASS (수정 후) |
| 14 | 미가입 약국 B — 매장 · 세미프랜차이즈 API 403 · 매장 목록 0 · 운영자 API 403 | PASS |

## 3. 발견 · 수정 (`3445aee35`)

1. 대기 · 정지 약국에 빈 매장 화면이 열림 — 매장 목록(`accessible-stores`)이 조직 owner 관계만 보고 기본 가입 상태를 보지 않았다. 기본 가입 active 가 아닌 약국 조직을 목록에서 제외(데이터는 이미 403 으로 보호).
2. 약국 홈 "상품 선택" 링크가 옛 승인 카탈로그(`/work/kpa-society/commerce/products`)를 가리킴 → 공급 상품.

## 4. 확인하지 않은 것

- 이벤트 · 모집의 화면 흐름(통합 테스트로만 검증) · 결제 전 취소 화면 · 다른 수취 주체 2개의 결제 묶음 분리 화면(통합 테스트로만 검증).
- Google 로그인 화면 · 운영 환경 · 실제 PG.
- 매장 없음 화면 안내 문구가 아직 "KPA · K-Cosmetics · PharmacyHub" 를 나열한다(K-Cosmetics 퇴역 작업과 함께 정리).

## 5. 2차 검증 (2026-10-05 — 콘텐츠 자료함 · QR · Codex 반영 후 재확인)

같은 격리 환경(로컬 API dev bundle · 격리 PostgreSQL). 운영 DB · PG 미사용. QR 4행 조회만 운영 DB read-only(`default_transaction_read_only`).

| # | 흐름 | 결과 |
|---|---|---|
| 15 | 담당 운영자 web-neture `/operator/semi-franchises/pharmacy` "콘텐츠" 탭 → 작성(제목 · 요약 · 본문) → 초안 저장 → 게시 | PASS |
| 16 | 약국 A web-store `/store/pharmacy/contents` — 가입 세미프랜차이즈의 게시 콘텐츠 표시(초안은 미표시 — 통합 테스트) | PASS |
| 17 | "내 매장 사본 만들기" → 완료 안내 → 매장 자료함 `/store/library/contents` "세미프랜차이즈" 탭에 사본 1건(원본 유형 세미프랜차이즈 · pharmacy) · 편집 가능 | PASS |
| 18 | PH 매장 QR slug 를 `/api/v1/pharmacy-hub/qr/public` · `/api/v1/kpa/qr/public` 로 열기 — product · link 결과 동일 | PASS |
| 19 | KPA 앱(새 호스트 대응) `/qr/:slug` product QR — 상품명 · 요약 · 매장 설명서 화면 내 표시 / `/tablet/:slug` 렌더 | PASS (수정 후 — 아래 6-1) |
| 20 | Codex 반영 후 주문 재확인(장바구니 코드 변경): 공급 상품 담기 → 수량 2 변경(60,000원) → 주문 확정 → 테스트 결제 → 주문 내역 결제 완료 · 공급자 주문 목록에 표시 | PASS |

정지 화면 검증(#12 · #13)은 관련 코드 변경이 없어 다시 하지 않았다.

## 6. 2차 발견 · 수정

1. 새 호스트 QR 화면에서 product QR "제품 보기" 가 매장 상품 상세(B2C 공개 노출 필요)로 가 PH 상품은 404 — 옛 PH 화면은 상품 정보를 화면 안에 표시했다. 새 호스트 QR 화면이 상품 요약 · 설명서를 화면 안에 표시하도록 수정(`f6c4e0596`). 버튼 자체의 404 는 기존 KPA 공개 노출 규칙 그대로(보고 항목).
2. Codex 리뷰 3건(`fed5afe1e`) — 통합 · 단위 테스트로 재현 후 수정. #20 으로 화면 재확인.

## 7. 2차에서 확인하지 않은 것

- 운영 환경의 새 호스트 QR(배포 전) · pharmacyhub.co.kr 도메인 리다이렉트 · QR link 4행 착지 변경(운영 write — 미실행, DESIGN §16-3 dry-run 만).
- 여러 약국을 운영하는 사용자의 매장 전환 화면(조직 단위 장바구니는 통합 테스트로 검증).

## 8. 최신 변경분 코드 리뷰 (2026-10-05)

**Codex 리뷰: 미완료.** 마지막 완료 리뷰는 `0cfd0fb` 기준(지적 3건 → `fed5afe1e` 수정). 이후 HEAD(`d6d7f121f`)에 두 번 요청했으나 두 번 모두 Codex 쪽 "unknown error" — 리뷰 결과 없음. CI 통과를 코드 리뷰 완료로 보지 않는다.

**직접 리뷰** — 범위 `0cfd0fb..427a715d3` 코드 31파일(콘텐츠 자료함 · QR · PH 은퇴 · Codex 반영):

| 확인 항목 | 결과 |
|---|---|
| 콘텐츠 운영자 API 권한 | 모든 운영자 라우트가 `requireOperatorOf`(neture:operator ∧ 담당 배정)를 거침 — 이상 없음 |
| 약국 열람 · 사본 범위 | published ∧ 세미프랜차이즈 active ∧ 조직 가입 active, 아니면 404 — 이상 없음 |
| 운영자 작성 HTML 노출 | 약국 화면 `ContentRenderer`(sanitize) 경유 — 이상 없음 |
| 사본 형식 | `content_json` 의 title · summary · body 가 기존 커뮤니티 사본 형식과 같음 — 매장 편집 · 게시 경로 호환. 같은 원본 여러 번 복사는 기존 설계(독립 사본) |
| 장바구니 조직 범위 | 조회 · 병합 · 수량 · 삭제 · 확정 · 확정 후 삭제 모두 `organization_id` — 통합 테스트로 확인 |
| **QR 서비스 축** | **결함 1건 발견 · 수정 `427a715d3`**: 최신 slug 1행만 보고 축을 바꿔, 여러 서비스에 slug 를 가진 매장은 호출 호스트 서비스 slug 가 있어도 다른 서비스 축으로 해석될 수 있었다. → 호출 서비스 slug 가 하나도 없을 때만 매장 축. 단위 테스트 추가(24/24) |
| PH 은퇴 화면 이동 | `/work/pharmacy-hub` 상품 · 장바구니 · 주문 → Neture 약국 경로, PG 복귀 유지 — 이상 없음 |
| PH 가입 410 · 자가 가입 제외 | 다른 소비처(web-pharmacy-hub 의 `/store/enrollment` 호출) 없음 |

**남은 위험 (수정하지 않음, 보고)**
1. ~~매장 자료함의 "세미프랜차이즈" 출처 **라벨**이 사본 `content_json.semiFranchiseKey` 로 판정돼 편집 후 "커뮤니티" 로 바뀜~~ → **수정(2026-10-06)**: 자료함 피드가 변하지 않는 스냅샷 기준 `sourceGroup` · `sourceName`(`source_service`/`asset_type` · 스냅샷 `content_json.semiFranchiseName`)을 응답하고 web-store 가 이를 우선 사용. 편집 override 는 출처 판정에 쓰지 않는다. 서버 저장 로직은 변경 없음(최소 수정).
2. 새 호스트 QR 화면의 "제품 보기" 버튼은 B2C 비공개 상품이면 404(기존 KPA 동작). 상품 정보는 화면 안에서 이미 제공.
3. 운영 데이터 상호작용(실제 PH 매장 · 다중 서비스 매장의 QR)은 운영 검증 전 — §16-7 검증 항목.
4. 최신 HEAD 에 대한 외부(Codex) 리뷰 부재 — **미완료로 기록**. 반복 요청으로 다른 마무리 작업을 막지 않는다(2026-10-06 결정).

`427a715d3` 는 QR 서비스 축 판정만 바꿨고 단일 서비스 PH 매장의 결과는 같아 브라우저 QR 검증(#18 · #19)은 다시 하지 않았다(단위 테스트로 두 경우 확인).
