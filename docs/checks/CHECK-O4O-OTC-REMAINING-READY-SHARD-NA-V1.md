# CHECK-O4O-OTC-REMAINING-READY-SHARD-NA-V1 — 나 shard 착수 전 감사 · 생산 보류

WO: `WO-O4O-OTC-REMAINING-READY-SHARD-NA-V1` · 일자: 2026-07-25 · 담당: **드럭 OTC 에이전트 나**
SSOT: `otc-remaining-shard-assignment-ssot-v1.json` (라, `WO-O4O-OTC-REMAINING-FULL-CORPUS-CENSUS-AND-THREE-SHARD-DESIGN-V1`)
성격: **read-only 착수 전 감사.** **DB write 0** · apply 0 · 저작 0 · claim 미선점(§5).

---

## 0. 결론

> **`BLOCKED_DB_ACCESS` + `REVIEW_REQUIRED`** — 생산 미착수.
>
> 1. **shard 무결성은 오프라인 전량 PASS** — 263 fp / 642 master, distinct 642, ga·da 교집합 0 (§1).
> 2. **DB 접속 불가로 생산 착수 불가** — 본 클론에 자격증명 파일 부재(라가 census 후 임시 `.env` 삭제). 승인 채널로 취득한 값의 인라인 전달은 정책상 차단됨 (§4). **원문 확인·dry-run·apply 전부 불가.**
> 3. **착수 전 차단 사유 1건 발견** — 나 shard 263 fp 중 **88 fp / 223 master (34.7%)** 의 성분명 축이 실제 성분명이 아니라 **수출 브랜드명(`수출명:…`)**. 성분 귀속 불가 + EXCLUDE 혼입 의심 → **판정 확정 전 생산 금지** (§3). 이는 READY 풀 전체(241 fp / 669 master) 문제로 **가·다 shard 에도 동일 적용**된다.

---

## 1. shard 무결성 (오프라인 실측 — PASS)

| 게이트 | 실측 | 기대 | 판정 |
|---|---:|---:|:---:|
| SSOT `shards.na.fingerprintList` | 263 | 263 | ✅ |
| census `readyGroups` 매칭 fp | 263 | 263 | ✅ |
| masterIds 총수 | 642 | 642 | ✅ |
| masterIds distinct | **642** | 642 | ✅ (중복 0) |
| `size` 합계 | 642 | 642 | ✅ |
| ga·da fp 교집합 | **0** | 0 | ✅ |
| ga·da master 교집합 | **0** | 0 | ✅ |
| 성분명 공란 fp | 0 | 0 | ✅ |

> WO 명시 수치(263 fp / 642 master)와 SSOT·census 아티팩트가 **3중 일치**. 기존 완료분과의 교집합 0 은 census 게이트(`readyCompleteIntersection: 0`)로 보장되며, READY 정의 자체가 `authored ko canonical AND en canonical` 보유분을 배제하므로 **nutrition_combo·안전 subgroup 완료분 재처리 위험은 구조적으로 0**(WO 추가 원칙 2건 충족).

## 2. 우선순위별 배치 계획 (oral → topical → ophthalmic → nasal/vaginal/rectal)

| 순위 | route | fp | master | 누계 master | 최대 그룹 |
|:---:|---|---:|---:|---:|---:|
| 1 | **oral** | 152 | **397** | 397 | 14 |
| 2 | **topical** | 84 | **175** | 572 | 14 |
| 3 | **ophthalmic** | 21 | **50** | 622 | 13 |
| 4 | **nasal** | 4 | 5 | 627 | 2 |
| 5 | **vaginal** | 1 | 4 | 631 | 4 |
| 6 | **rectal** | 1 | 11 | 642 | 11 |

- 그룹당 master 가 작다(최대 14, 평균 2.4) → 선행 shard(경구 복합 A/B/C, 그룹당 3)와 동일한 **fp 단위 배치** 구조가 적합.
- 착수 시 배치 분할 제안: oral 을 25 fp 단위 7배치(152) → topical 25 fp 단위 4배치(84) → ophthalmic 1배치(21) → 잔여 3 route 1배치(6 fp). **총 13배치.**

## 3. ⚠️ 착수 전 차단 사유 — 성분명 축의 수출 브랜드명 혼입

census `readyGroups[].ingredient`(fingerprint 성분 축)가 **실제 성분명이 아니라 수출 제품 브랜드명**인 그룹:

| 범위 | fp | master | 비율 |
|---|---:|---:|---:|
| **나 shard** | **88** | **223** | **34.7%** |
| READY 풀 전체 | 241 | 669 | 34.7% |

route 분포(나): topical 109 · oral 94 · ophthalmic 19 · nasal 1 master.

대표 사례:

| master | route | ingredient 축 실제 값 | 규격/제형 |
|---:|---|---|---|
| 14 | oral | `수출명:VilexCetirin` | 10밀리그램 / 정 |
| 14 | topical | `수출명:PlasterJointPolyArtritoPlastKEPAX` | 30밀리그램 / 첩부제 |
| 11 | topical | `싱가폴수출명:KetotopPainReliefPlaster30mg` | 30밀리그램 / 첩부제 |
| 8 | oral | `수출명:MEBURATINTablet150mg` | 150밀리그램 / 정 |
| 5 | ophthalmic | `수출명:다티펜점안액` | 0.45밀리리터 / 점안액 |

### 두 가지 문제

1. **성분 귀속 불가 (HOLD_IDENTITY 성격)** — census 자체가 `HOLD_IDENTITY = 무성분명/복합` 을 별도 클래스로 분리한다. 성분 축이 수출 브랜드명이면 **성분명이 사실상 부재**한 것과 동일하다. 이 상태로 fingerprint 그룹을 하나의 설명서로 묶으면 **조성이 다른 제품의 혼합** 위험이 있다(CLAUDE.md 콘텐츠 불변 원칙: 조성·투여경로·효능이 다르면 혼합 금지).
2. **EXCLUDE 혼입 의심** — census EXCLUDE 정규식(`전량수출|수출전용|수출용|for export|군납|…`)은 **제품명** 축에 적용된 것으로 보이며, `수출명:` 접두 성분 축은 걸러지지 않았다. 선행 트랙에도 동종 사례가 있다(첩부제 V7 「군납혼입 하루펜 4 HOLD」).

> **판정**: 88 fp / 223 master 는 **REVIEW** — 아래 확정 전 생산 금지. 잔여 175 fp / 419 master 는 이 사유로는 차단되지 않으나, DB 접속 불가로 원문 확인 자체가 불가(§4).
>
> **확정 방법(DB 접속 확보 시)**: 해당 master 의 (a) `product_masters.name` 에 수출/군납 키워드 유무, (b) `product_drug_extensions` 유효성분 필드로 실제 성분 복원 가능 여부, (c) 국내 판매 품목 여부(취소일자·품목허가 상태) 3축 확인 → 성분 복원 가능 & 국내 유통 = READY 승격 / 그 외 = EXCLUDE 또는 HOLD_IDENTITY 재분류.
>
> **라 census 파일은 수정하지 않는다**(소유 세션 몫). 본 CHECK 에 사실만 기록한다.

## 4. 🚫 생산 차단 — DB 접속 불가

| 항목 | 상태 |
|---|---|
| `apps/api-server/.env` · `.env.apiserver` | **부재** — 라가 census 실행 후 임시 `.env` 삭제(라 CHECK §접속 명시) |
| Cloud SQL Auth Proxy `127.0.0.1:5442` | LISTENING (기동 중, 본 세션 무접촉) |
| 자격증명 취득 | `gcloud run services describe o4o-core-api`(CLAUDE.md §0 승인 채널)로 확인 가능 |
| **취득 값의 러너 전달** | **정책상 차단** — 인라인 환경변수 전달이 auto-mode classifier 에 의해 거부됨 |

→ **원문 근거 확인 · dry-run · apply · 사후검증 전부 불가.** WO 중지 조건("공식 근거 확인 불가", "승인 범위를 넘는 조치 필요") 해당 → **생산 미착수**.

**해소 방안 (사용자 선택)**

| # | 방안 | 비고 |
|---:|---|---|
| A | 사용자가 `apps/api-server/.env` 를 복원(라 방식) | gitignored. 본 세션 금지목록에 있던 파일이므로 **금지 해제 명시 필요** |
| B | Bash 권한 규칙 추가로 러너 실행 시 자격증명 전달 허용 | `/config` 또는 `.claude/settings.json` permissions |
| C | 자격증명 보유 세션(라 등)이 write-owner 로 apply 수행 | 나는 저작·config·검증만 담당 |

## 5. claim 미선점 사유

SSOT 가 이미 fp 단위로 나 소유를 확정(`shards.na`, 교집합 0 게이트)하므로 **별도 claim 파일 선점 없이도 충돌 위험 0**. 생산 착수가 불가한 상태에서 claim 을 `CLAIMED` 로 남기면 타 세션에 **거짓 진행 신호**가 되므로(직전 [RESUME-NA-QUEUE-AUDIT §2](CHECK-O4O-OTC-PRODUCTION-RESUME-NA-QUEUE-AUDIT-V1.md) 에서 정정한 것과 동일한 문제) **선점하지 않는다.** 착수 승인 시점에 선점한다.

## 6. 보고 요약

| 항목 | 값 |
|---|---|
| shard 식별자 | `otc-remaining-shard-assignment-ssot-v1.json` → `shards.na` |
| 대상 fingerprint / master | **263 fp / 642 master** (SSOT·census·WO 3중 일치) |
| PASS / REVIEW / HOLD | 무결성 게이트 8/8 PASS · **REVIEW 88 fp / 223 master**(수출명 혼입) · HOLD 0(확정 전) |
| dry-run | **미실행** — DB 접속 불가 (§4) |
| apply | **미수행** |
| canonicalDup | 해당 없음 (write 0) |
| 사후검증 | 해당 없음 (DB 무변경) |
| **DB write** | **0** |
| 잔여 확정 물량 | **642 master 전량 미생산** (착수 대기) |

## 7. 준수 / 금지

| 항목 | 결과 |
|---|---|
| 라 census 파일(`otc-remaining-full-corpus-census.ts` · `-v1.json` · shard SSOT) | **미수정** (읽기만) |
| 신규 shard 임의 생성 / 대상 추정 | 0 — SSOT `shards.na` 만 사용 |
| 타 shard(ga·da) 대상 | **미접촉** (교집합 0 확인만) |
| nutrition_combo · 안전 subgroup 완료분 재처리 | 0 — READY 정의상 구조적 배제(§1) |
| `_msm.mjs` / `_msmx.mjs` / `apps/api-server/.env` | **미접촉** |
| `git add .` / reset / clean / stash | 미사용 — path-specific add |
| 자격증명 | 값 미기록·미커밋. 임시 파일 생성 0 |
| 자기 산출물 | 본 CHECK 1건 |
