# CHECK — HFF select 직접 statementNo 주입 최적화 (Agent B)

- 성격: **read-only 정비 + 회귀검증**. 코드 변경 = `hff-raw-source.ts` 1파일(소스 어댑터). DB write 0.
- 목적: shard-plan 이 산출한 대상 STTEMNT_NO 를 select 에 직접 전달 → 조합별 JSONB `ILIKE` 전수 스캔 제거.

## 1. 변경

- `hff-raw-source.ts`: `dbStmtListSource(port,creds,stmts[])` 신설 — `STTEMNT_NO = ANY($1)` 로 대상만 fetch(1000 chunk). `resolveSource` 에 `--statement-nos-file <path>`(JSON 배열/개행 목록) 분기 추가 → 지정 시 직접주입, `baseLike`(ILIKE) 무시.
- **select/generate/apply 무변경**: select 는 `resolveSource` 를 통해 소스만 교체받으며, 하위 strict 검증(exact full-set·MAIN_FNCTN 귀속·basis·HOLD/REVIEW)은 **동일 코드 경로**로 그대로 수행.

## 2. 회귀검증 — 직접주입 == search (셀레늄+아연)

| 경로 | mention | ELIGIBLE | grounding | 정체 |
|------|:-:|:-:|:-:|:-:|
| search(ILIKE) | 3,073 | 32 | 152 | 18 |
| direct(주입 170) | 170 | 0 | 152 | 18 |

- **검증 로직 일치**: 주입된 170건에 대한 grounding 152 · 정체 18 이 search 와 **정확히 동일**(같은 row는 같은 verdict). `direct ∖ search = 0`(SUBSET OK) — 직접주입이 새로운 오탐 eligible 을 만들지 않음.
- direct ELIGIBLE 0 은 버그 아님: shard-plan ids(미승격 clean 170)가 전량 grounding/identity HOLD 인 실제 데이터 특성(우량 se-zn 는 대부분 기승격). = search 의 미승격 부분집합과 일치.

## 3. 성능

- 셀레늄+아연: direct **4.0s** vs search **6.5s**(tsx 기동 ~3s 공통 → 순수 쿼리 direct ~1s / search ~3.5s).
- 저선택도 prefilter(`비타민` 등) 조합은 search 가 수만 row ILIKE 스캔(수 분)인 반면 direct 는 대상 stmt 만(수백) fetch → **격차 극대**.

## 4. shard 교집합 재확인

- `hff-combo-shard-plan --all-shards`: scanned 34,834 · clean 5,287 · sigs 998 · **signature 다중shard 배정(교집합) = 0**. shard0 330sig/927 · shard1 279sig/813 · shard2 389sig/804.

## 5. 준수

- read-only smoke(direct/search 실행) · DB write 0 · canonical 무변경 · path-specific commit.

*정비 전용. shard 1 생산은 후속(자동 apply, 게이트 통과 조건).*
