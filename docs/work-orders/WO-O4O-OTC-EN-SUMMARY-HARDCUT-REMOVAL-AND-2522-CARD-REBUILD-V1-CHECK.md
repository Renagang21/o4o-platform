# WO-O4O-OTC-EN-SUMMARY-HARDCUT-REMOVAL-AND-2522-CARD-REBUILD-V1 — CHECK

- 상태: **COMPLETE / PASS**
- 실행일: 2026-07-31
- 대상: 매장용 OTC 설명서 **EN canonical 3,476** 중 요약이 120자에서 하드컷된 **2,522**
- 성격: **요약 파생 규칙 교정 및 카드 재조립**. 번역 수정 아님(EN 6섹션 본문 문장 변경 0).

---

## 1. 문제

V4 저작기 계열 7종이 모두 `efficacy.split('\n')[0].slice(0, 120)` 으로 요약을 만들었다.
그 결과 EN canonical 3,476 중 **2,522** 가 정확히 120자에서 잘렸고, 그중 **1,931** 은 단어 중간에서 끊겼다.
잘린 문자열은 저장 `summary` 컬럼뿐 아니라 본문 HTML 의 **hero 배지** 와 **At a glance "How it works" 타일** 에 그대로 노출됐다.

매장용 설명서에서 이 절단은 질환명·조건절·수치를 문장 중간에서 잘라 **효능 정보를 오독 가능한 형태로 표시**한다.

## 2. 조치

### 2-1. 언어 중립 파생 함수 신설 (빌더 이원화 해소)

[apps/api-server/src/scripts/otc-leaflet-summary.shared.ts](../../apps/api-server/src/scripts/otc-leaflet-summary.shared.ts)

- `deriveLeafletSummary(efficacy, { maxChars })` — **단일 진입점**
- 규칙: ① 효능 첫 완결 문장 ② 축약은 문장 경계에서만 ③ 의미 단위·의학적 조건 보존 ④ 단어 중간 절단 금지 ⑤ 괄호·목록·콜론 내부 절단 금지 ⑥ 경고·제한 조건 제거 금지 ⑦ 종결부호가 없으면 첫 줄 전체 채택
- 예산 `DEFAULT_SUMMARY_BUDGET = 300`. 첫 완결 문장은 예산을 넘어도 **항상 온전히 포함**하고, 예산은 두 번째 이후 문장 추가 여부만 결정한다.
- 소수점(`3.5`)·약어(`etc.`, `E. coli`)·전각 종결부호·괄호 depth 를 인식한다.
- **zh·ja·vi·th·id 파이프라인은 이 함수를 재사용한다. `slice(n)` 복제 금지.**

기존 저작 스크립트 7종은 재복제·리팩터링하지 않았다(대규모 리팩터링 금지 조항). 신규 언어와 후속 저작이 이 함수를 참조한다.

### 2-2. 표시 계층 — 고정 길이 제한 제거

[packages/content-editor/src/components/ContentRenderer.tsx](../../packages/content-editor/src/components/ContentRenderer.tsx) — sd-* CSS 의 단일 SSOT.

```css
.store-desc-content .sd-badge:not(.is-solid){
  line-height:1.45;padding:7px 14px;border-radius:14px;
  max-width:100%;white-space:normal;overflow-wrap:break-word;text-align:center}
```

- 요약 배지가 문장 전체를 **줄바꿈으로** 담는다. 축약·`line-clamp`·숨김 없음.
- `is-solid`(Category 배지)는 기존 pill 그대로 — 단어 하나짜리 라벨이다.
- `@o4o/content-editor` 빌드 통과(ESM 172.80 KB, DTS OK).

### 2-3. 재조립

[apps/api-server/src/scripts/otc-en-summary-rebuild.ga.ts](../../apps/api-server/src/scripts/otc-en-summary-rebuild.ga.ts)

본문은 재렌더하지 않고 **구조적 2지점만 치환**한다.

| 지점 | 마커 |
|---|---|
| hero 배지 | `<span class="sd-badge">{summary}</span>` |
| At a glance 타일 | `<span class="sd-tag">How it works</span>\n        <p>{summary}</p>` |

이스케이프된 옛 요약은 문서마다 **3회** 등장한다(위 2곳 + `sd-intro` 본문의 접두). 단순 문자열 치환은 본문을 훼손하므로, 구조 마커 + **유일성 단언** + **역패치 복원 검사** + **길이 델타 정확 일치** 를 모두 통과한 행만 대상으로 삼았다.

## 3. 실행 게이트

| 단계 | 결과 |
|---|---|
| dry-run 2회 byte-identical | plan sha256 `c421472283010a13…`, planDigest `91e07ae39edde34b…` |
| 대표 샘플 40건(7 route · 결함 유형 9종) | `endsAtSentence` 40/40, `oldIsPrefixOfNew` 40/40, anomalies 0 |
| KO 효능 첫 줄 대조 | 질환명·괄호 병기·수치·연령/기간 조건 보존, 추가·완화 0 |
| rollback-test 2,522 | PASS 2,522 / residue 0 / writeActual 0 |
| **LIVE apply** | GREEN **2,522** / blocked 0 / exception 0 / **writeActual 2,522** / **auditRowsWritten 0** |
| 독립검증 21 게이트 | **failed 0** |
| 멱등 재실행 | alreadyRebuilt **3,476** / target **0** / write 0 / audit 0 |

### DB write 계약 (실측)

- master 당 개별 트랜잭션 + `SAVEPOINT`, 실패 시 해당 master 만 롤백
- `UPDATE … SET content, summary, updated_at` — **낙관적 잠금 `md5(content)=oldHash`**, `rowCount=1` 아니면 차단
- KO write **0** · 신규 번역행 **0** · `source_ref_id` 변경 **0** · canonical flip **0** · 대상 밖 update **0** · 잔여 **0**
- **audit 0행**: canonical 교체가 아닌 in-place 표시값 교정이며, `SharedProductDescriptionAuditLog` 의 이벤트 union 은 `canonical_replaced` 하나뿐이다. 선례([drug-otc-additive-warning-apply.ts](../../apps/api-server/src/scripts/drug-otc-additive-warning-apply.ts), `hff-*-spd-correct.ts`)와 동일. 추적성은 run-immutable 원장이 담당한다.

## 4. 독립검증 (별도 코드 경로)

[apps/api-server/src/scripts/otc-en-summary-rebuild-verify.ga.ts](../../apps/api-server/src/scripts/otc-en-summary-rebuild-verify.ga.ts) — 재조립기도, 파생 규칙 모듈도 import 하지 않는다.

핵심 증명(G7): LIVE 본문에서 **새 요약 2곳만** 옛 요약으로 되돌렸을 때 md5 가 적용 전 해시와 **byte 단위로 일치**한다. 따라서 6섹션 내용·수치·연령·횟수·간격·기간·경고 강도·route 문구·footer 는 변경될 수 없다.

| 게이트 | 기대 | 실측 |
|---|---:|---:|
| G0 코호트 EN canonical 총건 | 3,476 | 3,476 |
| G1 계획 건수 | 2,522 | 2,522 |
| G2 적용 합계(요약·본문 해시) | 2,522 | 2,522 |
| G3 단어/문장 중간 절단 | 0 | 0 |
| G3b 종결부호 없는 원문(첫 줄 전체 채택) | 3 | 3 |
| G4 120자 하드컷 잔존 | 0 | 0 |
| G5 `slice(0,120)` 패턴 잔존 | 0 | 0 |
| G6 KO canonical 변경 | 0 | 0 |
| G6b 플랫폼 전체 EN OTC 하드컷 잔존 | 0 | 0 |
| G7 역패치 → 적용전 해시 일치 | 2,522 | 2,522 |
| G8 잔여 본문 수치·연령·기간 토큰 드리프트 | 0 | 0 |
| G9 route 표현 소실 | 0 | 0 |
| G10 footer 누락 | 0 | 0 |
| G11 canonical 중복 | 0 | 0 |
| G12 sourceRef/언어/상태/타입 드리프트 | 0 | 0 |
| G13 대상 밖 update | 0 | 0 |
| G13b 적용 이후 갱신 총건 | 2,522 | 2,522 |
| G14 기존 정상 EN 건수 | 954 | 954 |
| G14b 기존 정상 EN 중 갱신 | 0 | 0 |
| G15 비의약품 master 혼입 | 0 | 0 |
| G16 저장 summary ↔ 본문 표시 불일치 | 0 | 0 |

### 검증 중 확인된 사실

- **G3b(3건)** — `파세몰시럽(아세트아미노펜)` 계열 3 master 는 효능 원문 첫 줄에 마침표가 없다. 파생 규칙 7항에 따라 첫 줄 **전체**를 채택했고 절단이 아니다. "종결부호로 끝나야 한다"는 초기 게이트 정의를 규칙에 맞게 정정했다.
- **updated_at 은 `timestamp without time zone`** 이다. JS `Date` 를 그대로 바인딩하면 드라이버가 로컬시각(KST)으로 변환해 9시간 어긋나 시각 기반 게이트가 조용히 0을 반환한다. 문자열 리터럴 + `::timestamp` 로 비교해야 한다.
- **EN STORE OTC canonical 전체는 15,908행**이고, 본 WO 코호트(`batchId LIKE 'otc-v4%'`)는 그중 3,476이다. 코호트 밖 12,432행에는 하드컷이 **없다**(G6b=0).

## 5. 완료 기준 대조

| 기준 | 목표 | 결과 |
|---|---|---|
| EN_SUMMARY_REBUILD_REQUIRED | 2,522 → 0 | **0** |
| EN_DISPLAY_PASS | 954 → 3,476 | **3,476** |
| EN_CURRENT | 3,476 유지 | **3,476** |
| KO 변경 | 0 | **0** |
| TM(6섹션) 변경 | 0 | **0** |
| canonicalDup | 0 | **0** |

새 요약 길이 분포: 120–199 **1,409** · 200–299 **684** · 300–399 **262** · 400+ **167**
route 분포: oral 1,242 · topical 893 · ophthalmic 293 · oromucosal 51 · rectal 20 · vaginal 14 · nasal 9

## 6. 후속 (범위 밖 — 별도 WO 필요)

1. **KO 설명서에 동일 결함 존재**. [otc-v3-content-leaflet-composer.na.ts:133](../../apps/api-server/src/scripts/otc-v3-content-leaflet-composer.na.ts#L133) 의 `작용: efficacy.split('\n')[0]?.slice(0, 120)` 이 그대로다. 본 WO 는 KO 변경을 금지하므로 손대지 않았다. KO 코호트 실측·재조립은 별도 WO 대상.
2. **신규 언어(zh·ja·vi·th·id)** 파이프라인은 `deriveLeafletSummary` 를 재사용한다. 새 저작기에 `slice(n)` 을 다시 넣지 않는다.

## 7. 산출물

| 파일 | 역할 |
|---|---|
| [otc-leaflet-summary.shared.ts](../../apps/api-server/src/scripts/otc-leaflet-summary.shared.ts) | 언어 중립 요약 파생 단일 함수 |
| [otc-en-summary-rebuild.ga.ts](../../apps/api-server/src/scripts/otc-en-summary-rebuild.ga.ts) | 재조립 러너(dry-run / rollback-test / apply) |
| [otc-en-summary-rebuild-sample.ga.ts](../../apps/api-server/src/scripts/otc-en-summary-rebuild-sample.ga.ts) | 대표 샘플 검증기(READ-ONLY) |
| [otc-en-summary-rebuild-verify.ga.ts](../../apps/api-server/src/scripts/otc-en-summary-rebuild-verify.ga.ts) | 독립검증기 21 게이트(READ-ONLY) |
| `src/scripts/data/otc-en-summary-rebuild-*.ga.json` | 계획·결과·체크포인트·샘플·검증 원장(run-immutable 사본 포함) |
