# CHECK — WO-O4O-OTC-ORAL-MULTI-INGREDIENT-EN-COMPLETION-GA-V4 (에이전트 가)

> 경구 복합성분 매장용 설명서 **EN 완결** — GA-V3 KO 완료 40 fp-그룹 / 509 master 전량 EN canonical 전환.
> 실행일: 2026-07-23 · 실행자: 드럭 OTC 에이전트 가 (단독 DB write-owner 구간에서 apply)

## 1. 결과 요약

| 항목 | 값 |
|------|-----|
| 대상 | 40 fp-그룹 / 509 master (batch3 15그룹 271 + batch4 25그룹 238) |
| EN canonical 신규 | **509** (그룹당 단일 md5 · 한글 0 · needs_review 잔존 0) |
| EN write (2T=INSERT needs_review→flip canonical) | **1,018** = batch3 542 + batch4 476 · writePlan==writeActual |
| KO 변경 | **0** — 러너 in-TX koUnchanged proof(md5+count 전/후) 40/40 통과, 최종 스윕 ko canonical 509 유지 |
| canonicalDup / target 밖 write / 비대상 EN drift | **0 / 0 / 0** |
| no-op 재실행 | 40/40 `ALREADY_COMPLETE` (write 0) |
| HOLD | **0그룹** |
| GA 세션 누계 | 47그룹 / 530 master **KO+EN 완결** (선행 7그룹 21 master 포함) |

## 2. 파이프라인 (그룹당)

1. KO canonical md5 고정 (앵커 `source_ref_id = uuid(md5('otc-combo-leaflet:'+fp))`, 그룹 내 단일 md5 확인)
2. EN 저작 — KO canonical 유일 원문. 질병명·허가효능·수치·연령·횟수·금기·상호작용·이상반응 보존, 신규 의료사실 0, 마케팅 0
3. 정적 게이트(merge-en): groupKey 일치 · 한글 0 · 필수필드 · KO→EN 수치 보존('1회/1일' 구조 카운터 제외, twice/once 정규화)
4. dry-run ×2 — builtMd5 byte-identical (batch3 15/15 · batch4 25/25)
5. apply — 이중게이트(`--apply` + `OTC_COMBO_LEAFLET_EN_CONFIRM=YES`), STEP1 idempotent INSERT + STEP2 단일 TX flip + koUnchanged proof + post-verify
6. no-op 재실행 → `ALREADY_COMPLETE`
7. 러너 밖 독립검증(verify-post-en): en canonical==기대 · en md5 단일 · 한글 0 · needs_review 0 · ko count/md5 유지 · dup 0 · out-of-target 0

## 3. 검증 기록

- batch3 독립검증: 15/15 PASS · en canonical 271
- batch4 독립검증: 25/25 PASS · en canonical 238
- 40그룹 최종 스윕(단일 쿼리): `enc=509 · ennr=0 · ko=509 · en한글=0 · canonicalDup(언어별 exactly-1)=0`
- 타 에이전트(나·다) claim master 교집합: 0 (사전검증)

## 4. EN 번역 계약 준수

- KO summaryTable 3축(분류/작용/주요 증상) → EN 3축(Category / How it works / Main symptoms) 대응 — 축 신설·삭제 0
- 질병명·허가 효능 직역 유지 (예: iron-deficiency anemia, chronic liver disease/liver cirrhosis/toxic liver disease, scurvy, rickets, nervous system disorders from B1·B6 deficiency)
- 경고 블록 보존 (예: 철분제제 "만 6세 이하 과량 복용 시 철분 중독성 사망" → "fatal iron poisoning" 직역)
- 상호작용 직역 (levodopa, estrogen 경구피임제, 테트라사이클린계, 제산제, 루프/티아지드 이뇨제, 감초·글리시리진산, 탄닌차·유제품, 200 mg 이상 아스코르브산 등)
- 약사 상담 foot는 러너 공통 `GMP_FOOT` 로 EN 삽입

## 5. Manifest (산출물)

| 파일 | 내용 |
|------|------|
| `apps/api-server/src/scripts/data/otc-oral-combo-leaflet-en-batch3.ga.json` | batch3 15그룹 EN 번역 원본 |
| `apps/api-server/src/scripts/data/otc-oral-combo-leaflet-en-batch4.ga.json` | batch4 25그룹 EN 번역 원본 |
| `apps/api-server/src/scripts/data/otc-oral-combo-leaflet-config-batch3.ga.json` | +en 병합 (additive, KO -0) |
| `apps/api-server/src/scripts/data/otc-oral-combo-leaflet-config-batch4.ga.json` | +en 병합 (additive, KO -0) |
| `apps/api-server/src/scripts/data/otc-combo-leaflet-<fp>-en.run.json` ×40 | 그룹별 apply run 기록 (builtMd5·step1/2·koUnchanged·post) |
| `apps/api-server/src/scripts/data/otc-production-claim.ga.json` | batch3/4 → DONE |

## 6. Commit

- `036e262b1` claim EN_PRODUCING 선점
- `e15a92333` batch3 EN 15그룹 271 LIVE
- (본 커밋) batch4 EN 25그룹 238 LIVE + claim DONE + CHECK

## 7. 재시작 지점

경구 복합성분 GA 트랙의 EN 미완료 **0**. 다음 작업 없음(트랙 KO+EN 완결). 새 그룹 발생 시: config batch 생성 → 본 파이프라인 재사용.
