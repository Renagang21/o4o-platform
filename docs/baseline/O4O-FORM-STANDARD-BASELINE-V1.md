# O4O Form Standard v1.0

> **Status: FROZEN (Aspirational Standard)**
> **Date: 2026-04-28**
> **WO: WO-O4O-FORM-STANDARD-BASELINE-V1**
> **Reference Implementation: `services/web-neture/src/pages/supplier/ProductDetailDrawer.tsx`**

---

## 0. Nature of this Baseline

This baseline defines the **target (aspirational) UI standard** for all detail/edit screens (forms) in the O4O platform.

**Existing forms may not comply yet** and must be aligned via separate work orders.

The reference implementation (ProductDetailDrawer) is the closest existing approximation but is itself non-compliant on four points (see §10 Compliance Gaps). The standard takes precedence over the reference. Domain-specific elements of the reference (dual edit mode, AI tag suggestion, spot pricing, etc.) are **not part of the standard** — they are domain extensions injected into the standard shell.

---

## 1. Purpose

O4O 플랫폼의 모든 상세/편집 화면 구조를 단일 표준으로 통일한다.

본 문서는 다음을 확정한다:

1. 모든 상세/편집 UI는 **Drawer**로 통일한다 (Modal / Inline Edit 금지)
2. View ↔ Edit는 **동일 Drawer 내부 토글**로 처리한다 (분리 금지)
3. Footer는 **모드 기반 조건부**로 표시한다 (View 모드는 Footer 없음)
4. 공통 Primitive(`Section`, `InfoRow`, `FormField`, `Badge`)는 `@o4o/operator-ux-core`에서 제공한다
5. 모든 신규 폼 화면은 본 표준을 준수해야 하며, 기존 화면은 별도 WO를 통해 정렬한다

---

## 2. Drawer Shell (Required)

### 2.1 구조

```tsx
<>
  <Backdrop />
  <DrawerPanel>
    <DrawerHeader />
    <DrawerBody />     {/* scrollable */}
    <DrawerFooter />   {/* 조건부 */}
  </DrawerPanel>
  <ConfirmModal />     {/* dirty check */}
</>
```

### 2.2 규격

| 항목 | 규칙 |
|------|------|
| 위치 | 화면 우측 슬라이드 |
| 너비 | 기본 `480px` (좁은 폼) / 도메인에 따라 `640px`까지 허용 |
| Backdrop | 반투명 (`bg-black/30`), 클릭 시 닫기 트리거 |
| Z-index | Drawer 50 / Backdrop 40 / ConfirmModal 60 / Sub-modal 70 |
| 트랜지션 | `transition-transform duration-300` |

### 2.3 금지

| # | 금지 | 이유 |
|---|------|------|
| F1 | Modal 기반 Form | 컨텍스트 손실, 작은 화면에서 가독성 저하 |
| F2 | Inline Edit (테이블 셀 직접 편집) | 일관성 파괴, dirty check 어려움 |
| F3 | View Drawer / Edit Drawer 분리 | 컨텍스트 단절 |
| F4 | Drawer 폭 가변 (resizable) | 일관성 파괴 |

---

## 3. Header (Required)

### 3.1 구성

```text
[좌측]
- Title (Bold, 식별 가능한 이름)
- Subtitle (optional — barcode, ID 등 부가 식별자)

[우측]
- HeaderActions (Edit 진입 버튼 0..N개)
- Close 버튼 (필수, 항상 마지막)
```

### 3.2 규칙

| 항목 | 규칙 |
|------|------|
| Edit 진입 | **Header에서만** (Footer/Body에서 금지) |
| 진입 버튼 개수 | 1개 권장. 도메인 분리 필요 시 N개 허용 (예: B2C/B2B) |
| 진입 시 동작 | `startEdit()` 함수로 폼 필드 초기화 후 모드 전환 |
| Close | 항상 우측 끝, dirty 시 confirm 트리거 |

---

## 4. Body (Required)

### 4.1 모드별 구성

| 모드 | 본문 구성 |
|------|----------|
| **View** | `Section` + `InfoRow` + `Badge` |
| **Edit** | `Section` + `FormField` (+ 도메인 컴포넌트) |
| **Approval** | View 본문 + Footer만 변경 |

### 4.2 규칙

| 항목 | 규칙 |
|------|------|
| 스크롤 | Body 영역만 `overflow-y-auto` (Header/Footer 고정) |
| 섹션 구분 | `Section` primitive 필수 사용 |
| 필드 정렬 | 세로 단일 컬럼 (멀티 컬럼 금지 — 도메인 명시 예외 시만 허용) |
| 도메인 섹션 | Slot 형태로 자유롭게 추가 가능 (단 Section/FormField primitive는 사용) |

---

## 5. Footer (Required, Conditional)

### 5.1 모드별 표시

| 모드 | Footer 표시 | 버튼 구성 |
|------|------------|----------|
| **View** | **표시 안 함** | - |
| **Edit** | 표시 | `[취소]` (좌, secondary) `[저장]` (우, primary) |
| **Approval** | 표시 | `[반려]` (좌, danger) `[승인]` (우, success) |

### 5.2 규칙

| 항목 | 규칙 |
|------|------|
| 위치 | DrawerPanel 하단 고정 (`border-t`) |
| Primary 색상 | Edit: blue / Approval-success: green |
| Secondary 색상 | slate (취소) |
| Danger 색상 | red (반려) |
| Loading | `disabled` + `"저장 중..."` / `"처리 중..."` 텍스트 |

---

## 6. Required Primitives

### 6.1 컴포넌트

| Primitive | 용도 | 모드 | 필수 prop |
|-----------|------|------|-----------|
| `Section` | 섹션 구분자 (제목 + 내용) | View / Edit | `title` |
| `InfoRow` | 라벨 + 값 한 줄 표시 | View | `label` |
| `FormField` | 라벨 + 입력 한 줄 편집 | Edit | `label` |
| `Badge` | 상태 표시 (색상 매핑) | View / Edit | `className` (색상) |

### 6.2 패키지

```text
@o4o/operator-ux-core
  ├─ Section
  ├─ InfoRow
  ├─ FormField
  └─ Badge   (이미 존재 시 통합)
```

> 참고: 인라인 또는 도메인 파일 내부에 동일 primitive를 재정의하는 것은 §11 위반.

### 6.3 FormField 표준 형태

```tsx
<FormField label="...">
  <input type="text" ... />
  {/* or <select> / <textarea> / <CategorySelect> 등 */}
</FormField>
```

내부 클래스 표준:
- 라벨: `text-sm font-medium text-slate-700 mb-1`
- 입력: `w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50`

---

## 7. Dirty Check (Required)

### 7.1 트리거

| Trigger | 동작 |
|---------|------|
| ESC 키 | dirty 시 confirm, 아니면 닫기 |
| Close 버튼 | 동상 |
| Backdrop 클릭 | 동상 |

### 7.2 Confirm Modal

```text
타이틀: "저장하지 않은 변경사항"
본문:   "저장하지 않은 변경사항이 있습니다. 닫으시겠습니까?"
좌측:   [계속 편집]   (secondary)
우측:   [변경 취소]   (danger)
```

### 7.3 Dirty 추적 방식

`useRef` 기반 (`isDirtyRef`) 권장 — re-render 루프 회피.

---

## 8. Save Flow (Required)

```text
1. validate          (필수 필드 체크)
2. setSaving(true)
3. API call
4. 성공 → onSaved() → close drawer
5. 실패 → toast.error(err.message)
6. finally → setSaving(false)
```

### 8.1 규칙

| 항목 | 규칙 |
|------|------|
| 에러 표시 | `toast.error()` (alert 금지) |
| 성공 표시 | `toast.success()` |
| Loading 중 입력 잠금 | 모든 FormField `disabled={saving}` |
| 저장 후 닫기 | 명시적 (자동 fetch refresh는 부모의 `onSaved` 콜백) |

---

## 9. Forbidden Patterns

| # | 금지 패턴 | 이유 |
|---|----------|------|
| F1 | Modal 기반 Form | §2.3 |
| F2 | Inline Edit | §2.3 |
| F3 | View/Edit Drawer 분리 | §2.3 |
| F4 | Drawer 폭 resizable | §2.3 |
| F5 | Footer를 View 모드에 표시 | §5.1 |
| F6 | Header에서 저장 버튼 | §3.2 |
| F7 | Body에 Edit 진입 버튼 | §3.2 |
| F8 | `alert()` / `confirm()` 사용 | §8.1 (toast 또는 ConfirmModal) |
| F9 | Section/InfoRow/FormField 재정의 | §6 (core primitive 사용) |
| F10 | Dirty check 없이 닫기 허용 | §7 |
| F11 | 멀티 컬럼 폼 (도메인 명시 예외 외) | §4.2 |

---

## 10. Compliance Gaps (Reference Page)

Reference Implementation `ProductDetailDrawer`는 본 표준 대비 다음 4가지가 불일치:

| # | 항목 | 현재 상태 | 표준 요구 | 후속 WO |
|---|------|----------|----------|--------|
| G1 | `alert()` 사용 (저장 실패 안내) | inline `alert()` | `toast.error()` | `WO-NETURE-PRODUCT-DRAWER-FORM-STANDARD-COMPLIANCE-V1` |
| G2 | `Section`/`InfoRow`/`Badge` 파일 내부 정의 | private | `@o4o/operator-ux-core` 추출 | 동상 |
| G3 | FormField 입력 클래스 인라인 반복 | 6+ 위치 | `FormField` primitive로 통합 | 동상 |
| G4 | Validation이 `disabled` 조건만 (인라인) | inline | 표준 validation util/hook | 동상 |

---

## 11. Domain Extensions (Out of Standard)

다음은 ProductDetailDrawer 고유의 도메인 로직이며, **본 표준의 일부가 아니다**:

| # | 도메인 항목 | 분류 |
|---|-------------|------|
| D1 | Dual edit mode (B2C / B2B) | Neture 상품 도메인 |
| D2 | Secondary edit toggle | D1의 부수 |
| D3 | AI 태그 추천 | 상품 도메인 |
| D4 | 스팟 가격 정책 sub-form | 가격 도메인 |
| D5 | KPA 2차 심사 섹션 | KPA 브리지 |
| D6 | 이미지 업로드 (thumbnail/detail/content) | 미디어 도메인 |
| D7 | Approval Footer (반려/승인) | Operator 승인 페이지 한정 (§5에서 표준 variant로 정의) |

도메인 섹션은 §4.2 규칙에 따라 Body slot에 자유롭게 주입한다. 단 그 내부에서도 **§6 primitive 사용은 의무**.

---

## 12. Application Scope

본 표준은 다음 모든 영역에 동일하게 적용:

- Operator 화면 (`/operator/*`)
- Admin 화면 (`/admin/*`)
- Supplier 화면
- Store 관리 화면
- 모든 Detail / Edit / Approval Drawer

도메인 또는 서비스 별 변형 금지. 변경 필요 시 본 베이스라인을 통해서만 (별도 WO 승인).

---

## 13. Change Policy

본 베이스라인은 **Frozen**이다.

- 버그 수정 / 명확화 / 누락된 사례 추가 → 허용
- Drawer 폭 / Footer 정책 / Primitive 위치 변경 → 명시적 WO + 본 문서 갱신 필수
- 신규 화면은 본 표준에 따라 작성

---

## 14. Related Documents

| 영역 | 문서 |
|------|------|
| **O4O Table Standard** | `docs/baseline/O4O-TABLE-STANDARD-BASELINE-V1.md` |
| Operator Dashboard 표준 | `docs/platform/operator/OPERATOR-DASHBOARD-STANDARD-V1.md` |
| HUB Template Standard | `docs/platform/hub/O4O-HUB-TEMPLATE-STANDARD-V1.md` |
| Design Core Governance | `docs/rules/design-core-governance.md` |
| Operator OS Baseline | `docs/baseline/BASELINE-OPERATOR-OS-V1.md` |
| KPA UX Baseline | `docs/baseline/KPA_UX_BASELINE_V1.md` |

---

*Updated: 2026-04-28*
*Version: 1.0*
*Status: Frozen — Aspirational Standard*
