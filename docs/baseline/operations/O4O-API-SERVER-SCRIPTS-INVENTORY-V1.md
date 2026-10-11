# O4O-API-SERVER-SCRIPTS-INVENTORY-V1

> **상태**: ACTIVE · **일자**: 2026-09-30
> **WO**: WO-O4O-REPOSITORY-DB-IDENTITY-AND-LEGACY-OPERATIONAL-SCRIPTS-CLEANUP-V1
> **범위**: `apps/api-server/src/scripts/**` — 운영 DB 에 직접 접속하는 CLI · 일회성 데이터 생산 스크립트

## 1. 원칙

1. **`src/scripts` 에 있다는 것은 현행 도구라는 뜻이 아니다.** 이 디렉터리의 대부분은 2026-07~08 데이터 생산 트랙의 일회성 실행 기록이다.
2. **운영 실행 후보는 ACTIVE · PAUSED 로 분류된 것뿐이다.** 그 외 파일은 실행하지 않는다. 필요하면 새 WO 에서 재검토한다.
3. **`o4o_api` 는 NOLOGIN owner role 이다.** 로그인 identity 는 [`SETUP.md` §4](../../../SETUP.md) 의 "운영 DB identity" 표가 정본이다.
4. **로그인 identity 를 코드에서 추정하지 않는다.** `DB_USERNAME || '<role>'` 같은 기본값을 두지 않고, `DB_USERNAME` 이 없으면 즉시 실패한다 — `.mjs` 는 [`require-db-username.mjs`](../../../apps/api-server/src/scripts/require-db-username.mjs), `.ts` 는 같은 형태의 inline 검사.
5. **운영 실행은 governance 를 따른다.** write 는 사용자 명시 승인 · dry-run 선행 ([`CLAUDE.md`](../../../CLAUDE.md) DB · 보안 경계, §8).
6. 과거 코드의 보존 수단은 Git history 다. "나중에 필요할 수도" 는 source tree 에 남길 근거가 아니다.

## 2. 분류

### ACTIVE — 실행 경로가 있거나 현행 CLI

> **PH 전용 판정 부분 대체 (2026-10-11 · #427):** 이 절의 PH forum route/원장 adapter·Hub template 채택·활성 serviceKey 예시·프로비저닝 CLI 실행/유지 계약은 [완전 폐기 정책](../O4O-PHARMACY-HUB-SERVICE-MODEL-BASELINE-V1.md) 1~6항으로 대체한다. PH는 새 소비처/구현/프로비저닝 대상이 아니며 PH 경로·등록/호환 참조를 제거한다. 공용 KPA/약사 커뮤니티·콘텐츠 모델·다른 서비스·인쇄 QR 연결은 보존하고 데이터 삭제는 전용 귀속/FK·타 서비스 소비처 확인 후 수행한다. 아래 PH 구조는 폐기 전 이력이다.


| 파일 | 근거 | DB identity |
|---|---|---|
| `dev/init-kpa-signage.ts` | `package.json` `seed:kpa:signage` | `DB_USERNAME` 필수 (이 WO 에서 fallback 제거) |
| `check-tables.ts` | 범용 점검 CLI | `DB_USERNAME` 필수 (이 WO 에서 fallback 제거) |
| `package.json` 에 등록된 CLI (`drug:candidate-import` · `hff:*` · `medical-device:*` · `guard:product-description` · `drug-master:promotion:*` · `migration:roles*` · `migration:member-dedup*` 등) | 실행 명령 존재 | `o4o_api` 로그인 없음 (계약 테스트 ③) |
| `seed-lecture-service-and-roles.ts` · `community-catalog-promotion.ts` · `encryption-key-rotation.ts` · `cafe24-product-census.ts` · `pharmacy-hub-store-subject-provisioning.ts` · `audit-roles.ts` · `productmaster-landing-bulk-apply.ts` | 2026-08~09 WO 의 현행 CLI | `DB_USERNAME` env |

`package.json` 등록 CLI 중 현재도 쓰이는지는 개별 판정하지 않았다(실행 전 해당 WO 에서 확인).

### PAUSED — 재개 계획이 기록된 트랙 (삭제 금지 · 실행은 새 WO)

| 파일 | 트랙 · 재개 근거 |
|---|---|
| `hff-en-c01-*.mjs` (DB 접속 6: apply · fix-speckle · glossary · regression · survey · verify) · `hff-en-census-fetch.mjs` | HFF EN C01 — "잔여 16,805 문서는 Cycle 3 으로 인계" (`2b0b634fd`, 2026-08-08) |
| `hff-ja-b04-*.mjs` (DB 접속 4: apply · measure · regression · verify) | HFF JA — 롱테일 저작 사이클, 신규 저작은 다음 WO 로 분리 (`7e46e1aa6`) |

위 11개는 `requireDbUsername()` 으로 전환했다. 같은 prefix 의 DB 비접속 모듈(lib · translate · render 등)과 `hff-ja-b01-build/translate` 는 이들이 import 하므로 함께 유지한다.

### COMPLETED_ONE_OFF / LEGACY — 실행 금지 · 물리 삭제는 후속

`o4o_api` 로그인을 하드코딩한 파일 **320개**는 [`legacy-o4o-api-login-frozen.json`](../../../apps/api-server/src/scripts/__tests__/legacy-o4o-api-login-frozen.json) 에 동결했다. 목록은 줄어들기만 한다(삭제). `o4o_api` 가 NOLOGIN 이므로 실행하면 인증 단계에서 실패한다(fail-closed).

| 묶음 | 파일 (동결 목록) | 판정 | 근거 |
|---|---:|---|---|
| `otc-*` (`.ga/.na/.da/.la` 에이전트별) | 156 | LEGACY (대체됨) | 2026-08-05 e약은요 KO 전량 재생산 LIVE (19,363) · 08-08 EN 전량 재번역 종료로 결과물 교체 — [KO rebuild CHECK](../../checks/WO-O4O-EASY-DRUG-KO-FULL-REBUILD-LIVE-PRODUCTION-V1-CHECK.md) · [EN CHECK](../../checks/CHECK-O4O-EASY-DRUG-EN-FULL-RETRANSLATION-FINAL-PRODUCTION-CLOSE-V1.md). oral 540 · 잔여 3,809 대기열의 재개 계획도 여기서 소멸 |
| `drug-otc-*` | 15 | LEGACY (대체됨) | 위와 같음 |
| `hff-*` (PAUSED 제외) | 129 | COMPLETED_ONE_OFF | KO · ZH · 복합형 · EN C02/C91 · JA b01~b03 · fix154 트랙 종료 CHECK |
| `easy-drug-*/` 하위 디렉터리 5개 | 20 | COMPLETED_ONE_OFF | KO rebuild · 치명 내용 교정 · 경구금지 corpus · EN 재번역 — 2026-08-05~08 종료 |

같은 묶음의 DB 비접속 파일(lib · compose · render · contract)과 `data/` 산출물(≈1.25GB, CI sparse checkout 에서 제외)도 같은 판정이다.

### UNKNOWN

없음. 판정이 애매한 파일은 PAUSED 로 두었다.

## 3. 회귀 방지

[`db-login-identity.contract.test.ts`](../../../apps/api-server/src/scripts/__tests__/db-login-identity.contract.test.ts) (jest, DB 비접속)

- ① helper 는 `DB_USERNAME` 미설정 · 공백이면 throw, 있으면 그 값만 사용
- ② ACTIVE · PAUSED 스크립트는 helper / inline 검사 사용, `o4o_api` 로그인 없음
- ③ `o4o_api` 로그인 하드코딩은 동결 목록 밖에 0 — 새 스크립트가 기본값을 들이면 실패

## 4. 후속 (별도 WO)

- COMPLETED / LEGACY 묶음 물리 삭제 — 스크립트 · 동반 모듈 · `data/` 산출물 합계 약 4,900 파일. 묶음 단위로 삭제하고 동결 목록을 함께 줄인다.
- `package.json` 등록 CLI 중 은퇴 대상 판정 (`package.json` 변경은 승인 필요).
