# CHECK-O4O-HFF-DESCRIPTION-RULES-SSOT-V1

> **작업명:** 건강기능식품 설명서 규칙 전용 SSOT 신설 (소실된 general-food R1~R10 참조 대체)
> **유형:** 문서 정비 전용 — **코드 0 · DB write 0 · migration 0 · deploy 0 · 설명서 신규 생성 0**
> **결과: PASS (문서)** — 건강기능식품 설명서 작성 규칙을 건기식 전용 SSOT(HFF-R01~R10)로 새로 구성하고, 일반식품 Legacy 전환으로 끊긴 R1~R10 참조를 이 SSOT로 재지정. Active 문서 충돌 0.
> **근거 WO:** WO-O4O-HFF-DESCRIPTION-RULES-SSOT-V1 (사용자 지시, 2026-07-12)
> **기준 정책(SSOT):** `docs/guides/products/O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1.md`
> **선행:** `CHECK-O4O-STORE-DESCRIPTION-COSMETIC-WRITE-GUARD-AND-DOC-ALIGN-V1`(M1을 별도 WO로 분리) · `IR-O4O-STORE-PRODUCT-DESCRIPTION-POLICY-CODE-AND-DOC-AUDIT-V1`(J-2a, M1)
> **작성일:** 2026-07-12

---

## 1. 배경 — 끊어진 R1~R10 참조

일반식품(`general-food`)이 **Legacy / Existing Content Only**(commit `9cf88fcb9`)로 전환되며 README의 R1~R10·R6-a~e 규칙이 제거되었다. 그러나 건강기능식품 실행 문서가 이 규칙을 SSOT로 참조하고 있어 참조가 끊겼다(IR J-2a).

**끊어진 참조 위치(정비 전):**

| 파일 | 위치 | 참조 내용 |
|---|---|---|
| `health-functional-food/AGENT-KICKOFF.md` | :5 헤더 | "규칙 SSOT(R1~R10·R6-a~e)는 general-food/README.md" |
| `health-functional-food/AGENT-KICKOFF.md` | :63 §4 표 | "일반식품이면 기능성 표현 자체 금지 — general-food README" |
| `health-functional-food/AGENT-KICKOFF.md` | :43·:61·:62·:66·:67·:69·:89 | 인라인 R10 · README R1 · R6-b · R2 · R8 · R6-c 태그(소실된 general-food 규칙) |
| `health-functional-food/AGENT-KICKOFF.md` | :149 참조 | "규칙 SSOT: general-food/README.md (R1~R10)" |

---

## 2. 신규 SSOT — HFF-R01~R10

**신규 문서:** `docs/guides/products/health-functional-food/HFF-DESCRIPTION-RULES-SSOT-V1.md` (상태: Active · V1)

기존 일반식품 R1~R10을 **복사하지 않고**, 현재 확정된 O4O 매장용 상품 상세설명서 정책 기준으로 건기식 전용으로 재구성했다.

| ID | 규칙 | 근거 CR |
|---|---|---|
| HFF-R01 | 구매 지원 우선 (성분·식약처 정보 정리 아님) | CR-001 |
| HFF-R02 | 제품 단위 설명서 (제품 1건 = 설명서 1건, 성분 그룹핑 아님) | — |
| HFF-R03 | 제품 매력과 선택 이유 (why this product 필수) | CR-001 |
| HFF-R04 | 제품 신뢰 형성 (구체성으로, 근거 없는 추상어 금지) | CR-002 |
| HFF-R05 | 공식정보는 판매 근거로 활용 (인정 범위 내, 원문 복사 금지) | CR-002 |
| HFF-R06 | 적극적 표현 + 최소 제한 (금지=4단정: 미확인 사실·치료보장·전원효과단정·원료효과전이) | CR-001 · CR-003 |
| HFF-R07 | 소비자 화면 문구만 (편집 라벨·근거 메모·내부 ID 비노출) | CR-001 |
| HFF-R08 | 주의사항은 구매를 돕는 범위로 (공식 주의사항 누락 금지, 상담 연결) | CR-006 |
| HFF-R09 | 원천·grounding 5단 우선순위 (웹 단독 근거 금지, 미확인 보류) | CR-002 · CR-004 · CR-007 |
| HFF-R10 | 검수·승격·이중게이트 (초안↔canonical 분리, 승인 없이 write/QR/배포 금지) | CR-008 · CR-009 |

- 표준 설명서 구조 10단(§3), 언어 정책(§4), 샘플 지위(§5) 포함.

---

## 3. 공통 SSOT ↔ HFF 전용 규칙 경계

- **공통 규칙(CR-NNN)은 재정의하지 않는다.** 각 HFF-R은 해당 CR을 건기식 맥락으로 **구체화**하며 CR을 참조만 한다(WO §12 "공통 SSOT와 중복 정의 금지" 준수).
- 건기식 **고유**(공통 CR에 없는) 규칙 = HFF-R02(제품 단위 = 성분 그룹핑 금지, 의약품 트랙과의 차이), HFF-R05(식약처 인정 기능성 범위), HFF-R09(건기식 원천 5단 우선순위).
- 의약품 규칙(DR)·화장품 정책과 혼합하지 않음(WO §12).

---

## 4. 수정한 Active 문서

| 파일 | 변경 |
|---|---|
| `health-functional-food/HFF-DESCRIPTION-RULES-SSOT-V1.md` | **신규** — 규칙 SSOT(HFF-R01~R10) |
| `health-functional-food/README.md` | 규칙 SSOT 포인터를 HFF SSOT로 지정. §2 말미·§3 운영자료에 SSOT 링크. (규칙 본문은 SSOT에만, README는 정책 개요) |
| `health-functional-food/AGENT-KICKOFF.md` | :5·:149 규칙 SSOT를 HFF SSOT로 교체. §4 표·§5의 인라인 태그(README R1→HFF-R06, R6-b→HFF-R03, R10→HFF-R09, R2→HFF-R09, R6-c→HFF-R07, R8→모바일 가독, CTA→HFF-R08) 재지정. |
| `common/DOCUMENT-INDEX.md` | 9-d 행 추가 — HFF 규칙 SSOT 등재 |

## 5. 수정하지 않은 참조 (WO §11 — 과거 WO/IR/Legacy 미수정)

아래는 여전히 소실된 general-food R1~R10을 인용하나, history/plan/Legacy 문서라 소급 수정하지 않는다(추후 각 문서 재개 시 갱신).

| 파일 | 성격 | 조치 |
|---|---|---|
| `work-orders/WO-O4O-ADMIN-STORE-DESCRIPTION-AUTHORING-STUDIO-V1.md` | WO(미착수 계획) | 미수정. 저작 스튜디오 구현 착수 시 규칙 SSOT를 건기식=HFF SSOT로 갱신. |
| `guides/products/general-food/AGENT-KICKOFF.md:59` | Legacy 진입점(배너 有) | 미수정(Legacy, 신규 진입점 아님). |
| `investigations/IR-*` (J-2a 등) | IR(불변 역사) | 미수정. |

---

## 6. 언어 정책 정렬

- HFF SSOT §4 = **`ko + en`** 명시(한국어 정본, 영어 = 정본 기반 영어권 톤·MFDS-recognized 프레임). 숫자·함량·제품명·기능성 범위 변경 금지.
- 과거 `zh` = 신규 정본 언어 아님. 기존 `ko+zh` photo 배치는 임시 예제(정본 아님)로 명시 — PROCESSED-LEDGER 헤더·AGENT-KICKOFF §3과 일치.

## 7. 샘플·정본 구분

- 정본 예제 = `examples/byeonenjang.semantic.html`(시맨틱 `sd-*`, `<style>` 없음, 식약처 grounding).
- 사진 기반 임시 예제(photo 배치, `ko+zh`) = 문장 예시용, 정본 아님(추후 삭제 예정).
- 샘플 문구 타제품 복사 금지, 제품별 사실 재확인(HFF-R09) 명시.

## 8. 이중게이트 반영

- HFF-R10 = 초안 작성 ↔ canonical 반영 분리. 승인 없이 DB write·canonical 승격·기존 canonical 교체·대량 생성·ProductLanding 연결·QR 노출·운영 배포 금지. AGENT-KICKOFF §6(이중게이트) 및 정책 §6.1과 일치.

---

## 9. 변경 없음 확인

```text
코드 변경        0
DB write         0
migration        0
deploy           0
설명서 신규 생성  0
샘플 삭제        0
기존 canonical   무변경
```

- 일반식품 신규 제작 정책 재활성화 없음 · 화장품 제작 정책 변경 없음 · 의약품 규칙 혼합 없음.

## 10. 커밋 / 배포

- commit: (본 커밋 SHA — 아래 완료 보고)
- push: main 직접(`git commit -- <docs 경로>` 로 해당 문서만, 동시 세션 안전)
- 배포: 문서 전용이라 없음(코드·web·API 무변경).

## 11. 완료 판정

**PASS (문서).** 건강기능식품 전용 규칙 SSOT(HFF-R01~R10) 신설, 구매 지원 최우선·제품 신뢰=구매 확신 요소·과도한 제한 배제·grounding/최소 금지·제품 단위·이중게이트·언어(ko+en) 정렬. README·AGENT-KICKOFF·DOCUMENT-INDEX 연결, 끊어진 general-food R1~R10 참조를 Active 트랙 전 범위에서 HFF-R로 재지정. Active 문서 충돌 0. 코드/DB/배포/설명서 신규 생성 0.

> 남은 준비 단계: **DB 실건수 확인** + **제작 준비 완료 종합 CHECK** → PASS 시 건강기능식품 설명서 제작 본작업.
