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
