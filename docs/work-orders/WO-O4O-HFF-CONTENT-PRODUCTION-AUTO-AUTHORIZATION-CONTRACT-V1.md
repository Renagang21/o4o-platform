# WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1

> **건강기능식품(HFF) 매장 설명서 반복 생산에 대한 사용자 사전승인 계약의 정본.**
> 이 문서가 적용되는 작업에서는 아래 **사전 승인 범위**에 대해 추가 승인 질문을 하지 않는다.
> 안전 게이트(dry-run·rollback·독립검증)는 **완화하지 않는다.** 본 계약은 *승인 질문만* 제거한다.

- 적용 범위: `regulatory_type='건강기능식품'` · `source_label='MFDS_HEALTH_FUNCTIONAL_FOOD'` STORE 설명서 생산. **의약품/의약외품/의료기기 제외**([[feedback_hff_only_no_drugs]]).
- 상위 규칙: `CLAUDE.md` · 콘텐츠 불변 원칙(`docs/guides/common/DOCUMENT-INDEX.md`) 우선. 충돌 시 상위 문서가 이긴다.
- 성격: 정책 문서. 코드/DB 무변경.

---

## 0. 배경 — 반복되는 승인 질문 제거

작업요청서마다 "자동 apply"는 적혀 있으나, 아래 항목이 매번 **개별 설계 승인처럼** 보여 생산이 중단됐다:
composer 부재 시 신규 작성 가부 · 기존 LIVE byte-parity 요구 여부 · EN 제품명 번역 허용 · 정적 lookup 생성 · 공용 parser/composer 수정 · dry-run 후 apply 자동 진행.
→ 매 WO 반복 대신 **본 계약 1건 + 실행 가드**로 고정한다.

## 1. 사전 승인 범위 (질문 없이 진행)

```text
- 기존 생산 composer가 없거나 유실된 경우 최소 결정적(deterministic) composer 복원
- 기존 selector/parser/generator/verifier 재사용 및 필요한 최소 보완
- 기존 LIVE와 구조·의미·안전·디자인 parity 를 만족하는 표준 템플릿 작성
- 제품명·제조사명 KO→EN 정적 lookup 생성
- fixture 및 regression test 작성
- REVIEW_LATER / HOLD 산출물 작성
- dry-run
- 게이트 통과 후 apply
- 독립검증
- CHECK 작성
- path-specific commit
- origin/main push
```

## 2. parity 기준 — byte-parity 불요

```text
기존 LIVE 의 byte-parity 는 요구하지 않는다.

정본 목표(4-parity + 2-불변):
- 정보(information) parity      : 원문 grounding 값 동일
- 구조(structure) parity        : sd-card 섹션 동형
- 안전(safety) parity           : Guard 전통과(무근거 주장 0)
- 디자인(design) parity         : ContentRenderer variant="store-description" 호환 sd-* HTML
- source-grounding              : 값·문구 전부 원문 근거
- deterministic rerun           : 동일 입력 → 동일 출력

기존 LIVE 는 수정하지 않는다. 신규 대상부터 정본 composer 를 적용한다.
```

## 3. LLM 사용 범위

```text
허용:
- 제품명·제조사명 번역 초안
- 번역 결과를 정적 lookup 으로 확정(고정)하는 작업

금지(전부 source-grounding 위반):
- 기능성 임의 생성
- 섭취량 임의 생성
- CFU 임의 계산
- 주의사항 임의 생성
- source 에 없는 의학적 문구 추가
- generate/apply 중 실시간 비결정적 LLM 호출
```

**공식 영문명 부재 시 순서:**
```text
1. 공식 영문명 사용
2. 기존 정본 lookup 사용
3. 이름만 1회 번역하여 lookup 에 고정
4. 모호하면 REVIEW_LATER
```
> 현행 composer(`hff-combo-compose`·`hff-probiotics-compose`)는 EN 초안에서 **한글 제품/제조사명을 보존**한다(음역 없음). EN 정적 lookup 은 도입 시 본 §3 순서를 따른다.

## 4. composer 부재 시 행동

```text
composer 가 없다는 이유로 승인 질문을 하지 않는다.

순서:
1. git history 조사
2. 기존 CHECK · target · manifest · LIVE fixture 조사
3. 재사용 가능한 정본 확인
4. 없으면 최소 결정적 composer 작성
5. 대표 fixture 회귀검증(기존 LIVE 1건 이상으로 parity 확인)
6. 생산 계속
```

- 단, **병렬 세션이 같은 공용 파일을 수정 중이면 덮어쓰지 않고 「공용 파일 소유권 충돌」로 중지**한다. 이는 사용자 승인이 아니라 **작업 조율** 문제로 보고한다(§8).

## 5. 자동 apply 계약 (안전 게이트 — 유지)

```text
다음 조건이 모두 충족되면 승인 질문 없이 자동 완결한다.

- dry-run PASS
- postVerify PASS
- canonicalDup 0
- expected writes == actual writes
- rollback manifest 생성
- 기존 LIVE drift 0
- master / candidate / source_ref 연결 정상
- shard 교집합 0
- independent verification PASS (apply 와 분리된 새 DB 연결)
```

진행 범위: `apply → 독립검증 → CHECK → path-specific commit → origin/main push`.

**canonical 계약(불변):** `status='canonical' · description_type='STORE' · source_type='o4o_hff_generated' · source_ref_id=candidate.id · barcode NULL · mfds_permit_number=STTEMNT_NO · candidate=approved_new_master` · DB partial-unique `(master_id, description_type, coalesce(language,'ko')) where canonical`.

**이중게이트:** apply 는 `--apply` + `HFF_*_APPLY_CONFIRM=YES` 필수(스크립트 강제). 본 계약은 이 게이트를 **제거하지 않는다** — 자동화는 게이트 *통과*를 뜻하지 *생략*이 아니다.

## 6. 개별 오류 vs 전체 중지

**개별 제품 오류 → REVIEW_LATER 또는 HOLD, 배치는 계속:**
```text
- 이름 모호 · CFU 파싱 실패 · serving 파싱 실패 · BULK
- truncated · 비표준 기능성(FN_NONSTANDARD) · source grounding 부족
```

**전체 중지(아래로 한정):**
```text
- ProductMaster 오연결
- shard 교집합(다른 shard 대상 침범)
- 다수 제품 기능성 오귀속
- 공용 composer/parser/registry 소유권 충돌
- canonical 계약 실패
- rollback 실패
- 예상/실측 write 불일치
- 기존 LIVE 대량 drift
- 독립검증 실패
```

## 7. 다시 하지 않을 질문

```text
- composer 를 복원해도 되는가
- deterministic template 을 써도 되는가
- 기존 LIVE 와 byte-parity 가 필요한가
- 제품명 EN 번역을 해도 되는가
- 정적 lookup 을 만들어도 되는가
- dry-run 후 apply 해도 되는가
- CHECK 와 push 까지 진행해도 되는가
```

## 8. 공용 코드 소유권

```text
공용 composer/parser/registry 파일은 동시에 한 에이전트만 수정한다.

공용 코드 변경이 필요한 작업:
1. 한 에이전트가 정본화
2. commit / push
3. 다른 에이전트가 origin/main 동기화
4. 이후 shard 생산

각 shard 에이전트가 별도 composer 를 만들지 않는다.
```

- 공용 파일: `hff-source-parse.ts`(파서) · `hff-nutrient-registry.ts`(registry) · `hff-*-compose.ts`(composer) · `hff-combo-select.ts`.
- shard 계약(정본): **FNV-1a**(`h=2166136261; h^=charCodeAt; h=Math.imul(h,16777619)>>>0`) · combo=**signature-축** · 단일기능성=**stmt-축**(`String(STTEMNT_NO).trim()`, 빈 stmt 제외) · `% shard-count` · shard 상호배타. 신규 shard 배치는 이 구현을 재사용(재작성 금지).

## 9. 전역 집계 정본

복합형 LIVE 전역 집계는 **tag-agnostic** `hff-combo-live-verify.ts` 를 사용한다(STORE·canonical·deleted_at NULL·ko·o4o_hff_generated·원료카드≥2·distinct master). `combo-%` tag + allowlist 집계는 **폐기**(과소집계).

---

## 부록 A — 이후 생산 WO 에 넣을 짧은 참조문

```md
## 자동 승인 계약

본 작업은 `WO-O4O-HFF-CONTENT-PRODUCTION-AUTO-AUTHORIZATION-CONTRACT-V1` 적용 대상이다.

해당 계약 범위의 조사·최소 구현·composer/parser 복원·이름 번역 lookup·
dry-run·apply·독립검증·CHECK·path-specific commit·push 는 사전 승인되어 있다.
계약에 명시된 전체 중지 조건(§6)이 아닌 경우 추가 승인 질문 없이 완결한다.
```

---

*정책 문서 · 코드/DB write 0. 안전 게이트(§5) 불변 — 승인 질문만 제거.*
