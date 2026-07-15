# CHECK-O4O-HFF-DESCRIPTION-BATCH-0-LEGACY-PHOTO-TO-SEMANTIC-KO-EN-V1

> **작업명:** HFF Batch 0 — 구형 photo `ko+zh` 15건 → semantic `ko+en` 정본 초안
> **유형:** 대상 확정 + grounding 감사 (read-only) — **코드 0 · DB write 0 · 설명서 신규 생성 0 · 기존 콘텐츠 무변경**
> **결과: 대상 확정 PASS / 초안 제작 = HOLD (grounding 선행 필요)**
> **근거 WO:** WO-O4O-HFF-DESCRIPTION-BATCH-0-LEGACY-PHOTO-TO-SEMANTIC-KO-EN-V1 (사용자 지시, 2026-07-15)
> **선행 CHECK:** [`CHECK-O4O-HFF-DESCRIPTION-PRODUCTION-READINESS-FINAL-CHECK-V1`](CHECK-O4O-HFF-DESCRIPTION-PRODUCTION-READINESS-FINAL-CHECK-V1.md)
> **규칙 SSOT:** [`HFF-DESCRIPTION-RULES-SSOT-V1`](../guides/products/health-functional-food/HFF-DESCRIPTION-RULES-SSOT-V1.md) (HFF-R01~R10) · [`AGENT-KICKOFF`](../guides/products/health-functional-food/AGENT-KICKOFF.md)
> **작성일:** 2026-07-15

---

## 0. 요약

WO §4가 지시한 대로 **실행 전 DB에서 정확한 15건 대상과 기존 콘텐츠 ID를 재확정**했다(§1). 확정 결과는 WO §4 named 목록과 **정확히 일치**한다. 그러나 §6~§7 grounding 확인 단계에서 **15건 전부 식약처 공식 grounding(품목보고번호·인정 기능성)이 DB에 부재**하고, 41,261 후보 풀 이름 매칭도 **신뢰 불가**함을 확인했다. HFF-R09 / CR-007 / WO §14(HOLD 기준)에 따라 **근거 부족 상태에서 추정 초안을 만들지 않고 grounding 선행을 요구**한다. 기존 `ko+zh` 콘텐츠는 무변경, DB write 0, 초안 0.

---

## 1. 대상 15건 확정 (프로덕션 read-only 실측)

기준 = `regulatory_type='건강기능식품'` AND 기존 `zh` 언어 SPD 보유(= 구형 photo ko+zh). 결과 = **정확히 15건**. WO §4 named 14건 + "나머지 1건"(맨 파워 포텐)과 **완전 일치**. 삭제된 손상 5건·일반식품 0건 포함 안 됨.

| # | 제품 | master id | 기존 STORE | 기존 B2B | 성분/기능 tags |
|---|------|-----------|:--:|:--:|---|
| 1 | 맨 파워 포텐 | `f5f88abb-17d6-405c-9450-cc8cb9d0b066` | ko+zh | ko+zh | 남성 |
| 2 | 모어 플러스 & 비오틴 | `50414d47-ff50-430b-8010-c6ca0450add8` | ko+zh | ko+zh | 비오틴·모발·엽산·판토텐산·B |
| 3 | 이가돌 맥스 | `90e00d92-d21f-4d8e-8ee0-4b9cd636f9cf` | ko+zh | — | 프로폴리스·칼슘·비타민D·뼈·치아·구강 |
| 4 | 코큐텐 액티브 | `cb26c8b3-121c-4cd6-9730-3f5538421895` | ko+zh | — | (tags 없음) |
| 5 | 프리미엄 브레인 솔루션 에스 | `7a5764c6-5870-419e-97b3-40be8e86703b` | ko+zh | ko+zh | 포스파티딜세린·은행잎·인지력·기억력 |
| 6 | 듀얼케어 락토바이옴 | `9440c2ac-0ec1-404f-b6d1-c36a5e7c4fb6` | ko+zh | ko+zh | 바나바잎·유산균·혈당·장건강 |
| 7 | 로얄파워민 프로 | `29286920-36ec-4fe8-a49d-fc72871d4cf5` | ko+zh | — | (tags 없음) |
| 8 | 락토밸런스 프로바이오틱스 + 아연 | `a583b71b-c6ab-4440-b421-abe0c6f50e3b` | ko+zh | ko+zh | 프로바이오틱스·아연·장건강·면역 |
| 9 | 프리미엄 알티지 오메가3 | `ff92d6bd-087b-40fa-8cd0-153b3752dde9` | ko+zh | — | (tags 없음) |
| 10 | 프리미엄 헤파에이스 400 | `069f70af-43c8-48bb-ba94-a7897bace32d` | ko+zh | — | (tags 없음) |
| 11 | 파워 본 케이투 엔 디 5000 | `a7f5272d-7099-491f-b2e8-21d5e13f44f5` | ko+zh | — | 제조사=마더스팜 |
| 12 | 아스타잔틴 루테인 600 | `3e46616f-b2ff-4788-b974-08792fd2c0f3` | ko+zh | — | 제조사=VITALTREE |
| 13 | 징코Q 마그시아 | `0a47e0bc-38d0-45ae-9e6a-15a71ff80e1d` | ko+zh | — | (tags 없음) |
| 14 | 징코Q젠시아 | `325c2ad9-4e3f-4870-84e2-e7c558e52223` | ko+zh | ko+zh | 은행잎·혈행·기억력 |
| 15 | 면역엔 이뮨 부스터 α | `fa5141ee-bec7-4314-9ad8-6d9d0ea7aaaa` | ko+zh | ko+zh | 그린프로폴리스·베타글루칸·아연·비타민A·면역·항산화 |

- 기존 SPD 상태 요약: canonical ko 22 / zh 22, candidate ko 9 / zh 6 (STORE/B2B 합산, 15 master 범위).
- 기존 STORE/B2B ko·zh SPD id 전량은 작업 스냅샷(scratchpad `hff_spdids.sql` 출력)으로 확보. 대표: 락토밸런스 STORE ko=`6620dd21-…`/zh=`9cfffd7b-…`, 징코Q젠시아 STORE ko=`1d78a4bb-…`/zh=`63550c83-…`.
- **주의(이가돌 맥스 `90e00d92`)**: LEDGER "충돌 처리(손대지 말 것) — R2 스튜디오 ko+zh 유지". 신규 초안은 별도 candidate 로만 만들며 기존 canonical 무변경(§5·§12).

---

## 2. LEDGER ↔ DB 정합 (WO §4 재확정 결과)

- WO §4 named 목록 = DB 실측 15건과 **정확히 일치**(코큐텐 액티브·헤파에이스·본케이투·알티지오메가3·로얄파워민·아스타잔틴루테인·징코Q마그시아 포함).
- `PROCESSED-LEDGER.md §처리 목록`(구형 photo 표)은 **outdated**(10건 + 일반식품 혼재만 기록). AGENT-KICKOFF §7 "DB가 진실" 원칙에 따라 **DB 실측을 대상 SSOT로 채택**.
- 일반식품(크릴오일·대마종자유·알부민PDRN 등)은 이 15건에 **미포함**(§18 준수).

---

## 3. Grounding 감사 — 15건 전부 공식 근거 DB 부재 (결정적)

WO §6 step 3(식약처 공식 품목정보 확인) + §7(grounding 필수 항목) 확인 결과:

| 축 | 실측 | 판정 |
|---|---|:--:|
| `mfds_permit_number`(품목보고번호) | **15건 전부 공백** | ✗ |
| `product_identifiers` | **15건 전부 0건** | ✗ |
| 후보(candidate) 매칭 링크 | **15건 전부 없음** | ✗ |
| 제조사(manufacturer_name) | 2건만(마더스팜·VITALTREE), 13건 공백 | 부분 |

**41,261 MFDS 후보 풀 이름 매칭 시도 (공식 grounding 회수 가능성):**

| 제품 토큰 | 후보 hit | 해석 |
|---|:--:|---|
| 본케이투 / 로얄파워민 / 이가돌맥스 / 헤파에이스 / 브레인솔루션 / 징코Q젠시아 / 징코Q마그시아 | **0** | 마케팅명 ≠ 공식 품목명 — 회수 불가 |
| 코큐텐(203) / 모어플러스·비오틴(386) / 알티지오메가3(1025) / 맨파워포텐(36) / 면역엔이뮨(23) | **수백~수천** | 일반 성분 토큰 — 특정 제품 1:1 식별 불가 |
| 락토밸런스(3) / 듀얼케어락토바이옴(6) / 아스타잔틴루테인(9) | 소수 | 유일 확정 불가(품목보고번호 없이 어느 레코드가 이 제품인지 확정 불능) |

**→ 15건 어느 것도 식약처 공식 레코드(품목보고번호·인정 기능성·함량)로 1:1 확정 불가.** AGENT-KICKOFF §8 "사진 제품↔공식 레코드 매칭 = 이름만으론 fuzzy → 보류"와 일치. 기존 `ko+zh` 콘텐츠는 사실 근거 금지(§5).

---

## 4. 판정 — 초안 제작 HOLD (grounding 선행)

WO §14(HOLD 기준: "식약처 공식 품목정보 미확인" / "기존 ProductMaster가 다른 제품일 가능성" / "기능성 원료·함량 불명") + HFF-R09 + CR-007("핵심 근거 부족 → HOLD·미작성") + 플랫폼 불변 원칙("의약품 등 소비자 콘텐츠 외부 LLM 초안 자동생성 안 함, 공식 원문 grounding")에 따라:

- **15건 전부 grounding 부족 → semantic ko+en 초안 제작 HOLD.** 추정·기존콘텐츠 재활용·유사제품 대체로 초안을 만들지 않는다(§14 "근거 부족 상태에서 추정 설명서를 만드는 것이 실패").
- §7 필수 grounding(품목보고번호·기능성 원료·1일 섭취량 함량·인정 기능성·섭취방법·주의사항) 중 **제품 특정 값(함량·품목보고번호)** 을 공식 원천으로 확정할 수 없음.
- 고시형 기능성 원료(은행잎·프로바이오틱스·루테인·밀크씨슬·코엔자임Q10·칼슘/비타민D·오메가3·프로폴리스·아스타잔틴·비오틴·쏘팔메토·마그네슘)의 **인정 기능성 문구 자체는 표준**이나, **제품별 함량·품목보고번호가 미확정**이라 제품 단위(HFF-R02) 정본을 만들 수 없다.

---

## 5. 무변경 확인

```text
코드 변경        0
DB write         0
설명서 신규 생성  0 (초안 0)
기존 ko+zh       무변경(canonical/candidate 보존)
기존 QR/landing  무변경
migration        0
deploy           0
```

- ProductMaster 신규 생성 0 · 일반식품/화장품/의약품 미포함 · 공급자 설명서 무수정.

---

## 6. Grounding 선행 방안 (다음 단계 권장)

초안 제작(Batch 0-A~C) 재개 조건 = 제품별 공식 grounding 확보. 권장 순서:

1. **제품별 식약처 공식 품목 확정** — 식품안전나라(건강기능식품 품목정보) 또는 제품 표시사항에서 **품목보고번호 + 제조사 + 인정 기능성 + 기능성 원료 함량 + 섭취방법 + 주의사항** 확보. 시판 여부 병행 확인(AGENT-KICKOFF §2 파이프라인).
2. **확정 grounding → DB 링크**(품목보고번호 태그/identifier, 승인 후 write) — 재작업·오매칭 방지.
3. **grounding 확보 제품만** semantic ko+en 초안(candidate/needs_review). 확정 불가 제품은 계속 HOLD.
4. 별도 grounding WO 권장: `WO-O4O-HFF-BATCH-0-GROUNDING-ESTABLISH-V1`(제품별 공식 품목 확정·시판 확인·DB 링크). 확보 후 본 초안 WO 재개.

- 이중게이트(HFF-R10): 초안↔canonical 분리. 승인 없이 DB write·canonical 승격·기존 canonical 교체·QR/landing 변경 금지 — 본 CHECK 범위에서 전부 미실행.

---

## 7. 완료 판정

- **대상 확정 = PASS** (15건, WO §4와 일치, 기존 콘텐츠 ID 확보).
- **초안 제작 = HOLD** (grounding 선행 필요 — 15건 전부 공식 근거 DB 부재·후보 매칭 신뢰 불가).
- 추정 작성을 피하고 규칙(HFF-R09/CR-007/§14)을 준수한 정직한 중단. 데이터 무변경.

> **다음 단계:** grounding 선행(§6) → 확보 제품부터 Batch 0-A(5건 단위) semantic ko+en 초안 → 검수 → 승인 → 별도 승격.

## 8. 커밋

- commit: 본 CHECK 문서 1개(docs 전용, path-scoped). 무관 dirty/lockfile 미포함.
- 배포: 없음(문서 전용, 코드·DB·web 무변경).
