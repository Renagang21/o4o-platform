# CHECK — V2 다 shard EN 저작 완료 및 apply-readiness (에이전트 다)

WO: `WO-O4O-OTC-REMAINING-READY-SHARD-DA-V2-LIVE-APPLY-V1`
기준 커밋: V2 census/SSOT `81b39da72` · 공용 러너 `3447b2323` · apply 지원 `394ab0e4b` · 다 preflight `2dcbdb6b4`

작성 주체: 에이전트 다 (공용 V2 러너 단일 작성자 겸 da shard write-owner)
DB write: **0** (본 CHECK 시점까지 apply 미수행)

---

## 1. 다 shard EN 저작 — COMPLETE

| 항목 | 값 |
|---|---|
| 적격 대상 | 237 fingerprint / 833 master |
| EN 저작 커버 | **237 fp / 833 master** (누락 0 · 초과 0 · fp 중복 0 · master 중복 0) |
| HOLD 제외 | 1 fp / 6 master — 일반명코드 `227736ATD` (oromucosal 구강용해필름) |
| EN write 예상 | 1,666T == 필요 1,666T |
| coverage 판정 | **COMPLETE** |
| verify 판정 | **PASS** (237 entries) |

저작 파트: `otc-v2-en-config-da-p01.json` ~ `p12.json` (12 파트)

### 1-1. 저작 기준 원문

공용 러너의 `--emit-sample` 은 주의 축을 `slice(0, 1200)` 으로 절단하므로, 저작 기준 원문은
**무절단**으로 별도 산출했다 (`otc-v2-authoring-source-full.da.json`).

- 237 fp / 833 master · 효능 결손 0 · 용법 결손 0 · 주의 결손 0
- caution 총 199,513자 · 최대 2,012자 · 1,200자 초과 그룹 62 (절단본 저작이었다면 62 그룹에서 주의 정보층 소실)
- 섹션 추출·정규화는 census-v2 VERBATIM

### 1-2. verify 게이트 (러너 export 직접 import — apply 시점과 동일 판정)

| 게이트 | 결과 |
|---|---|
| 필수 필드(title/efficacy/usage/caution/summaryTable) 채움 | PASS |
| 한글 잔존 | **0** |
| 공식 용법 수치 보존 (missingNumericsEn) | 누락 **0** |
| 비경구 route EN 용법의 경구 동사 | **0** |
| `usageLabel` 미포함 (러너가 route 로 주입) | PASS |
| 일반명코드 라벨 대조 (제목·요약표) | 237/237 일치, 불일치 **0** |

### 1-3. 저작 원칙 준수

- 공식 원문(효능·용법·주의) grounding. 원문에 없는 의료 사실 생성 **0**.
- 공식 효능의 질병명·증상명 회피/약화 없음.
- 비경구 경로(topical / ophthalmic / oromucosal)는 경로 동사로 표현. 경구 동사 미사용.
- 매장 약사 문의 안내 전 항목 유지 (`Ask the pharmacist`).

---

## 2. 공용 러너 결함 1건 수정 (3 shard 영향 분석 포함)

### 문제

`normalize()` 는 census 계약상 하이픈류를 `,` 로 치환한다. 이 때문에 공식 용법의
`250-500 mg` 이 `250,500 mg` 이 되고, `missingNumericsEn` 의 수량 정규식이 이를
**천단위 구분자**로 읽어 실재하지 않는 토큰 `250500` 을 EN 용법에 요구했다.

- 검출 지점: da `#6fb59004a03ec4fe` (일반명코드 `199402ATB`, 나프록센 정)
- 증상: 충족 불가능한 수치 게이트로 정상 저작이 FAIL

### 수정

`missingNumericsEn` **내부에서만** normalize 이전에 `숫자-하이픈-숫자` 를 `~` 로 분리.

- fingerprint 산식 · census `normalize` · KO 경로 · writePlan **미변경**
- 치환 범위는 EN 수량 게이트 지역 한정

### 3 shard 영향 검증

| 검증 | 결과 |
|---|---|
| `--selftest` | PASS |
| 가 EN config 12파트 237 entries 재검증 | **PASS** (회귀 0) |
| dry-run manifest 재산출 SHA256 대조 — na | **IDENTICAL** |
| dry-run manifest 재산출 SHA256 대조 — da | **IDENTICAL** |
| dry-run manifest 재산출 SHA256 대조 — ga | DIFF — 원인은 **가 세션의 LIVE apply**(완료분 교집합 837 · writePlan 0). 본 수정과 무관 |

게이트는 느슨해지지 않는다: 충족 불가능한 병합 토큰만 제거되고 우변 수량은 그대로 요구된다.

커밋: `fix(drug-otc): 공용 러너 EN 수량 게이트 하이픈 범위 오탐 수정 + 다 EN p06-p08`

---

## 3. 다 shard apply-readiness — 내용 게이트 전량 PASS, 순서 게이트만 차단

`--shard=da --lang=ko --apply-readiness` (DB write 0)

| 게이트 | 결과 |
|---|---|
| target fp/master == dry-run manifest | PASS |
| HOLD 대상 제외 | PASS |
| fingerprint 재현 100% | PASS |
| shard 밖 master 0 | PASS |
| 기존 완료분 교집합 0 | PASS |
| CLQ/CDS/CSI 혼입 0 | PASS |
| 빅콘에스600정 혼입 0 | PASS |
| pre-apply canonicalDup 0 | PASS |
| 예상 write == 실측 계획 | PASS |
| **apply 순서 충족** | **FAIL — 차단** |

writePlan: KO 3,332 + EN 1,666 = **4,998T** (WO 예상치 일치)

### 순서 차단 사유 (정상)

- 선행 shard `na` KO apply 미완료
- 선행 shard `na` EN apply 미완료
- 선행 shard `na` 독립검증 미완료

### apply ledger 현황 (`otc-v2-apply-order.json`)

| shard | KO apply | EN apply | 독립검증 |
|---|---|---|---|
| ga | ✅ | ✅ (237그룹 · 1,674T · MATCH) | ✅ |
| na | ❌ | ❌ | ❌ |
| da | ❌ | ❌ | ❌ |

**다 LIVE apply 는 나 세션의 `--mark-verified=na` 완료 이후에만 가능하다.** 순서 무시 apply 없음.

---

## 4. 잔여 작업 (나 검증 완료 후)

1. `--shard=da --lang=ko --apply-readiness` 재실행 → READY 확인
2. KO apply (`--apply` + `OTC_V2_LEAFLET_KO_CONFIRM=YES`) — 3,332T
3. EN apply (`--apply --en-config=...` + `OTC_V2_LEAFLET_EN_CONFIRM=YES`) — 1,666T
4. 독립검증 (authored KO canonical 833 · authored EN canonical 833 · audit 833 · canonicalDup 0 · HOLD 6 master write 0)
5. `--mark-verified=da`
6. 전체 V2 생산 결과 종합 CHECK

---

## 5. 규율 준수

- 공용 러너: 단일 작성자(다) 단독 수정. 세션 전용 분기 없음. V1 러너 `otc-oral-combo-store-leaflet-runner.ga.ts` **무변경**.
- fingerprint 계약 무변경 · 세션별 앵커 추가 없음 (`fpToUuidV2` 단일).
- 라 census/SSOT 무변경.
- 다른 세션 EN 파일(ga/na) 무변경 — da 전용 사본만 신규 작성.
- `git add .` 미사용. 자기 산출물만 path-specific stage.
- DB 자격증명 값 열람·출력 0. `apps/api-server/.env` 는 `process.env` 경유로만 사용. 루트 `.env` 미사용.
- `.env` 삭제하지 않음 (다 apply·독립검증·전체 확인 종료 후 사용자 지시로만 삭제).
