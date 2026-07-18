# WO-O4O-OTC-CANONICAL-APPLY-PILOT-B01AC06-V1

> **첫 production canonical write 파일럿.** 지금까지의 read-only 파이프라인(shard → 통합 `0aa64a0ef` → 글로벌 ATC·안전지문 재계산 `92c265035`)에서 처음으로 `shared_product_descriptions` 에 canonical 을 쓴다. **1 atc-key 60제품**으로 apply 파이프라인(고정 → 재검증 → dry-run → 이중게이트 write → 멱등·롤백)을 전 구간 검증한 뒤 top-5 로 확대한다.

---

## 0. 성격 · 게이트

| 항목 | 값 |
|---|---|
| 기준 커밋 | 글로벌 재계산 `92c265035` (bucket=`ATC후보+안전지문일치`) |
| 조사 단계(§1~§4) | **read-only** — 고정·재검증·dry-run·ID 목록 확정 |
| write 단계(§5~) | **DB write — §4 dry-run 보고 후 사용자 승인 필수** (CLAUDE.md §0 데이터 변경 승인) |
| 아키텍처 | F12 — canonical = `shared_product_descriptions (master, description_type=STORE, ...)`. Resource→ProductMaster 단방향, FK 신설 금지 |
| 콘텐츠 원칙 | grounded only(외부 LLM 초안 금지). authored 대표 설명서를 소스로 재사용, 경로·제형 동일(atc-key 에 포함) |

---

## 1. 대상 (apply 직전 재고정)

```text
ATC          : B01AC06 (아세틸살리실산 — 항혈소판)
성분/함량/제형/경로 : 무성분명 · 100밀리그램 · 정 · oral
판정 버킷      : ATC후보 + 안전지문 일치 (9요소 전부 일치)
authored 대표  : source_ref_id = 0052dc6c-639a-400b-b7a3-144d84ae5c14
재계산 시점 예상 : 60 제품
```

**⚠️ 원문 분열 2종 (재계산에서 확인 — 반드시 분리 처리):**

| fingerprint | 제품 수 | 예 |
|---|---:|---|
| `1c2e38232d471a9e` | 52 | 삼익/서울/프라임아스피린장용정 |
| `6e2030058d0db10e` | 8 | 한미/삼성아스피린장용정100밀리그램 |

> 안전지문(용법수치·연령·기간·최대량·금기·임신수유·상호작용·첨가제·단일복합)은 60제품 **동일**이나, 원문(효능·효과 등)이 2종으로 갈린다. 아스피린은 동일 성분·함량이라도 적응증·용법이 달라질 수 있으므로 **ATC 일치만으로 60개 일괄 적용 금지**. fingerprint 별로 분리해 각 원문이 authored 대표와 정합한지 apply 직전 재확인하고, **어긋나는 fingerprint 는 파일럿에서 제외**한다.

---

## 2. 진행 순서

1. **대상 60제품 재고정·재열거** — `92c265035` 기준을 신뢰하지 않고, apply 직전 DB 에서 `B01AC06 | 100밀리그램 | 정 | oral | 무성분명 | 경구·단일` + `안전지문 일치` 를 다시 질의해 master ID 목록을 재산출한다. fingerprint 별(52/8)로 분리 집계.
2. **9요소 재검증** — 함량·제형·경로·단일/복합·용법수치·연령·기간·금기·상호작용·첨가제를 대상 60개 각각 재계산. authored 대표(0052dc6c) 의 동일 지문과 대조.
3. **불일치 자동 제외** — 재검증에서 안전지문이 갈리거나 원문 fingerprint 가 authored 대표와 부정합인 제품은 **자동 제외**. 대상 수가 60에서 변동하면 **실행 전 보고**(어느 제품이 왜 빠졌는지).
4. **dry-run 확정** — 최종 write 대상 master ID 목록을 **동결**하고, 예상 INSERT(ko)·INSERT(en)·flip 건수를 산출. 실제 write 없이 결과만 산출.
5. **이중게이트 canonical write (단계별 단일 TX)** —
   - STEP1: ko STORE `needs_review` INSERT (동결 목록 기준, 빌더=grounded HTML)
   - STEP2: en STORE `needs_review` INSERT (ko↔en master·source_ref 정합)
   - STEP3: en `needs_review` → `canonical` flip
   - STEP4: ko `needs_review` → `canonical` flip
   - 각 STEP 단일 트랜잭션. 실패 시 해당 TX 롤백.
6. **사후 검증** — ko/en 짝(각 N), 중복 canonical 0, `source_ref_id` 정합, content hash 지문 불변(N/N).
7. **재실행 no-op** — 재실행 시 이미 canonical 존재분은 INSERT 0·flip 0 (멱등).
8. **롤백 구성** — 이번 파일럿 write 의 master ID·row id 를 기록해, 문제 시 **이 60(또는 확정분)만** canonical→회수 가능하도록 범위 한정.
9. **승인 게이트** — §4 dry-run 의 **최종 대상 수 + 예상 INSERT/UPDATE 수**를 보고하고 **승인 대기**. 승인 전 어떤 write 도 하지 않는다.

---

## 3. 필수 결과

* 재고정된 최종 대상 수 (fingerprint 52/8 별)
* 제외 제품 수·사유 (있으면)
* dry-run 예상 INSERT(ko/en)·flip 수
* (승인 후) 실제 write 결과: ko canonical N · en canonical N · needs_review 잔량 0 · dup 0
* 사후 검증 PASS (ko/en 짝, source_ref 정합, hash 불변)
* 재실행 no-op 확인
* 롤백 대상 ID 목록 산출물

---

## 4. 금지

* 다른 ATC key 동시 적용
* 안전지문 불일치 제품 포함
* 기존 canonical content **UPDATE** (신규 INSERT + flip 만; 기존 행 수정 금지)
* 수동 추정에 의한 그룹 확장 (fingerprint/안전지문 근거 없는 포함 금지)
* 338제품 전량 적용 (파일럿 범위 초과 금지)
* 외부 LLM 초안 자동생성 (authored 대표 grounding 만)
* §9 승인 전 write

---

## 5. 산출물

```text
apps/api-server/src/scripts/
  drug-otc-apply-pilot-b01ac06-dryrun.ts        # §1~§4 read-only 고정·재검증·dry-run
  drug-otc-apply-pilot-b01ac06-write.ts         # §5 이중게이트 write (승인 후 실행)

apps/api-server/src/scripts/data/
  otc-apply-pilot-b01ac06-target-frozen-v1.json # 동결된 최종 대상 ID + fingerprint 별 집계
  otc-apply-pilot-b01ac06-dryrun-v1.json        # 예상 INSERT/flip + 제외 목록
  otc-apply-pilot-b01ac06-writelog-v1.json      # (승인 후) 실제 write 결과 + 롤백 ID

docs/checks/
  CHECK-O4O-OTC-CANONICAL-APPLY-PILOT-B01AC06-V1.md
```

---

## 6. 완료 기준

* 대상 60(또는 재검증 후 확정분) fingerprint 별 재고정·동결
* 제외 발생 시 사유 보고 완료
* dry-run 예상 수 보고 + **승인 획득**
* 승인 후 canonical write: ko/en 짝 완결, dup 0, needs_review 잔량 0
* 사후 검증 PASS · 재실행 no-op · 롤백 목록 확보
* 자기 파일만 commit·push
* 통과 후 다음 = `top-5` 확대 (별도 WO)

---

*첫 canonical write 파일럿. 멱등·중복방지·롤백까지 통과한 뒤에만 확대한다. shard·통합·재계산 산출물 및 타 세션 파일 미수정.*
