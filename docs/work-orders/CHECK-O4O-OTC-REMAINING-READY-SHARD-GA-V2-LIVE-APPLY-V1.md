# CHECK — WO-O4O-OTC-REMAINING-READY-SHARD-GA-V2-LIVE-APPLY-V1

**에이전트**: 가 (첫 LIVE write-owner)
**일자**: 2026-07-25
**상태**: **완료 — KO/EN LIVE apply 5,022T · 독립검증 GREEN · 나 shard 해제**

---

## 1. 결론 요약

| 단계 | 결과 |
|------|------|
| EN 저작 완비 게이트 (p01~p12) | **COMPLETE** — 237 fp / 837 master |
| KO apply-readiness | **READY** — 10 게이트 PASS |
| **KO LIVE apply** | **3,348T / 예상 3,348T MATCH** |
| EN apply-readiness | **READY** — 11 게이트 PASS (post-KO 게이트 포함) |
| **EN LIVE apply** | **1,674T / 예상 1,674T MATCH** |
| **총 실제 write** | **5,022T** (계약 5,022T 일치) |
| 독립 사후검증 | **GREEN — 15/15 PASS** |
| `--mark-verified=ga` | **완료** (note: 독립검증 GREEN) |
| 나(na) shard apply 해제 | **해제됨** — na ko readiness READY |

---

## 2. EN 저작 완비 게이트 (파일 기준 · DB write 0)

### 2-1. coverage (`otc-v2-en-config-coverage.ga.mjs`)

```
EN-CONFIG-COVERAGE ga — COMPLETE
  configs 12 · entries 237
  covered 237 fp / 837 master · eligible 237 fp / 837 master
  HOLD 제외 1 fp / 2 master · 누락 0 · 초과 0
  EN write 예상 1674T / 필요 1674T
```

누락 0 · 중복 0(fp/master 양축) · HOLD 포함 0 · shard 밖 fp 0 · 필수 필드 채움 · 한글 잔존 0 · usageLabel 입력 0.

### 2-2. verify (`otc-v2-en-config-verify.ga.mjs` — 공용 러너 `renderEn`/`missingNumericsEn` 직접 import)

```
EN-CONFIG-VERIFY ga — entries 237 · PASS
```

모든 JSON parse PASS · 비경구 경로 경구 동사 0 · 공식 용법 수치 누락 0 · 빈 html 0.

병합본 `otc-v2-en-config-ga-all.json` 에 대해서도 동일 게이트 재실행 → COMPLETE / PASS.

---

## 3. KO LIVE apply

```
APPLY-PREFLIGHT ga / ko — 적격 237 fp / 837 master · HOLD 1 fp / 2 master
  PASS  target fp/master == dry-run manifest        PASS  CLQ/CDS/CSI 혼입 0
  PASS  HOLD 대상 제외                               PASS  빅콘에스600정 혼입 0
  PASS  fingerprint 재현 100%                        PASS  pre-apply canonicalDup 0
  PASS  shard 밖 master 0                            PASS  예상 write == 실측 계획
  PASS  기존 완료분 교집합 0                          PASS  apply 순서 충족
READY → APPLIED ga/ko — 237 그룹 · writeActual 3348 / 예상 3348 MATCH
```

master 1건당 4T = easy_drug canonical → deprecated / authored INSERT / canonical 전환 / audit.

---

## 4. 공용 러너 최소 수정 (사용자 승인 후 수행)

### 4-1. 발견한 구조 결함

KO apply 직후 EN readiness 가 **적격 0 fp / HOLD 238 fp** 로 전량 차단됐다.

원인: `preflight()` 가 lang 무관하게 **"KO apply 이전" DB 상태를 전제**했다.

| 위치 | 기존 전제 | KO apply 이후 실제 |
|------|----------|-------------------|
| `fetchTargetState` e약은요 원문 LATERAL | easy_drug ko `status='canonical'` 행에서 공식 원문을 읽음 | KO apply 가 `deprecated` 로 강등 → 원문 조회 0건 → 전 master `원문 부재` → fp 재현 실패 |
| `preflight` 슬롯 검사 | `easyCanonical1 === g.size` | easy canonical 0 |
| `preflight` 슬롯 검사 | `authoredConflict === 0` | authored ko 837 존재 |

### 4-2. 적용한 수정 (사용자 승인: "첫 번째 선택지 — 공용 러너 최소 수정")

1. **원문 조회 status 범위만 확장** — `status IN ('canonical','deprecated')` + `ORDER BY (status='canonical') DESC, length DESC`.
   canonical 최우선 정렬이므로 **KO apply 이전(=dry-run) 선택 결과는 완전 동일**하고, canonical 이 사라진 post-KO 에서만 deprecated 원문으로 폴백한다. content 자체는 KO apply 가 건드리지 않으므로 **fingerprint 산식·입력 불변**.
2. **`preflight(ds, shard, lang='ko')` lang 인지형 분기** — `lang='en'` 이고 ledger 상 같은 shard `koApplied=true` 인 경우에만 post-KO 모드:
   - 기대: authored ko canonical == size · easy ko canonical 0 · en canonical 0
   - 기존 pre-KO 기대치는 `lang='ko'` 경로에 그대로 유지
3. **`post-KO 선행 상태 실측 일치` 게이트 신설** — EN apply 직전 DB 실측으로 shard 전체 합계 재확인:
   authored ko canonical == 837 · easy ko canonical == 0 · ko dup == 0 · audit == 837

**불변 유지**: fingerprint 재현 · sourceRef 앵커 · route resolver · 수치 보존 · HOLD 제외 · canonicalDup · 예상 write · apply 순서 게이트 전부 그대로.
**KO 837건은 수정·rollback·재적용하지 않았다.**

### 4-3. 회귀검증

| 검증 | 결과 |
|------|------|
| `--selftest` (오프라인) | **PASS** — fp 재현·route resolver·경로별 KO/EN·수치 보존·차단 게이트·앵커 분리 |
| `tsc --noEmit --strict` | **통과** (exit 0) |
| na shard ko readiness | 실질 게이트 **전부 PASS** (fp 재현 100% · 839 master) — 당시 순서 게이트만 차단 |
| da shard ko readiness | 실질 게이트 **전부 PASS** (fp 재현 100% · 833 master) — 순서 게이트만 차단 |

na/da 는 `koApplied=false` 이므로 pre-KO 분기를 그대로 타며 동작 변화 없음을 실측 확인했다.

---

## 5. EN LIVE apply

```
APPLY-PREFLIGHT ga / en — 적격 237 fp / 837 master · HOLD 1 fp / 2 master
  PASS  (기존 10 게이트 전부)
  PASS  post-KO 선행 상태 실측 일치
  post-KO 선행 실측 — authored ko canonical 837 · easy ko canonical 0 · ko dup 0 · audit 837 (대상 837)
READY → APPLIED ga/en — 237 그룹 · writeActual 1674 / 예상 1674 MATCH
```

master 1건당 2T = authored EN INSERT / canonical 전환.

**파트별 EN write** (병합본은 p01~p12 순수 concat, 파트 경계 그대로 유지):

각 파트의 fp 를 apply run 리포트(`otc-v2-apply-run.ga.en.json`)의 fp 별 실측 write 로 집계한 값이다.

| 파트 | fp | master | 실제 write |
|------|---:|------:|------:|
| p01 | 20 | 221 | 442T |
| p02 | 20 | 117 | 234T |
| p03 | 20 | 88 | 176T |
| p04 | 20 | 71 | 142T |
| p05 | 20 | 60 | 120T |
| p06 | 20 | 49 | 98T |
| p07 | 20 | 40 | 80T |
| p08 | 20 | 40 | 80T |
| p09 | 20 | 40 | 80T |
| p10 | 20 | 40 | 80T |
| p11 | 20 | 40 | 80T |
| p12 | 17 | 31 | 62T |
| **계** | **237** | **837** | **1,674T** |

파트는 fp 20개씩 균등 분할이지만 그룹당 master 수가 달라 write 는 앞 파트에 몰린다(p01 221 master ↔ p07~p11 각 40).

> 러너는 shard 전체를 **단일 패스**로 apply 하므로(중간 fp 누락 시 즉시 중지) 파트 단위 실행이 불가능하다.
> 따라서 p01~p12 를 순수 concat 한 병합본 1개로 실행했고, 파트별 수치는 각 파트의 fp/master 배분에서 그대로 도출된다.

---

## 6. 독립 사후검증 (`otc-v2-ga-postverify.ga.mjs` · read-only · DB write 0)

공용 러너의 preflight/apply 경로를 **쓰지 않고** shard SSOT master 목록만으로 DB 실측.

```
OTC-V2-GA POST-VERIFY (독립) — 대상 837 master · HOLD 2 master
  PASS  authored STORE ko canonical 정확히 1 — 837 / 837
  PASS  ko canonical 0건 master — 0 / 0
  PASS  ko authored 중복 — 0 / 0
  PASS  STORE en canonical 정확히 1 — 837 / 837
  PASS  en canonical 0건 master — 0 / 0
  PASS  en canonical 중복 — 0 / 0
  PASS  easy_drug ko canonical 잔존 — 0 / 0
  PASS  easy_drug ko deprecated (원문 보존) — 837 / 837
  PASS  canonicalDup (ko/en) — 0 / 0
  PASS  audit(canonical_replaced/ko) — 837 / 837
  PASS  HOLD master authored SPD write — 0 / 0
  PASS  HOLD master audit write — 0 / 0
  PASS  HOLD master en SPD write — 0 / 0
  PASS  shard 밖 write (이번 WO 앵커 기준) — 0 / 0
  PASS  이번 WO audit 총량 — 837 / 837
  실측 write — KO 3348T · EN 1674T · 총 5022T (기대 3348 / 1674 / 5022)
POST-VERIFY ga — GREEN
```

**기존 LIVE drift 0** — authored canonical 분포에서 이번 WO 증분만 확인됨:

| source_type | KO apply 전 | 최종 | 증분 |
|-------------|-----------:|-----:|-----:|
| `mfds_drug_otc` | 8,398 | 10,072 | +1,674 (KO 837 + EN 837) |
| `mfds_drug_otc_nutrition_combo` | 7,090 | 7,090 | 0 |
| `mfds_easy_drug` | 12,062 | 11,225 | −837 (canonical → deprecated) |

### 검증기 자체 교정 이력 (투명성)

- 초판에서 authored source_type 을 `authored_store_leaflet_v2` 로 추정 → 전 항목 FAIL. 러너 실값 `mfds_drug_otc`(`AUTHORED_SOURCE_V2`, L879)로 교정.
- `mfds_drug_otc` 는 선행 트랙과 공유하는 값이라 source_type 만으로 "shard 밖" 을 판정하면 선행 8,398건이 오탐 → 이번 WO 의 audit `metadata->>'wo'` 앵커 기준으로 교정.

---

## 7. HOLD 유지

- 일반명코드 **227703ATB** · 1 fingerprint / 2 master
- 공식 주의사항 축 전부 부재 → 생산 제외 · 추정 보완 없음
- **DB write 0 실측 확인** (authored SPD 0 · audit 0 · en SPD 0)

---

## 8. 산출물

| 파일 | 성격 |
|------|------|
| `apps/api-server/src/scripts/otc-v2-store-leaflet-runner.shared.ts` | **공용 러너 — 승인된 최소 수정** (§4-2) |
| `apps/api-server/src/scripts/otc-v2-ga-postverify.ga.mjs` | 독립 사후검증기 (신규 · read-only) |
| `apps/api-server/src/scripts/data/otc-v2-en-config-ga-all.json` | p01~p12 병합본 (순수 concat · 내용 무변경) |
| `apps/api-server/src/scripts/data/otc-v2-apply-preflight.ga.json` | preflight 산출 (러너 자동 기록) |
| `apps/api-server/src/scripts/data/otc-v2-apply-run.ga.ko.json` | KO apply run 리포트 |
| `apps/api-server/src/scripts/data/otc-v2-apply-run.ga.en.json` | EN apply run 리포트 |
| `apps/api-server/src/scripts/data/otc-v2-apply-order.json` | ledger — ga 3축 전부 true |

---

## 9. 다음 shard 인계

```
ga: koApplied=true · enApplied=true · independentVerified=true (note: 독립검증 GREEN)
na: READY — na ko apply 진행 가능 (10 게이트 PASS · writePlan KO 3356 / EN 1678 / total 5034)
da: 차단 유지 — 선행 na 미완료
```

**나 세션 주의사항**: 러너는 이제 KO → EN 순서를 정상 지원한다(post-KO 분기). 파트별 EN config 는
`--en-config` 이 단일 파일만 받고 러너가 shard 전체를 단일 패스로 처리하므로, **병합본 1개**를 만들어
coverage/verify 게이트를 통과시킨 뒤 EN apply 를 1회 실행한다.
