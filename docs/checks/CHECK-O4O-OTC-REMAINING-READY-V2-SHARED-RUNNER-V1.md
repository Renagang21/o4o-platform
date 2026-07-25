# CHECK-O4O-OTC-REMAINING-READY-V2-SHARED-RUNNER-V1 — 가·나·다 공용 V2 러너 + 다 shard dry-run (에이전트 다)

WO: `WO-O4O-OTC-REMAINING-READY-V2-SHARED-RUNNER-V1`
기준 commit: `81b39da72` · SSOT: `otc-remaining-shard-assignment-ssot-v2.json` · census: `otc-remaining-full-corpus-census-v2.json`
상태: **PASS — 공용 러너 신규 작성 · dry-run 게이트 12/12 PASS · fp 재현 839/839(100%) · DB write 0.**

## 0. 결론

> V2 계약(일반명코드 + 공식 경로, 제품명 미개입)을 그대로 소비하는 **가·나·다 공용 러너**를 신규 작성했다.
> 다 shard **238 fp / 839 master** 전량 DB read-only dry-run 완료. **생산 가능 237 fp / 833 master**, HOLD 1 fp / 6 master(공식 주의사항 축 부재).
> **LIVE apply 미수행**(순번상 가 → 나 독립검증 완료 후). **DB write 0 · apply 경로 자체가 러너에 없음.**

## 1. 작성 산출물

| 파일 | 성격 |
|---|---|
| `apps/api-server/src/scripts/otc-v2-store-leaflet-runner.shared.ts` | **공용 러너** (가·나·다 공유) — Shared Module Change Protocol 대상 |
| `apps/api-server/src/scripts/data/otc-v2-dryrun-manifest.da.json` | 다 shard dry-run manifest |
| `apps/api-server/src/scripts/data/otc-v2-samples.da.json` | 경로별 샘플 실물 |

**V1 러너 `otc-oral-combo-store-leaflet-runner.ga.ts` 는 수정하지 않았다**(0 byte 변경). V1 은 제품명 유래 6축 산식의 구현체로 보존한다.

### 구성

1. **V2 계약 VERBATIM 블록** — `H` · `sections` · `normalize` · `SUFFIX_MAP` · `SITE_AMBIGUOUS` 를 census-v2.ts 와 1:1 로 복제.
2. **SSOT 로더** `loadShard(shard)` — V2 SSOT + census readyGroups 교차 검증(fp 수·master 합 불일치 시 throw).
3. **fp 재현기** `fingerprintV2(ax, gencode, route)` = `H([H(norm(ind)), H(norm(dos)), H(norm(cau)), gencode, route])` — census:306 과 동일.
4. **verifier** `resolveRoute(gencode)` — 접미 allowlist. CLQ/CDS/CSI·미등재는 차단. `admissionCheck(group)` 이 차단 fp/master·route·form 상충을 한 번에 판정.
5. **route별 KO composer** `composeKo()` — 공식 3축 grounding, 경로 동사 재표현, 수치 보존 게이트.
6. **route별 EN renderer** `renderEn()` — `usageLabel` 을 **경로에서 주입**(저작자 자유입력 차단), 한글 잔존·경구 동사·수량 누락 게이트.
7. **dry-run** — DB read-only. apply 분기 없음.

### 금지 축 미사용 (실측)

`ingredientOf(name)` · `formOf(name)` · `routeSig(name)` · 제품명 끝 괄호 성분 추출 · V1 산식 — **전부 부재**. 제품명은 러너의 fp/축 판정 경로에 어떤 형태로도 입력되지 않는다. selftest 가 "제품명이 달라도 fp 불변"·"gencode/route 가 다르면 fp 변동"으로 이를 증명한다.

### 일반명코드 연결

census 조인 계약 VERBATIM — `pc.raw_payload->>'mfdsCode' = pi.identifier_value` (+ `source_label LIKE 'mfds-drug-master-standard-code%'`). `identifier_value` 는 13자리 KOREA_DRUG_CODE 이므로 **MFDS_CODE 직접 조인은 사용하지 않았다.** master 당 gencode 가 정확히 1개일 때만 채택.

## 2. 지원 route (7)

`oral` · `topical` · `ophthalmic` · `oromucosal` · `nasal` · `vaginal` · `rectal` — WO 최소 요건 충족.

| route | KO usageLabel | EN usageLabel | 경구 동사 |
|---|---|---|---|
| oral | 복용 안내 | How to take it | 허용 |
| oromucosal | 사용 안내 | How to use it in the mouth | **차단** |
| topical | 사용 안내 | How to apply it | **차단** |
| ophthalmic | 사용 안내 | How to use the eye drops | **차단** |
| nasal | 사용 안내 | How to use it in the nose | **차단** |
| vaginal / rectal | 사용 안내 | How to insert it | **차단** |

플랫폼 DR-019 계약(`usageLabel` = '복용 안내'(경구) | '사용 안내'(비경구), 제형명 추정 금지)을 그대로 따른다. 비경구는 원문의 경구 동사를 경로 동사로 재표현하되 **수치·대상·횟수·기간·연령은 건드리지 않는다**(재표현 후 수치 보존 재검증).

## 3. 오프라인 검증

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` (러너 관련 오류) | **0** |
| selftest (DB 미접속) | **PASS** — fp 재현·제품명 무관성·gencode/route 축 반영·route resolver(ATB/COS/ATO/CTB 정상, CLQ/CDS/CSI/CSP 차단)·경로별 KO 합성·KO 빌더 계약·EN 렌더(한글/경구동사/수량)·차단 게이트·V1 앵커 분리 |

selftest 가 실제로 잡아낸 결함 1건: **EN 수량 게이트가 한글 단위 토큰을 영문에 대조**하고 있었다. 영어는 `1일 2회` 를 `twice a day` 로 옮기는 것이 정상 번역이므로, 수량값 + 숫자 단어형(once/twice/…) 인정 방식(`missingNumericsEn`)으로 교정했다. 교정하지 않았다면 어색한 직역을 강제해 오히려 원문 충실도가 떨어졌을 것이다.

## 4. DB dry-run — 게이트 12/12 PASS

접속: `127.0.0.1:5442` · `o4o_api` / `o4o_platform` · 사용자 배치 `apps/api-server/.env` (값 **열람·출력 0**, `process.env` 로만 전달). 루트 `.env` 미사용.

| # | 게이트 | 실측 | 판정 |
|---|---|---|:---:|
| 1 | V2 fingerprint 재현 100% | **839 / 839** (실패 0) | PASS |
| 2 | target fp == V2 SSOT | 238 / 238 | PASS |
| 3 | target master == V2 SSOT | 839 / 839 | PASS |
| 4 | shard 밖 대상 0 | 0 | PASS |
| 5 | 기존 완료 대상 교집합 0 | 0 | PASS |
| 6 | CLQ/CDS/CSI 651 혼입 0 | 0 | PASS |
| 7 | 빅콘에스600정 혼입 0 | fp 0 / master 0 | PASS |
| 8 | route/form/gencode 상충 0 | 0 | PASS |
| 9 | 예상 write == 실측 계획 | KO 3,332 == 833×4 · EN 1,666 == 833×2 | PASS |
| 10 | canonicalDup 0 | 0 | PASS |
| 11 | dry-run DB write 0 | 0 (apply=false, apply 경로 부재) | PASS |
| 12 | 동일 입력 2회 byte-identical | md5 `7ad773f1…` 동일 | PASS |

### 대상 처분

| 구분 | fp | master |
|---|---:|---:|
| **생산 가능** | **237** | **833** |
| HOLD | 1 | 6 |
| 합계 | 238 | 839 (SSOT 일치) |

생산 가능 route별: oral 206 fp/697 m · topical 20 fp/87 m · ophthalmic 9 fp/38 m · oromucosal 2 fp/11 m.

**HOLD 1건** — `d6a0785fdee2decf` / `227736ATD` / oromucosal 구강용해필름 / 6 master.
사유: 공식 원문에 **주의사항 3축(경고·사용상 주의사항·상호작용) 전부 부재**(효능 49자·용법 102자는 존재, 주의 0자). 소비자 설명서 빌더의 필수 필드를 충족하지 못하며, 안전정보를 창작해 채우는 것은 콘텐츠 불변 원칙 위반이므로 생산하지 않는다. fp 재현 6/6 은 정상이므로 **대상 결함이 아니라 원문 결손**이다. 선례: 빅콘에스600정(용법 1축 부재) HOLD_SOURCE.

> V2 census 의 READY 조건은 효능·용법 2축이나, 매장 설명서 렌더 계약은 **주의 축까지 필수**다. 이 간극이 드러난 첫 사례이며 가·나 shard 에도 동일 유형이 있을 수 있다.

## 5. 경로별 샘플 (WO 요건 충족)

| route | 요건 | 실측 | 결과 |
|---|---|---|---|
| oral | ≥2 fp | 2 (`A65403ALQ` 34m · `A04400ATB` 16m) | 전건 PASS |
| topical | ≥2 fp | 2 (`C37200CPL` 13m · `339600CCM` 10m) | 전건 PASS |
| ophthalmic | ≥2 fp | 2 (`D36900COS` 14m · `216134COS` 6m) | 전건 PASS |
| oromucosal | ≥2 fp | 2 (`387201ATD` 9m · `227736ATD` 6m) | fp/경로 PASS (후자는 §4 HOLD) |
| nasal/vaginal/rectal | 존재 시 ≥1 | 다 shard 에 **해당 경로 대상 0** | 해당 없음 |

샘플 8건 전부: **fp 재현 true · 경구동사 혼입 false · 수치 누락 0**.

실물 대조 (원문 → 합성):

- ophthalmic `D36900COS` — 용법 `1회 1~2방울, 1일 4~5회 점안합니다.` → 동일 보존, 라벨 `사용 안내`. 효능 `눈의 피로, 누액의 보조(눈의 건조), 하드콘택트렌즈…` 전문 보존.
- topical `C37200CPL` — `1일 수회(여러 차례) 환부(질환 부위)에 부착합니다.` → 동일 보존.
- topical `339600CCM` — `1일 1~수회 환부에 적당량 바르십시오.` → 동일 보존.

공식 효능·용법·주의 정보층 보존 · 경로별 동사 정확(점안/부착/바르십시오 — 경구 표현 0) · 수치·연령·기간 보존 · **제품명 유래 추론 0**.

## 6. 예상 write (apply 시)

| 언어 | 계산 | 트랜잭션 |
|---|---|---:|
| KO | 833 master × 4T (authored INSERT · easy demote · authored flip · audit) | **3,332** |
| EN | 833 master × 2T (INSERT · flip) | **1,666** |
| **합계** | | **4,998** |

EN 본문은 그룹별 저작 페이로드가 필요하다(러너는 렌더·검증만 수행). 현 dry-run 은 KO 합성까지 검증했고 EN 은 렌더러 계약·게이트를 selftest 로 검증했다.

## 7. 현 단계 준수

- **LIVE apply 미수행** · **DB write 0** · 러너에 apply 분기 **부재**
- V1 러너 **수정 0** · V1 shard **미사용** (V2 SSOT 전용, `supersedes` 확인)
- 라 census·회수 감사 파일 **수정 0** (읽기 전용 참조)
- **`apps/api-server/.env` 삭제하지 않고 보존** — 라 세션 651건 회수 감사가 동일 파일을 사용 중/예정이므로 유지. 최종 삭제는 사용자 별도 지시 시점.
- 자격증명 값 **출력 0** · 루트 `.env` **미사용**
- `git add .` 미사용 · reset/clean/stash 미사용 · 타 세션 untracked 파일(`otc-v2-leaflet-config-batch1.ga.json` 가 · `otc-remaining-v2-verify.na.mjs` 나) **미접촉**

## 8. 공용 자산 안내 (가·나 세션)

```
# 오프라인 자기검증
../../node_modules/.bin/tsx src/scripts/otc-v2-store-leaflet-runner.shared.ts --selftest

# 자기 shard dry-run
../../node_modules/.bin/tsx src/scripts/otc-v2-store-leaflet-runner.shared.ts --shard=ga --dry-run
../../node_modules/.bin/tsx src/scripts/otc-v2-store-leaflet-runner.shared.ts --shard=na --dry-run

# 경로별 샘플
../../node_modules/.bin/tsx src/scripts/otc-v2-store-leaflet-runner.shared.ts --shard=ga --emit-sample --per-route=2
```

**가·나 세션은 이 파일을 수정하지 않는다.** 수정이 필요하면 다 세션에 요청한다 — 3 shard 전부에 영향이 가므로 단일 작성자를 유지한다. manifest 산출 경로는 shard 별로 분리되어 충돌하지 않는다.

## 9. Git / 무결성

- 자기 산출물 4개(공용 러너 · dry-run manifest · samples · 본 CHECK)만 path-specific stage·commit·push
- `_msm.mjs` / `_msmx.mjs` 미접촉 · `.env` 는 gitignore 대상으로 스테이징 위험 없음
