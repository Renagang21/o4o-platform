# HANDOFF

> 마지막 작업: 2026-10-05 (KST) · worktree `C:/Users/sohae/coding/o4o-wt/neture-pharmacy-commerce` · branch `wo/neture-pharmacy-store-commerce-refactor-v1` · draft PR #308

## 요약

**WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1** 단계 1-7 ~ 6-3 의 코드 · 스키마 · 정본 반영을 branch 에 push 했다. 진행 정본은 WO TODO 체크리스트 — [`docs/work-orders/WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1.md`](docs/work-orders/WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1.md). 설계 정본: [`DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1`](docs/design/DESIGN-NETURE-PHARMACY-STORE-COMMERCE-V1.md).

## 상태 구분 (혼동 금지)

| 항목 | 상태 |
|---|---|
| 코드 구현 (branch) | 완료 — 백엔드 · web-store · web-neture |
| 테스트 결제 흐름 검증 | 격리 PostgreSQL 15 통합 테스트로 검증(로컬). 운영 환경 검증 없음 |
| 실제 PG 연동 | **대기(D1)** — PG · 수취 법인 미정. live 모드는 503 |
| main 통합 | 미실시 — 사용자 "main 통합 진행" 승인 후 PR merge |
| 운영 DB migration `CreateNeturePharmacyCommerce1791160000000` | 미적용 — merge 후 CI/CD 가 적용 |
| 운영 배포 · 운영 실결제 검증 | 미실시 |
| 테스트 데이터 초기화(DESIGN §12) | 범위만 확정 — 운영 DB write 는 사용자 승인 필요 |

## 다음에 할 일

1. PR #308 CI 확인 → 실패 시 수정. draft 해제 · merge 는 사용자 승인 후.
2. merge 후: migration 적용 확인(`migration:show`) → 배포 → production 에서 테스트 결제를 쓰려면 `NETURE_PHARMACY_PAYMENT_MODE=test` env 설정(인프라 변경 = 사용자 승인) → 브라우저 smoke(기본 가입 → 운영자 승인 → pharmacy 가입 → 공급 상품 → 장바구니 → 테스트 결제 → 공급자 목록).
3. 운영 시작 전 관리자 작업: `pharmacy` 세미프랜차이즈 담당 운영자 지정(`/admin/semi-franchises`).
4. 후속 WO 제안: KPA 회원 승인 시 매장 프로비저닝 제거 · 세미프랜차이즈 커뮤니티 게시판(공통 Forum 구조) · 세미프랜차이즈 범위 콘텐츠 자료함 · KPA/KCos/PH 기존 결제 컨트롤러 결함 · 정산 서비스 필터 · CANONICAL-INDEX 행 추가(PR #304 통합 후).

## 로컬 검증 재현

- 격리 DB: `docker run -d --name o4o-npc-pg15 -e POSTGRES_PASSWORD=<임의> -e POSTGRES_DB=o4o_it -p 55433:5432 postgres:15` → `apps/api-server` 에서 DB_* env 로 `npx tsx src/migrate.ts`
- 통합 테스트: `NETURE_PHARMACY_IT_DATABASE_URL=postgres://...@127.0.0.1:55433/o4o_it npx jest src/modules/neture-pharmacy` (운영 DB 금지)

## 주의

- 다른 PC 의 worktree(`D:/o4o-wt/...`)는 이 PC 에서 정리하지 않는다. PR #304 는 이 트랙 대상이 아니다.
- main 반영은 PR merge 하나뿐. 직접 push · bypass 금지. 저장소 Public — 실명 · 자격증명 기록 금지.
