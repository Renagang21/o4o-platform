# CHECK-O4O-REPOSITORY-DB-IDENTITY-AND-LEGACY-OPERATIONAL-SCRIPTS-CLEANUP-V1

> **WO**: WO-O4O-REPOSITORY-DB-IDENTITY-AND-LEGACY-OPERATIONAL-SCRIPTS-CLEANUP-V1
> **일자**: 2026-09-30
> **판정**: **B. CLEANED_WITH_DEFERRED_ITEMS**
> **정본 산출물**: [O4O-API-SERVER-SCRIPTS-INVENTORY-V1](../baseline/operations/O4O-API-SERVER-SCRIPTS-INVENTORY-V1.md)

## 1. 경과

- Phase A 조사에서 실제 범위가 예상(341)보다 크다는 것을 확인하고 STOP — `src/scripts` root 827 · `data/` 3,817 · 하위 디렉터리 포함 약 4,900 파일.
- 사용자 결정 **B안**: 물리 대량 삭제 없이 ① 현행 · 재사용 가능 스크립트의 `o4o_api` 로그인 fallback 제거(fail-fast) ② 상태 분류 · inventory 기록. 삭제는 후속.

## 2. 변경

| 구분 | 파일 | 내용 |
|---|---|---|
| helper 신설 | `apps/api-server/src/scripts/require-db-username.mjs` | `DB_USERNAME` 미설정 · 공백이면 throw, 기본값 없음 |
| PAUSED 11 | `hff-en-c01-{apply,fix-speckle,glossary,regression,survey,verify}.mjs` · `hff-en-census-fetch.mjs` · `hff-ja-b04-{apply,measure,regression,verify}.mjs` | `user: 'o4o_api'` → `user: requireDbUsername()` |
| ACTIVE 2 | `check-tables.ts` · `dev/init-kpa-signage.ts` | `DB_USERNAME \|\| 'o4o_api'` → inline fail-fast |
| 주석 3 | `drug-master-promotion-dryrun-db.ts` · `productmaster-global-qr-dryrun.ts` · `productmaster-landing-bulk-apply.ts` | 실행 예시 `DB_USERNAME=o4o_api` → `<login identity, SETUP.md §4>` |
| 계약 테스트 | `__tests__/db-login-identity.contract.test.ts` · `__tests__/legacy-o4o-api-login-frozen.json` | helper fail-fast · ACTIVE/PAUSED 준수 · 동결 목록(320) 밖 `o4o_api` 로그인 0 |
| 문서 | inventory 신설 · `SETUP.md` §4 · `docs/CANONICAL-INDEX.md` §7 | 정본 연결 |

미변경: `package.json` · lockfile · DB · Cloud Run · Secret Manager · migration. **삭제 파일 0.**

## 3. 분류 결과

| 상태 | 수 | 비고 |
|---|---:|---|
| ACTIVE | init-kpa-signage · check-tables · package.json 등록 CLI · 현행 CLI 7 | `o4o_api` 로그인 없음 |
| PAUSED | DB 접속 11 (+ 비접속 동반 모듈) | HFF EN C01 Cycle 3 인계 · HFF JA b04 |
| COMPLETED_ONE_OFF / LEGACY | `o4o_api` 로그인 하드코딩 320 (otc 156 · drug-otc 15 · hff 129 · easy-drug 하위 20) | 실행 금지 · NOLOGIN 이라 fail-closed · 동결 목록 |
| UNKNOWN | 0 | |

## 4. 검증

- `node --check` — PAUSED `.mjs` 11 전부 통과
- jest `db-login-identity.contract.test.ts` + 기존 `community-catalog-promotion` 계약 — 3 suites · 56/56 PASS (DB 비접속)
- `tsc --noEmit -p tsconfig.json` — 기존 ServiceKey middleware 오류 3건만 (본 변경과 무관, `src/scripts` 는 build 제외). 수정한 TS 2 파일 단독 tsc clean
- Production DB 접속 · write · deploy · migration: **0**

## 5. 후속 (별도 WO)

1. COMPLETED / LEGACY 묶음 물리 삭제 (약 4,900 파일, 묶음 단위 · 동결 목록 동시 축소)
2. `package.json` 등록 CLI 은퇴 판정 (package.json 변경 승인 필요)
