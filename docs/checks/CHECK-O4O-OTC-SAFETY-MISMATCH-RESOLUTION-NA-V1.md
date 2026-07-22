# CHECK-O4O-OTC-SAFETY-MISMATCH-RESOLUTION-NA-V1

WO: **WO-O4O-OTC-SAFETY-MISMATCH-RESOLUTION-10H-PRODUCTION-NA-V1** (에이전트 나, drug-OTC)
성격: 장시간 자율 생산 WO. 결과: 엄밀 필드단위 감사 결과 **자율 apply 가능한 안전 그룹 0** → **production DB write 0** 로 종료(common-stop: 남은 후보 전부 안전정보 상이).
DB 채널: 공유 proxy(5433) 장애 → 전용 proxy(5434) read-only. write 없음.
최종 판정: **HOLD_ALL / NO_SAFE_AUTONOMOUS_PRODUCTION** (생산 0, 재실행 no-op N/A).

---

## 0. 사전점검 (지시 순서 준수)

1. main == origin/main 동기(0/0). 2. working tree 자기범위 clean, 타세션 WIP 미접촉. 3. 자기 미완료 WO 0.
4. 가·다 claim 확인: `otc-production-claim.ga.json`·`.da.json` 전부 **NUTRITION_COMBO_EN_ONLY**(combo 비타민, 전 DONE) → 본 SAFETY_MISMATCH 트랙과 **교집합 0**.
5·6. 완료 CHECK·DB LIVE·bridge 로 중복 pre-filter. 7. 안전 claim 대상 0 → 신규 claim 파일 없음(기존 na claim 미변경).

## 1. 모집단 (bridge SSOT `안전지문불일치` 버킷)

| 항목 | 값 |
|---|---|
| 안전지문불일치 총 master | 1,424 |
| fp-entries | 411 |
| distinct pharmKey | 87 |
| 감사 in-scope(경구·단일성분·비민감·비수출) | **45 groups** |
| 범위 밖(atc-combo·민감약효군 아스피린 등·수출·성분파싱 이상) | 42 pharmKey |

## 2. 필드단위 안전지문 분해 결과 (결정론)

각 그룹의 미생산 easy-canonical master 를 **효능/용법/주의(금기·병용·상호·임부수유·연령·기간 포함)** 버킷으로 분해, 정규화 해시로 안전 subgroup 산출. 추가로 **미생산 easy 의 safety 해시 == 기존 LIVE 그룹 easy safety 해시(overlap)** 여부로 순수 형식차(format-only) 를 결정적으로 판정.

| 분류 | groups | easy masters | 의미 |
|---|---:|---:|---|
| **READY_FORMAT_ONLY (안전 확장 가능)** | **0** | **0** | mismatch safety == LIVE safety 인 그룹 없음 |
| HOLD_DIFFERENT_SUBGROUP | 10 | 37 | 내부 안전 균질이나 **LIVE 와 safety 상이**(overlap 0) → 제품별 신규 authoring 필요 |
| HOLD_TRUE_SAFETY_CONFLICT | 35 | 1,052 | 그룹 내 **다중 안전지문**(제품별 상이) → 제품별 신규 authoring 필요 |
| **합계 in-scope** | **45** | **1,089** | 전부 HOLD |

**decisive check**: READY_FORMAT_ONLY 후보 10개(distinctSafety=1)를 LIVE 그룹 easy safety 와 대조 → **10/10 overlap 0**. 즉 "안전지문불일치"는 HTML/공백/순서 형식차가 아니라 **실제 제품별 안전정보 차이**다. 기존 LIVE canonical(고유 safety) 을 이들에 그대로 확장하면 **다른 안전정보로 덮어쓰는 위험** → 불가.

## 3. 판정 근거 (WO 계약 준수)

- READY 조건("안전지문 동일 또는 안전 subgroup 이 기존 검증 canonical 과 byte-identical 재사용") 충족 그룹 **0**.
- 해소 가능한 유일 경로 = 제품별(subgroup별) **신규 grounded 소비자 설명서 authoring + EN 번역**. 이는 공식 원문 기반 신규 콘텐츠 생성·의료검토 단계로, WO 절대금지("신규 의료 해석으로 문구 조정"·"충돌 남은 채 canonical apply"·"강한 금기 완화")와 CLAUDE.md(의약품 소비자 콘텐츠 외부 LLM 초안 자동생성 금지) 상 **자율 apply 범위 밖**.
- 부수: 기존 LIVE 그룹의 `mfds_easy_drug` 원문이 deprecated/삭제되어 grounding 원문 대조도 제약(펙소페나딘 감사 `eb425b9ba` 와 동일 패턴).
- → **common-stop**: 남은 후보 전부 TRUE_SAFETY_CONFLICT/DIFFERENT_SUBGROUP → 생산 write 0 종료.

## 4. write 회계

| 항목 | 값 |
|---|---|
| 완료 그룹 / master | 0 / 0 |
| KO write / EN write / 총 | 0 / 0 / 0 |
| 제품별 분리 생산 | 0 |
| canonicalDup | 0 (write 없음) |
| target 밖 drift / 기존 LIVE drift | 0 (write 없음) |
| 재실행 no-op | N/A |

## 5. 후속 권고 (별도 WO — 자율 apply 아님)

1. HOLD_DIFFERENT_SUBGROUP 10(37 master): 각 subgroup(안전 균질)별 **자기 easy 원문 grounded 제품별 canonical** authoring → 의료검토 → dry-run → apply.
2. HOLD_TRUE_SAFETY_CONFLICT 35(1,052): 그룹 내 안전 subgroup 분해 후 동일 절차. 다수 subgroup → 대량.
3. 민감약효군(아스피린 등)·atc-combo·수출 42 pharmKey: 트랙 분리.
4. LIVE 그룹 easy 원문 deprecated/삭제 원인 규명(grounding 대조 복원).

## 6. 산출물

- 본 CHECK + 감사 스크립트 `apps/api-server/src/scripts/otc-safety-mismatch-resolution-audit.ts` + detail JSON `apps/api-server/src/scripts/data/otc-safety-mismatch-resolution-audit-v1.json`.
- read-only. 공유 proxy 미접촉·5434 전용. 가·다/HFF/pnpm-lock/기존 LIVE 미접촉.
