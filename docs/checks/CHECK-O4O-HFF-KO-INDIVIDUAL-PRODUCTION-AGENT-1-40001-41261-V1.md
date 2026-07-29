# CHECK-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-40001-41261-V1

건강기능식품(HFF) 한글 매장용 설명서 개별 생산 — Agent 1 **마지막 구간 40,001~41,261 (1,261건)** 및 **전체 41,261 완결성 감사**

- 근거 WO: `WO-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-40001-41261-V1`
- 직전 구간: `CHECK-O4O-HFF-KO-INDIVIDUAL-PRODUCTION-AGENT-1-35001-40000-V1`
- 기준 커밋: `17f4c9100` (착수 HEAD 와 동일)
- 판정: **PASS** — 전체 구간 생산 **완결**

---

## 1. 실행 전 환경 확인

| 항목 | 결과 |
|---|---|
| `ide_selection` 자동 첨부 | **없음** |
| 공용 driver / parser / registry / composer / Guard / 렌더러 / CSS 수정 | **없음** |
| 타 세션 WIP 접촉 | **없음** |

## 2. 실행 파라미터 — WO 표기와 driver 실제 계약의 차이 (기록)

WO 는 `HFF_OFFSET=40000 / HFF_BATCH=1261 / HFF_EXPECT=1261` 을 지시했으나, **driver 의 실제 계약은 다르다.**

| 변수 | driver 에서의 의미 | WO 표기 해석 시 문제 |
|---|---|---|
| `HFF_BATCH` | **산출물 basename 선택자** (`BASE = data/hff-ko-agent-01-${BATCH}`) — 건수가 아님 | `1261` 을 넣으면 `hff-ko-agent-01-1261.*` 로 기록되어 **WO 가 요구한 산출물 파일명을 위반** |
| `HFF_OFFSET` | **driver 에 존재하지 않음** | offset 은 manifest 생성 단계에서 결정되며 driver 는 manifest 를 그대로 소비 |
| `HFF_EXPECT` | manifest 기대수량 가드 | 표기대로 `1261` 사용 (일치) |

WO 의 **의도**(마지막 1,261건 · 기대수량 1261 · 지정된 산출물 파일명)를 충족하도록 다음 값으로 실행했다. 공용 driver 는 수정하지 않았다.

```
HFF_BATCH=40001-41261   (basename)
HFF_EXPECT=1261
PROXY_PORT=5474
manifest offset=40000 / limit=1261  (manifest 생성 스크립트에서 지정)
```

## 3. DB 접속

| 항목 | 값 |
|---|---|
| 인스턴스 연결 이름 | `netureyoutube:asia-northeast3:o4o-platform-db` |
| 접속 경로 | Cloud SQL Auth Proxy v2, 전용 포트 **5474** |
| 자격증명 취급 | 로컬 `.env` → 동일 명령 내 `$PGPW` 로만 주입. **코드·CHECK·manifest·로그·커밋 미기록** |

## 4. 대상 확정 (manifest)

| 항목 | 값 |
|---|---|
| 풀 총계 | **41,261** |
| `풀 총계 == offset + limit` | **true** (40,000 + 1,261) |
| manifest 길이 | **1,261** |
| firstIndex / lastIndex | **40,001 / 41,261** |
| 재파생 mismatch | **0** |
| candidateId 중복 / statementNo 중복 | **0 / 0** |
| head | `20230029284188` 그대로 채운 바나바잎 |
| tail | `202600280981` **명장 홍삼정** |
| **전체 후보 tail** | `202600280981` **명장 홍삼정** |
| **tail == 전체 후보 tail** | **true** ✅ |
| 직전 구간 tail (40,000) | `20230029284187` → **정확히 인접** |
| 잔여 (41,261 이후) | **0** |

## 5. Driver parity

| 항목 | 값 |
|---|---|
| shim 무결성 | **PASS** (driver 22,417 bytes — 전 구간 불변) |
| 대조 대상 | 직전 구간(35001-40000) LIVE SPD **30건** |
| byte 동일 | **30 / 30** |
| `git diff` driver | **공백 (무변경)** |

## 6. 표본 20건 검증

| 항목 | 결과 |
|---|---|
| CREATE / HOLD | **20 / 0** |
| 쿼터 충족 | 전 유형 충족 (`quotaShort` 없음) |
| 기능성 grounding | 188 검사 / **위반 0** |
| 참고사항 grounding | 132 검사 / **위반 0** |
| 섭취 chip grounding | 20 검사 / **위반 0** |
| 문제 총계 | **0** → **PASS** |

### 6-1. `SRV_LONG` 표본 — 전량 순위 대체 (사유·길이 기록)

본 구간 pending(947건) 분포 실측:

| 축 | max | median | 임계값 이상 |
|---|---|---|---|
| `SRV_USE` | 127자 | 31자 | **≥150자 = 0건** |
| `INTAKE_HINT1` | 815자 | 140자 | ≥200자 = 210건 |
| `MAIN_FNCTN` | 1,380자 | 69자 | ≥300자 = 158건 |

`SRV_USE` 는 **150자 이상이 0건**이므로 절대 임계값으로는 쿼터를 채울 수 없다. 임계값을 낮추거나 타 구간 제품을 섞지 않고 **구간 내 최장값 순위 3건**으로 선정했다.

| 신고번호 | 제품명 | `SRV_USE` 길이 |
|---|---|---|
| `20240028080515` | 애터미 우먼 멀티팩 | 127자 |
| `20240028080453` | 애터미 맨 멀티팩 | 120자 |
| `20240028080290` | 바이브이펙트 두잇 멀티팩 | 68자 |

산출물에 `SRV_LONG_BY_RANK` 태그로 명시.

## 7. Dry-run

| 상태 | 건수 |
|---|---|
| CREATED | 945 |
| SKIPPED_EXISTING | 314 |
| HOLD_FOR_AGENT_9 | 2 |
| FAILED_SYSTEM | 0 |
| 합계 | **1,261** ✅ |
| DB write | **0** |
| 소요 | 70s (**56ms/건**) |

SKIPPED_EXISTING 314 = 사전 조회한 기존 canonical 보유 master 314 와 **정확히 일치**.
HOLD 사유 `NO_INTAKE_DATA` 2 (SRV_USE 부재) — WO 명시 사유. `INTAKE_HINT1` 공란만을 이유로 한 보류 **0**.

## 8. Apply (LIVE)

| 항목 | 값 |
|---|---|
| CREATED / SKIPPED / HOLD / FAILED | **945 / 314 / 2 / 0** — dry-run 과 **완전 동일** |
| DB writes | **2,835** (= 945 × 3) |
| expected == actual | **2,835 = 2,835** ✅ |
| 소요 | 105s (**83ms/건**) |
| 실행 시간창 | `2026-07-29T13:57:53Z` ~ `13:59:38Z` |
| rollback manifest | masters 945 · spd 945 · links 945 · outcomes 945 |

## 9. 독립 검증 (driver 미사용)

### 9-1. 저장 정합 — 전 항목 0

생성 SPD 실재 945/945 · 속성 무효 0 · candidate 링크 불량 0 · canonical 유일성 위반 0 · permit 중복 master 0 · manifest 밖 SPD/master 생성 0/0 · 시간창 내 기타 SPD 갱신 0 · **SKIP 대상 기존 canonical drift 0** (SHA-256 스냅샷 628행 대조) · 기존 SPD 소실 0.

### 9-2. Grounding

| 축 | 검사 | 위반 |
|---|---|---|
| 기능성 ⊆ `MAIN_FNCTN` | 4,390 | **0** |
| 참고사항 ⊆ `INTAKE_HINT1` | 4,329 | **0** |
| 섭취 chip ⊆ `SRV_USE` | 559 | **0** |

### 9-3. 디자인·구조

`designProblems` **빈 객체 — 전 항목 0건**.

### 9-4. 전역 증감

STORE/ko canonical SPD **+945** · `o4o_hff_generated` **+945** · `건강기능식품` master **+945** — 전부 기대치 일치. apply 전 baseline(62,376)은 직전 구간 종료값(59,653 + 2,723)과 일치.

### 9-5. 실브라우저 렌더 — `.store-desc-content` 래퍼 증명

| 속성 | 래퍼 **없이** | 래퍼 **적용** |
|---|---|---|
| `.sd-card` max-width | `none` | **`860px`** |
| `.sd-card` border-radius | `0px` | **`20px`** |
| `.sd-hero` padding | `0px` | **`40px 34px 32px`** |
| `.sd-badge` border-radius | `0px` | **`999px`** |

`cssActuallyApplied: true`. 430 / 820 / 1280 전 폭에서 페이지 가로 overflow 없음 · 요소 overflow 0 · 클리핑 0 · 필수 섹션 전부 존재.

## 10. Carry-over 지표 (미수정 · 수량 보고)

| 항목 | 값 |
|---|---|
| 렌더 내 기능성 중복 발생 제품 | **16** / 945 |
| 중복 문장 중 **원문 등장 횟수로 설명됨** | **41** |
| **설명되지 않는 중복** | **0** ✅ |
| `○` 계열 글머리 기호 잔존 제품 / 항목 | **8** / **32** |

중복 판정은 분할 휴리스틱이 아니라 **공식 `MAIN_FNCTN` 원문 문자열 내 실제 등장 횟수 직접 카운트**로 확인했다(`원문 등장 ≥ 렌더 횟수`). 원료 경계가 불명확한 `sd-why` 목록에 임의 dedupe 를 적용하지 않았다.

---

# 11. 전체 41,261 완결성 감사

## 11-A. Manifest 합집합 — 단절·중복·누락 0

| 구간 | 길이 | index |
|---|---|---|
| 00001-05000 | 5,000 | 1 – 5,000 |
| 05001-10000 | 5,000 | 5,001 – 10,000 |
| 10001-15000 | 5,000 | 10,001 – 15,000 |
| 15001-20000 | 5,000 | 15,001 – 20,000 |
| 20001-25000 | 5,000 | 20,001 – 25,000 |
| 25001-30000 | 5,000 | 25,001 – 30,000 |
| 30001-35000 | 5,000 | 30,001 – 35,000 |
| 35001-40000 | 5,000 | 35,001 – 40,000 |
| **40001-41261** | **1,261** | **40,001 – 41,261** |
| **합계** | **41,261** | **1 – 41,261** |

| 검사 | 결과 |
|---|---|
| index 단절(gap) | **0** |
| index 중복 | **0** |
| candidateId 중복 | **0** |
| statementNo 중복 | **0** |
| 연속성 | **true** |

## 11-B. DB 재파생 전량 대조

고정 정렬로 전체 41,261행을 재파생하여 manifest 연결본과 **candidateId 단위 1:1 대조**.

| 검사 | 결과 |
|---|---|
| 풀 총계 / DB 행수 | 41,261 / 41,261 |
| 순서 불일치 | **0** |
| manifest ↔ DB 길이 차 | **0** |

## 11-C. 전체 상태 집계

| 상태 | 건수 |
|---|---|
| CREATED | **25,074** |
| SKIPPED_EXISTING | **15,839** |
| HOLD_FOR_AGENT_9 | **348** |
| FAILED_SYSTEM | **0** |
| **합계** | **41,261** = 풀 총계 ✅ |

전 구간 `mode: apply` 로 기록되어 있으며 미분류(OTHER) **0**. 전 후보가 4상태 중 하나로 정확히 귀결된다.

**전체 HOLD 사유 분포 (348건):**

| 사유 | 건수 |
|---|---|
| `NO_INTAKE_DATA` (SRV_USE 부재) | **314** |
| `NO_FUNCTIONAL_DATA` (MAIN_FNCTN 부재) | **29** |
| `HINT_UNDER_EXTRACTION` | **5** |

전부 WO 가 명시한 정당한 보류 사유이며, `INTAKE_HINT1` 공란만을 이유로 한 보류는 **0건**이다.

## 11-D. DB 실측 교차 확인

| 지표 | 값 |
|---|---|
| HFF 후보 총계 | **41,261** |
| ProductMaster 연결된 후보 | **40,913** |
| **STORE/ko canonical 보유 후보** | **40,913** |
| 미보유 (= HOLD) | **348** |

**41,261 − 40,913 = 348 = HOLD 수와 정확히 일치.** 즉 **보류 348건을 제외한 전 후보가 STORE/ko canonical 설명서를 보유**하며, 시스템 실패로 인한 미처리는 **0건**이다.

## 11-E. 재실행 대상

`FAILED_SYSTEM` **0** → **재실행 대상 없음**.

---

## 12. Git 안전 절차

- 착수 HEAD = `17f4c9100` = `origin/main` = 기준 커밋.
- 타 세션 WIP(`otc-v4-pilot-500-*` 계열 등) **일절 미접촉**.
- `git add .` / 경로 없는 commit 미사용 — 경로 지정 stage + 경로 지정 commit 만 사용.
- `pnpm-lock.yaml` 미수정 / 공용 모듈·driver·렌더러·CSS 미수정 / 영문 설명서 미생성 / force push 미사용.
- 임시 스크립트(`tmp-hff-a1-*.mjs`) 및 임시 baseline 스냅샷 전량 삭제 후 커밋.

## 13. 다음 단계

1. **전체 통합 검증** — 본 CHECK §11 이 1차 통합 감사에 해당한다. 추가로 필요한 항목은 콘텐츠 품질 표본 감사(구간 교차 표본) 정도다.
2. **Agent 9 보류 큐 통합** — 9개 구간의 `-holds.jsonl` 을 단일 큐로 통합한다. 전 구간 동일 계약(`index / candidateId / statementNo / productName / productMasterId / holdReason / holdDetail / mainFnctn / srvUse / baseStandard / intakeHint1`)으로 기록되어 있어 단순 concat 으로 통합 가능하다.

| 구간 | HOLD |
|---|---|
| 00001-05000 | 23 |
| 05001-10000 | 43 |
| 10001-15000 | 21 |
| 15001-20000 | 6 |
| 20001-25000 | 69 |
| 25001-30000 | 53 |
| 30001-35000 | 67 |
| 35001-40000 | 64 |
| 40001-41261 | 2 |
| **합계** | **348** |

3. **공용 driver 정비 (별도 WO)** — 누적 carry-over 2건:
   - `INTAKE_HINT1` 의 `○ ● ◦ ※` 계열 글머리 기호 미제거 (`MARKER_LEAD` 확장)
   - 공식 원문 반복 문장의 렌더 중복 — **`sd-why`(원료 경계 미표기) 목록에는 dedupe 적용 금지**. 그룹 간 동일 문장은 원료별 공식 기능성이므로 병합 시 기능성 삭제가 된다.

## 14. 함정 기록 (인계)

1. **`HFF_BATCH` 는 건수가 아니라 파일 basename 이다** (§2). 마지막 구간처럼 5,000 이 아닌 배치에서 혼동하기 쉽다. 건수 가드는 `HFF_EXPECT`, offset 은 manifest 생성 단계에 있다.
2. 프록시 연결 이름 = `netureyoutube:asia-northeast3:o4o-platform-db`, 토큰 수명 ~1시간 → 구간마다 새 포트 재기동.
3. `mfds_permit_number` 무인덱스 → `= ANY()` 일괄 조회 필수.
4. **렌더 검증은 `.store-desc-content` 래퍼 필수** + computed style 대조로 적용 증명(§9-5).
5. **표본 쿼터를 절대 임계값으로 고정하지 말 것** — 구간마다 분포가 크게 다르다(본 구간 `SRV_USE` ≥150자 **0건**). 채울 수 없으면 구간 내 최장값 순위로 선정하고 실제 길이를 기록(§6-1).
6. **중복 판정은 원문 문자열 직접 카운트로** — `①~⑮` 기준 분할 휴리스틱은 `(1)(2)(3)` 마커 원문을 놓친다.
7. HTML 균형 검사는 `<ul` 로, chip grounding 은 `sd-chips` 내부로 스코프.

---

*작성: 2026-07-29*
