# WO-O4O-NETURE-COMPETITIVENESS-PAGE-NEW-V1

> **목적:** Neture O4O 소개 흐름에서 `/o4o` 개요 다음 단계로, **"O4O를 통해 내 사업에서 무엇이 좋아지는가"** 를 설명하는 신규 페이지 `/o4o/competitiveness` 를 만든다.
>
> 본 WO 는 [CHECK-O4O-NETURE-BUSINESS-COMPETITIVENESS-STRUCTURE-V1](../investigations/CHECK-O4O-NETURE-BUSINESS-COMPETITIVENESS-STRUCTURE-V1.md) 의 권장 갈래 A를 그대로 실행한다.

- **작성일:** 2026-05-23
- **분류:** Work Order (Implementation Ready)
- **선행:**
  - [CHECK-O4O-NETURE-BUSINESS-COMPETITIVENESS-STRUCTURE-V1](../investigations/CHECK-O4O-NETURE-BUSINESS-COMPETITIVENESS-STRUCTURE-V1.md) — 5 축 / 표현 / 매트릭스 / 흐름 확정
  - [WO-O4O-NETURE-OVERVIEW-BODY-REWRITE-V1](WO-O4O-NETURE-OVERVIEW-BODY-REWRITE-V1.md) — `/o4o` 메인 재구성 (선행 또는 병행)
  - [IR-O4O-NETURE-BUSINESS-COMPETITIVENESS-STRUCTURE-V1](../investigations/IR-O4O-NETURE-BUSINESS-COMPETITIVENESS-STRUCTURE-V1.md)

---

## 0. 작업 원칙 (CLAUDE.md 준수)

- **CLAUDE.md §1** — main 직접 작업, 작업 전 `git pull origin main` 필수
- **작업 범위 외 수정 금지** — 본 WO 명시 파일만 수정
- **기존 디자인 시스템 유지** — Design Core 정책 유지, 독자 디자인 금지
- **기존 자산 최대 활용** — O4OMainPage 의 카드/그리드/아이콘 패턴 재사용 권장
- **호칭 일관성** — 본문 전체에서 **"소규모 사업자"** 사용
- **내부 용어 단독 노출 금지** — Event Offer / Market Trial / Operator / Store Execution / HUB 등은 사업자 언어로 변환하여 노출 (§3.4 매핑 참조)
- **구현 판단 자율** — 본 WO 는 *구조와 메시지*를 정의. 시각 표현·내부 컴포넌트 구성은 구현자 판단
- **smoke test 후 결과 보고**

---

## 1. 작업 범위

### 1.1 신규 페이지

- [services/web-neture/src/pages/o4o/O4OCompetitivenessPage.tsx](../../services/web-neture/src/pages/o4o/) — 신규 작성

### 1.2 라우트 추가

- [services/web-neture/src/App.tsx](../../services/web-neture/src/App.tsx) — `/o4o/competitiveness` 라우트 + lazy import

### 1.3 `/o4o` 메인 진입 추가

- [services/web-neture/src/pages/o4o/O4OMainPage.tsx](../../services/web-neture/src/pages/o4o/O4OMainPage.tsx) — "다음 단계" 영역에 경쟁력 페이지 진입 카드/링크 추가

### 1.4 범위 외 (별도 WO)

- 5 축 상세 페이지 (`/o4o/competitiveness/{purchase|product|store|operation|growth}`) — 자리만 표시, 활성화는 후속 WO
- 사업자 유형별 Landing
- 사례·증거 자료
- 디자인 시스템 변경
- 매출/KPI 환산 모델

---

## 2. 페이지 핵심 구조

```text
┌─ Hero ───────────────────────────────────────────────┐
│  O4O가 만드는 소규모 사업자의 새 경쟁력                │
│  O4O는 다섯 가지 축에서 경쟁력을 만듭니다.            │
│  구매 · 상품 · 매장 · 운영·데이터 · 성장.             │
└──────────────────────────────────────────────────────┘
        ↓
┌─ 5 경쟁력 축 카드 (그리드) ──────────────────────────┐
│  [1] 구매   [2] 상품   [3] 매장                       │
│  [4] 운영·데이터       [5] 성장                       │
└──────────────────────────────────────────────────────┘
        ↓
┌─ 각 축 상세 (Pain → Gain → O4O 활용) ────────────────┐
│  5 축 × 3-단 = 5 상세 박스                            │
└──────────────────────────────────────────────────────┘
        ↓
┌─ 다음 단계 ──────────────────────────────────────────┐
│  "내 사업에서 어떻게 활용할 수 있을까요?"              │
│  CTA: 내 사업에 적용해 보기 → /o4o/apply              │
└──────────────────────────────────────────────────────┘
```

---

## 3. 섹션별 작업 명세

### 3.1 Hero

**제목**

> O4O가 만드는 소규모 사업자의 새 경쟁력

**부제 (1~2 줄)**

> O4O는 다섯 가지 축에서 경쟁력을 만듭니다.
>
> 구매 · 상품 · 매장 · 운영·데이터 · 성장.

> 길이·줄바꿈은 구현자 조정 가능. 핵심: *5 축* 을 Hero 에서 미리 노출.

---

### 3.2 5 축 카드 (그리드)

5 카드. 각 카드:

| 항목 | 내용 |
|------|------|
| 카드 제목 | (축 이름) |
| 카드 한 줄 | (한 줄 가치 정의) |
| 카드 행동 | 같은 페이지의 §3.3 상세 박스로 스크롤 (또는 anchor) |

**5 카드 데이터**

| # | 카드 제목 | 한 줄 가치 |
|---|---------|----------|
| 1 | **구매 경쟁력** | 함께 사고, 더 좋은 조건으로 받습니다 |
| 2 | **상품 경쟁력** | 차별화된 상품·자체 상품을 만들 수 있습니다 |
| 3 | **매장 경쟁력** | 매장 자체가 더 강한 경험·설명 공간이 됩니다 |
| 4 | **운영·데이터 경쟁력** | 데이터와 AI로 더 똑똑하게 운영합니다 |
| 5 | **성장 경쟁력** | 혼자가 아닌 함께 성장합니다 |

> 카드 형태(아이콘·그리드 컬럼 수·hover)는 구현자 판단. O4OMainPage 의 기존 카드 패턴 재활용 권장.

---

### 3.3 5 축 상세 박스 (Pain → Gain → O4O 활용)

5 축 모두 동일 3-단 구조. 시각/리듬 일관성 필수.

```text
[Pain]  지금까지의 한계 (1 문장)
   ↓
[Gain]  좋아지는 것 (2~3 문장)
   ↓
[O4O 활용]  어떻게 만드는가 — 사업자 언어로 변환된 O4O 기능
```

#### 3.3.1 구매 경쟁력

| 단 | 내용 |
|----|------|
| Pain | 혼자서는 단가 협상이 어렵고, 좋은 조건을 받기 힘듭니다. |
| Gain | 같은 업종 사업자들과 함께 구매해서 비용을 낮춥니다. 단독으로 어려운 협상도 가능해지고, 안정적인 공급망을 확보합니다. |
| O4O 활용 | 공동 구매 · 특가 행사 · 공급 통합 (Event Offer 기반) |

#### 3.3.2 상품 경쟁력

| 단 | 내용 |
|----|------|
| Pain | 좋은 제품만 갖다 놓는 것으로는 차별화가 어렵습니다. |
| Gain | 우리 매장만의 상품을 만들 수 있습니다. 작게 시장에 검증한 뒤 확장할 수 있고, 자체 브랜드(PB)와 제조사 공동 개발의 가능성이 열립니다. |
| O4O 활용 | 신제품 시장 검증 · PB / 자체 브랜드 · 공동 개발 (Market Trial 기반) |

#### 3.3.3 매장 경쟁력

| 단 | 내용 |
|----|------|
| Pain | 고객은 더 많은 설명을 원하지만, 매장에서 일일이 응대하기 어렵습니다. |
| Gain | 설명 없이도 고객이 이해하는 매장이 됩니다. 콘텐츠와 AI로 신뢰를 쌓고, 다른 매장의 경험을 콘텐츠로 활용해 체류와 재방문이 늘어납니다. |
| O4O 활용 | 콘텐츠 · QR · POP · 디지털 사이니지 · 키오스크 · LMS · AI 설명 지원 |

#### 3.3.4 운영·데이터 경쟁력

| 단 | 내용 |
|----|------|
| Pain | 흩어진 정보로는 의사결정이 어렵고, 반복 업무는 시간을 잡아먹습니다. |
| Gain | 데이터로 더 똑똑하게 운영합니다. 경험을 자산으로 만들고, AI가 반복 업무를 줄여줍니다. 다른 매장의 운영 노하우도 활용할 수 있습니다. |
| O4O 활용 | AI 활용 · 데이터 · 경험 공유 · 콘텐츠 자산화 |

#### 3.3.5 성장 경쟁력

| 단 | 내용 |
|----|------|
| Pain | 혼자서 매장 확장이나 새로운 형태 시도를 결정하기는 부담이 큽니다. |
| Gain | 매장 그룹·협동조합·세미 프랜차이즈로 함께 성장합니다. 지역 안에서 시너지를 만들고, 새로운 매장 형태를 작게 시도할 수 있으며, 사업 확장의 위험을 함께 나눕니다. |
| O4O 활용 | 운영 파트너 · 협동조합 · 세미 프랜차이즈 · 공동 운영 구조 |

> **각 박스의 본문 길이·줄바꿈은 구현자 조정 가능.** Pain ≤ 1 문장 / Gain ≤ 3 문장 / O4O 활용은 키워드 나열 형태 권장.

---

### 3.4 내부 용어 → 사업자 언어 매핑 (강제)

| 내부 용어 | 노출 표현 |
|----------|----------|
| Event Offer | 공동 구매 · 특가 행사 |
| Market Trial | 신제품 시장 검증 · 시장 반응 보기 |
| Operator | 운영 파트너 · 공동 운영자 |
| Store Execution | 매장에서 실행 |
| HUB | 공동 콘텐츠 · 공유 자산 |
| 무재고 판매 구조 | 재고 부담 없이 판매 |

> 내부 용어 *단독* 노출 금지. 신뢰 가교가 필요하면 *괄호 안 병기* 허용 ("공동 구매 (Event Offer)"). 본 페이지에서는 단독 변환만 사용.

---

### 3.5 다음 단계 (CTA)

**제목**

> 내 사업에서는 어떻게 활용할 수 있을까요?

**본문 (1~2 줄)**

> O4O는 업종과 사업 구조에 따라 다양한 방식으로 활용될 수 있습니다.
>
> 내 사업에 맞는 활용 방식을 확인해 보세요.

**CTA — 2 버튼**

| 라벨 | 진입 |
|------|------|
| **내 사업에 적용해 보기** (메인) | `/o4o/apply` |
| 전체 구조 보기 | `/o4o/intro` |

---

### 3.6 5 축 상세 페이지 자리 (Disabled)

5 축 카드 또는 상세 박스 하단에 **"자세히 보기"** 자리를 마련하되, 본 WO 단계에서는 **disabled / "준비 중"** 표시.

```tsx
// 예시 — 구현자 자율
<button disabled className="...">자세히 보기 (준비 중)</button>
```

→ 후속 WO 에서 5 상세 페이지 활성화 시 이 자리를 채운다.

---

## 4. `/o4o` 메인 진입 추가

[O4OMainPage.tsx](../../services/web-neture/src/pages/o4o/O4OMainPage.tsx) 의 "다음 단계" 영역(직전 WO 의 §3.11) 에 경쟁력 페이지 진입 카드 추가.

**카드**

| 라벨 | 진입 |
|------|------|
| 경쟁력 구조 보기 — "내 사업에 무엇이 좋아지는가" | `/o4o/competitiveness` |

> 위치는 "다음 단계" 영역의 우선 카드 자리 (사업자 유형별 활용 안내 / 사례 / 공급 구조 / 공동 대응 카드들과 동일 영역). 진입 자체가 자연스럽게 노출되어야 함.

---

## 5. 라우트 추가

[App.tsx](../../services/web-neture/src/App.tsx) 의 `/o4o/*` 라우트 영역에 추가.

```tsx
<Route path="/o4o/competitiveness" element={<O4OCompetitivenessPage />} />
```

> lazy import 권장 — 기존 `/o4o/*` 라우트들의 import 패턴 따름.

---

## 6. 사전 동기화 (필수)

CLAUDE.md §1 의 sync first 원칙.

```bash
git status
git pull origin main
git status   # 본인 변경 분리 확인
```

직전 WO `WO-O4O-NETURE-OVERVIEW-BODY-REWRITE-V1` 의 변경이 main 에 반영된 상태인지 확인 (병행 작업이면 충돌 가능 — 본 WO §4 는 동일 파일 `O4OMainPage.tsx` 수정).

---

## 7. 커밋·푸시 규칙

- **본인 변경 파일만 staging** — `git add .` 금지, 파일 명시
- 작업 파일:
  - `services/web-neture/src/pages/o4o/O4OCompetitivenessPage.tsx` (신규)
  - `services/web-neture/src/pages/o4o/O4OMainPage.tsx` (다음 단계 카드 추가)
  - `services/web-neture/src/App.tsx` (라우트 추가)
- 예상 밖 변경 파일이 staging 후보에 등장하면 중단 후 보고
- 커밋 메시지:

```
feat(neture): WO-O4O-NETURE-COMPETITIVENESS-PAGE-NEW-V1 — /o4o/competitiveness 신규 (5 경쟁력 축 페이지)
```

---

## 8. 검증

### 8.1 빌드·타입체크

```bash
pnpm --filter @o4o/web-neture build
pnpm --filter @o4o/web-neture typecheck   # 또는 tsc --noEmit
```

### 8.2 배포 후 브라우저 검증

- `/o4o/competitiveness` 접속 → Hero / 5 축 카드 / 5 상세 박스 / 다음 단계 4 영역 표시
- Hero 타이틀 "O4O가 만드는 소규모 사업자의 새 경쟁력" 확인
- 5 축 카드 — 5 카드 모두 표시, 한 줄 가치 카피 일치
- 5 상세 박스 — Pain / Gain / O4O 활용 3-단 일관 적용 확인
- "자세히 보기 (준비 중)" disabled 자리 표시 (선택 — 구현 판단)
- CTA "내 사업에 적용해 보기" → `/o4o/apply` 정상 연결 확인
- `/o4o` 메인 "다음 단계" 영역에 "경쟁력 구조 보기" 카드 표시
- 카드 클릭 시 `/o4o/competitiveness` 정상 진입
- 모바일 (320–414px) 레이아웃 확인 (5 카드 그리드 1 컬럼 / 2 컬럼 변환)
- "작은 사업자" 문구 잔존 0 확인

### 8.3 내부 용어 단독 노출 검사

페이지 본문 검색하여 다음 단어가 사업자 언어 없이 *단독* 으로 등장하지 않음을 확인:

- `Event Offer` (병기 허용, 단독 금지)
- `Market Trial`
- `Operator` (단, "운영 파트너" 표현은 OK)
- `Store Execution`
- `HUB`
- `Producer / Visibility / Boundary / Tenant / RBAC` — 0 등장

---

## 9. 산출물

- `services/web-neture/src/pages/o4o/O4OCompetitivenessPage.tsx` — 신규
- [services/web-neture/src/pages/o4o/O4OMainPage.tsx](../../services/web-neture/src/pages/o4o/O4OMainPage.tsx) — "다음 단계" 카드 1 개 추가
- [services/web-neture/src/App.tsx](../../services/web-neture/src/App.tsx) — `/o4o/competitiveness` 라우트 추가
- 배포 후 `/o4o/competitiveness` 동작 확인

---

## 10. 완료 보고 항목

작업 완료 시 보고할 것:

1. 수정 파일 목록
2. 빌드/타입체크 결과
3. 배포 리비전·서비스
4. 브라우저 검증 결과 (§8.2 항목별)
5. 내부 용어 단독 노출 검사 결과 (§8.3)
6. 잔여 이슈/후속 권장 사항

---

## 11. 후속 WO 후보 (본 WO 범위 외)

- `WO-O4O-NETURE-COMPETITIVENESS-DETAIL-PAGES-V1` — 5 상세 페이지 활성화
- `IR-O4O-NETURE-BUSINESS-TARGET-TYPE-STRUCTURE-V1` — 사업자 유형 × 5 축 매트릭스
- 사례·수치·인용 자료 수집 (자료 수집 선행 IR)

---

*Version: V1 (2026-05-23)*
*Status: Work Order — Implementation Ready*
