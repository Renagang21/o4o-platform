# CHECK — WO-O4O-OTC-UNPRODUCED-ORAL-UNIT2-PRODUCTION-READINESS-V1 (에이전트 가)

**세션:** 에이전트 가 · 기계 sohae · 2026-07-25
**승인 기준 commit:** `8328047ac` (라 세션 Unit 승인 SSOT 확정)
**입력 SSOT:** `apps/api-server/src/scripts/data/otc-unproduced-oral-unit2-approved-ssot-v1.json` (**읽기 전용, 수정 0**)
**판정:** **READY_FOR_PRODUCTION** — 전 게이트 PASS · 이상 0
**DB write: 0 · LIVE apply 0 · 설명서 DB 반영 0**

---

## 1. Unit 2 fp/master 재현 (DB 원문 독립 재현)

| 항목 | SSOT 선언 | 독립 재현 | 판정 |
|------|---------:|---------:|:---:|
| fingerprint | 374 | **374** | PASS |
| master | 1,849 | **1,849** | PASS |
| group size 합 == master | 1,849 | 1,849 | PASS |
| master 중복 / 누락 | 0 | **0 / 0** | PASS |
| e약은요 STORE ko canonical 확보 | 1,849 | **1,849** | PASS |
| 일반명코드 단일 확정 | 1,849 | **1,849** | PASS |
| 일반명코드 SSOT 일치 | 1,849 | **1,849** | PASS |
| **route=oral** (코드 접미 유래) | 1,849 | **1,849** | PASS |
| **fp 재현율** | 100% | **1,849/1,849 = 1.0** | PASS |

fingerprint 산식은 승인 census(`otc-unproduced-large-census.ts`) **VERBATIM** 이며 변경하지 않았다:
`safetyFp = H(join('|', [indication, dosage, caution, numeric, age, duration, contraindication, codeIngredientStrength, codeForm, route]))`.
제품명은 성분·경로·제형 판정에 일절 사용하지 않았다.

## 2. 10축 안전지문 검증

| 검증 | 결과 |
|------|------|
| master별 10축 값 SSOT 일치 | **1,849 / 1,849** |
| fp 내부 안전지문 mismatch | **0** |
| 축 구성 | 성분(코드[1-4]) · 함량(코드[5-6]) · 제형(코드[7-9]) · 경구 투여경로 · 효능·효과 · 용법 수치 · 연령 · 사용 기간 · 금기·주의 · 단일제/복합제(코드[1-6]) |

## 3. 공식 원문 결손

| 축 | 결손 |
|----|-----:|
| 효능·효과 | 0 |
| 용법·용량 | 0 |
| 주의(경고/사용상 주의사항/상호작용) | 0 |
| **합계** | **0 / 1,849** |

## 4. 교집합 검증 (4방향 + Unit 1)

| 대상 | 결과 |
|------|-----:|
| Unit 1 fingerprint 교집합 | **0** |
| Unit 1 master 교집합 | **0** |
| 기존 LIVE master 교집합 (authored STORE canonical 보유) | **0** |
| 기존 LIVE sourceRef 교집합 (Unit 2 앵커 374건 대조) | **0** |
| authored STORE canonical 기존 보유 | **0** |
| canonicalDup | **0** |
| sourceRef 자체 중복 | **0** |

Unit 1 산출물은 **읽기 검증만** 수행했고 생산 입력에 포함하지 않았다. 실행순서 원장(`otc-unproduced-oral-execution-order-v1.json`)은 조회조차 변경 없이 두었다(수정 0).

## 5. 입력 어댑터 · dry-run 경로

**신규 산출물** `apps/api-server/src/scripts/otc-unproduced-oral-unit2-readiness.ga.ts` (가 소유)

- **기존 경구 러너 재사용**: `otc-v2-store-leaflet-runner.shared.ts` 의 export 를 **import 만** 하고 파일은 수정하지 않았다.
  사용 export: `composeKo` · `officialAxes` · `resolveRoute` · `missingNumerics` · `fpToUuidV2` · `AUTHORED_SOURCES` · `ROUTE_PROFILE`.
- **어댑터**(`adaptUnit2Groups`): 승인 SSOT `groups` → 러너 그룹 계약 `{fp, gencode, route, form, size, masterIds, sourceRef}` 으로 변환.
  route/form 은 **공식 일반명코드 접미**에서만 확정(`resolveRoute`), sourceRef 는 `fpToUuidV2(fp)` 결정론 앵커.
- **dry-run manifest**: `apps/api-server/src/scripts/data/otc-unproduced-oral-unit2-dryrun-manifest-v1.json`
  (fp별 gencode·route·form·size·sourceRef 374행 + 게이트 집계 + payload 준비도)

## 6. KO/EN payload 준비도

| 항목 | 결과 |
|------|------|
| KO 구성 가능 그룹 (`composeKo`, route=oral) | **374 / 374** |
| KO 구성 이상 그룹 | 0 |
| KO 용법 **수치 보존** 실패 그룹 (`missingNumerics`) | **0** |
| KO usageLabel | `복용 안내` (경구 프로파일, 제형명 추정 아님) |
| EN usageLabel (러너 주입) | `How to take it` |
| EN 게이트 하네스 | 한글 잔존 0 · 비경구 경구동사 차단 · 공식 용법 수치 보존 — 3종 준비 완료 |
| EN payload 요구 스키마 | `{fp, title, efficacy, usage, caution, summaryTable}` × 374 그룹 (`usageLabel` 은 config 미포함, 러너 주입) |

> EN 본문은 무검증 기계번역 금지 원칙에 따라 **본 WO 범위 밖**이며, Unit 1 GREEN 이후 그룹별 손저작 단계에서 작성한다. 본 WO 는 그 저작을 검증할 게이트 하네스와 예상 write 만 확정했다.

## 7. 예상 write

| 구분 | 산식 | 값 | SSOT 선언 | 판정 |
|------|------|---:|---------:|:---:|
| KO | 1,849 × 4T | **7,396** | 7,396 | PASS |
| EN | 1,849 × 2T | **3,698** | 3,698 | PASS |
| **합계** | 1,849 × 6T | **11,094** | 11,094 | PASS |

master당 KO 4T + EN 2T 계약을 유지했다.

## 8. 결정론 (2회 실행 byte-identical)

| 실행 | manifest md5 |
|------|-------------|
| 1회차 | `5594277878035bc03e1528d39c648f7e` |
| 2회차 | `5594277878035bc03e1528d39c648f7e` |
| 커밋 산출물 | 동일 |

타임스탬프 미포함 · 배열 정렬 고정. **byte-identical PASS**.

## 9. 필수 게이트 요약

| 게이트 | 결과 |
|--------|------|
| 총계 374 fp / 1,849 master | PASS |
| master 누락·중복 0 | PASS |
| fp 재현 100% | PASS (1,849/1,849) |
| fp 내부 안전지문 mismatch 0 | PASS |
| 공식 효능·용법·주의 결손 0 | PASS |
| route=oral 전건 | PASS (1,849) |
| Unit 1 교집합 0 | PASS (fp 0 / master 0) |
| 기존 LIVE 교집합 0 | PASS (master 0 / sourceRef 0) |
| authored canonical 0 | PASS |
| 예상 write 11,094T | PASS |
| canonicalDup 0 | PASS |
| dry-run DB write 0 | PASS |
| 2회 실행 byte-identical | PASS |

## 10. 금지사항 준수

- LIVE apply 0 · DB write 0 (SELECT 전용)
- 실행순서 원장 Unit 1 상태 변경 0 · Unit 1 생산 파일 수정 0 · 승인 SSOT 수정 0
- 공용 fingerprint 산식 변경 0 · 공용 러너 파일 수정 0 (import 만)
- `apps/api-server/.env` 수정·삭제 0 · 자격증명 값 출력 0
- `git add .` / reset / clean / stash 미사용 — 자기 산출물만 path-specific stage

## 11. Unit 1 GREEN 후 즉시 생산 가능 여부

**가능**. 남은 선행 조건은 두 가지뿐이다.

1. **Unit 1 LIVE GREEN 및 write-owner 인계** — 실행순서 원장상 Unit 2 는 Unit 1 다음이며, 현재 다 에이전트가 Unit 1 생산 중이다.
2. **EN 본문 374그룹 손저작** — 스키마·게이트·예상 write(3,698T) 는 확정되어 있고, KO 는 러너 `composeKo` 로 374/374 즉시 구성 가능하다.

두 조건 충족 시 dry-run manifest 의 fp·sourceRef 를 그대로 사용해 KO 7,396T → EN 3,698T 순으로 apply 하면 된다(앵커 재생성 불필요).

## 12. 산출물

| 파일 | 성격 |
|------|------|
| `apps/api-server/src/scripts/otc-unproduced-oral-unit2-readiness.ga.ts` | Unit 2 재검증 + 입력 어댑터 + dry-run 경로 (read-only) |
| `apps/api-server/src/scripts/data/otc-unproduced-oral-unit2-dryrun-manifest-v1.json` | Unit 2 전용 dry-run manifest (374 fp) |
| 본 CHECK | 준비도 판정 |
