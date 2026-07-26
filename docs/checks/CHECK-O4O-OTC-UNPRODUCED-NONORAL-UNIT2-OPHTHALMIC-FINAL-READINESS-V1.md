# CHECK — WO-O4O-OTC-UNPRODUCED-NONORAL-UNIT2-OPHTHALMIC-FINAL-READINESS-V1 (에이전트 가)

**세션:** 에이전트 가 · 기계 sohae · 2026-07-26
**기준 proposal commit:** `05dc50b14` · **입력:** `apps/api-server/src/scripts/data/otc-unproduced-nonoral-approval-proposal-v1.json` (**읽기 전용, 수정 0**)
**판정:** **READY_FOR_PRODUCTION** — 최종 승인 SSOT `APPROVED_FOR_PRODUCTION` · 전 게이트 PASS · 이상 0
**DB write: 0 · LIVE apply 0 · 설명서 DB 반영 0**

---

## 1. 산출물

| 구분 | 경로 |
|------|------|
| **최종 승인 SSOT** | `apps/api-server/src/scripts/data/otc-unproduced-nonoral-unit2-ophthalmic-approved-ssot-v1.json` |
| 점안 전용 profile · 어댑터 | `apps/api-server/src/scripts/otc-unproduced-nonoral-unit2-ophthalmic-profile.ga.ts` |
| SSOT 빌드 실행기 | `apps/api-server/src/scripts/otc-unproduced-nonoral-unit2-ophthalmic-ssot-build.ga.ts` |
| 생산 실행기 (dry-run · rollback · apply 경로) | `apps/api-server/src/scripts/otc-unproduced-nonoral-unit2-ophthalmic-production.ga.ts` |
| EN 검증기 | `apps/api-server/src/scripts/otc-unit2-oph-en-config-verify.ga.mjs` |
| EN 병합기 | `apps/api-server/src/scripts/otc-unit2-oph-en-config-merge.ga.mjs` |
| EN 최종 JSON | `apps/api-server/src/scripts/data/otc-unit2-oph-en-config-ga-all.json` (md5 `b5e44bb715c8b2813fbe082387da508c`) |
| EN 파트 저작본 | `otc-unit2-oph-en-config-ga-p01.json` ~ `-p03.json` |
| 저작 원문(무절단) | `apps/api-server/src/scripts/data/otc-unproduced-nonoral-unit2-ophthalmic-authoring-source.ga.json` |
| dry-run manifest | `apps/api-server/src/scripts/data/otc-unproduced-nonoral-unit2-ophthalmic-dryrun-manifest-v1.json` (md5 `fb1801acc4d04759b7d3fb54ffc5fec1`) |

**공용 파일 변경 0** — `otc-v2-store-leaflet-runner.shared.ts` 는 import 만 했다. 점안 계약은
`composeKo(..., profiles)` / `renderEn(..., profiles)` 의 profiles 주입 지점에 전용 `OPHTHALMIC_PROFILE` 을 넘겨 적용한다.

## 2. fp / master 재현 (DB 공식 원문 독립 재현)

| 항목 | proposal 선언 | 독립 재현 | 판정 |
|------|-------------:|---------:|:---:|
| fingerprint | 34 | **34** | PASS |
| master | 159 | **159** | PASS |
| group size 합 == master | 159 | 159 | PASS |
| master 누락 / 중복 | 0 | **0 / 0** | PASS |
| easy_drug STORE ko canonical 확보 | 159 | **159** | PASS |
| 일반명코드 단일 확정 | 159 | **159** | PASS |
| 일반명코드 proposal 일치 | 159 | **159** | PASS |
| **fp 재현율** | 100% | **159/159 = 1.0** | PASS |

fingerprint 산식은 승인 census(`otc-unproduced-large-census.ts`) **VERBATIM** 이며 변경하지 않았다:
`safetyFp = H(join('|', [indication, dosage, caution, numeric, age, duration, contraindication, codeIngredientStrength, codeForm, route]))`.
`fpToUuidV2` · canonical 계약도 변경 0. 제품명은 route·적용부위·성분 판정에 **일절 사용하지 않았다**.

## 3. route · 안전지문 검증

| 검증 | 결과 |
|------|-----:|
| route=ophthalmic 전건 (일반명코드 접미 COS/COO 유래) | **159 / 159** |
| 제형 분포 | 점안액(COS) 31 fp · 점안겔(COO) 3 fp |
| fp 내부 10축 안전지문 mismatch | **0** |
| 공식 효능·용법·주의 결손 | **0 / 159** |
| **효능·용법 경로 충돌** (점안 제형 + 경구 전용 용법) | **0** |
| HOLD_ROUTE · HOLD_MULTI_ROUTE 포함 | **0 fp / 0 master** |
| 어댑터 차단 그룹 | **0** |
| sourceRef 중복 | **0** |

route 판정은 **일반명코드 접미 + 공식 제형 + 공식 용법·효능 대조**로만 수행했다. 34 fp 전부 공식 용법에 점안 지시(`점안`/`눈`/`결막낭`)가 존재한다.

## 4. 점안 전용 RouteProfile

| 항목 | 값 | 비고 |
|------|----|------|
| route | `ophthalmic` | |
| KO usageLabel | **점안 사용 안내** | WO 지정. 공용 프로파일의 비경구 일반 라벨 `사용 안내` 를 본 유닛에서만 구체화 |
| EN usageLabel | **How to use the eye drops** | 공용 프로파일과 동일 |
| KO 동사 재표현 | 공용 `NONORAL_REWRITE` (복용→사용) | `복용→점안` 일괄 치환은 **하지 않았다** — 주의사항에는 다른 경구약 복용을 가리키는 문장이 섞여 있어 일괄 치환 시 공식 원문에 없는 사실이 생긴다 |
| KO 금지 동사 | `복용` · `먹` · `내복` | 34/34 그룹 잔존 0 |
| EN 금지 동사 | take · takes · taken · taking · swallow · swallowed · swallowing · orally · by mouth | 34/34 잔존 0 |

> **DR-019 정렬 노트** — DR-019 는 "투여경로를 제형명으로 추정하지 말고 확정된 route 에서 라벨을 도출한다" 는 규칙이다.
> `점안 사용 안내` 는 route=ophthalmic 에서 도출한 더 구체적인 **비경구** 라벨이므로 규칙에 반하지 않는다.
> 본 라벨은 전용 프로파일에만 있으므로 다른 route·다른 유닛의 렌더 결과는 바뀌지 않는다.

## 5. EN 저작 결과

```
$ npx tsx src/scripts/otc-unit2-oph-en-config-verify.ga.mjs
OPH-EN-VERIFY — COMPLETE
  configs 3 · entries 34 · covered 34/34 fp · 누락 0 · 중복 0 기준검사 포함
  예상 EN write 318T / 필요 318T
```

| 게이트 | 결과 |
|--------|-----:|
| EN fp 커버리지 | **34 / 34** |
| 누락 fp / 중복 fp | **0 / 0** |
| 필수필드 공백 · `usageLabel` 혼입 | **0 / 0** |
| **한글 잔존** | **0** |
| **경구 동사** (본문·요약표 전 영역) | **0** |
| **점안 경로 표현 부재** (instill / eye / eyelid / conjunctival sac) | **0** |
| **1회 방울 수 누락** (`방울`·`적` 양쪽 요구) | **0** |
| **공식 용법 수량 누락** (`missingNumericsEn` — 횟수·간격·기간 포함) | **0** |
| **연령 축 누락** (용법 연령 → EN 용법 / 주의 연령 → EN 용법·주의) | **0** |
| **한쪽·양쪽 눈 축 누락** | **0** |
| **점안 고유 주의 축 누락** (콘택트렌즈 · 용기 끝 접촉 · 점안 간격) | **0** |
| **금기·주의 축 누락** (금지문 → `do not`/`must not`/`never`) | **0** |
| 신규 의료 사실 | **0** (공식 효능·용법·주의 grounding 전용) |

공용 `missingNumericsEn` 의 단위 목록에 `적`(滴)이 없어 방울 수가 새는 구간이 있었다.
공용 파일을 고치지 않고 전용 `missingDropCountsEn` 으로 `방울`·`적` 양쪽을 직접 요구하도록 보강했다.

## 6. KO payload 구성 가능 여부

| 항목 | 결과 |
|------|-----:|
| KO 구성 가능 그룹 | **34 / 34** |
| KO 이상 그룹 | **0** |
| KO 용법 수치 누락 그룹 | **0** |
| KO 경구 동사 잔존 그룹 | **0** |
| KO usageLabel | `점안 사용 안내` (전 그룹) |

## 7. dry-run

```
OPH-U2 DRY-RUN — fp 34/34 · master 159/159
  PASS  G1 SSOT status·수량 일치 (34fp/159m)
  PASS  G2 fp 재현 100% (SSOT 앵커 일치)
  PASS  G3 route·효능·용법 mismatch 0
  PASS  G4 EN 34/34 매칭
  PASS  G5 기존 LIVE 교집합 0 (sourceRef)
  PASS  G6 authored canonical 0 (ko/en)
  PASS  G7 HOLD 혼입 0
  PASS  G8 canonicalDup 0
  PASS  G9 예상 write 954T
  PASS  G10 이상 0
  PASS  G11 easy ko canonical 슬롯 1건
  PASS  G12 DB write 0
  writePlan KO 636 + EN 318 = 954 (예상 954) · dbWrite 0
```

## 8. rollback 시험

```
OPH-U2 ROLLBACK TEST — 표본 2fp/33m · 시도 write KO 132 + EN 66 = 198T
  커밋 전 사후검증: PASS (authored ko 33 · en 33 · easy canonical 0)
  before total 33 easy 33 authored 0 en 0
  after  total 33 easy 33 authored 0 en 0
  rollback 사유: ROLLBACK TEST — 사후검증 통과 후 무조건 rollback
  판정: PASS (전량 rollback · easy/authored canonical 불변 · 순 DB write 0)
```

- 실제 write 계약(KO 4T demote→insert→flip→audit, EN 2T insert→flip)을 표본 트랜잭션 안에서 그대로 수행했다.
- **커밋 전** 트랜잭션 내부 상태를 사후검증했다(authored ko 33 · en 33 · easy canonical 0 — 계약과 일치).
- 사후검증 통과 후에도 **무조건 rollback** 했다. 커밋 경로는 실행하지 않았다.
- rollback 후 easy canonical · authored canonical · en canonical 카운트 전부 불변, **순 DB write 0**.
- rollback 직후 재실행한 dry-run manifest 가 rollback 이전 manifest 와 **byte-identical** — DB 잔재 0을 독립 확인.

## 9. 2회 실행 byte-identical

| 산출물 | md5 | 2회 실행 |
|--------|-----|:-------:|
| 최종 승인 SSOT | `35763faaed035a7ced4606b948957527` | 동일 |
| EN 최종 JSON | `b5e44bb715c8b2813fbe082387da508c` | 동일 |
| dry-run manifest | `fb1801acc4d04759b7d3fb54ffc5fec1` | 동일 (rollback 시험 전/후 포함 3회) |

타임스탬프·난수·순서 비결정 요소 없음.

## 10. 교집합 · 예상 write

| 항목 | 결과 |
|------|-----:|
| 기존 LIVE master 교집합 | **0** |
| 기존 LIVE fp 교집합 | **0** |
| 기존 LIVE sourceRef 교집합 | **0** |
| authored STORE ko canonical 기존 보유 | **0** |
| STORE en canonical 기존 보유 | **0** |
| **canonicalDup** | **0** |
| 예상 write | KO **636T** + EN **318T** = **954T** (master 159 × 6T) |
| **실제 DB write** | **0** |

## 11. 금지사항 준수

| 금지 | 결과 |
|------|:----:|
| LIVE apply | **0** (apply 경로는 이중 게이트 + 명시적 차단문으로 잠금) |
| 실행 순서 원장 GREEN 변경 | **0** (원장 파일 읽지도 쓰지도 않음) |
| 공용 fingerprint · sourceRef 산식 변경 | **0** |
| 경구 Unit 1·2 파일 수정 | **0** |
| 비경구 Unit 1 파일 수정 | **0** |
| 공용 러너 수정 (대규모 리팩터링 포함) | **0** (import 만) |
| `git add .` / reset / clean / stash | **미사용** (path-specific add 만) |
| `apps/api-server/.env` 수정·삭제 | **0** |
| 자격증명 출력 | **0** (process.env 로만 전달, 값 열람·출력 없음) |

## 12. 비경구 Unit 1 GREEN 후 즉시 LIVE 가능 여부

**판정: 가능 (점안 Unit 2 측 선행조건 전부 충족).**

- 최종 승인 SSOT 가 `APPROVED_FOR_PRODUCTION` 이고, EN 34/34 페이로드가 단일 파일로 준비되어 생산 실행기의 `--en-config=<한 파일>` 입력 계약을 그대로 만족한다.
- dry-run 12 게이트 전부 PASS, rollback 시험 PASS, 2회 실행 byte-identical 확인 완료. 실행기의 apply 경로는 게이트 통과 + `--apply` + 확인 env 이중 게이트로만 열린다.
- 남은 선행조건은 **가 세션 밖**에 있다:
  1. 경구 Unit 2 GREEN,
  2. 비경구 Unit 1 GREEN,
  3. write-owner 인계 및 LIVE apply 승인 WO.
- 위 3건이 충족되면 `--mode=apply --lang=ko` → `--lang=en` 순으로 즉시 실행 가능하다. 총 write 954T(KO 636T + EN 318T), INSERT-only, 단일 트랜잭션, 커밋 전 사후검증, 실패 시 전량 rollback.
- 본 CHECK 시점까지 DB 반영은 **0** 이며, 승인 없는 apply 는 수행하지 않는다.
