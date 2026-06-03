# WO-O4O-NETURE-BUSINESS-LANDING-COMMON-V1

> **목적:** Neture O4O 소개 흐름에서 *"누가 O4O를 활용할 수 있는가"* 를 설명하는 공통 사업자 Landing 페이지 `/o4o/business` 를 만든다.
>
> 본 페이지는 사업자 유형별 상세 Landing 으로 가기 전, **5 개 사업자 유형을 한 화면에서 이해시키는 중간 진입 페이지**이다.

- **작성일:** 2026-05-23
- **분류:** Work Order (Implementation Ready)
- **대상 서비스:** Neture (`services/web-neture`)
- **대상 영역:** O4O 사업자 유형 공통 Landing
- **신규 경로:** `/o4o/business`
- **선행:**
  - [WO-O4O-NETURE-OVERVIEW-BODY-REWRITE-V1](WO-O4O-NETURE-OVERVIEW-BODY-REWRITE-V1.md)
  - [WO-O4O-NETURE-COMPETITIVENESS-PAGE-NEW-V1](WO-O4O-NETURE-COMPETITIVENESS-PAGE-NEW-V1.md)
  - [WO-O4O-NETURE-CASE-PAGES-V1](WO-O4O-NETURE-CASE-PAGES-V1.md)
- **선행 CHECK:**
  - [CHECK-O4O-NETURE-BUSINESS-TARGET-STRUCTURE-V1](../investigations/CHECK-O4O-NETURE-BUSINESS-TARGET-STRUCTURE-V1.md) — 5 유형 · 메시지 · 매트릭스
  - [CHECK-O4O-NETURE-BUSINESS-CASE-STRUCTURE-V1](../investigations/CHECK-O4O-NETURE-BUSINESS-CASE-STRUCTURE-V1.md) — 사례 4 건 · slug

---

## 0. 작업 원칙 (CLAUDE.md 준수)

- main 직접 작업
- 작업 전 `git pull origin main` 필수
- 본 WO 명시 파일만 수정
- `git add .` 금지
- 기존 디자인 시스템 유지 (Design Core 정책)
- 신규 디자인 시스템 생성 금지
- 내부 용어 단독 노출 금지
- 호칭 **"소규모 사업자"** 유지
- 기능 설명보다 *사업자 관점* 우선
- 사례는 실제 `/o4o/cases/{slug}` 로 연결 (placeholder 금지 — 본 WO 시점에 사례 페이지는 존재)
- 구현 판단 자율 — 본 WO 는 *구조와 메시지*, 시각 표현은 구현자 판단
- smoke test 후 결과 보고

---

## 1. 작업 범위

### 1.1 신규 페이지

- `services/web-neture/src/pages/o4o/O4OBusinessLandingPage.tsx` (`/o4o/business`)

### 1.2 라우트 추가

[services/web-neture/src/App.tsx](../../services/web-neture/src/App.tsx)

```tsx
<Route path="/o4o/business" element={<O4OBusinessLandingPage />} />
```

### 1.3 진입 링크 추가 (조건부)

선행 WO 반영 상태 확인 후 다음 위치에 `/o4o/business` 진입 링크 추가:

- `/o4o` (O4OMainPage) "다음 단계" 영역
- `/o4o/competitiveness` (O4OCompetitivenessPage) "다음 단계" 영역
- `/o4o/apply` (O4OApplyEntryPage)

→ 충돌 위험 시 페이지·라우트만 먼저 구현하고 진입 링크는 후속으로 분리.

### 1.4 범위 외

- 사업자별 상세 Landing 5 페이지 (`/o4o/business/{type}`)
- 사례 이미지 제작
- 문의 폼 구현
- KPI 환산 모델
- 전문 서비스 / 지역 운영 신규 사례 작성

---

## 2. 페이지 역할

`/o4o/business` 는 다음 질문에 답한다.

- O4O 는 어떤 사업자를 위한 구조인가?
- 내 사업 유형은 어디에 해당하는가?
- 각 사업자 유형은 어떤 경쟁력을 얻을 수 있는가?
- 더 자세한 사례나 적용 흐름은 어디서 볼 수 있는가?

본 페이지는 **상세 제안서가 아닌 사업자 유형 선택형 공통 Landing** 이다.

---

## 3. 페이지 구조

```text
Hero
   ↓
5 사업자 유형 카드
   ↓
유형 × 경쟁력 축 요약 (매트릭스)
   ↓
대표 사례 연결 (4 카드)
   ↓
다음 단계 CTA
```

---

## 4. Hero

### 4.1 제목

> O4O 는 다양한 소규모 사업자의 성장 구조를 만듭니다

### 4.2 부제 (2 줄)

> 협동조합 · 매장 그룹 · 공급망 사업자 · 전문 서비스 · 지역 운영 조직까지,
>
> O4O 는 각 사업자가 가진 전문성과 현장 경험을 연결해 새로운 경쟁력을 만들도록 돕습니다.

### 4.3 Hero CTA (3 버튼)

| 라벨 | 진입 |
|------|------|
| 내 사업에 적용해 보기 | `/o4o/apply` |
| 경쟁력 구조 보기 | `/o4o/competitiveness` |
| 대표 사례 보기 | `/o4o/cases` |

---

## 5. 5 사업자 유형 카드

각 카드의 공통 구성:

```text
유형명
대표 예
한 줄 메시지
강조 경쟁력 축 (3 키워드)
[연결 사례 카드]
[상세 Landing 버튼 — 활성 / "준비 중"]
```

### 5.1 사업자 연합체

| 항목 | 내용 |
|------|------|
| 대표 예 | 협동조합 · 협회 · 전문가 단체 |
| 한 줄 메시지 | 혼자서는 어려운 구매·자체 상품 개발·회원사 운영 지원을 함께 만들어 갈 수 있습니다. |
| 강조 경쟁력 | 구매 · 상품 · 성장 |
| 연결 사례 | [/o4o/cases/pharmacy-cooperative](../../services/web-neture/) |
| 상세 Landing | `/o4o/business/cooperative` — *준비 중* (본 WO 범위 외) |

### 5.2 매장 기반 사업 그룹

| 항목 | 내용 |
|------|------|
| 대표 예 | 창고형 약국 · 관광객 대상 화장품 매장 · 관광지 약국 · 다점포 그룹 |
| 한 줄 메시지 | 여러 매장의 운영을 표준화하고, 콘텐츠와 AI로 고객 경험과 객단가를 함께 키울 수 있습니다. |
| 강조 경쟁력 | 매장 · 운영·데이터 · 성장 |
| 연결 사례 | `/o4o/cases/pharmacy-group-stores` + `/o4o/cases/cosmetics-tourism-store` |
| 상세 Landing | `/o4o/business/store-group` — *준비 중* |

### 5.3 공급망 사업자

| 항목 | 내용 |
|------|------|
| 대표 예 | 비처방 제품 유통 · 공급 사업자 · 제조사 |
| 한 줄 메시지 | 신제품을 작게 시장에 검증하고, 매장 네트워크 안에서 안정적으로 확장할 수 있습니다. |
| 강조 경쟁력 | 상품 · 매장 · 성장 |
| 연결 사례 | `/o4o/cases/manufacturer-market-trial` |
| 상세 Landing | `/o4o/business/supplier` — *준비 중* (2차) |

### 5.4 전문 서비스 사업자

| 항목 | 내용 |
|------|------|
| 대표 예 | 의료기관 · 헬스장 · 피부관리 · 미용 |
| 한 줄 메시지 | 전문성을 콘텐츠로 만들어 고객 신뢰와 재방문 가능성을 높일 수 있습니다. |
| 강조 경쟁력 | 매장 · 운영·데이터 |
| 연결 사례 | *사례 준비 중* |
| 상세 Landing | `/o4o/business/professional` — *준비 중* (2차) |

### 5.5 지역 운영 / 공동 성장 조직

| 항목 | 내용 |
|------|------|
| 대표 예 | 전통시장 현대화 · 지역 운영 조직 · 지방자치단체 협력 사업 |
| 한 줄 메시지 | 개별 매장이 아닌 지역 단위의 공동 성장 구조를 만들 수 있습니다. |
| 강조 경쟁력 | 성장 · 매장 · 운영·데이터 |
| 연결 사례 | *사례 준비 중* |
| 상세 Landing | `/o4o/business/region` — *준비 중* (2차) |

---

## 6. 유형 × 경쟁력 축 요약 매트릭스

5 유형 × 5 축. 표 또는 카드 그리드 — 구현자 판단.

**표기**

- 주요 (◎)
- 보조 (○)
- 준비 중 (△ 또는 회색 처리)

**매핑**

| 사업자 유형 | 구매 | 상품 | 매장 | 운영·데이터 | 성장 |
|------------|:----:|:----:|:----:|:--------:|:----:|
| 사업자 연합체 | 주요 | 주요 | 보조 | 보조 | 주요 |
| 매장 기반 사업 그룹 | 보조 | 보조 | 주요 | 주요 | 주요 |
| 공급망 사업자 | 보조 | 주요 | 보조 | 보조 | 보조 |
| 전문 서비스 사업자 | 준비 중 | 준비 중 | 주요 | 주요 | 보조 |
| 지역 운영 조직 | 보조 | 준비 중 | 보조 | 보조 | 주요 |

---

## 7. 대표 사례 연결 (4 카드)

사례 카드 4 개. 각 카드:

```text
사례 제목
대상 사업자 유형
핵심 경쟁력 축
짧은 설명 (사례 상황 1~2 줄)
자세히 보기 → /o4o/cases/{slug}
```

| # | 사례 | slug |
|---|------|------|
| 1 | 약국 협동조합: 공동 구매에서 자체 상품까지 | `pharmacy-cooperative` |
| 2 | 창고형·다점포 약국: 매장이 늘어도 운영 기준을 유지하는 구조 | `pharmacy-group-stores` |
| 3 | 제조사: 신제품을 작게 검증하고 매장 네트워크로 확산하는 구조 | `manufacturer-market-trial` |
| 4 | 관광객 대상 화장품 매장: 짧은 시간 안에 상품을 이해시키는 구조 | `cosmetics-tourism-store` |

> 본 WO 시점에는 4 사례 페이지가 이미 존재(`WO-CASE-PAGES-V1` 선행 완료). placeholder 금지 — *실제 진입* 으로 연결.

---

## 8. 다음 단계 CTA

페이지 하단:

| 라벨 | 진입 |
|------|------|
| 내 사업에 적용해 보기 | `/o4o/apply` |
| 대표 사례 더 보기 | `/o4o/cases` |
| 경쟁력 구조 보기 | `/o4o/competitiveness` |

---

## 9. 내부 용어 처리 (강제)

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

## 10. 사전 동기화 (필수)

CLAUDE.md §1 의 sync first.

```bash
git status
git pull origin main
git status   # 본인 변경 분리 확인
```

선행 세 WO (`OVERVIEW-BODY-REWRITE`, `COMPETITIVENESS-PAGE-NEW`, `CASE-PAGES`) 의 main 반영 여부 확인. 미반영 시 §1.3 진입 링크 작업 보류.

---

## 11. 커밋·푸시 규칙

- **본인 변경 파일만 staging** — `git add .` 금지, 파일 명시
- 예상 파일:
  - `services/web-neture/src/pages/o4o/O4OBusinessLandingPage.tsx` (신규)
  - `services/web-neture/src/App.tsx` (라우트)
- 조건부 (선행 WO 반영 + 진입 링크 추가 시에만):
  - `services/web-neture/src/pages/o4o/O4OMainPage.tsx`
  - `services/web-neture/src/pages/o4o/O4OCompetitivenessPage.tsx`
  - `services/web-neture/src/pages/o4o/O4OApplyEntryPage.tsx`
- 예상 밖 변경 파일이 staging 후보에 등장하면 중단 후 보고

**커밋 메시지**

```
feat(neture): WO-O4O-NETURE-BUSINESS-LANDING-COMMON-V1 — O4O 사업자 유형 공통 Landing 추가
```

---

## 12. 검증

### 12.1 빌드·타입체크

```bash
pnpm --filter @o4o/web-neture build
pnpm --filter @o4o/web-neture typecheck   # 또는 tsc --noEmit
```

### 12.2 배포 후 브라우저 검증

확인 경로:

```text
/o4o/business
```

검증 항목:

- Hero 표시 + 3 CTA 정상 연결 (`/o4o/apply`, `/o4o/competitiveness`, `/o4o/cases`)
- 5 사업자 유형 카드 표시 + 각 카드 메시지·강조 축 일치
- 유형 × 경쟁력 축 요약 매트릭스 표시
- 대표 사례 4 카드 표시
- 사례 카드 클릭 → `/o4o/cases/{slug}` 정상 진입 (4 사례 모두)
- 상세 Landing 버튼 — "준비 중" disabled 상태로 표시
- 다음 단계 CTA 3 버튼 정상 연결
- 모바일 (320–414px) 레이아웃 확인 (5 유형 카드 그리드 1·2 컬럼 변환)
- 진입 링크 추가 작업 결과 (§1.3 — 추가 여부 보고)

### 12.3 키워드/용어 검사

- **내부 용어 단독 0** — `Event Offer`, `Market Trial`, `Operator`, `Store Execution`, `HUB`, `RBAC`, `Tenant`, `Boundary` (병기 허용, 단독 금지)
- **"작은 사업자" 0** — 전부 "소규모 사업자"
- **임의 수치 0** — 페이지 본문에 `%` / 배수 / 만 명 등 0

---

## 13. 산출물

- `services/web-neture/src/pages/o4o/O4OBusinessLandingPage.tsx` — 신규
- [services/web-neture/src/App.tsx](../../services/web-neture/src/App.tsx) — `/o4o/business` 라우트 추가
- 조건부: `/o4o`, `/o4o/competitiveness`, `/o4o/apply` 의 진입 링크
- 배포 후 `/o4o/business` 동작 + 4 사례 연결 확인

---

## 14. 완료 보고 항목

1. 수정 파일 목록
2. 라우트 추가 결과
3. 빌드/타입체크 결과
4. 배포 리비전·서비스
5. 브라우저 검증 결과 (§12.2 항목별)
6. 사례 카드 연결 결과 (4 사례 진입 확인)
7. 진입 링크 추가 여부 (§1.3)
8. 키워드/용어 검사 결과 (§12.3)
9. 잔여 이슈 / 후속 권장 사항

---

## 15. 후속 WO 후보

- `WO-O4O-NETURE-BUSINESS-LANDING-COOPERATIVE-V1` — 약국 협동조합 상세 Landing
- `WO-O4O-NETURE-BUSINESS-LANDING-STORE-GROUP-V1` — 매장 그룹 상세 Landing
- (2차) `WO-O4O-NETURE-BUSINESS-LANDING-SUPPLIER-V1` — 공급망 / 제조사
- (2차) `WO-O4O-NETURE-BUSINESS-LANDING-PROFESSIONAL-V1` — 전문 서비스
- (2차) `WO-O4O-NETURE-BUSINESS-LANDING-REGION-V1` — 지역 운영

---

*Version: V1 (2026-05-23)*
*Status: Work Order — Implementation Ready*
