# HANDOFF

> 마지막 작업: 2026-10-07 (KST) · PR #308 · #332 · #336 · #328 **main 통합 · 운영 배포 완료 · 테스트 결제 활성화** — **운영 업무 흐름 미검증**(계정 필요)

## 요약

**WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1** — 상품 선택 → 주문 → 테스트 결제 → 공급자 처리의 주요 흐름은 구현 · 로컬 브라우저 검증까지 끝났다. 세미프랜차이즈 콘텐츠 자료함 · pharmacy-hub 기능 이전 · QR 착지 이전 준비 · Codex 리뷰 3건 반영까지 끝났다. **WO 전체 완료가 아니다** — 다른 트랙 담당 미완료(커뮤니티 게시판 · KPA 매장 provisioning 제거 · PH 인프라 삭제)가 남아 있다. 진행 정본은 WO TODO, 설계 · 인계 계약 · 미완료 범위는 [`DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1`](docs/design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md) §13 · §14 · §15 · §16.

## 상태 구분 (혼동 금지)

| 항목 | 상태 |
|---|---|
| 코드 구현 | main 통합 완료(#308 · #332 운영 전환 호환 · #336 배포 전 접근 정렬 · #328 결제 모드 주입) · 다른 트랙 담당 미완료 3건(DESIGN §15-2) |
| 테스트 결제 흐름 | 격리 PostgreSQL 통합 17건 + 로컬 브라우저 20항목 PASS ([CHECK](docs/checks/CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1.md)) |
| 실제 PG 연동 | 대기(D1) |
| 운영 배포 | **완료** — Promote run `37548237819`(SHA `0e283ba10`) success: migration 1 · API · 웹 8. 웹 8(admin · neture · kpa-society · pharmacy-hub · lecture · store · kpa-branch · hospital-pharmacy) 각 traffic 100% · revision 라벨 `0e283ba10`. API 는 이후 PR #325 Delivery 자동 배포로 `5e97815c7`(`0e283ba10` 후손) · revision `o4o-core-api-03840-mos` traffic 100% · health alive. 공개 화면 · 로그인 전 화면 · 기본 진입 13곳 실브라우저 렌더 정상(2026-10-07 확인) |
| 결제 모드 | **테스트 결제 활성** — 운영 API revision `o4o-core-api-03840-mos` env `NETURE_PHARMACY_PAYMENT_MODE=test`(variable 설정 23:53Z 이후 #325 자동 배포로 반영). 추가 API 재배포 불필요. 실제 PG 는 계속 차단(D1) |
| 운영 업무 흐름 검증 | **미검증** — 배포 성공과 별개. Google 인증 약국 · 공급자 테스트 계정 · `pharmacy` 담당 운영자 필요(CHECK §9-5 · [`CHECK-NETURE-PHARMACY-CUTOVER-COMPAT-V1`](docs/checks/CHECK-NETURE-PHARMACY-CUTOVER-COMPAT-V1.md) §5-4) |
| 인덱스 2단계(부분 UNIQUE · 이벤트 재신청 409 해제) | 미착수 — 운영 안정화 후 별도 migration WO(DESIGN §17-1) |
| 테스트 데이터 초기화 | 범위만 확정(DESIGN §12) — 운영 DB write 사용자 승인 필요 |
| pharmacyhub.co.kr QR link 4행(비활성 E2E) | 테스트 데이터 초기화 대상으로 결정(DESIGN §12 · §16-3 A) — 삭제 미실행 · 초기화 승인 때 함께 |
| PH 공급자 opt-in | Neture 에 재구현 안 함 — 신규 시작 410 · 단독 키 중지 409(기본 공급 노출 방지) · 기존 주문 처리 유지(DESIGN §16-5) |
| PH 안내 · 소식 | 안내 → 기존 `/guide/*`(문구는 배포 후 운영자 편집) · 소식 → 홈 공지 · PH 안내 문구 관리 화면 제거(§16-6) |
| 인쇄 QR 경로 보존 리다이렉트 | 구현안 · 검증 방법 · 4경로 새 화면 대조(차단 격차 없음, 301 전 조건 4건 — DESIGN §16-7) — 적용은 웹 서비스 정비 트랙 · 사용자 승인 |
| 최신 HEAD 코드 리뷰 | Codex 미완료(unknown error 2회, 미완료로 기록 · 반복 요청 안 함) · 직접 리뷰 완료 · 사본 출처 라벨 수정(CHECK §8) |
| pharmacy-hub 서버 · 도메인 · 인증서 | 보존 — 운영 검증 후 웹 서비스 정비 트랙이 삭제(DESIGN §16-4) |

## 담당 경계

- 인증 · 가입 트랙으로 인계: 가입 원장 · 신청/승인 · role 발급 · 승인 orchestration — `pharmacy-membership.service.ts` · `pharmacy-store-provisioner.ts` · 해당 라우트 · 화면 · KPA 매장 provisioning 제거 — [`WO-NETURE-PHARMACY-MEMBERSHIP-AUTH-TRACK-HANDOFF-V1`](docs/work-orders/WO-NETURE-PHARMACY-MEMBERSHIP-AUTH-TRACK-HANDOFF-V1.md).
- 공통 커뮤니티 · Forum 트랙: 세미프랜차이즈 커뮤니티 게시판 — [`WO-O4O-SEMI-FRANCHISE-COMMUNITY-BOARD-V1`](docs/work-orders/WO-O4O-SEMI-FRANCHISE-COMMUNITY-BOARD-V1.md)(DRAFT).
- 웹 서비스 정비 트랙: pharmacy-hub 인프라 삭제(조건 DESIGN §16-4).
- Store/Commerce 유지: 조직 · 매장 연결 계약 `pharmacy-store-link.ts` · 매장 판정 · 세미프랜차이즈 이후 전부.
- K-Cosmetics: 퇴역 결정 — 보존 전제 철회, 제거 범위는 퇴역 작업(DESIGN §14).

## 다음에 할 일

1. 사용자가 Google 로그인 · 테스트 계정 준비 후 운영 업무 흐름 검증 — 기본 가입 → 승인 → pharmacy 세미프랜차이즈 가입 → pharmacy.neture.co.kr 접근(직접 로그인 · handoff) → 내 매장 · 계약 승낙 · 사이니지 → 주문 → 테스트 결제 → 공급자 처리 · 콘텐츠 · QR(CHECK §9-5).
2. 그 뒤: `pharmacy` 담당 운영자 지정 → 새 호스트 안내 문구 편집(§16-6) → PH 인프라 삭제 인계(§16-7 301 전 조건 포함). PH 은퇴 시 `pharmacy-hub` 키 단순 제거 금지(§16-5).
3. 별도 승인 · 별도 WO: 테스트 데이터 초기화(DESIGN §12, QR 4행 포함, dry-run 동반) · 매장 경영자 계약 게시 · 인덱스 2단계 · LB/도메인 변경 · 실제 PG(D1) · 세미프랜차이즈 커뮤니티 게시판.

## 로컬 검증 재현

- docker `postgres:15` 격리 DB → `apps/api-server` 에서 `npx tsx src/migrate.ts`(DB_* env).
- API: `NODE_ENV=development pnpm run build:api` 후 `node dist/main.js` (tsup 번들은 빌드 시 NODE_ENV 를 고정 — production 번들은 로컬 DB 에 SSL 을 요구한다). `apps/api-server/.env`(미추적)에 로컬 DB · 임의 JWT secret · `NETURE_PHARMACY_PAYMENT_MODE=test`.
- 화면: `VITE_API_BASE_URL=http://localhost:3002` 로 web-store(4210) · web-neture(3000) dev. 로그인은 `/auth/email/login` 토큰을 `o4o_accessToken` · `o4o_refreshToken` 에 넣어 대체.
- 통합 테스트: `NETURE_PHARMACY_IT_DATABASE_URL=<격리 DB>` + `npx jest src/modules/neture-pharmacy`. 운영 DB 금지.

## 주의

- 다른 PC 의 worktree 는 이 PC 에서 정리하지 않는다. main 반영은 PR merge 하나뿐. 저장소 Public — 실명 · 자격증명 기록 금지.
