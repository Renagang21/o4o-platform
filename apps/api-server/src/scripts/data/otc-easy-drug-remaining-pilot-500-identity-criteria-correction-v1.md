# identity 판정 기준 정정 기록 — pilot 500

> WO: `WO-O4O-OTC-EASY-DRUG-REMAINING-MASTER-BY-MASTER-PILOT-500-QUEUE-V1`
> 작성: 라 에이전트 · 근거: pilot 100 실제 생산 결과(commit `7f04f3ffb`) · **DB write 0 (read-only)**
> ⚠️ 본 문서는 정정 사실의 기록이다. **pilot 100 원장과 결과 파일은 일절 수정하지 않는다(읽기 전용).**

---

## 1. 정정 내용

| 축 | 정정 전 (pilot 100 사전 기준) | 정정 후 (pilot 500 기준) |
|----|------------------------------|---------------------------|
| `gencodeCount >= 2` | 단독으로 `IDENTITY_CONFLICT` | **예외 사유에서 제거** |
| `permitCodeCount >= 2` | (미사용) | `IDENTITY_CONFLICT` |
| 서로 다른 공식 원문 hash 다중 | (미사용) | `IDENTITY_CONFLICT` |
| 성분·함량·제형 또는 품목 identity 상충 | (미사용) | `IDENTITY_CONFLICT` |
| master ↔ 공식 원문 단일 확정 불가 | (미사용) | `IDENTITY_CONFLICT` |

**핵심**: `gencode` 는 **후보 연결 키**이며, 생산 grounding 은 **`master_id` + 공식 원문**이다.
동일 master 에 품목기준코드 1개 + 공식 e약은요 원문 1건이 안정적으로 연결되면 생산 가능하다.

---

## 2. 실측 근거 — pilot 100

- 사전 `IDENTITY_CONFLICT` 예상: **12건** (전량 `gencodeCount >= 2` 사유)
- 그 중 실제 **정상 생산(GREEN)**: **10건**
- 그 중 실패: **2건** — 실패 사유는 모두 **route 축**이며 identity 축이 아니다

### 2-1. 정상 생산된 10건 (정정의 직접 근거)

| # | masterId | 제품명 | gencodeCount | permitCodeCount | 생산 route |
|--:|----------|--------|-------------:|----------------:|-----------|
| 1 | `002063d6-2bea-4975-9fab-7d13bba0a19f` | 디알클리어점안액(카르복시메틸셀룰로오스나트륨) | 2 | 1 | ophthalmic |
| 2 | `00218d5c-d6d4-4206-bb80-bd131525d960` | 미리놀과립(아세틸시스테인) | 2 | 1 | oral |
| 3 | `004aab4d-6f13-4d2e-87ae-1cc19368ce90` | 스카풀라정 | 2 | 1 | oral |
| 4 | `00a49157-6ded-488f-a647-db37bfc773a8` | 아웃콜에프캡슐 | 2 | 1 | oral |
| 5 | `00fdc1b1-336b-42b3-b26c-c7b75635b7f0` | 태극케토코나졸크림 | 2 | 1 | topical |
| 6 | `012903c2-bdfb-474b-861e-042c01c45f4c` | 신신파스아렉스 | 2 | 1 | topical |
| 7 | `015425b9-10e6-4344-99b7-f76eec68544c` | 원타임프레쉬점안액(카르복시메틸셀룰로오스나트륨)(1회용) | 2 | 1 | ophthalmic |
| 8 | `0157af47-6f06-4ceb-80c4-d82bb953ea5f` | 원타임프레쉬점안액(카르복시메틸셀룰로오스나트륨)(1회용) | 2 | 1 | ophthalmic |
| 9 | `0181e3ea-a445-407f-a647-b92d5eb4c479` | 헥사메딘액0.12%(클로르헥시딘글루콘산염액) | 3 | 1 | oromucosal |
| 10 | `0203be99-2d01-4e15-9143-011de3060ea9` | 원타임프레쉬점안액(카르복시메틸셀룰로오스나트륨)(1회용) | 2 | 1 | ophthalmic |

→ 10건 전부 `permitCodeCount = 1`. 즉 **품목 identity 는 단일**이었고, gencode 다중은 성분명코드 축의 다중성일 뿐이었다.

### 2-2. 실패한 2건 (identity 사유 아님)

| masterId | 제품명 | 사전 예상 | 실제 예외 코드 |
|----------|--------|-----------|----------------|
| `00551806-bd1d-4c74-b606-56b60fe1e283` | 대한관류용멸균생리식염수 | IDENTITY_CONFLICT | `ROUTE_UNRESOLVED` |
| `02342db7-70a4-481a-96d3-c862017edb5d` | 큐앤큐헥시코올탈지면액 | IDENTITY_CONFLICT | `ROUTE_UNRESOLVED` |

→ 실제 실패 코드는 `ROUTE_UNRESOLVED`. identity 충돌이 아니라 **투여경로 미확정**이 원인이다.

---

## 3. pilot 500 적용 결과

| 항목 | 값 |
|------|----|
| v1(정정 전) 분류 | agent-ga 2426 / agent-na 1037 / exclude 266 |
| v2(정정 후) 분류 | agent-ga 2766 / agent-na 697 / exclude 266 |
| 재분류 master | **600건** |

### 전이별 내역

| 전이 | 건수 |
|------|-----:|
| `IDENTITY_CONFLICT → READY` | 340 |
| `IDENTITY_CONFLICT → ROUTE_UNRESOLVED` | 260 |

### identity 축 실측 분포 (잔여 분류 대상 전체)

| 축 | 건수 |
|----|-----:|
| 분류 대상(exclude 제외) | 3463 |
| `permitCodeCount >= 2` | 0 |
| `officialSourceHashCount >= 2` | 0 |
| `gencodeCount >= 2` | 600 |
| `gencodeCount >= 2` 이면서 품목 identity 는 단일 | 600 |
| v1 IDENTITY_CONFLICT 총계 | 600 |
| **v2(정정) IDENTITY_CONFLICT 총계** | **0** |

`gencodeCount >= 2` 단독 600건의 v2 귀결: `{"READY_MASTER_PRODUCTION":340,"ROUTE_UNRESOLVED":260}`

→ 잔여 모집단에서 `permitCodeCount >= 2` 또는 서로 다른 공식 원문 hash 다중인 master 는 0건이다. 즉 정정 후 `IDENTITY_CONFLICT` 는 **실측상 소멸**하며, 종전 IDENTITY_CONFLICT 로 묶여 있던 건은 정상 생산 또는 route 예외로 정확히 재귀속된다.

---

## 4. 불변 규칙

1. **pilot 100 원장·결과 파일 수정 금지.** 본 정정은 pilot 500 이후 기준에만 적용한다.
2. 정정된 `IDENTITY_CONFLICT` 판정은 `permitCodeCount` 와 `officialSourceHashCount` 두 실측 축으로만 내린다.
3. `gencodeCount` 는 원장에 계속 기록하되 **판정 축에서 제외**한다(추적성 유지).
4. route 미확정은 identity 예외가 아니라 `ROUTE_UNRESOLVED` / `ROUTE_CONFLICT` 로 분류한다.
