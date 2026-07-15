# CHECK-O4O-HFF-DESCRIPTION-PRODUCTION-READINESS-FINAL-CHECK-V1

> **작업명:** 건강기능식품(HFF) 설명서 제작 준비 완료 종합 CHECK
> **유형:** 준비 상태 선언 전용 — **코드 0 · DB write 0 · migration 0 · deploy 0 · 설명서 신규 생성 0**
> **결과: PASS (준비 완료 선언)** — 아래 준비 항목 전체 PASS. Batch 0 본작업 착수 가능.
> **근거 WO:** WO-O4O-HFF-DESCRIPTION-PRODUCTION-READINESS-FINAL-CHECK-V1 (사용자 지시, 2026-07-15)
> **기준 정책(SSOT):** [`docs/guides/products/O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1.md`](../guides/products/O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1.md)
> **규칙 SSOT:** [`docs/guides/products/health-functional-food/HFF-DESCRIPTION-RULES-SSOT-V1.md`](../guides/products/health-functional-food/HFF-DESCRIPTION-RULES-SSOT-V1.md) (HFF-R01~R10)
> **작성일:** 2026-07-15

---

## 1. 준비 작업 전체 PASS 여부

건강기능식품 설명서 본작업(Batch 0) 착수 전 준비 항목 전수 판정.

| # | 준비 항목 | 판정 | 근거 산출물 |
|---|---|:--:|---|
| 1 | 정책 SSOT | **PASS** | `O4O-STORE-PRODUCT-DESCRIPTION-POLICY-V1` (매장용 상품 상세설명서 정책 확정) |
| 2 | HFF 규칙 SSOT | **PASS** | [`CHECK-O4O-HFF-DESCRIPTION-RULES-SSOT-V1`](CHECK-O4O-HFF-DESCRIPTION-RULES-SSOT-V1.md) — HFF-R01~R10 신설, 끊긴 general-food R1~R10 참조 재지정, Active 충돌 0 |
| 3 | 로그인 전용 열람 | **PASS** | 매장용 STORE 설명서 열람은 인증 게이트 통과 매장만(공개 노출 아님) |
| 4 | 공급자 제작원 | **PASS** | [`CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-PROVIDER-QUOTA-ALTERNATIVE-V1`](CHECK-O4O-HEALTH-FUNCTIONAL-FOOD-STORE-DESCRIPTION-PROVIDER-QUOTA-ALTERNATIVE-V1.md) |
| 5 | 화장품 write 가드 | **PASS** | `CHECK-O4O-STORE-DESCRIPTION-COSMETIC-WRITE-GUARD-AND-DOC-ALIGN-V1` — 화장품 비-supplier canonical 생성/승격 차단(2중 방어) |
| 6 | 일반식품 Legacy 보존 | **PASS** | general-food = Legacy / Existing Content Only(commit `9cf88fcb9`). 신규 제작 재활성화 없음 |
| 7 | 손상 HFF 데이터 정리 | **PASS** | [`…-BROKEN-REGULATORY-TYPE-NORMALIZE-V1`](CHECK-O4O-HFF-BROKEN-REGULATORY-TYPE-NORMALIZE-V1.md)(정규화) + [`…-CORRUPTED-PRODUCTMASTER-GUARDED-DELETE-V1`](CHECK-O4O-HFF-CORRUPTED-PRODUCTMASTER-GUARDED-DELETE-V1.md)(손상 5건 guarded delete, 스냅샷 백업) |
| 8 | HFF master 모수 | **30 clean** | 손상 5건 삭제 후 30건(건강기능식품 리터럴), **name 손상 0 = 완전 clean** |
| 9 | canonical 중복 | **0** | (master, description_type, 언어) 당 canonical 1개 partial-unique 만족, 중복 0 |

**종합 판정: 준비 완료 = PASS.** 위 9개 축 전부 통과. 아래 §8 열린 항목 3건은 **본작업 차단 사유 아님**(후속 관리 항목).

### 데이터 모수 스냅샷 (프로덕션 실측 근거)

```text
HFF candidate (product_candidates, MFDS_HEALTH_FUNCTIONAL_FOOD, live) = 41,261건
  - 전량 candidate_status=pending / match_status=unmatched (미승격·미매칭)
  - STTEMNT_NO distinct = 41,261 (1:1, 중복 0), SKU/barcode 승격 흔적 0
  - raw_payload.source.* 원문 무손실 보존(핵심 필드 96~100% 커버리지)
HFF ProductMaster (건강기능식품) = 30건 clean (name 손상 0)
HFF canonical 중복 = 0
```
> 근거: [`CHECK-O4O-HFF-O4O-DB-CURRENT-STATE-SQL-VERIFY-V1`](CHECK-O4O-HFF-O4O-DB-CURRENT-STATE-SQL-VERIFY-V1.md)(41,261 실측) + 손상 정리 2건(30 clean).

---

## 2. Batch 0 대상 = 15건

- **Batch 0 = 구형 photo 배치 `ko+zh` 임시 예제 15건 → semantic `ko+en` 정본으로 재작성.**
- 30 clean HFF master 중, 과거 사진 기반 임시 예제(photo 배치, `ko+zh`) 콘텐츠를 가진 15건이 대상.
- 손상 정리로 삭제된 마스터(맨파워포텐 `0b5502e5`, 변엔장 `38a9d3e4` 등 5건)는 **Batch 0 제외**.
- 정본 예제 기준 = [`examples/byeonenjang.semantic.html`](../guides/products/health-functional-food/examples/byeonenjang.semantic.html)(시맨틱 `sd-*`, `<style>` 없음, 식약처 grounding).

---

## 3. 기존 `ko+zh` = Legacy 보존

- 과거 `ko+zh` photo 배치는 **임시 예제(정본 아님)** 로, Legacy 로 **보존**한다(소급 삭제·자동 전환 없음).
- `zh` 는 **신규 정본 언어가 아니다**(HFF SSOT §4·§6·§7). Batch 0 는 기존 `ko+zh` 를 덮어쓰지 않고 신규 정본을 별도로 제작한다.
- 사진 기반 임시 예제는 추후 삭제 예정이나, 이번 준비/Batch 0 범위에서 삭제하지 않는다.

---

## 4. 신규 정본 = semantic `ko+en`

- 신규 정본 언어 = **`ko + en`**(한국어 정본 + 정본 기반 영어권 톤·MFDS-recognized 프레임).
- 숫자·함량·제품명·기능성 범위는 언어 간 변경 금지.
- 형식 = semantic HTML(`sd-*` 클래스, 인라인 `<style>` 없음). photo 배치 아님.

---

## 5. 41,261 후보 취급 규칙 (본작업 실행 규칙)

- 41,261 HFF 후보는 **전량 pending/unmatched**. **일괄 master 생성·설명서 제작 금지.**
- 각 제품은 **①시판(유통) 확인 + ②grounding(식약처 공식 원천) 확보** 후에만 ProductMaster 생성 → 설명서 제작.
- STTEMNT_NO 는 매칭 축이며 **SKU/barcode 로 승격하지 않는다**(`SKU_IDENTIFIER_MISSING` 플래그 유지).
- 후보 열람(listable) 자체는 read-only 허용(admin sourceLabel 필터 기존 존재). 열람 ≠ 승격.

---

## 6. 근거 부족 제품 = HOLD

- **근거(grounding·시판·정체성) 부족 제품은 설명서를 제작하지 않고 HOLD**(CR-007 / HFF-R09).
- 유사·다른 제품 콘텐츠로 대체 금지. 보수적 추정 설명서 금지.
- 3구분 원칙: 근거 충분 → 작성 / 보완 가능 → 조사 후 재판정 / 핵심 부족 → **HOLD·미작성**.
- 예: 손상 정리에서 `0b5502e5`(설명서 0·분류 근거 부족) = HOLD 처리한 선례.

---

## 7. DB write / canonical 승격 = 이중게이트 후

- 설명서 초안 작성 ↔ canonical 반영은 **분리**(HFF-R10).
- 승인 없이 다음 금지: DB write · canonical 승격 · 기존 canonical 교체 · 대량 생성 · ProductLanding 연결 · QR 노출 · 운영 배포.
- DB write 와 canonical 승격은 **이중게이트(초안 검토 → 명시 승인)** 통과 후에만 실행.

---

## 8. 열린 항목 3건 — 본작업 차단 사유 아님 (후속 관리)

| # | 열린 항목 | 성격 | 판단 |
|---|---|---|---|
| 1 | **E2E 테스트 master 1건** (`6f6f7be8`, regulatory_type=GENERAL, name=`[E2E_TEST] Neture B2B…` U+FFFD) | HFF 아님 | HFF 모수와 무관 → **별도 E2E 테스트 데이터 정리 트랙**. Batch 0 비차단 |
| 2 | **등록 경로 인코딩 버그** (Phase D 바코드리스 admin 등록, CP949→UTF8 mis-decode) | 재발 방지 | **재발 시 원인 조사**. 현재 HFF 30건 모수는 **clean**(손상 0) → Batch 0 비차단 |
| 3 | **41,261 후보 listable / 시판 확인 정책** | 실행 규칙 | 본작업 실행 규칙(§5)으로 **확정**. Batch 0(기존 30 clean 대상)와 독립 → 비차단 |

- 3건 모두 Batch 0(30 clean 중 photo 15건 재작성) 착수를 막지 않는다.

---

## 9. 변경 없음 확인

```text
코드 변경        0
DB write         0
migration        0
deploy           0
설명서 신규 생성  0
기존 canonical   무변경
ko+zh Legacy     보존(삭제·전환 0)
```

- 일반식품 신규 제작 재활성화 없음 · 화장품 제작 정책 변경 없음 · 의약품 규칙 혼합 없음.

---

## 10. 완료 판정 및 다음 단계

**PASS (준비 완료 선언).** 준비 9축 전부 통과, HFF master 30 clean / canonical 중복 0. Batch 0(구형 photo `ko+zh` 15건 → semantic `ko+en`) 착수 조건 충족. 41,261 후보는 시판 확인 + grounding 후에만 master 생성·설명서 제작, 근거 부족 HOLD, DB write·canonical 승격은 이중게이트 후. 열린 항목 3건은 후속 관리(비차단).

> **다음 단계: 준비 단계 종료 → 본작업 `WO-O4O-HFF-DESCRIPTION-BATCH-0-…-V1`(구형 photo 15건 semantic ko+en 제작) 작업요청서로 진행.**

## 11. 커밋

- commit: 본 CHECK 문서 1개(docs 전용, path-scoped). 무관 dirty/lockfile 미포함.
- 배포: 문서 전용이라 없음(코드·web·API·DB 무변경).
