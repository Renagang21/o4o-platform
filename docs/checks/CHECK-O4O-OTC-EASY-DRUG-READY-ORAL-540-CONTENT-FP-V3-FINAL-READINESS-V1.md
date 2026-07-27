# CHECK — WO-O4O-OTC-EASY-DRUG-READY-ORAL-540-CONTENT-FP-V3-FINAL-READINESS-V1 (에이전트 다)

**세션:** 에이전트 다 (write-owner oral-unit-1 · oral-unit-2) · 2026-07-27
**모델 전환:** gencode-fingerprint(폐기) → **content-fingerprint V3** (전역 재승인 commit `00851d237`)
**판정:** **PRE_APPLY READY** — 540/131fp/2unit 재현 · 131 fp KO+EN 저작·검증 · 이중게이트 apply 잠금 · 전 게이트 PASS
**DB write: 0 · LIVE apply 0 · 설명서 DB 반영 0**

---

## 0. 배경 — 왜 V3 인가

기존 gencode 단독 fingerprint 는 **같은 일반명코드라도 제품별 공식 원문(효능·용법·주의)이 동질임을 보장하지 못한다**.
V3 는 공식 6섹션을 개별 정규화·해시하여 fingerprint 를 구성한다. gencode 는 후보 연결 키일 뿐 fingerprint 가 아니다.

```
CONTENT_SECTIONS = [효능·효과, 용법·용량, 경고, 사용상 주의사항, 이상반응, 상호작용]
H(s)             = md5(s).slice(0,16)
fp = H([gencode, route, ...CONTENT_SECTIONS.map(k => H(normalize(sec[k]||'')))].join('|'))
sourceRef        = contentFpToUuid(fp) = uuid(md5('otc-v3-content-leaflet:' + fp))   // V2(otc-v2-leaflet:) 와 다른 namespace
```

같은 content fp 안에서는 **6섹션이 정의상 byte-identical** 이므로, fp 당 1회 저작(KO+EN)이 그 fp 의 모든 master 에 그대로 적용된다.

## 1. 산출물

| 구분 | 경로 |
|------|------|
| V3 6섹션 KO 합성기 + EN 렌더러 (da 전용) | `apps/api-server/src/scripts/otc-easy-drug-ready-oral-v3-composer.da.ts` |
| EN 저작·검증 파이프라인 (문장 TM 방식) | `apps/api-server/src/scripts/otc-easy-drug-ready-oral-v3-en-author.da.ts` |
| 문장단위 번역메모리 (794 문장, 100% filled) | `.../data/otc-easy-drug-ready-oral-v3-tm.da.json` |
| KO source dump (공식 6섹션 grounding) | `.../data/otc-easy-drug-ready-oral-v3-ko-source-dump.da.json` |
| EN 저작 페이로드 (131 fp) | `.../data/otc-easy-drug-ready-oral-v3-en-payload.da.json` |
| 빌드 산출기 (원장+dump+EN 조인) | `apps/api-server/src/scripts/otc-easy-drug-ready-oral-v3-build.da.ts` |
| 빌드 파일 (KO/EN, unit별) | `.../data/otc-easy-drug-ready-oral-v3-{build,en-build}-oral-unit-{1,2}.json` |
| 생산 실행기 (dry-run · rollback-test · apply 이중잠금) | `apps/api-server/src/scripts/otc-easy-drug-ready-oral-v3-apply.da.ts` |
| **독립** 검증자 (composer/build/apply 미import) | `apps/api-server/src/scripts/otc-easy-drug-ready-oral-v3-verify.da.ts` |
| PRE_APPLY READY emit | `apps/api-server/src/scripts/otc-easy-drug-ready-oral-v3-preapply-emit.da.ts` |
| **PRE_APPLY READY 원장** | `.../data/otc-easy-drug-ready-oral-v3-preapply-ready-oral-unit-{1,2}.json` |

**공용 파일 변경 0** — `otc-v2-store-leaflet-runner.shared.ts`, V3 승인 SSOT/원장(`otc-easy-drug-ready-1134-content-fingerprint-unit-ledger-v1.json`), 기존 oral GREEN 파일, na 형제 러너는 **import·read-only**. oral 제형 정책은 da 소유 파일로만 적용.

## 2. fp / master 재현 (V3 unit 원장 + DB 공식 원문 독립 재현)

| 항목 | 선언 | 독립 재현 | 판정 |
|------|-----:|---------:|:---:|
| content fingerprint | 131 | **131** | PASS |
| master | 540 | **540** | PASS |
| oral-unit-1 | 65fp / 270m | **65 / 270** | PASS |
| oral-unit-2 | 66fp / 270m | **66 / 270** | PASS |
| unit 간 master 교집합 | 0 | **0** | PASS |
| fp unit 분할(split) | 0 | **0** | PASS |
| easy_drug STORE ko canonical 확보 | 540 | **540** | PASS |
| **fp 재현율** | 100% | **131/131** | PASS |

census 조인은 승인본 VERBATIM. 제품명은 route·성분 판정에 **일절 미사용**.

## 3. route · 제목 · sourceRef

| 검증 | 결과 |
|------|-----:|
| route=oral 전건 | **540 / 540** |
| 제형 → EN 매핑 (9종: 정/연질캡슐/캡슐/현탁액/시럽/장용정/내복액/서방정/장용캡슐) | **전건 등록, 미등록 제형 STOP 가드** |
| **제목 = `${제형} (${gencode})`** (브랜드명 아님 — content-fp representative) | KO/EN 동일 방식, na 형제 WO 정렬 |
| fp 내부 6섹션 byte-identical | **131/131 (정의상 보장)** |
| sourceRef 3중 일치 (dump · ledger · V3 산식 재계산) | **131/131** |
| sourceRef LIVE 충돌 | **0** |
| V3 sourceRef == V2 namespace | **0 (131/131 상이)** |

## 4. KO 합성 — 6섹션 보존

프로즌 HTML 빌더의 콘텐츠 존 3개(efficacy/usage/caution)에 V3 6섹션을 보존한다. 4개 안전 섹션(경고·사용상 주의사항·이상반응·상호작용)을 **고정순서 `【라벨】` 블록**으로 단일 caution 존에 적재. KO 는 저장본이 아니라 official 6섹션에서 `composeKoV3` 로 재생성한다.

| 항목 | 결과 |
|------|-----:|
| KO 구성 가능 fp | **131 / 131** |
| KO anomalies | **0** |
| 용법·효능 수치 누락 (`missingNumerics`) | **0** |
| present 안전 섹션 caution 보존 | **131/131 전량 보존** |
| 매장 약사 문의 안내 유지 | **전건** |

## 5. EN 저작 — 131 fp (문장단위 TM)

결정론적 문장단위 번역메모리(TM) 방식. KO 공식 6섹션을 문장으로 분해 → TM(794 문장)에서 1:1 조회 → EN 섹션 조립. **공식 원문에 없는 의료 사실 생성 0.** TM 미등록 문장은 커버리지 실패로 STOP.

```
$ tsx otc-easy-drug-ready-oral-v3-en-author.da.ts
fpProcessed=131 tmFilled=794 missingSentences=0 anomalyFps=0
coverageComplete=true validationClean=true → EN READY (131 fp payload written)
```

| 게이트 | 결과 |
|--------|-----:|
| EN fp 커버리지 | **131 / 131** |
| TM 문장 충전율 | **794 / 794 (100%)** |
| 한글 잔존 | **0** |
| 공식 용법 수량 누락 (`missingNumericsEn` — 수량·횟수·간격·연령·기간) | **0** |
| 신규 의료 사실 | **0** |

> "1일"(하루 관용구)은 문자 "1" 을 요구하는 `missingNumericsEn` 를 만족시키기 위해 TM 에서 "a day"/"once a day" 로 번역(EN_NUM_WORDS['1'] 충족). 공용 checker 는 미수정.

## 6. dry-run (unit별 2회 byte-identical)

| unit | koWritePlan | enWritePlan | anomalies | enHeldPendingKo | planDigest md5 (2회) |
|------|-----------:|-----------:|---------:|---------------:|----------------------|
| oral-unit-1 | 1080 | 540 | 0 | 65 | `d9c3d4cd25f7976efa350ae88259580a` **동일** |
| oral-unit-2 | 1080 | 540 | 0 | 66 | `b208727afb9be3bf317aea35d26ef3f2` **동일** |

타임스탬프·난수 없음, 정렬 고정, html 해시 기록. EN 은 KO canonical 선행이므로 dry-run 에서 HELD(정상).

## 7. rollback-test (트랜잭션 → 강제 ROLLBACK, 순 DB write 0)

실제 write 계약(KO 4T: easy demote → authored insert → flip canonical → audit · EN 2T: insert → flip)을 **전 master** 트랜잭션 안에서 그대로 수행 후 무조건 ROLLBACK.

| unit | txWrittenThenRolledBack | residue (authored/v3ref/easyDeprecated/audit) | residueClean |
|------|------------------------:|:---------------------------------------------:|:-----------:|
| oral-unit-1 | 1620 (KO 1080 + EN 540) | 0 / 0 / 0 / 0 | **true** |
| oral-unit-2 | 1620 (KO 1080 + EN 540) | 0 / 0 / 0 / 0 | **true** |

트랜잭션 내부에서 계약대로 발생 후 커밋 없이 전량 ROLLBACK → **순 DB write 0**.

## 8. 독립 검증자 (composer/build/apply 미import)

`verify.da.ts` 는 러너의 빌드 로직을 쓰지 않고 fingerprint·sourceRef·수치보존을 **재유도**해 대조한다.

```
=== INDEPENDENT VERIFY · PASS=true · fails=0 ===
reproduce { unit-1 65fp/270m · unit-2 66fp/270m · totFp 131 · totM 540 · masterIntersection 0 · fpSplit 0 }
sourceRef { checked 131 / expected 131 }
dbBaseline { targetMasters 540 · easy_canon 540 · authored_ko_canon 0 · authored_ko_row 0 ·
             en_authored_row 0 · v3ref_row 0 · wo_audit 0 }
```

`dbBaseline` 이 LIVE 미반영을 실증: authored ko/en canonical 0, V3 sourceRef 행 0, WO audit 0. easy canonical 540 만 존재.

## 9. 예상 write · 교집합

| 항목 | 결과 |
|------|-----:|
| 기존 LIVE authored ko/en canonical | **0 / 0** |
| V3 sourceRef 행 · WO audit | **0 / 0** |
| 예상 write | KO **2,160T** + EN **1,080T** = **3,240T** (master 540 × 6T) |
| — oral-unit-1 | KO 1,080 + EN 540 = 1,620T |
| — oral-unit-2 | KO 1,080 + EN 540 = 1,620T |
| **실제 DB write** | **0** |

## 10. 금지사항 준수

| 금지 | 결과 |
|------|:----:|
| LIVE apply | **0** (`--apply` 는 이중 게이트 `OTC_V3_APPLY_KO_ORAL_UNIT_{1,2}=CONFIRM` + EN 동일 + WO 범위 밖 강제중지 exit 3 으로 잠금) |
| V3 승인 SSOT / unit 원장 / 기존 oral GREEN 변경 | **0** (read-only) |
| 공용 러너 · fingerprint · sourceRef 산식 변경 | **0** |
| 가·나·라 세션 파일 · pnpm-lock 접촉 | **0** |
| `git add .` / reset / clean / stash | **미사용** (path-specific add 만) |
| `.env` 수정·삭제·자격증명 출력 | **0** (process.env 로만 전달) |

## 11. LIVE apply 선행조건 (다 세션 밖)

**판정: oral-unit-1 · oral-unit-2 양측 선행조건 전부 충족 (PRE_APPLY READY).**

- 남은 선행조건: LIVE apply 승인 WO + 이중 게이트 토큰 부여.
- 충족 시 `--apply --confirm` (KO 선행 → EN) 로 unit 당 1,620T, INSERT-only, 단일 트랜잭션, 사후검증, 실패 시 전량 rollback.
- **oral-unit-1 LIVE 즉시 실행 가능 여부: 예 (게이트 토큰·승인 부여 시 즉시 실행 가능).** dry-run 2회 byte-identical, rollback residue 0, 독립검증 PASS, DB baseline 미반영 확인 완료.
- 본 CHECK 시점까지 DB 반영 **0**. 승인 없는 apply 는 수행하지 않는다.
