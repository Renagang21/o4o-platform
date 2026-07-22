# CHECK — 신규 단일 기능성 5종 grounding 조사 (Agent C) V1

- 성격: **read-only 조사 · DB write 0 · registry 수정 0 · generate/apply 0 · 기능성 문구 임의생성 0.**
- 일자 `2026-07-22 +0900` · 프로바이오틱스 shard2 생산(별도 CHECK) 종료 후 수행.
- 채널: 자체 Cloud SQL Auth Proxy(5434, fresh 토큰) → production, SELECT only.
- 대상 5종: 바나바잎추출물 · 포스파티딜세린 · 히알루론산 · 헤마토코쿠스추출물 · 쏘팔메토열매추출물.
- pure-single 판정 = MAIN_FNCTN `[원료]` 브래킷 정확히 1종 & 해당 원료 & 고형 & 미승격(생산 파이프라인 정의와 동일).

## 0. 결론

> **바나바잎추출물·히알루론산 = GROUNDING_READY (EN 대응 완비, 즉시 생산 가능).**
> **쏘팔메토 = READY* (EN 은 기존 매핑의 조사 '의' 변이 정규화만 필요 — 실질 대응 존재).**
> **포스파티딜세린·헤마토코쿠스 = GROUNDING_PENDING (공식 기능성 KO 는 grounded 이나 EN 매핑 부재 — registry EN 확장 선행 필요, 본 조사에서 임의생성 안 함).**
> 5종 pure-single 고형 미생산 합계 **148** (바나바 43 · PS 45 · HA 30 · 쏘팔메토 19 · 헤마토 11).

## 1. 원료별 조사 결과

| 원료 | total | solid | pure-single 고형 미생산 | stmt shard 0/1/2 | 섭취파싱 | 대표 공식 MAIN_FNCTN(KO canonical 후보) | mapFunctionEn | 판정 |
|---|---:|---:|---:|---|---:|---|---|---|
| **바나바잎추출물** | 1,028 | 973 | **43** | 14/16/13 | 43/43 (100%) | 식후 혈당상승 억제에 도움을 줄 수 있음 | **HIT** — "May help with suppressing the rise in blood sugar after meals" | **GROUNDING_READY** |
| **히알루론산** | 398 | 314 | **30** | 9/16/5 | 30/30 (100%) | 피부보습에 도움을 줄 수 있음 | **HIT** — "May help with skin moisturisation" | **GROUNDING_READY** |
| **쏘팔메토열매추출물** | 564 | 558 | **19** | 9/4/6 | 17/19 (89.5%) | 전립선 건강의 유지에 도움을 줄 수 있음 | 조사 '의' 포함형 MISS / '전립선 건강 유지'(무'의') **HIT** — "May help with maintaining prostate health" | **READY\*** (정규화만) |
| **포스파티딜세린** | 510 | 500 | **45** | 13/18/14 | 44/45 (97.8%) | 노화로 인해 저하된 인지력 개선·자외선에 의한 피부 손상으로부터 피부 건강 유지·피부보습에 도움을 줄 수 있음 | 피부보습 HIT / **인지력 개선 MISS · 자외선 피부건강유지 MISS** | **GROUNDING_PENDING** |
| **헤마토코쿠스추출물** | 495 | 488 | **11** | 8/2/1 | 11/11 (100%) | 눈의 피로도 개선에 도움을 줄 수 있음 | **MISS** ("눈의 피로도 개선" 미매핑) | **GROUNDING_PENDING** |

## 2. 원료명 표기 변이

- 바나바잎추출물: `바나바`(1,013) · `코로솔산`(10, 지표성분) · `Banaba`(5)
- 히알루론산: `히알루론산`(393) · `Hyaluron`(5)
- 헤마토코쿠스추출물: `헤마토코쿠스`(253) · `아스타잔틴`(242) — **지표성분명(아스타잔틴)과 원료명 병용**, 분류 시 양쪽 인식 필요
- 포스파티딜세린: `포스파티딜세린`(510, 단일)
- 쏘팔메토열매추출물: `쏘팔메토`(564, 단일)

## 3. EN 누락 문구 (registry `mapFunctionEn` 확장 대상 — 본 조사 미반영)

| KO 공식 기능성(원문 grounded) | 현재 EN | 필요 원료 |
|---|---|---|
| 노화로 인해 저하된 인지력 개선 | 없음(MISS) | 포스파티딜세린 |
| 자외선에 의한 피부 손상으로부터 피부 건강 유지 | 없음(MISS) | 포스파티딜세린 |
| 눈의 피로도 개선 | 없음(MISS) | 헤마토코쿠스 |
| 전립선 건강**의** 유지 | '전립선 건강 유지'는 HIT — 조사 '의' 정규화 필요 | 쏘팔메토 |

- **원칙 준수**: EN 문구는 공식 근거 없이 임의 생성하지 않음. 위 KO 는 제품 MAIN_FNCTN 원문(grounded)이며, EN 확정은 registry 확장 WO(사람 검수) 대상.

## 4. GROUNDING 상태 · realistic producible · 다음 생산 우선순위

| 순위 | 원료 | 상태 | realistic producible | 근거 |
|:-:|---|---|---:|---|
| 1 | **바나바잎추출물** | GROUNDING_READY | **~43** | 단일 명료 기능성(식후 혈당) · EN HIT · 섭취 100% · 3-shard 균형(14/16/13) |
| 2 | **히알루론산** | GROUNDING_READY | **~24** (피부보습 단일형) | EN HIT · 섭취 100% · 일부 복합변이(자외선 피부건강)는 PENDING |
| 3 | **쏘팔메토열매추출물** | READY\* | **~17** | 전립선 건강 — EN 실질 대응 존재, 조사 '의' 정규화 1건만 선행 |
| 4 | **포스파티딜세린** | GROUNDING_PENDING | 45 (EN 2문구 확보 후) | 최대 풀이나 인지력·자외선피부건강 EN 부재 |
| 5 | **헤마토코쿠스추출물** | GROUNDING_PENDING | 11 (EN 1문구 확보 후) | 소량 풀 + 눈피로도 EN 부재 + 지표성분명 병용 |

- **즉시 착수 권고**: 바나바잎추출물(shard 분리 생산 가능, 3자 균형) → 히알루론산(피부보습 단일). 두 원료는 프로바이오틱스 파이프라인(shard-select/compose/generate)에 원료 파라미터만 확장하면 동형 생산 가능(CLS 분류기에 원료 라벨 추가 필요 — 별도 WO).

## 5. 보고 요약

```text
조사 5종 pure-single 고형 미생산 합계 148 (바나바43·PS45·HA30·쏘팔19·헤마11)
GROUNDING_READY: 바나바잎추출물(43,EN HIT) · 히알루론산(30,EN HIT)
READY*(정규화만): 쏘팔메토(19, 전립선 EN '의' 변이)
GROUNDING_PENDING: 포스파티딜세린(45, 인지력·자외선피부건강 EN 부재) · 헤마토코쿠스(11, 눈피로도 EN 부재)
섭취 파싱: 4종 100%·쏘팔메토 89.5%·PS 97.8%
stmt 3-way 분포 원료별 §1. registry 수정 0 · DB write 0 · 임의 EN 생성 0
다음 우선순위: 바나바 → 히알루론산 → 쏘팔메토(정규화 후) → PS(EN2) → 헤마토(EN1)
```

## 6. 산출물

- 조사 원자료: `docs/checks/data/product-description-guard/hff-new-functional-5-grounding.json`
- 본 문서. (도구는 read-only 임시 스크립트 — 커밋 제외.)

---

*read-only 조사. DB write 0 · registry 수정 0 · 기능성 문구 임의생성 0 · 신규 5종 generate/apply 0.*
