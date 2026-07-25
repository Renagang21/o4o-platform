# CHECK — WO-O4O-OTC-REMAINING-READY-SHARD-GA-V2-LIVE-APPLY-V1

**에이전트**: 가 (첫 LIVE write-owner)
**일자**: 2026-07-25
**상태**: **KO LIVE 완료 · EN LIVE 차단 (공용 러너 구조 결함)** — 사용자 결정 대기

---

## 1. 결론 요약

| 단계 | 결과 |
|------|------|
| EN 저작 완비 게이트 (p01~p12) | **COMPLETE** — 237 fp / 837 master |
| KO apply-readiness | **READY** — 10개 게이트 전부 PASS |
| **KO LIVE apply** | **완료 — writeActual 3,348T / 예상 3,348T MATCH** |
| EN apply-readiness | **NOT READY — 차단 3건** (KO apply 이후 구조적으로 통과 불가) |
| EN LIVE apply | **미실행 — DB write 0** |
| 독립 사후검증 | KO 축 **전부 GREEN** · EN 축 미충족(미적용) |
| `--mark-verified=ga` | **미실행** (EN 미완료 → 러너가 거부) |
| 나(na) shard apply 해제 | **미해제** — ledger `enApplied:false` 로 차단 유지 |

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

- 누락 0 · 중복 0 (fp/master 양축) · HOLD 포함 0 · shard 밖 fp 0
- 필수 필드(title/efficacy/usage/caution/summaryTable) 채움 · 한글 잔존 0 · usageLabel 입력 0

### 2-2. verify (`otc-v2-en-config-verify.ga.mjs` — 공용 러너 `renderEn`/`missingNumericsEn` 직접 import)

```
EN-CONFIG-VERIFY ga — entries 237 · PASS
```

- 모든 JSON parse PASS
- 비경구 경로에 경구 동사 0
- 공식 용법 수치 누락 0
- 빈 html 0

**→ 요구된 완비 게이트 전 항목 PASS. coverage COMPLETE 확인.**

---

## 3. KO LIVE apply

### 3-1. apply-readiness

```
APPLY-PREFLIGHT ga / ko — 적격 237 fp / 837 master · HOLD 1 fp / 2 master
  PASS  target fp/master == dry-run manifest
  PASS  HOLD 대상 제외
  PASS  fingerprint 재현 100%
  PASS  shard 밖 master 0
  PASS  기존 완료분 교집합 0
  PASS  CLQ/CDS/CSI 혼입 0
  PASS  빅콘에스600정 혼입 0
  PASS  pre-apply canonicalDup 0
  PASS  예상 write == 실측 계획
  PASS  apply 순서 충족
  writePlan KO 3348 · EN 1674 · total 5022
READY — ga ko apply 진행 가능
```

### 3-2. apply 실행

```
APPLIED ga/ko — 237 그룹 · writeActual 3348 / 예상 3348 MATCH
  run → src/scripts/data/otc-v2-apply-run.ga.ko.json
```

master 1건당 4T = easy_drug canonical → deprecated / authored INSERT / canonical 전환 / audit.

---

## 4. EN LIVE apply 차단 — 원인 확정

### 4-1. 증상

KO apply 직후 EN readiness 재실행 결과:

```
APPLY-PREFLIGHT ga / en — 적격 0 fp / 0 master · HOLD 238 fp / 839 master
  *** FAIL ***  target fp/master == dry-run manifest
  *** FAIL ***  fingerprint 재현 100%
  *** FAIL ***  예상 write == 실측 계획
NOT READY — 차단 3건
```

### 4-2. 원인 (코드 확정)

공용 러너의 `preflight()` 는 **lang 무관하게 항상 "KO apply 이전" DB 상태를 전제**한다.

| 위치 | 전제 | KO apply 이후 실제 상태 |
|------|------|------------------------|
| `fetchTargetState` e약은요 원문 LATERAL (L541-546) | `source_type='mfds_easy_drug' AND status='canonical'` 인 ko 행에서 **공식 원문**을 읽는다 | KO apply 가 그 행을 `deprecated` 로 강등 → **원문 조회 결과 0건** |
| `preflight` L916 | `easyCanonical1 === g.size` | easy canonical 0 → 불일치 |
| `preflight` L915 | `authoredConflict === 0` | authored ko 837 존재 → 충돌 |

원문을 못 읽으므로 `verifyGroupMasters` 가 master 전건에 `원문 부재` → `fpBad` 를 남기고,
그 결과 `fingerprint 재현 100%` 가 깨지며 전 그룹이 HOLD 로 떨어진다.
EN apply 는 `preflight` blockers 가 0 일 때만 진행하므로 **EN 은 구조적으로 실행 불가**다.

### 4-3. 순서 함의

- 러너 설계상 통과 가능한 순서는 **EN → KO** 다 (EN 선적용 시 easy canonical 이 살아있어 preflight 통과, 이후 KO 의 `기존 완료분 교집합` 게이트도 0 유지).
- 인계서가 지정한 **KO → EN** 순서는 현재 러너에서 완주할 수 없다.
- 원문 자체는 **소실되지 않았다** — easy_drug 행 837건이 `deprecated` 상태로 content 보존 중 (독립검증 PASS).

---

## 5. 독립 사후검증 (`otc-v2-ga-postverify.ga.mjs` · read-only)

공용 러너의 preflight/apply 경로를 쓰지 않고 shard SSOT master 목록만으로 DB 실측.

```
OTC-V2-GA POST-VERIFY (독립) — 대상 837 master · HOLD 2 master
  PASS  authored STORE ko canonical 정확히 1 — 837 / 837
  PASS  ko canonical 0건 master — 0 / 0
  PASS  ko authored 중복 — 0 / 0
  *** FAIL ***  STORE en canonical 정확히 1 — 0 / 837      ← EN 미적용(차단)
  *** FAIL ***  en canonical 0건 master — 837 / 0          ← EN 미적용(차단)
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
  실측 write — KO 3348T · EN 0T · 총 3348T (기대 3348 / 1674 / 5022)
```

**EN 2건을 제외한 KO 축 전 항목 GREEN.** EN FAIL 은 저작·데이터 결함이 아니라 §4 차단으로 인한 미적용이다.

### 검증기 자체 교정 이력 (투명성)

초판에서 authored source_type 을 `authored_store_leaflet_v2` 로 추정해 전 항목 FAIL 이 났고,
러너 실값 `mfds_drug_otc` (`AUTHORED_SOURCE_V2`, L879) 로 교정했다.
또한 `mfds_drug_otc` 는 선행 트랙과 공유하는 값이라 source_type 만으로 "shard 밖" 을 판정하면
선행 8,398건이 오탐된다 — 이번 WO 의 audit `metadata->>'wo'` 앵커 기준으로 교정했다.

---

## 6. HOLD 유지

- 일반명코드 **227703ATB** · 1 fingerprint / 2 master
- 공식 주의사항 축 전부 부재 → 생산 제외 · 추정 보완 없음
- **DB write 0 실측 확인** (SPD 0 · audit 0 · en 0)

---

## 7. 산출물

| 파일 | 성격 |
|------|------|
| `apps/api-server/src/scripts/otc-v2-ga-postverify.ga.mjs` | 독립 사후검증기 (신규 · read-only) |
| `apps/api-server/src/scripts/data/otc-v2-en-config-ga-all.json` | p01~p12 병합본 (순수 concat · 내용 무변경). 러너가 shard 전체를 단일 패스로 apply 하므로 필요 |
| `apps/api-server/src/scripts/data/otc-v2-apply-preflight.ga.json` | preflight 산출 (러너 자동 기록) |
| `apps/api-server/src/scripts/data/otc-v2-apply-run.ga.ko.json` | KO apply run 리포트 (러너 자동 기록) |
| `apps/api-server/src/scripts/data/otc-v2-apply-order.json` | ledger — `ga.koApplied:true / enApplied:false` |

**공용 러너 `otc-v2-store-leaflet-runner.shared.ts` 는 수정하지 않았다.**

---

## 8. 사용자 결정 필요 사항

EN 완주에는 다음 중 하나가 필요하며, 둘 다 인계서가 자율 수행을 금지한 범위다.

**(A) 공용 러너 최소 수정 (권장)**
`preflight()` 를 lang 인지형으로 만들어, `lang='en'` 이고 해당 shard 가 이미 KO 적용된 경우:
- 공식 원문을 easy_drug `canonical` 또는 `deprecated` 에서 읽는다
- `easyCanonical1` / `authoredConflict` 기대값을 post-KO 기준으로 뒤집는다

→ fingerprint 재현·수치 보존 등 실질 게이트는 그대로 유지된다. 나·다 shard 도 동일 순서로 완주 가능해진다.
단 공용 러너는 나·다 세션이 공유하므로 변경 시 조율 필요.

**(B) KO 롤백 후 EN → KO 재적용**
러너에 롤백 경로가 없어 별도 스크립트 작성 + 837 master 대상 파괴적 변경이 필요하다. 권장하지 않는다.

**현 상태는 안전하다** — KO 837건은 정상 LIVE canonical 이고, 원문은 deprecated 로 보존되며,
나·다 shard 는 ledger 로 계속 차단되어 있다. 결정 전까지 추가 write 는 하지 않는다.
