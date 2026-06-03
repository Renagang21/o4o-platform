# IR-O4O-HUBPRODUCER-POLICY-ALIGNMENT-AUDIT-V1

> **조사 요청서 (Investigation Result)**
>
> 코드 수정 없음 / 정책 수정 없음 / UI 수정 없음 / Freeze 변경 없음
>
> 본 문서는 [`O4O-3-ROLE-FLOW-BASELINE-V1`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) §6.1 의 명시적 후속 — `HubProducer='supplier'` 가 의도된 정책인가 / 제한적 예외인가 / Drift 인가 — 를 판정하기 위한 조사이다.

- **작성일:** 2026-05-23
- **분류:** Investigation Result (Read Only)
- **선행:**
  - [`O4O-BUSINESS-PHILOSOPHY-V1`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) §3.1, §5
  - [`O4O-3-ROLE-FLOW-BASELINE-V1`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) §3, §6.1
  - [IR-NETURE-PHILOSOPHY-ALIGNMENT-AUDIT-V1](IR-NETURE-PHILOSOPHY-ALIGNMENT-AUDIT-V1.md) Finding F9
- **상태:** Read-Only IR / 결정 대기

---

## 0. 조사 목적

다음 충돌의 본질을 확정한다.

**정책 측 정의:**

```text
PLATFORM-CONTENT-POLICY-V1 §3.1
HubProducer = 'operator' | 'supplier' | 'community' | 'store'
```

**철학·흐름 측 정의:**

```text
O4O-3-ROLE-FLOW-BASELINE-V1 §6.1 (금지 흐름)
Supplier
   ↓
HUB 직접 배포 (Operator 가공 없음)
```

`HubProducer='supplier'` 가:

- (a) Intentional — 의도된 정책
- (b) Exception — 제한적 예외만 허용
- (c) Drift — 정책 의도 없이 코드만 잔존

중 어느 것인지 판정한다.

---

## 1. 실제 경로 — 단계별 추적

### 1.1 Supplier 작성

| 항목 | 값 |
|------|----|
| Entry API | `POST /api/v1/cms/supplier/contents` |
| 구현 | [`apps/api-server/src/routes/kpa/services/supplier-content.service.ts:65-75`](../../apps/api-server/src/routes/kpa/services/supplier-content.service.ts) |
| 강제 필드 | `authorRole='supplier'` (서버 강제) / `status='pending'` (서버 강제) / `visibilityScope='service'` (서버 강제) |
| Supplier 자유도 | title / body / category 등 콘텐츠 본문 |

**관찰:** `visibilityScope='service'` 가 서버 측에서 강제됨. `'platform'` 으로 승격될 경로 없음.

---

### 1.2 Operator 검수 (Approval Gate)

| 항목 | 값 |
|------|----|
| Entry API | `hub_content_submission` 승인 처리 |
| 구현 | [`apps/api-server/src/routes/kpa/services/content-approval.service.ts:111-175`](../../apps/api-server/src/routes/kpa/services/content-approval.service.ts) |
| 전환 권한 | `pending → published` 만 Operator 권한 |
| 가공 가능 여부 | **불가능** — 승인/반려만 가능, 본문 편집 API 없음 |
| 승인 시 동작 | `UPDATE cms_contents SET status='published'` ([L303](../../apps/api-server/src/routes/kpa/services/content-approval.service.ts)) — `visibilityScope` 유지 (`'service'`) |

**관찰:** 게이트는 강제되나, 가공은 강제되지 않는다.

---

### 1.3 HUB 노출

| 항목 | 값 |
|------|----|
| Query 구현 | [`apps/api-server/src/modules/hub-content/hub-content.service.ts:160-202`](../../apps/api-server/src/modules/hub-content/hub-content.service.ts) |
| 노출 조건 | `status='published' AND visibilityScope IN ('platform', 'service')` |
| Producer 매핑 | [`PLATFORM-CONTENT-POLICY-V1 §3.2`](../baseline/PLATFORM-CONTENT-POLICY-V1.md) — `authorRole='supplier'` ↔ `HubProducer='supplier'` |

**관찰:** `visibilityScope='service'` 인 Supplier 콘텐츠는 HUB 에 노출된다. 서비스 범위는 격리되나 HUB 표면에는 등장한다.

---

### 1.4 Enum 정의 위치

| 항목 | 값 |
|------|----|
| 타입 정의 | [`packages/types/src/hub-content.ts:17`](../../packages/types/src/hub-content.ts) — `type HubProducer = 'operator' \| 'supplier' \| 'community' \| 'store'` |
| 정책 문서 | [`PLATFORM-CONTENT-POLICY-V1 §3`](../baseline/PLATFORM-CONTENT-POLICY-V1.md) |
| Stable 선언 | [`CONTENT-STABLE-DECLARATION-V1`](../baseline/CONTENT-STABLE-DECLARATION-V1.md) — 변경 시 WO 필요 |

---

## 2. 핵심 발견

### 2.1 실제 흐름은 "절반 가공 / 게이트 있음"

```text
Supplier 작성
   │  authorRole='supplier' (강제)
   │  status='pending'     (강제)
   │  visibilityScope='service' (강제 — platform 불가)
   ↓
Operator 검수  ← 게이트 강제 / 가공 불가능
   │  pending → published
   ↓
HUB 노출
   │  visibilityScope ∈ ('platform', 'service')
   │  HubProducer='supplier' (그대로 노출)
   ↓
Store
```

이 흐름은:

- **3-ROLE-FLOW §6.1 의 "Operator 가공 없음" 우회와 정확히 일치하지 않는다** — 검수 게이트는 있다.
- **3-ROLE-FLOW §3 의 "Operator 가공 단계" 와도 일치하지 않는다** — 가공은 없다.

즉, 현재 구현은 **검수만 있고 가공은 없는 중간 상태**.

---

### 2.2 visibilityScope 강제는 "예외 신호"

`visibilityScope='service'` 가 서버 측에서 강제되고 `'platform'` 으로 승격될 경로가 없다는 점은:

- Supplier 콘텐츠가 HUB 에 등장하더라도 **서비스 경계 안에서만** 등장한다
- 플랫폼 전체에 직접 노출되지 않는다

이는 의도된 **격리 정책** 의 신호로 해석할 수 있다 — 완전한 우회가 아니라 "제한된 영역 안의 직접 배포".

---

### 2.3 Stable 선언은 "Drift 아님" 신호

[`CONTENT-STABLE-DECLARATION-V1`](../baseline/CONTENT-STABLE-DECLARATION-V1.md) 가 `HubProducer` enum 을 명시적 보호 대상으로 분류하고 있다. 의도 없는 코드 잔존(Drift) 이라면 Stable 보호 대상에 포함되지 않았을 가능성이 높다.

---

### 2.4 그러나 사업 철학과는 명백히 충돌

| 항목 | 사업 철학 / 3-ROLE-FLOW | 현재 구현 |
|------|------------------------|----------|
| Supplier 의 콘텐츠 생산 책임 | "공급자는 콘텐츠 생산자가 아니다" ([`IR-NETURE-STRUCTURE-FREEZE-V1 §2`](IR-NETURE-STRUCTURE-FREEZE-V1.md)) | Supplier 가 CMS 콘텐츠를 직접 작성 |
| Operator 의 가공 단계 | [`3-ROLE-FLOW §3`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) — "Operator 가공 + 검수 필수" | Operator 검수만, 가공 불가 |
| HUB 의 책임 주체 | [`PHILOSOPHY-V1 §5`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) — "운영사업자가 매장 실행 자산을 생산" | Supplier 콘텐츠도 동등한 Producer 로 노출 |

---

## 3. 판정 후보 — 근거 정리

### (a) Intentional — 의도된 정책

**근거:**

- [`PLATFORM-CONTENT-POLICY-V1 §3.2`](../baseline/PLATFORM-CONTENT-POLICY-V1.md) 의 명시적 매핑 (supplier authorRole ↔ HubProducer)
- [`CONTENT-STABLE-DECLARATION-V1`](../baseline/CONTENT-STABLE-DECLARATION-V1.md) 의 Stable 보호 대상
- visibilityScope='service' 강제로 영향 범위 제한
- Operator 검수 게이트 존재

**반박:**

- 사업 철학 [`PHILOSOPHY-V1 §3.1`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) 과 정면 충돌
- 3-ROLE-FLOW §6.1 에서 "별도 검증 필요" 로 명시 — 의도가 확정되지 않았다는 자체 표시
- "Operator 가공" 이 빠진 흐름이 의도된 것인지 명시된 곳 없음

---

### (b) Exception — 제한적 예외만 허용

**근거:**

- `visibilityScope='service'` 강제 — Supplier 콘텐츠가 **서비스 경계 내에서만** 직접 등장
- Operator 검수 게이트 강제 — 완전한 우회는 아님
- Stable 선언으로 보호 대상 — 의도 없는 잔존은 아님

**반박:**

- 카테고리 분리 정책 (광고/공지 vs 실행 자산) 이 코드/문서 어디에도 명시되지 않음
- "예외" 라는 표현이 정책 문서에 없음 — 일반 흐름으로 다뤄지고 있음

---

### (c) Drift — 정책 의도 없이 코드 잔존

**근거:**

- 3-ROLE-FLOW §6.1 / 8.1 에서 검증 후속 작업으로 명시 — 의도 미확정
- IR-NETURE-PHILOSOPHY-ALIGNMENT-AUDIT-V1 Finding F9 에서 Drift 의심 지적
- IR-NETURE-STRUCTURE-FREEZE-V1 §2 "공급자는 콘텐츠 생산자가 아니다" 선언과 정면 충돌

**반박:**

- Stable 보호 대상이라는 사실은 Drift 가설을 약하게 만든다
- visibilityScope 강제·Operator 게이트 등 "의도된 제약" 의 흔적이 있음

---

## 4. 판정

| 후보 | 강도 |
|------|------|
| (a) Intentional | 중 |
| **(b) Exception** | **강** |
| (c) Drift | 약 |

**가장 강한 후보는 (b) Exception** — 그러나 코드/정책 어디에도 "예외" 라는 명시가 없는 **암묵적 예외** 이다.

**현재 상태의 본질:**

> 정책 측은 의도된 설계 (HubProducer enum 정의 + Stable 보호 + visibilityScope 강제 + Operator 게이트) 를 가지고 있으나,
> 사업 철학 측은 이 흐름을 명시적으로 인정한 적이 없다.
>
> 즉 **"정책은 있고 철학적 정렬은 없는 상태"** — 묵시적 예외.

---

## 5. 결정이 필요한 사항

이 IR 은 판정을 종결하지 않는다. 다음 세 가지 방향 중 사용자 결정 필요.

### Option X — 3-ROLE-FLOW 를 완화

**내용:** 3-ROLE-FLOW §3 의 "Operator 가공 단계" 를 "Operator 가공 또는 검수" 로 완화. §6.1 의 금지 흐름에서 "visibilityScope='service' + Operator 검수 통과" 경로를 권장 흐름으로 인정.

**효과:**

- 현재 코드와 정렬됨 (수정 없음)
- 3-ROLE-FLOW 의 엄격성이 낮아짐
- "공급자 광고·공지" 같은 콘텐츠가 Supplier 직접 노출 가능 (현실적)

**비용:**

- 사업 철학의 "공급자는 콘텐츠 생산자가 아니다" 와의 거리 유지

---

### Option Y — 구현을 강화

**내용:** Operator 검수만으로는 부족하고, Operator 가공 단계를 강제. Supplier 가 CMS 에 직접 작성한 콘텐츠는 HubProducer='operator' 로 변환되거나, Operator 가 보완·재게시한 경우에만 HUB 노출.

**효과:**

- 사업 철학과 일치
- HubProducer='supplier' 의 의미가 축소됨 (사실상 미사용 또는 카테고리 한정)

**비용:**

- 코드 변경 규모 큼 (CMS Supplier API · Approval Service · HUB Query 수정)
- Stable 선언 변경 필요 (별도 WO)
- Supplier UX 변경 필요

---

### Option Z — 카테고리 분리 (Hybrid)

**내용:** "공급자 광고/공지/브랜드 자료" 는 Supplier 직접 producer 허용, "POP / QR / 블로그 / 상품 상세 설명 / 사이니지 실행 콘텐츠" 는 Operator 가공 필수. 콘텐츠 카테고리에 producer 정책 분기 도입.

**효과:**

- 현실 흐름과 사업 철학을 모두 수용
- visibilityScope 외에 **콘텐츠 카테고리** 라는 분리 축을 추가
- "암묵적 예외" 를 "명시적 예외" 로 승격

**비용:**

- 카테고리 분류 체계 신설 필요
- PLATFORM-CONTENT-POLICY-V1 갱신 (Stable 변경 WO)
- 3-ROLE-FLOW §6.1 의 금지 흐름 표현 정밀화

---

## 6. 권장

**Option Z (Hybrid)** 가 현실 흐름과 사업 철학을 동시에 충족하는 데 가장 유리하다.

근거:

- 현재 코드의 `visibilityScope='service'` 강제 + Operator 검수 게이트는 이미 "암묵적 예외" 의 구조 — 이를 카테고리 축으로 명시화하면 됨
- Option X 는 사업 철학과의 거리를 유지, Option Y 는 코드 변경 부담
- Option Z 는 [`O4O-3-ROLE-FLOW §4`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) "원천 자료 vs 실행 자산" 분류를 그대로 사용 가능
  - 원천 자료 카테고리 (브랜드 자료 / 광고 / 공지) → Supplier 직접 producer 허용
  - 실행 자산 카테고리 (POP / QR / 블로그 / 상품 상세 설명 / 사이니지 실행) → Operator 가공 필수

---

## 7. 후속 작업 (실행은 별도 WO)

본 IR 은 read-only. 사용자 결정 후 다음 작업이 자연스럽다.

### Option Z 선택 시

1. **`IR-O4O-HUBPRODUCER-CATEGORY-SPLIT-DESIGN-V1`** — 카테고리 분리 체계 설계
2. **`WO-O4O-PLATFORM-CONTENT-POLICY-CATEGORY-AXIS-V1`** — PLATFORM-CONTENT-POLICY-V1 갱신 (Stable 변경)
3. **`WO-O4O-3-ROLE-FLOW-V1-CATEGORY-CLARIFICATION-V1`** — 3-ROLE-FLOW §6.1 표현 정밀화
4. **`WO-O4O-CMS-SUPPLIER-CONTENTS-CATEGORY-GUARD-V1`** — API 측 카테고리 가드 추가

### Option X 또는 Y 선택 시

각각의 갱신 WO 필요. 본 IR §5 참조.

---

## 부록 A. 조사 근거 인용 (대표)

| 항목 | 위치 |
|------|------|
| HubProducer enum 정의 | [`packages/types/src/hub-content.ts:17`](../../packages/types/src/hub-content.ts) |
| Supplier 작성 API | [`apps/api-server/src/routes/kpa/services/supplier-content.service.ts:65-75`](../../apps/api-server/src/routes/kpa/services/supplier-content.service.ts) |
| Operator 검수 로직 | [`apps/api-server/src/routes/kpa/services/content-approval.service.ts:111-175`](../../apps/api-server/src/routes/kpa/services/content-approval.service.ts) |
| HUB Query | [`apps/api-server/src/modules/hub-content/hub-content.service.ts:160-202`](../../apps/api-server/src/modules/hub-content/hub-content.service.ts) |
| 정책 매핑 (Producer ↔ authorRole) | [`PLATFORM-CONTENT-POLICY-V1 §3.2`](../baseline/PLATFORM-CONTENT-POLICY-V1.md) |
| Stable 보호 선언 | [`CONTENT-STABLE-DECLARATION-V1`](../baseline/CONTENT-STABLE-DECLARATION-V1.md) |
| "공급자는 콘텐츠 생산자가 아니다" | [`IR-NETURE-STRUCTURE-FREEZE-V1 §2`](IR-NETURE-STRUCTURE-FREEZE-V1.md) |
| 3-ROLE-FLOW 금지 흐름 명시 | [`O4O-3-ROLE-FLOW-BASELINE-V1 §6.1`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) |
| IR-PHILOSOPHY F9 (Drift 의심) | [`IR-NETURE-PHILOSOPHY-ALIGNMENT-AUDIT-V1 §2.4.3`](IR-NETURE-PHILOSOPHY-ALIGNMENT-AUDIT-V1.md) |

---

**작성:** Claude Code (조사)
**상태:** Read-Only IR / Option X·Y·Z 결정 대기
