# CHECK — HFF Batch 3 shard 1 완결형 생산 (직접주입) (Agent B)

- 방식: shard 1 · `select --shard 1 --shard-count 3 --exclude-taken --statement-nos-file`(직접주입) · **자동 apply**(사전승인, 게이트 PASS 시).
- 기준 commit `cf95b9d5c`. T0 14:41.

## 1. round1 (base signature)

- shard-plan(shard 1): signature **263** · 후보합 475(미승격 clean).
- 직접주입 strict select(exclude-taken) → 대부분 signature 가 **taken 또는 grounding/attribution HOLD** 로 0 eligible. 순가용 산발 singleton.
- generate: **READY 81** · REVIEW_LATER 1 · 79 그룹(대다수 1건).
- dry-run+자동apply: **79/79 COMMIT · 81건 · write 324 · ALREADY_PROMOTED 0 · canonicalDup 0**. 독립검증 combo-b3f masters **81** · canonicalDup 0. slug `combo-b3f-*`.

## 2. shard-1 producible 소진 관찰

- shard-1 미승격 후보 475 중 **실제 producible 81** (17%). 나머지는:
  - taken(내 batch2 268 + nc/타 세션 생산분의 canonical SPD) — exclude-taken 자동 제외.
  - grounding/attribution HOLD(표시량/비율/섭취/기능성 귀속 실패) — 상위 signature(vc-vd-zn 26 등)가 전량 HOLD.
- **500~900 목표 미달 = shard-1 base-family 풀 고갈**. 능력·경로가 아니라 원자재 소진. 충돌 방지·직접주입·mga-TE 인프라는 정상 동작(충돌 0).

## 3. 자동 apply 준수

- 게이트(dry-run PASS·postVerify PASS·canonicalDup 0·예상=실측 write·rollback·LIVE drift 0·ALREADY_PROMOTED 0) 전부 통과 → 승인 질문 없이 자동 apply·독립검증·commit·push. rollback manifest 그룹별 저장.

*직접주입 최적화 경로 · 자동 apply(사전승인) · 독립검증 read-only · path-specific commit(타 세션 파서/shard-plan 수정 미접촉).*

## 4. round2 (기능성앵커 패밀리 — --include-functional)

- shard-plan `--include-functional`(타 세션 추가 옵션): shard-1 signature 263→**280**(+17 기능성 패밀리: 프로폴리스·밀크씨슬 조합 등) · 후보 475→600.
- round1 미처리 신규 signature 94개만 직접주입 select → generate **READY 74** · REVIEW_LATER 1 · 38 그룹.
- dry+자동apply: **38/38 COMMIT · 74건 · write 296 · ALREADY_PROMOTED 0 · canonicalDup 0**. slug `combo-b3g-*`.
- 기능성앵커 패밀리(미생산·registry 귀속 안정)라 base 대비 수율 양호(그룹당 ~2).

## 5. Batch 3 최종

- **round1 81 + round2 74 = 155 LIVE** · 전 배치 **충돌 0**(ALREADY_PROMOTED 0·canonicalDup 0). totalComboLive(combo-%) **2015**.
- 목표 500~900 미달 = shard-1 풀 고갈(내 batch2 268 + 타 세션 대량 생산). 인프라(shard·직접주입·mga-TE·자동apply) 전부 정상.
