# CHECK — HFF 공용 원문 파서 확장: 식이섬유 원료별 구조 보존 + 표시량 포맷 (Agent C) V2

- WO: `WO-O4O-HFF-SOURCE-PARSER-EXPANSION-C-V2`.
- 성격: **파싱·분류·회귀검증만.** DB write 0 · ProductMaster 생성 0 · canonical 승격 0 · 콘텐츠 작성 0 · 의료 판단 0.
- 담당: 이번 라운드 `hff-source-parse.ts` 및 그 fixture/test/CHECK **단독 소유(Agent C)**. A·B 무접촉.
- 시작 `2026-07-23` · 종료 단일 세션. DB 채널 미사용(파서 순수 함수 검증).

## 0. 결론

> **완전 additive 확장 완료.** 기존 export(`parseSpecs`/`classify`/`CLS`/`SPEC_RE`)는 **한 줄도 바꾸지 않았고**,
> 식이섬유 하위 원료 해석을 신규 함수 `parseFiberSources()` 로 격리했다. self-test **130/130 PASS**,
> parseSpecs 회귀 baseline **완전일치(변경 0)**, 결정성 2회 동일, C-소유 파일 tsc 오류 0.

## 1. 재현한 결함 (편집 전 실측)

기존 파서를 B fixture 10종에 돌린 결과:

| 결함 | 케이스 | 편집 전 실측 |
|---|---|---|
| **① 원료 일반화** | 줄바꿈형·타원료동반·㎎표기 | `프락토올리고당` 라인이 단일 키 `식이섬유` 로 흡수(특정 원료 소실). `CLS` 가 8원료를 `식이섬유` 하나로 매핑 + `if(byKey.has(k))continue` 로 2번째 원료 드롭 |
| **② X%이상 미매칭** | 차전자단독·X이상형·폴리덱스트로스단독·총량+개별 | `…의 80% 이상`(하한 백분율) 이 `SPEC_RE` 비율 tail 에 없어 spec 미생성 → `unknownLabels` 로 강등 |
| **③ ml 기준량 미매칭** | 난소화성단독·다원료동반 | `/100ml`·`/250 ml` 기준량이 `mg\|g` 한정에 걸려 **제품 표시량 전량 누락**(unknownLabels 조차 없음) |

## 2. 수정한 parser 계약 (additive only)

신규 export (기존 계약 무변경):

- `parseFiberSources(base, fn=''): FiberParse` — 식이섬유 하위 원료별 표시량 보존 파서.
- `classifyFiberSource(label): string | null` — **2종 이상 매칭 시 null**(혼합 라벨 임의 택일 금지).
- `FIBER_SUB` — 8원료(차전자피/난소화성말토덱스트린/프락토올리고당/폴리덱스트로스/자일로올리고당/이눌린/치커리/귀리) 분류 테이블.
- `FiberParse` = `{ bySource: Map<원료, FiberSpec[]>; generic: FiberSpec[]; aggregate: FiberSpec[]; fnSources: string[]; sources: string[] }`.

설계 원칙:

- **표시량 self-binding**: 값·기준량은 자기 라벨과 **같은 정규식 매치(같은 라인)** 에서만 캡처 → 타 원료/섭취량 수치 교차연결 구조적으로 불가.
- **추정 금지**: 일반 `식이섬유` 라벨은 특정 원료로 추정하지 않고 `generic` 버킷. `fn` 은 원료 **식별 신호**로만 쓰고 수치를 귀속하지 않음(`fnSources`).
- **aggregate 분리**: `총식이섬유`/`영양소식이섬유`(합계·차감)는 원료가 아니므로 `aggregate` 로 분리(원료 합산 방지).
- 포맷 확장: `X~Y%` · `X% 이상` · 접미 `이상` 비율 모두 허용(비율은 선택), 기준단위 `mg|g|ml|mL|㎖|l|L`. `/kg`(오염물 라인)은 단위집합 제외로 자동 배제.

## 3. 추가한 fixture

`apps/api-server/src/scripts/hff-source-parse.fixtures.json` (C 소유):

- **fiber 8종**(실원문, B census 채집분 기반): 프락토직접 · 차전자단독(X%이상) · 난소화성단독(ml) · generic만(생산제외) · ㎎표기 · **다원료동반(프락토+난소화성 원료별보존+교차연결검증)** · 폴리덱스트로스단독(base일반+fn식별) · 총량+개별(귀리·aggregate분리).
- **displayAmount 9종**(표시량 단위검증): 원료명뒤수치 · 원료명앞수치(귀속금지) · **표형식(코퍼스부재→허위원료0)** · 반복행(2행 보존) · 지표성분공존(지표수치 오인0) · 총내용량·섭취량공존(섭취량 오인0) · **잘린행(불완전기준량 미매칭)** · 긴괄호 혼합라벨(2종→추정금지) · 한글영문병기.
- 코퍼스 부재 포맷(`표형식`·`그램표기`)은 B census 가 41,261 전수에서 무존재로 기록 → 여기서는 **무붕괴·허위원료 0** 보증용 단위 fixture 로 대체.

## 4. 회귀검증 결과 (self-test 130 assert)

`npx tsx src/scripts/hff-source-parse-selftest.ts` → **PASS=130 FAIL=0**.

| 게이트 (WO §회귀) | 검증 방식 | 결과 |
|---|---|---|
| 기존 fixture 결과 변경 0 | `parseSpecs` 하드코딩 baseline(편집 전 실측) 완전일치 | ✅ REG |
| 원료 간 표시량 교차 연결 0 | `crossLink` — 프락토=7.0/난소화성=2.5 등 타값·섭취량값 불일치 assert | ✅ |
| 일반 식이섬유를 특정 원료로 추정 0 | `mustNotSource` / `mustNotSourceInBySource` / 혼합라벨 generic | ✅ |
| 함께 있는 다른 원료 누락 0 | 다원료동반 `sources={프락토,난소화성}` · 반복행 2건 보존 | ✅ |
| 재실행 결과 동일 | DET 축(2회 직렬화 동일) + 스위트 2회 재실행 동일 | ✅ |
| 기존 parser 소비 타입 호환 | C-소유 파일 tsc 오류 0(소비처 22곳 무변경) | ✅ |

> tsc 전역에 잔존하는 오류는 **전부 타 세션 파일**(drug-otc-*, hff-nutrient-generate, hff-vd-generate) — 본 WO 무접촉·무관.

## 5. ambiguous(불확정) 처리 방식

- **혼합 라벨**(`식이섬유(차전자피 및 난소화성말토덱스트린 혼합)`): `classifyFiberSource` 2종 매칭 → null → `generic`(특정 원료 확정 안 함).
- **합계·차감 라벨**(총/영양소 식이섬유): `aggregate` 로 분리(원료 아님).
- **일반 `식이섬유`**: base 만으로는 원료 미확정 → `generic`. `fn` 에 원료명 있으면 `fnSources`/`sources` 로 **식별만**(표시량 귀속 없음).
- **불완전/미매칭 라인**(잘린 행·표형식): 확정값 생성 없이 무시 → 허위 원료 0.

## 6. 변경 파일

- `apps/api-server/src/scripts/hff-source-parse.ts` — additive 섹션 추가(신규 export 4). 기존 코드 무변경.
- `apps/api-server/src/scripts/hff-source-parse.fixtures.json` — 신규(fixture 17).
- `apps/api-server/src/scripts/hff-source-parse-selftest.ts` — 신규(결정적 self-test).
- `docs/checks/CHECK-O4O-HFF-SOURCE-PARSER-EXPANSION-C-V2.md` — 본 문서.

## 7. 준수

- DB write 0 · 콘텐츠 작성/의료 판단/효능 평가/apply/승격 0.
- `parseSpecs`/`classify`/`CLS`/`SPEC_RE`/registry 무변경 → 기존 소비처 22곳 출력 불변.
- `git add .` 미사용 · path-specific stage · `pnpm-lock.yaml`/타세션 파일 미접촉 · force push 미사용.

---

*파싱·분류·회귀검증 전용. 생산(census→apply)은 별도 세션에서 본 parser commit 기준으로 기존 승인 파이프라인 적용.*
