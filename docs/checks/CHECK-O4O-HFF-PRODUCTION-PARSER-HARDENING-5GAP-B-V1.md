# CHECK — HFF 공용 생산 파서 보강 5종 (Agent B)

- 상위 근거: `CHECK-O4O-HFF-COMBO-NEW-NUTRIENT-5GROUP-STRICT-SELECT-C-V1` (Agent C) §3·§4 — read-only 발견분
- 대상 모듈: `apps/api-server/src/scripts/hff-source-parse.ts` (생산 `hff-combo-select` 가 `parseSpecs`/`splitFunctions` 로 사용하는 **공용 경로**, 하드닝 `6a2769045` 에서 일원화)
- 성격: **파서 코드 보강 + 회귀검증**. DB write 0(apply 없음) → 기존 LIVE drift 구조적 0.
- 선행: single-lutein gap 2종(ugRAE·colon) `ade71c6cb` 에 반영됨. 본 문서는 **추가 5종**.

## 1. 보강 5종

| # | gap | 원인 | 수정 |
|---|-----|------|------|
| 1 | 괄호형 비율 spec | `SPEC_RE` 가 비율을 `[)] [의] X~Y%` 로만 허용 → `9.9mg/850mg(표시량의 80∼120%)`·`210mg/2,400mg(80~150%)` 처럼 **기준량 뒤 괄호 안 비율** 미매치 → spec 통째 소실 → 은닉 원료가 가드 우회 | 비율 tail 에 `\(? … (?:표시량의\s*)? … \)?` 추가(표준형·괄호형 동시 허용) |
| 2 | 미파싱 spec 소실 | 매칭 불발 라인이 `byKey`·`unknownLabels` 어디에도 안 남아 **소실** → `keys===TARGET` 성립 → HOLD 미발동. 포맷을 늘려도 미지 변이는 잔존 | `LOOSE_SPEC_RE`(값/기준 규격, 비율 tail 불요, `/kg` 오염 배제) span 대조 → SPEC_RE 미캡처 규격 라인을 **unknownLabels 강제 편입**(안전 기본값=HOLD) |
| 3 | 브래킷 문장 미분리 | `splitFunctions` 가 `[곰피추출물]` 을 공백 치환 → 앞 문장이 `)` 로 끝나 분리자 미적용 → 다음 원료로 기능성 병합 | 브래킷을 **하드 경계 sentinel(U+0001)** 로 치환·분리 |
| 4 | 추정 귀속(끌림) | #3 결과 `[곰피추출물]간건강…` 이 `비타민B1` 세그먼트로 끌려가 **허위 기능성 표시** | #3 하드 경계로 세그먼트 분리 → 간건강 문구가 B1 로 끌리지 않음 |
| 5 | functionsKo 선행 구두점 | 세그먼트가 `",  뼈와 치아…"` 처럼 선행 쉼표+공백으로 시작 → 게시 노출 | leading-strip 문자클래스에 `,，` 추가 |

## 2. 단위 검증 (5종 PASS)

- gap1: `디에콜(Dieckol) 함량 : 9.9mg/850mg(표시량의 80∼120%)` → spec 인식 → `unknownLabels=['디에콜(Dieckol) 함량']`
- gap2: `신비원료 함량 : 5.5mg/700mg`(비율 없음) → unknownLabels 강제 편입
- gap3/4: `[곰피추출물]간건강…(May help) [비타민B1]탄수화물…` → 세그먼트 분리, 간건강에 B1 문구 미혼입
- gap5: `…필요, 뼈와 치아 형성에 필요` → 선행 쉼표 제거
- 회귀(루테인 bracket): mode=bracket, keys=[루테인,비타민E,비타민A] 정상

## 3. 회귀검증 (실 DB, read-only)

| 항목 | Agent C 기준 | 5-gap 실측 | 판정 |
|------|:---:|:---:|------|
| **리버케어지티(`20040015104115`) 제외** | 목표 | B5 ELIGIBLE 3→**2**, 리버케어 **제외** | ✅ 목표 |
| single-lutein 최종 그룹 | 21/8/2 | **21/8/2**(changedVsQueue 0) | ✅ 유지 |
| 비타민D+아연+칼슘 | 39 | **40** | ⚠️ 정당 복구(+1) |
| 비타민A+비타민E | 30 | **31** | ⚠️ 정당 복구(+1) |
| 기존 복합형 LIVE drift | 0 | **0**(파서 전용, DB write 0) | ✅ |

### +1 2건 = 정당 복구 (결함 아님)

- `2014002001263` **하이키즈영양제**: 칼슘 210mg/2,400mg**(80~150%)** · 비타민D 10ug/2,400mg**(80~180%)** · 아연 8.5mg/2,400mg**(80~150%)**. 비율 `(X%)` 괄호형이라 HEAD 파서가 spec 미인식 → **부당 HOLD** 됐던 것을 gap-1 이 복구. 은닉 원료 0.
- `20190004553183` (A+E): 동일 괄호형 비율 복구분.
- **D+Zn+Ca 40건·A+E 31건 전수 클린**(byKey==target, unknownLabels 0) 직접 재검증 — 부적합 0.
- 리버케어 제외(gap-1 이 디에콜 spec 인식→unknown→HOLD)와 이 2건 복구는 **분리 불가한 동일 gap-1 정효과**. 따라서 **40/31 이 정확**하고 Agent C 의 39/30 은 under-count.

**결론(사용자 승인)**: 보정 수용. Agent C 신규 후보 최종 = **비타민D+아연+칼슘 40 + 비타민A+비타민E 31 = 71건**.

## 4. 주의·후속

- `LOOSE_SPEC_RE` 2차 스캔으로 대형 그룹(A+E·B5, mention 2,000+) select 이 2분+ 소요 — 배치/오프라인 도구라 런타임 무관하나 실측 시 여유 timeout 필요.
- 다음 생산 후보 **71건 고정**. 새 방식(한 에이전트가 조사→KO/EN→디자인→DB 완결) 첫 배치로 사용 권장.

*파서 전용 · DB write 0 · 회귀 read-only · 복구 2건 전수 클린 검증.*
