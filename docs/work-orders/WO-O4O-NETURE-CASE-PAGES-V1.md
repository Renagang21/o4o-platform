# WO-O4O-NETURE-CASE-PAGES-V1

> **목적:** Neture O4O 소개 흐름에서 사업자별 Landing 의 신뢰 가교가 될 **대표 사례 페이지**를 먼저 구축한다.
>
> 본 WO 는 [CHECK-O4O-NETURE-BUSINESS-CASE-STRUCTURE-V1](../investigations/CHECK-O4O-NETURE-BUSINESS-CASE-STRUCTURE-V1.md) 에서 확정한 4 개 대표 사례를 `/o4o/cases/{slug}` 구조로 구현한다.

- **작성일:** 2026-05-23
- **분류:** Work Order (Implementation Ready)
- **대상 서비스:** Neture (`services/web-neture`)
- **대상 영역:** O4O 사례 페이지
- **선행:**
  - [CHECK-O4O-NETURE-BUSINESS-CASE-STRUCTURE-V1](../investigations/CHECK-O4O-NETURE-BUSINESS-CASE-STRUCTURE-V1.md)
  - [WO-O4O-NETURE-OVERVIEW-BODY-REWRITE-V1](WO-O4O-NETURE-OVERVIEW-BODY-REWRITE-V1.md)
  - [WO-O4O-NETURE-COMPETITIVENESS-PAGE-NEW-V1](WO-O4O-NETURE-COMPETITIVENESS-PAGE-NEW-V1.md)

---

## 0. 작업 원칙 (CLAUDE.md 준수)

- main 직접 작업
- 작업 전 `git pull origin main` 필수
- 본 WO 명시 파일만 수정
- `git add .` 금지
- 기존 디자인 시스템 유지 (Design Core 정책)
- 신규 디자인 시스템 생성 금지
- 내부 용어 단독 노출 금지
- **임의 수치 생성 금지** — 실제 데이터가 없으면 만들지 않음
- 호칭 **"소규모 사업자"** 유지
- 사례는 *"가능성"* 이 아니라 **적용 흐름** 중심으로 작성
- 구현 판단 자율 — 본 WO 는 *구조와 메시지* 정의, 시각 표현은 구현자 판단
- smoke test 후 결과 보고

---

## 1. 작업 범위

### 1.1 신규 페이지

- `services/web-neture/src/pages/o4o/O4OCasesPage.tsx` — 사례 목록 (`/o4o/cases`)
- `services/web-neture/src/pages/o4o/O4OCaseDetailPage.tsx` — 사례 상세 (`/o4o/cases/:slug`)

### 1.2 라우트 추가

[services/web-neture/src/App.tsx](../../services/web-neture/src/App.tsx)

```tsx
<Route path="/o4o/cases" element={<O4OCasesPage />} />
<Route path="/o4o/cases/:slug" element={<O4OCaseDetailPage />} />
```

### 1.3 사례 데이터 정의

slug 기반 정적 데이터 4 건. 위치는 구현자 판단:

- 옵션 A: `O4OCaseDetailPage.tsx` 내부 const map
- 옵션 B: `services/web-neture/src/pages/o4o/caseData.ts` 별도 파일

> 4 건 정도면 파일 분리는 선택사항. 후속 사례 추가가 잦을 것 같으면 옵션 B 권장.

### 1.4 진입 링크 추가 (조건부)

선행 WO 의 main 반영 상태에 따라:

- `WO-COMPETITIVENESS-PAGE-NEW-V1` 이 main 반영 완료 → `O4OCompetitivenessPage.tsx` 의 "다음 단계" 에 사례 목록 진입 카드 추가
- 미반영 → **진입 링크는 후속으로 남기고 본 WO 범위 외로 처리**

→ 충돌 방지 우선. 사례 페이지와 라우트만 먼저 구현해도 무방.

### 1.5 범위 외

- 사업자별 Landing 구현 (별도 WO)
- 실제 수치 생성
- 사례 이미지 제작
- 문의 폼 구현
- KPI 환산 모델
- 5 경쟁력 축 상세 페이지

---

## 2. 4 대표 사례 구현

### 2.1 약국 협동조합

| 항목 | 내용 |
|------|------|
| slug | `pharmacy-cooperative` |
| 제목 | 약국 협동조합: 공동 구매에서 자체 상품까지 |
| 대상 유형 | 사업자 연합체 |
| 핵심 축 | 구매 · 상품 · 성장 |

**5-단 본문**

```text
[상황]
회원 약국들이 공동 구매는 이미 운영하지만 매장 안 판매 콘텐츠와 자체 상품은 부족합니다.

[문제]
같은 상품을 들여와도 회원 약국마다 설명력과 매장 실행이 다릅니다. 회원사가 늘어날수록 격차도 커집니다.

[O4O 적용]
공동 구매 상품에 콘텐츠·POP·QR·디지털 사이니지를 함께 제공합니다. 회원 약국이 같은 자료로 같은 수준의 설명을 제공할 수 있도록 합니다.

[기대 변화]
회원 약국이 같은 상품을 더 일관되게 설명하고 판매할 수 있습니다. 운영 격차가 줄어듭니다.

[확장]
시장 반응이 좋은 상품은 협동조합 자체 PB로 발전시킵니다. 신제품 검증부터 PB 출시까지의 흐름이 만들어집니다.
```

---

### 2.2 창고형 / 다점포 약국 그룹

| 항목 | 내용 |
|------|------|
| slug | `pharmacy-group-stores` |
| 제목 | 창고형·다점포 약국: 매장이 늘어도 운영 기준을 유지하는 구조 |
| 대상 유형 | 매장 기반 사업 그룹 |
| 핵심 축 | 매장 · 운영·데이터 · 성장 |

**5-단 본문**

```text
[상황]
매장 수가 늘어나며 운영·콘텐츠·직원 응대의 격차가 벌어집니다.

[문제]
신규 매장 셋업 비용이 크고, 직원 교육과 매장 디스플레이가 매장마다 달라 그룹 일관성을 유지하기 어렵습니다.

[O4O 적용]
공통 콘텐츠와 디지털 사이니지·QR·POP 자산을 그룹 단위로 운영합니다. AI가 응대 격차를 보완합니다.

[기대 변화]
매장이 늘어도 운영 표준이 유지됩니다. 직원 교육·디스플레이 부담이 줄어듭니다.

[확장]
운영 데이터를 그룹 단위로 활용해 의사결정에 사용합니다. 추가 매장 확장이 더 쉬워집니다.
```

---

### 2.3 건강기능식품 / 화장품 제조사

| 항목 | 내용 |
|------|------|
| slug | `manufacturer-market-trial` |
| 제목 | 제조사: 신제품을 작게 검증하고 매장 네트워크로 확산하는 구조 |
| 대상 유형 | 공급망 사업자 |
| 핵심 축 | 상품 · 매장 · 성장 |

**5-단 본문**

```text
[상황]
신제품 출시 시 B2C 광고 비용은 크지만 매장 노출과 시장 반응은 약합니다.

[문제]
신제품을 시장에 검증하려면 광고비·진열비 등 큰 비용이 듭니다. 작은 규모로 시도하기 어렵습니다.

[O4O 적용]
매장 네트워크 안에서 신제품을 작게 노출하고, 콘텐츠·QR로 정보를 전달합니다. 매장 반응 데이터를 수집합니다.

[기대 변화]
큰 광고 없이 매장 안 콘텐츠로 신제품 반응을 확인할 수 있습니다. 검증 비용이 낮아집니다.

[확장]
검증 결과가 좋은 제품은 매장 네트워크 안에서 안정적으로 확산합니다. 공급자-매장 공동 프로모션이 가능해집니다.
```

---

### 2.4 관광객 대상 화장품 매장 그룹

| 항목 | 내용 |
|------|------|
| slug | `cosmetics-tourism-store` |
| 제목 | 관광객 대상 화장품 매장: 짧은 시간 안에 상품을 이해시키는 구조 |
| 대상 유형 | 매장 기반 사업 그룹 (관광 sub-segment) |
| 핵심 축 | 상품 · 매장 · 운영·데이터 |

**5-단 본문**

```text
[상황]
관광객 대상 매장은 짧은 시간 안에 다국어로 상품을 설명해야 합니다.

[문제]
직원이 다국어로 일일이 응대하기 어렵고, 관광객 반응을 다음 상품 기획에 반영하기도 어렵습니다.

[O4O 적용]
다국어 콘텐츠·QR·디지털 사이니지로 상품 설명을 자동화합니다. 관광객 반응을 매장·그룹 단위로 모읍니다.

[기대 변화]
설명 부담이 줄고, 관광객이 더 쉽게 상품을 이해합니다. 매장 디스플레이가 더 강한 영업 자산이 됩니다.

[확장]
관광객 반응 데이터를 기반으로 관광객 대상 자체 브랜드 상품을 기획합니다.
```

---

## 3. `/o4o/cases` 목록 페이지

### 3.1 구성

```text
┌─ Hero ───────────────────────────────────────┐
│  O4O 사례                                     │
│  소규모 사업자가 O4O를 어떻게 활용하는지        │
│  대표 사례로 살펴보세요.                       │
└──────────────────────────────────────────────┘

┌─ 4 사례 카드 (그리드) ──────────────────────┐
│  각 카드:                                     │
│  - 사례 제목                                  │
│  - 대상 사업자 유형                            │
│  - 핵심 경쟁력 축 (3 키워드)                   │
│  - 짧은 설명 (상황 1~2 줄)                    │
│  - "자세히 보기" 버튼                          │
└──────────────────────────────────────────────┘
```

### 3.2 시각 형태

`/o4o/competitiveness` 의 카드 그리드 패턴 재활용 권장. 컬럼 수·hover·아이콘은 구현자 판단.

---

## 4. `/o4o/cases/:slug` 상세 페이지

### 4.1 구성

```text
┌─ Hero ──────────────────────────────────┐
│  제목                                     │
│  대상 사업자 유형 · 핵심 경쟁력 축          │
└─────────────────────────────────────────┘
        ↓
┌─ 5-단 사례 구조 ────────────────────────┐
│  상황 → 문제 → O4O 적용 → 기대 변화 → 확장 │
└─────────────────────────────────────────┘
        ↓
┌─ 필요 증거 영역 (자료 준비 중 표시) ────────┐
│  - 운영 화면                              │
│  - 콘텐츠 예시                            │
│  - QR / POP / 사이니지 예시               │
│  - 매장 진술                              │
└─────────────────────────────────────────┘
        ↓
┌─ 다음 단계 ──────────────────────────────┐
│  목록으로 / 다른 사례 / 내 사업에 적용해 보기  │
└─────────────────────────────────────────┘
```

### 4.2 5-단 시각 표현

5 단을 시각적으로 *순차* 로 읽히도록 작성. `/o4o/competitiveness` 의 Pain/Gain/O4O 3-단 카드 패턴 응용 권장.

### 4.3 증거 영역 — 자료 준비 중 처리

증거 자료가 아직 없으면 실제 자료를 invent 하지 않고 다음과 같이 표시:

```text
자료 준비 중
운영 화면과 콘텐츠 예시는 후속 단계에서 추가됩니다.
```

→ 자료 확보 시 점진 채움. 자리만 마련.

### 4.4 다음 단계 CTA

- 목록으로 → `/o4o/cases`
- 다른 사례 (현재 사례 외 3 개 사례 카드)
- 내 사업에 적용해 보기 → `/o4o/apply`

---

## 5. 내부 용어 처리 (강제)

다음 표현은 *단독* 노출 금지:

| 내부 용어 | 노출 표현 |
|----------|----------|
| Event Offer | 공동 구매 · 특가 행사 |
| Market Trial | 신제품 시장 검증 |
| Operator | 운영 파트너 · 공동 운영자 |
| Store Execution | 매장에서 실행 |
| HUB | 공동 콘텐츠 · 공유 자산 |
| RBAC / Tenant / Boundary / Producer / Visibility | 0 등장 |

> 신뢰 가교가 필요하면 *괄호 안 병기* 허용. 본 WO 에서는 단독 변환 표현 우선.

---

## 6. 사전 동기화 (필수)

CLAUDE.md §1 의 sync first.

```bash
git status
git pull origin main
git status   # 본인 변경 분리 확인
```

선행 두 WO (`OVERVIEW-BODY-REWRITE`, `COMPETITIVENESS-PAGE-NEW`) 의 main 반영 여부 확인. 미반영 시 §1.4 진입 링크 작업은 보류.

---

## 7. 커밋·푸시 규칙

- **본인 변경 파일만 staging** — `git add .` 금지, 파일 명시
- 예상 파일:
  - `services/web-neture/src/pages/o4o/O4OCasesPage.tsx` (신규)
  - `services/web-neture/src/pages/o4o/O4OCaseDetailPage.tsx` (신규)
  - `services/web-neture/src/App.tsx` (라우트)
  - 선택: `services/web-neture/src/pages/o4o/caseData.ts` (사례 데이터 분리 시)
- 조건부:
  - `services/web-neture/src/pages/o4o/O4OCompetitivenessPage.tsx` — 선행 WO 반영 완료 시에만 진입 링크 추가
  - `services/web-neture/src/pages/o4o/O4OMainPage.tsx` — 동일
- 예상 밖 변경 파일이 staging 후보에 등장하면 중단 후 보고

**커밋 메시지**

```
feat(neture): WO-O4O-NETURE-CASE-PAGES-V1 — O4O 대표 사례 페이지 4건 추가
```

---

## 8. 검증

### 8.1 빌드·타입체크

```bash
pnpm --filter @o4o/web-neture build
pnpm --filter @o4o/web-neture typecheck   # 또는 tsc --noEmit
```

> 프로젝트에 typecheck 스크립트가 없으면 기존 검증 방식 사용.

### 8.2 배포 후 브라우저 검증

확인 경로:

```text
/o4o/cases
/o4o/cases/pharmacy-cooperative
/o4o/cases/pharmacy-group-stores
/o4o/cases/manufacturer-market-trial
/o4o/cases/cosmetics-tourism-store
```

검증 항목:

- 목록 페이지 4 사례 카드 표시
- 각 카드 클릭 시 해당 상세 페이지 이동
- 상세 페이지 5-단 구조 표시 (상황→문제→O4O 적용→기대 변화→확장)
- 대상 사업자 유형 / 핵심 경쟁력 축 표시
- 증거 영역 "자료 준비 중" placeholder 표시
- CTA "내 사업에 적용해 보기" → `/o4o/apply` 정상 연결
- 모바일 (320–414px) 레이아웃 확인
- 잘못된 slug 접근 시 처리 (404 또는 목록 리다이렉트)

### 8.3 키워드/용어 검사

페이지 본문 검색하여 확인:

- **임의 수치 0 등장** — `%`, `배`, `만 명`, `만 원`, `30%`, `2배` 등 — *0개*
- **내부 용어 단독 0 등장** — `Event Offer`, `Market Trial`, `Operator`, `Store Execution`, `HUB`, `RBAC` (병기 허용, 단독 금지)
- **"작은 사업자" 0 등장** — 전부 "소규모 사업자"

---

## 9. 산출물

- `services/web-neture/src/pages/o4o/O4OCasesPage.tsx` — 신규 (목록)
- `services/web-neture/src/pages/o4o/O4OCaseDetailPage.tsx` — 신규 (상세)
- [services/web-neture/src/App.tsx](../../services/web-neture/src/App.tsx) — 라우트 2 개 추가
- 선택: `services/web-neture/src/pages/o4o/caseData.ts` — 사례 데이터 분리 시
- 배포 후 `/o4o/cases`, `/o4o/cases/{slug}` 5 페이지 동작 확인

---

## 10. 완료 보고 항목

작업 완료 시 보고:

1. 수정 파일 목록
2. 라우트 추가 결과
3. 빌드/타입체크 결과
4. 배포 리비전·서비스
5. 브라우저 검증 결과 (§8.2 항목별)
6. 키워드/용어 검사 결과 (§8.3)
7. 진입 링크 추가 여부 (§1.4)
8. 잔여 이슈 / 후속 권장 사항

---

## 11. 후속 WO 후보

본 WO 완료 후 가능한 다음 작업:

- `WO-O4O-NETURE-BUSINESS-LANDING-COMMON-V1` — `/o4o/business` 공통 Landing (5 유형 카드 + 사례 카드 연결)
- `WO-O4O-NETURE-BUSINESS-LANDING-COOPERATIVE-V1` — 약국 협동조합 Landing
- `WO-O4O-NETURE-BUSINESS-LANDING-STORE-GROUP-V1` — 매장 그룹 Landing
- 사례 자료 수집 → 본 WO 산출물의 *자료 준비 중* 자리 점진 채움

---

*Version: V1 (2026-05-23)*
*Status: Work Order — Implementation Ready*
