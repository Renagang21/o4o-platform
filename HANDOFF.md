# HANDOFF

> 마지막 작업: 2026-10-05 (KST) · worktree `C:/Users/sohae/coding/o4o-wt/neture-pharmacy-commerce` · branch `wo/neture-pharmacy-store-commerce-refactor-v1` · draft PR #308 (merge 보류)

## 요약

**WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1** — 상품 선택 → 주문 → 테스트 결제 → 공급자 처리의 주요 흐름은 구현 · 로컬 브라우저 검증까지 끝났다. 세미프랜차이즈 콘텐츠 자료함 · pharmacy-hub 기능 이전 · QR 착지 이전 준비 · Codex 리뷰 3건 반영까지 끝났다. **WO 전체 완료가 아니다** — 다른 트랙 담당 미완료(커뮤니티 게시판 · KPA 매장 provisioning 제거 · PH 인프라 삭제)가 남아 있다. 진행 정본은 WO TODO, 설계 · 인계 계약 · 미완료 범위는 [`DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1`](docs/design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) §13 · §14 · §15 · §16.

## 상태 구분 (혼동 금지)

| 항목 | 상태 |
|---|---|
| 코드 구현 (branch) | 이 트랙 범위 완료 · 다른 트랙 담당 미완료 3건(DESIGN §15-2) |
| 테스트 결제 흐름 | 격리 PostgreSQL 통합 17건 + 로컬 브라우저 20항목 PASS ([CHECK](docs/checks/CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1.md)) |
| 실제 PG 연동 | 대기(D1) |
| main 통합 · 운영 migration · 배포 · 운영 실결제 | 미실시 — 사용자 승인 대기 |
| 테스트 데이터 초기화 | 범위만 확정(DESIGN §12) — 운영 DB write 사용자 승인 필요 |
| pharmacyhub.co.kr QR link 4행 착지 변경 | dry-run 만(DESIGN §16-3) — 운영 DB write 사용자 승인 필요 |
| pharmacy-hub 서버 · 도메인 · 인증서 | 보존 — 운영 검증 후 웹 서비스 정비 트랙이 삭제(DESIGN §16-4) |

## 담당 경계

- 인증 · 가입 트랙으로 인계: 가입 원장 · 신청/승인 · role 발급 · 승인 orchestration — `pharmacy-membership.service.ts` · `pharmacy-store-provisioner.ts` · 해당 라우트 · 화면 · KPA 매장 provisioning 제거 — [`WO-NETURE-PHARMACY-MEMBERSHIP-AUTH-TRACK-HANDOFF-V1`](docs/work-orders/WO-NETURE-PHARMACY-MEMBERSHIP-AUTH-TRACK-HANDOFF-V1.md).
- 공통 커뮤니티 · Forum 트랙: 세미프랜차이즈 커뮤니티 게시판 — [`WO-O4O-SEMI-FRANCHISE-COMMUNITY-BOARD-V1`](docs/work-orders/WO-O4O-SEMI-FRANCHISE-COMMUNITY-BOARD-V1.md)(DRAFT).
- 웹 서비스 정비 트랙: pharmacy-hub 인프라 삭제(조건 DESIGN §16-4).
- Store/Commerce 유지: 조직 · 매장 연결 계약 `pharmacy-store-link.ts` · 매장 판정 · 세미프랜차이즈 이후 전부.
- K-Cosmetics: 퇴역 결정 — 보존 전제 철회, 제거 범위는 퇴역 작업(DESIGN §14).

## 다음에 할 일

1. PR #308 CI · 리뷰 확인. merge 는 사용자 "main 통합 진행" 후.
2. 사용자 결정 대기: PH opt-in 공급자 배송 이전(목표 supply_proposals) · PH 매뉴얼/안내 목적지 · QR link 4행 apply.
3. merge 후: migration 적용 확인 → 배포 → `NETURE_PHARMACY_PAYMENT_MODE=test` 설정 승인 → 운영 smoke(콘텐츠 자료함 · 새 호스트 QR 포함) → `pharmacy` 담당 운영자 지정 → PH 인프라 삭제 인계.

## 로컬 검증 재현

- docker `postgres:15` 격리 DB → `apps/api-server` 에서 `npx tsx src/migrate.ts`(DB_* env).
- API: `NODE_ENV=development pnpm run build:api` 후 `node dist/main.js` (tsup 번들은 빌드 시 NODE_ENV 를 고정 — production 번들은 로컬 DB 에 SSL 을 요구한다). `apps/api-server/.env`(미추적)에 로컬 DB · 임의 JWT secret · `NETURE_PHARMACY_PAYMENT_MODE=test`.
- 화면: `VITE_API_BASE_URL=http://localhost:3002` 로 web-store(4210) · web-neture(3000) dev. 로그인은 `/auth/email/login` 토큰을 `o4o_accessToken` · `o4o_refreshToken` 에 넣어 대체.
- 통합 테스트: `NETURE_PHARMACY_IT_DATABASE_URL=<격리 DB>` + `npx jest src/modules/neture-pharmacy`. 운영 DB 금지.

## 주의

- 다른 PC 의 worktree 는 이 PC 에서 정리하지 않는다. main 반영은 PR merge 하나뿐. 저장소 Public — 실명 · 자격증명 기록 금지.
