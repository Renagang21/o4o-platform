# WO-O4O-OTC-KO-SUMMARY-HARDCUT-CENSUS-AND-CARD-REBUILD-V1 — CHECK

- 상태: **COMPLETE / PASS**
- 실행일: 2026-07-31
- 대상: 매장용 OTC 설명서 **KO canonical 전수 15,908** 중 요약이 고정 120자에서 잘린 **1,193**
- 성격: **요약 파생 규칙 교정 및 표시 카드 재조립**. 한국어 본문 6섹션 변경 0.

---

## 1. 전수 조사 — 코호트가 아니라 데이터가 대상을 정한다

`otc-v3-content-leaflet-composer.na.ts:133` 의 `slice(0, 120)` 이 존재한다는 사실로 대상 수를 추정하지 않고,
LIVE KO canonical **전수**를 재현해 상호배타로 분류했다.

[apps/api-server/src/scripts/otc-ko-summary-hardcut-census.ga.ts](../../apps/api-server/src/scripts/otc-ko-summary-hardcut-census.ga.ts) (READ-ONLY)

| 분류 | 건수 | 성격 |
|---|---:|---|
| KO STORE OTC canonical 모집단 | **15,908** | |
| 요약 없음(summary NULL) | 1,577 | 본 WO 대상 아님 — 요약 신규 생성은 범위 밖 |
| **고정 120자 절단 = 결함** | **1,193** | 재조립 대상 |
| 구절형 요약(정상) | 1,014 | 절단 아님 — 아래 §1-1 |
| 그 외 정상 | 12,124 | 요약이 첫 줄 전체이거나 접두가 아님 |
| 상호배타 합계 검증 | **PASS** | 1,577 + 1,193 + 1,014 + 12,124 = 15,908 |

결함 1,193 의 세부:

| 지표 | 건수 |
|---|---:|
| 문장 중간 절단 | 1,193 |
| 어절(단어) 중간 절단 | 858 |
| `작용` 타일도 같은 값으로 잘림 | 1,193 |
| 고정 절단 길이 분포 | `120` **1,193** — `200` **0** |

배치 분포: `(none)` **943** · `otc-v4-next2000` 161 · `otc-v4-finalall` 50 · `otc-v4-pilot-500` 32 · `otc-v4-pilot-100` 7

> **79% 가 V4 배치 밖이었다.** EN 코호트(`batchId LIKE 'otc-v4%'`, 3,476)를 그대로 복제했다면 943 건을 놓쳤다.
> `otc-v4-carryover72-author.ga.ts:87` 의 `slice(0, 200)` 은 **LIVE 에 0 건**이다(앞 항 `summaryTable['작용']` 이 항상 채워졌다).
> 코드 존재 ≠ 데이터 존재 — 대상은 실측으로만 정했다.

### 1-1. 접두 일치만으로는 결함이 아니다 (오탐 1,014 제거)

초기 판정("요약이 효능 첫 줄의 접두이면 절단")은 **2,207** 을 결함으로 잡았다. 실측으로 반증했다:

```
SUM : 만성 간질환, 독성 간질환의 보조치료
LINE: 만성 간질환, 독성 간질환의 보조치료에 사용하는 일반의약품입니다.
```

저작기가 요약을 **구절**로 만들고 `sd-intro` 가 문장 프레임을 덧붙이는 설계다. 꼬리는 5종뿐이며
`에 사용하는 일반의약품입니다.` 926 · `에 사용합니다.` 46 · ` 완화에 사용합니다.` 34 · `의 보조치료에 사용합니다.` 4 · ` 증상의 완화에 사용합니다.` 4 로 닫힌다.
길이 120 이면서 접두가 아닌 10 건은 요약 = 첫 줄 **전체**(완결 문장)라 정상이다.

따라서 결함 정의를 **"효능 첫 줄의 앞 120자와 정확 일치하고 첫 줄이 더 길다"** 로 좁혔다.

### 1-2. 타일 일치 계수 정정

`작용` 타일 텍스트를 `trim()` 후 비교하면 1,037 로 집계됐다. 120자 절단은 **공백 위치에서도** 일어나 요약 끝에 공백이 남고,
`trim()` 이 그 156 건을 불일치로 오판한 것이다. 공백 보존 비교로 정정해 **1,193** 으로 러너와 일치시켰다.

## 2. 조치

새 요약 규칙은 EN 에서 검증된 언어 중립 단일 함수를 **그대로 재사용**했다(신규 규칙 도입 0).

[apps/api-server/src/scripts/otc-leaflet-summary.shared.ts](../../apps/api-server/src/scripts/otc-leaflet-summary.shared.ts) — `deriveLeafletSummary()`
① 첫 완결 문장 ② 축약은 문장 경계에서만 ③ 의미 단위·의학적 조건 보존 ④ 단어 중간 절단 금지
⑤ 괄호·목록·콜론 내부 절단 금지 ⑥ 경고·제한 조건 제거 금지 ⑦ 종결부호 없으면 첫 줄 전체

[apps/api-server/src/scripts/otc-ko-summary-rebuild.ga.ts](../../apps/api-server/src/scripts/otc-ko-summary-rebuild.ga.ts) — 본문은 재렌더하지 않고 **구조적 2지점만** 치환한다.

| 지점 | 마커 |
|---|---|
| hero 배지 | `<span class="sd-badge">{summary}</span>` |
| 한눈에 보기 | `<span class="sd-tag">작용</span>\n        <p>{summary}</p>` |

### EN 러너와 달라져야 했던 지점 (실측 기반)

1. **모집단** — 코호트가 아니라 KO 전수. 결함의 79% 가 배치 밖이다.
2. **절단 판정** — 한국어는 종결이 `다.` 형태라 종결부호 유무로 판정할 수 없다. **첫 줄 앞 120자와의 정확 일치**로 판정한다.
3. **footer 가드** — KO 에는 `sd-foot` 이 없는 구형 템플릿이 **943** 건 있다. EN 러너의 "footer 존재 요구"를 그대로 쓰면 이 943 이 전부 차단된다.
   footer 신설은 본 WO 의 **금지 diff** 이므로 가드를 **소실 금지**(`sd-foot`·`sd-intake`·`sd-cta`·`sd-warn`·`sd-core` 가 있던 문서에서 사라지지 않을 것)로 정정했다.
   해당 943 건도 `주의 대상` 타일에 "매장 약사에게 먼저 문의하세요" 를 갖고 있어 전문가 문의 전제는 유지된다(G10).
4. **타일 교체 조건** — 타일 값이 옛 요약과 **정확히 같을 때만** 교체한다. 다르면 손대지 않는다(범위 밖 변경 금지).

## 3. 실행 게이트

| 단계 | 결과 |
|---|---|
| dry-run 2회 byte-identical | plan sha256 `0ba3436b240c9a04…`, planDigest `7250846ccc588555…`, target 1,193 / blocked 0 |
| 대표 샘플 40건(3 route · 유형 9종) | 문장완결 40/40 · 옛 요약 접두 확장 40/40 · **원문 첫 줄의 부분문자열 40/40** · 줄바꿈 최대 모바일 12줄 / 태블릿 6줄 |
| rollback-test 1,193 | PASS 1,193 / residue 0 / writeActual 0 |
| **LIVE apply** | GREEN **1,193** / blocked 0 / exception 0 / **writeActual 1,193** / **auditRowsWritten 0** |
| 독립검증 22 게이트 | **failed 0** |
| 멱등 재실행 | alreadyRebuilt 10,146 / target **0** / write 0 |

### LIVE apply 가 2회로 나뉜 사유

1차 실행(07:34:25Z)이 **395 건에서 cloud-sql-proxy 종료로 중단**됐다(`ECONNREFUSED`). 행 단위 트랜잭션 + `SAVEPOINT` 구조라
부분 적용된 395 건은 각각 완결 커밋이며 중간 상태가 없다. 프록시 재기동 후 재실행이 잔여 **798** 을 처리했다(395 + 798 = **1,193**).
1차 실행은 결과 원장을 남기지 못했고 체크포인트 원장 `otc-ko-summary-rebuild-checkpoint.run-20260731T073425.ga.json` 이 이를 기록한다.
최종 상태 검증은 결과 원장이 아니라 **LIVE 전수 재조회**(G2/G4/G7/G13b)로 수행했으므로 증명에 공백은 없다.

### DB write 계약 (실측)

- master 당 개별 트랜잭션 + `SAVEPOINT`, 실패 시 해당 master 만 롤백
- `UPDATE … SET content, summary, updated_at` — **낙관적 잠금 `md5(content)=oldHash`**, `rowCount=1` 아니면 차단
- EN write **0** · 신규 행 **0** · `source_ref_id` 변경 **0** · canonical flip **0** · 대상 밖 update **0** · 잔여 **0**
- **audit 0행**: canonical 교체가 아닌 in-place 표시값 교정. `SharedProductDescriptionAuditLog` 이벤트 union 은 `canonical_replaced` 하나뿐이다. 선례([drug-otc-additive-warning-apply.ts](../../apps/api-server/src/scripts/drug-otc-additive-warning-apply.ts), `hff-*-spd-correct.ts`)와 동일하며 추적성은 run-immutable 원장이 담당한다.

## 4. 독립검증 (별도 코드 경로)

[apps/api-server/src/scripts/otc-ko-summary-rebuild-verify.ga.ts](../../apps/api-server/src/scripts/otc-ko-summary-rebuild-verify.ga.ts) — 재조립기도, 파생 규칙 모듈도 import 하지 않는다.

핵심 증명(G7): LIVE 본문에서 **새 요약 2지점만** 옛 요약으로 되돌리면 md5 가 적용 전 해시와 **byte 단위로 일치**한다.
따라서 6섹션 내용·수치·연령·횟수·간격·기간·경고 강도·route 문구·footer 는 변경될 수 없다.

| 게이트 | 기대 | 실측 |
|---|---:|---:|
| G0 KO canonical 모집단 | 15,908 | 15,908 |
| G1 계획 건수(적용 전 원장) | 1,193 | 1,193 |
| G1b 2차 apply GREEN | 798 | 798 |
| G2 본문 해시 = 계획 newHash | 1,193 | 1,193 |
| G2b 저장 summary = 계획 newSummary | 1,193 | 1,193 |
| G3 대상 문장 중간 절단 잔존 | 0 | 0 |
| G4 KO 전수 120자 하드컷 잔존 | 0 | 0 |
| G5 hero 배지 ↔ 저장 summary 불일치 | 0 | 0 |
| G5b `작용` 타일 ↔ 저장 summary 불일치 | 0 | 0 |
| G6 적용 창 이후 EN canonical 갱신 | 0 | 0 |
| G7 역패치 복원 → 적용 전 해시 일치 | 1,193 | 1,193 |
| G8 잔여 본문 수치·연령·기간 토큰 드리프트 | 0 | 0 |
| G9 경고 목록 항목 수 드리프트 | 0 | 0 |
| G10 매장 전문가(약사) 문의 안내 소실 | 0 | 0 |
| G11 KO canonical 중복 master | 0 | 0 |
| G12 sourceRef/언어/상태/타입 드리프트 | 0 | 0 |
| G13 적용 창 이후 대상 밖 KO 갱신 | 0 | 0 |
| G13b 적용 창 이후 KO 갱신 총건 | 1,193 | 1,193 |
| G14 기존 정상 KO 중 갱신 | 0 | 0 |
| G15 비의약품 master 혼입 | 0 | 0 |
| G16 새 요약이 효능 첫 줄의 접두가 아님 | 0 | 0 |
| G17 새 요약이 옛 요약을 포함하지 않음 | 0 | 0 |

## 5. 완료 기준 대조

| 기준 | 목표 | 결과 |
|---|---|---|
| KO_SUMMARY_REBUILD_REQUIRED | 1,193 → 0 | **0** |
| KO canonical 모집단 | 15,908 유지 | **15,908** |
| EN 변경 | 0 | **0** |
| 본문 6섹션 변경 | 0 | **0** (G7 byte 증명) |
| 수치·연령·횟수·간격·기간 변경 | 0 | **0** |
| 경고 강도·route 문구·footer 변경 | 0 | **0** |
| sourceRef · canonical 상태 변경 | 0 | **0** |
| canonical 중복 | 0 | **0** |

새 요약 길이 분포: 120–199 **977** · 200–299 **216**
route 분포: oral 1,063 · topical 76 · ophthalmic 54

허용 diff(요약 / hero 요약 영역 / 한눈에 보기 `작용` 타일) 외의 변경은 G7 역패치 byte 일치로 **불가능함이 증명**된다.

## 6. 범위 밖 — 별도 WO 필요

### 6-1. 본문 `주의 대상` 260자 하드컷 (신규 발견 · 중요도 높음)

[otc-unproduced-oral-unit-approval.ts:210](../../apps/api-server/src/scripts/otc-unproduced-oral-unit-approval.ts#L210)

```ts
official: { indication: indP.slice(0, 260), dosage: dosP.slice(0, 260), caution: cauP.slice(0, 260) },
```

KO 전수 실측(본 WO 조사 스크립트가 관측 전용으로 함께 산출):

| 지표 | 값 |
|---|---:|
| 주의 목록을 가진 문서 | 15,908 |
| 주의 `<li>` 총 항목 | 58,705 |
| **정확히 260자인 항목** | **2,114** |
| 그중 종결부호 없이 끊긴 항목 | **2,029** |
| 영향 문서 | 2,114 |

실례(어절 중간 절단):

> …일주일 동안 메토트렉세이트 15밀리그람(15 mg/주) 이상의 용량을 병용 투여하는 환자,임신 3기에 해당하는 임부는 복용하지 마십시오. … 신장애,심혈관 순환기능이상(신혈관 질환,울혈성 심부전,체

**금기·주의 문장이 문장 중간에서 끊긴다.** 이는 요약이 아니라 **본문 6섹션** 변경이므로 본 WO 의 금지 diff 에 해당해 손대지 않았다.
매장용 설명서에서 경고 문장의 절단은 요약 절단보다 위해도가 높다 — 별도 WO 로 원문 재적재 기준을 세워 처리해야 한다.

### 6-2. 요약 없음(summary NULL) 1,577

요약 신규 생성은 본 WO 범위 밖(재조립만 허용)이다. 저작 원문 확보 여부에 따라 별도 판단이 필요하다.

### 6-3. 신규 언어

zh·ja·vi·th·id 파이프라인은 `deriveLeafletSummary` 를 재사용한다. 새 저작기에 `slice(n)` 을 다시 넣지 않는다.
신규 언어는 문서 단위 직접 번역이 아니라 **고유 KO 번역 단위 + 공통 라벨**을 번역한 뒤 결정론적으로 조립한다.

## 7. 산출물

| 파일 | 역할 |
|---|---|
| [otc-ko-summary-hardcut-census.ga.ts](../../apps/api-server/src/scripts/otc-ko-summary-hardcut-census.ga.ts) | KO 전수 조사·상호배타 분류(READ-ONLY) |
| [otc-ko-summary-rebuild.ga.ts](../../apps/api-server/src/scripts/otc-ko-summary-rebuild.ga.ts) | 재조립 러너(dry-run / rollback-test / apply) |
| [otc-ko-summary-rebuild-sample.ga.ts](../../apps/api-server/src/scripts/otc-ko-summary-rebuild-sample.ga.ts) | 대표 샘플 검증기(READ-ONLY) |
| [otc-ko-summary-rebuild-verify.ga.ts](../../apps/api-server/src/scripts/otc-ko-summary-rebuild-verify.ga.ts) | 독립검증기 22 게이트(READ-ONLY) |
| `src/scripts/data/otc-ko-summary-*.ga.json` | 조사·계획·결과·체크포인트·샘플·검증 원장(run-immutable 사본 포함) |
