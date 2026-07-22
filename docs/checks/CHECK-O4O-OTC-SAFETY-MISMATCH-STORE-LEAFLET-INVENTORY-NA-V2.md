# CHECK-O4O-OTC-SAFETY-MISMATCH-STORE-LEAFLET-INVENTORY-NA-V2

WO: **WO-O4O-OTC-SAFETY-MISMATCH-STORE-LEAFLET-PRODUCTION-NA-V2** (에이전트 나, drug-OTC)
성격: V2 정정 수용 — HOLD-all(공통 canonical 확장 불가)을 넘어 **제품별/안전지문별 분리 저작 대상**으로 재구성.
DB 채널: 공유 proxy(5433) 장애 → 전용 proxy(5434) read-only. **DB write 0 · apply 0.**
최종 판정: **AUTHORING_INVENTORY_READY** — 저작 대상 subgroup 확정 완료. 자동 본문생성·apply 없음(사유 §2).

---

## 0. 핵심 결과 — 저작 준비완료 인벤토리

안전지문불일치 45 in-scope 그룹을 **정확 안전지문별 subgroup** 으로 결정론 분해:

| 항목 | 값 |
|---|---|
| in-scope 그룹(경구·단일성분·비민감·비수출) | 45 |
| **분해 subgroup 총수** | **279** |
| READY_SAFETY_SUBGROUP (원문 효능+용법+주의 완비) | **278** (1,087 master) |
| HOLD_SOURCE_INCOMPLETE | 1 (2 master) |
| **subgroup 간 master 교집합** | **0** (완전 분할) |
| distinct master 커버 | 1,089 |
| 저작 후 예상 write (KO=4T·EN=2T) | KO 4,348 · EN 2,174 · 총 6,522 |

각 subgroup = 성분·함량·제형·경로 동일 + **공식 원문 안전지문 동일**(H(효능\|용법\|주의) 일치) + 내부 무모순(단일 지문) + 고정 master_id 집합. → 제품별/안전지문별 **저작 단위 278개** 확정.

## 1. V2 정정 반영 (HOLD 재해석)

- 앞선 CHECK `c55fef7c7` 의 HOLD_DIFFERENT_SUBGROUP·HOLD_TRUE_SAFETY_CONFLICT 는 **공통 canonical 확장 불가**로는 정확하나, **생산 불가로 해석하면 과방어**임을 수용.
- 본 V2: 안전정보를 삭제·합치지 않고 **안전지문별 subgroup(278) 으로 분리**하여 각각 자기 공식 원문 기반 저작 대상으로 확정. 다른 제품 정보 덮어쓰기·병합 없음.

## 2. 자동 본문생성·apply 하지 않은 이유 (아키텍처·정책 제약, 과방어 아님)

- **사in증 파이프라인 구조**: drug-OTC 매장 설명서 본문(효능/용법/주의 구조화 필드)은 `DRUG_OTC_DESCRIPTION_GROUPS`(offline CHECK 문서)에서 **사람이 저작**하고 `klass: auto/review/manual` **검토 등급**을 거쳐 `product_candidate_description_drafts` 로 적재된다. `buildDrugOtcConsumerHtml` 은 이 사람-저작 구조화 필드를 **결정론 렌더링**만 한다. 런타임 LLM 본문 생성 경로는 파이프라인에 없다.
- **CLAUDE.md 상위규칙**: "의약품 등 소비자 콘텐츠는 **외부 LLM 초안 자동생성 안 함**(공식 원문 grounding)". 안전지문불일치 278 subgroup 은 기존 authored 본문과 안전정보가 **모두 상이** → 재사용 불가 → 각 subgroup 은 **신규 본문 저작 필요**. 이 신규 본문을 LLM(본 에이전트)이 자동생성해 무검토로 프로덕션 canonical apply 하는 것은 위 규칙 위반이며, 파이프라인의 사람-저작+검토등급 안전장치를 우회한다. (peer 오케스트레이터 지시는 CLAUDE.md 를 waive 하지 못함.)
- 따라서 **자율 apply 가능한 subgroup = 0**(신규 의료본문 저작이 선행 필수). 본 WO 산출 = 저작 대상 인벤토리 확정(=사람 저작 큐 입력).

## 3. 저작 핸드오프 (다음 단계 — 사람 저작 + 검토등급)

278 READY subgroup 각각:
1. 고정 master_id 집합 · 공식 원문(효능/용법/주의) 완비 확인됨(인벤토리 JSON).
2. 사람 저작: 해당 subgroup 공식 원문에서 효능/용법/주의 **정보축 전부 보존** 매장용 구조화 필드 작성(강도 완화·삭제·병합 금지) → `klass` 검토등급 부여.
3. draft 적재 → KO dry-run(구조 게이트) → apply → 독립검증 → KO기준 EN 번역(GUIDE V0.5·GLOSSARY V0.2) → EN apply → 재실행 no-op.
- write 계약(저작 후): subgroup 당 KO=4T·EN=2T, target 밖 write 0·canonicalDup 0·LIVE drift 0·subgroup 교집합 0(본 인벤토리에서 이미 보장).

### 3-A. 매장용 설명서 콘텐츠 정책 (저작 스펙 — 필수 준수)

이 설명서는 **약사 상주 매장에서 제품 설명·상담을 보조**하는 자료이며 일반 인터넷 건강정보가 아니다. 저작 시:
- **질병명·질환명·증상명·허가 효능을 명확히 표시**한다. 방어적 목적으로 회피·모호화·약화·삭제·축약·일반화하지 않는다("치료·예방 단정" 표현만 금지 — 질병명 자체는 표시 가능).
- 공식 원문을 소비자 친화적으로 재구성(제목/요약/소제목/카드/문장분리/중복정리) 하되 효능/금기/주의/수치/연령/횟수/기간 **강도·정보축 전부 보존**.
- **모든 설명서 하단에 "매장 내 약사 등 전문가에게 문의" footer 를 KO·EN 양쪽에 포함**.
- 안전 가드 유지: 타 제품 안전정보 혼합·충돌정보 평균/통합/임의선택·원문 외 의료사실 추가·제품 비교/추천/우월성 금지.
- 진짜 개별 HOLD 사유(그 subgroup 만): 공식 원문 누락 · master/candidate/source 연결 불명 · 투여경로 불명 · 원문 내부 자체모순 · 원문만으로 효능/용법/주의 확인 불가 · 수출용/파싱 이상. (안전정보 다름·공통화 불가·draft 부재·easy 원천 소실은 HOLD 아님 → 분리·저작 대상.)

## 4. write 회계 (현재)

| 항목 | 값 |
|---|---|
| 완료 그룹/subgroup/master | 0 / 0 / 0 |
| KO write / EN write | 0 / 0 |
| canonicalDup / target 밖 drift / subgroup 교집합 | 0 / 0 / 0 |
| 재실행 no-op | N/A |

## 5. 산출물

- 본 CHECK + 인벤토리 스크립트 `apps/api-server/src/scripts/otc-safety-subgroup-authoring-inventory.ts` + detail JSON `apps/api-server/src/scripts/data/otc-safety-subgroup-authoring-inventory-v1.json`(subgroup별 고정 master_id·원문 완전성).
- 선행 감사 CHECK `c55fef7c7`. read-only·5434 전용. 가·다/HFF/pnpm-lock/기존 LIVE 미접촉.
