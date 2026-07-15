# CHECK-O4O-HFF-BATCH-0-GROUNDING-ESTABLISH-V1

> **작업명:** HFF Batch 0 15건 제품 정체성·공식 근거 확보 (grounding establish)
> **유형:** grounding 조사 (read-only) — **코드 0 · DB write 0 · 설명서 초안 0 · 기존 콘텐츠 무변경**
> **결과: READY 0 / 전량 SOURCE_REQUIRED — 원 표시사항(사진) 자산 전무로 공식 1:1 매칭 불가**
> **근거 WO:** WO-O4O-HFF-BATCH-0-GROUNDING-ESTABLISH-V1 (사용자 지시, 2026-07-15)
> **선행:** [`CHECK-O4O-HFF-DESCRIPTION-BATCH-0-LEGACY-PHOTO-TO-SEMANTIC-KO-EN-V1`](CHECK-O4O-HFF-DESCRIPTION-BATCH-0-LEGACY-PHOTO-TO-SEMANTIC-KO-EN-V1.md)(대상 15건 확정)
> **작성일:** 2026-07-15

---

## 0. 요약

Batch 0 15건의 grounding 확보를 위해 WO §4A(**기존 photo 자산의 표시사항에서 식별정보 회수**)를 먼저 수행했다. 결과 = **원 제품 사진·표시사항 자산이 모든 저장소에 전무**. 식별자(품목보고번호·바코드) 없이는 §4B 공식 1:1 매칭(우선순위 1~3)이 성립하지 않고, 제품명·성분만의 매칭은 §3·§11에서 금지된다. 따라서 **15건 전부 `SOURCE_REQUIRED`**(원 표시사항/사진 추가 확보 시 재판정), **READY 0**. WO 종결 원칙("사진에도 품목보고번호·바코드가 없다면 HOLD")에 따라 설명서 작성은 계속 HOLD. DB write 0, 초안 0, 기존 콘텐츠 무변경.

---

## 1. Step A — 기존 photo 자산 존재 여부 (전량 부재, 프로덕션 read-only)

| 소스 | 결과 |
|---|---|
| repo 이미지 자산 (`docs/guides/products/**`, jpg/png/webp) | **0건** |
| `product_images` (master 링크) | **0건** (15 master 전부) |
| `representative_products.thumbnail_image_id` | **0건** |
| SPD `content` 내 `<img>` 태그 | **15건 전부 없음** |
| SPD `content` 내 품목보고번호/`STTEMNT`/`제NNNN` 키워드 | **15건 전부 없음** |
| SPD `content` 내 13자리 바코드 | **15건 전부 없음** |

- photo 배치의 사진은 저작 시 소스로만 사용되고 **어디에도 persist 되지 않았다**. 기존 SPD 콘텐츠는 순수 소비자 마케팅 카피(길이 3.1k~5.7k)로, 표시사항 식별정보(품목보고번호·바코드·함량)를 담고 있지 않다.
- §4A 원칙("기존 콘텐츠 HTML 문구가 아니라 제품 이미지의 표시사항만 근거") 적용 시 **회수 가능한 근거 0**.

## 2. Step B — 공식 품목 1:1 매칭 (불가)

WO §4B 매칭 우선순위와 대조:

| 우선순위 | 조건 | 충족 |
|---|---|:--:|
| 1 | 품목보고번호 정확 일치 | ✗ (제품 품목보고번호 미확보) |
| 2 | 바코드 정확 일치 + 제조사 | ✗ (바코드 미확보) |
| 3 | 공식 제품명 + 제조사 + 용량·제형 일치 | ✗ (마케팅명·용량 표시사항 미확보) |
| 4 | 미충족 → HOLD | **해당** |

- 선행 CHECK §3에서 확인: master 15건 전부 `mfds_permit_number` 공백·`product_identifiers` 0·후보 매칭 링크 0. 41,261 후보 이름 매칭도 0건(마케팅명≠공식명) 또는 수백~수천 건(성분 토큰)으로 **1:1 확정 불가**.
- 제품명 유사·성분명 검색으로의 연결은 §3·§11 금지 → 시도하지 않음.

## 3. 제품별 판정 (15건)

| # | 제품 | master id | photo/표시사항 | 제조사 | 공식 1:1 매칭 | 판정 |
|---|------|-----------|:--:|---|:--:|:--:|
| 1 | 맨 파워 포텐 | `f5f88abb…` | 없음 | — | 불가 | SOURCE_REQUIRED |
| 2 | 모어 플러스 & 비오틴 | `50414d47…` | 없음 | — | 불가 | SOURCE_REQUIRED |
| 3 | 이가돌 맥스 | `90e00d92…` | 없음 | — | 불가 | SOURCE_REQUIRED |
| 4 | 코큐텐 액티브 | `cb26c8b3…` | 없음 | — | 불가 | SOURCE_REQUIRED |
| 5 | 프리미엄 브레인 솔루션 에스 | `7a5764c6…` | 없음 | — | 불가 | SOURCE_REQUIRED |
| 6 | 듀얼케어 락토바이옴 | `9440c2ac…` | 없음 | — | 불가 | SOURCE_REQUIRED |
| 7 | 로얄파워민 프로 | `29286920…` | 없음 | — | 불가 | SOURCE_REQUIRED |
| 8 | 락토밸런스 프로바이오틱스 + 아연 | `a583b71b…` | 없음 | — | 불가 | SOURCE_REQUIRED |
| 9 | 프리미엄 알티지 오메가3 | `ff92d6bd…` | 없음 | — | 불가 | SOURCE_REQUIRED |
| 10 | 프리미엄 헤파에이스 400 | `069f70af…` | 없음 | — | 불가 | SOURCE_REQUIRED |
| 11 | 파워 본 케이투 엔 디 5000 | `a7f5272d…` | 없음 | 마더스팜 | 불가(식별자 부재) | SOURCE_REQUIRED |
| 12 | 아스타잔틴 루테인 600 | `3e46616f…` | 없음 | VITALTREE | 불가(식별자 부재) | SOURCE_REQUIRED |
| 13 | 징코Q 마그시아 | `0a47e0bc…` | 없음 | — | 불가 | SOURCE_REQUIRED |
| 14 | 징코Q젠시아 | `325c2ad9…` | 없음 | — | 불가 | SOURCE_REQUIRED |
| 15 | 면역엔 이뮨 부스터 α | `fa5141ee…` | 없음 | — | 불가 | SOURCE_REQUIRED |

**분포: READY 0 / SOURCE_REQUIRED 15 / HOLD_IDENTITY 0 / HOLD_MARKET 0 / EXCLUDE 0.**
(11·12는 제조사만 부분 확보 — 그래도 품목보고번호·바코드·함량 부재로 1:1 불가 → SOURCE_REQUIRED.)

## 4. READY 필수 grounding 확보표 (WO §5)

| 항목 | 15건 확보 |
|---|:--:|
| 제품 공식 식별 / 품목보고번호 / 바코드 | 0 |
| 제조사·수입사 | 2 (부분) |
| 기능성 원료 / 1일 섭취량 함량 / 인정 기능성 / 섭취방법 / 공식 주의사항 / 제형·구성 / 시판 확인 | 0 (공식 원천 기준) |

- 성분/기능 tags(선행 CHECK §1)는 저작 흔적이지 공식 grounding 아님 → 근거로 미채택(§11).

## 5. DB 연결이 필요한 항목 (전부 미실행)

- `mfds_permit_number` / `product_identifiers` / 바코드 / 후보·raw source reference / grounding source memo — **확정 근거 부재로 연결 대상 0**. WO §7 승인 게이트 이전이며 read-only 유지.

## 6. 무변경 확인

```text
코드 변경        0
DB write         0
설명서 초안       0
ProductMaster    무변경
mfds_permit_number 저장  0
ProductIdentifier 생성   0
기존 ko+zh       무변경
QR/Landing       무변경
```

## 7. 판정 및 다음 단계 — 진짜 unblock

- **grounding establish 결과: READY 0.** 원 제품 표시사항(사진) 자산이 전무해 공식 1:1 매칭이 불가하다. WO 기본 원칙에 따라 **15건 전부 설명서 작성 HOLD 유지**.
- **진짜 unblock = 제품별 원 표시사항 확보.** 다음 중 하나가 선행되어야 한다:
  1. 각 제품의 **원 사진(전면 제품명 + 후면 표시사항: 품목보고번호·바코드·제조사·기능성 원료 함량·섭취방법·주의사항)** 을 사용자/운영자가 제공 → §4A 재수행 → §4B 공식 1:1 매칭.
  2. 또는 물리 제품 표시사항을 확보해 품목보고번호/바코드로 식품안전나라 공식 품목과 매칭.
- 확보되면 READY 제품만 [`WO-O4O-HFF-DESCRIPTION-BATCH-0A-SEMANTIC-KO-EN-DRAFT-V1`](../work-orders/) (5건 단위 초안 → 검수 → 이중게이트 → 승격)로 진행.
- (선택) 제조사 확보된 11·12 등에 한해 식품안전나라 공식 웹 매칭을 **명시 승인 시** 시도할 수 있으나, 식별자 부재로 1:1 신뢰도가 낮아 기본은 SOURCE_REQUIRED 유지.

## 8. 완료 판정

- **15건 전수 조사 완료** · 제품명/성분 매칭으로 확정한 건 **0** · 공식 1:1 근거 있는 제품만 READY(=0) · 근거 부족 15건 SOURCE_REQUIRED · 승인 없는 DB 변경 0.
- 추정·기존콘텐츠 재활용 없이 규칙(§3·§11·HFF-R09·CR-007) 준수한 정직한 중단.

## 9. 커밋

- commit: 본 CHECK 문서 1개(docs 전용, path-scoped). 무관 dirty/lockfile 미포함.
- 배포: 없음(문서 전용).
