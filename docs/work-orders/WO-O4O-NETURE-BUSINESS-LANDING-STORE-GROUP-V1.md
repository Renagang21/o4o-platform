# WO-O4O-NETURE-BUSINESS-LANDING-STORE-GROUP-V1

> **목적:** Neture O4O 사업자 유형 Landing 중 2순위 대상인 **매장 기반 사업 그룹 상세 Landing** `/o4o/business/store-group` 을 만든다.
>
> 본 페이지는 창고형·다점포 약국, 관광객 대상 화장품 매장, 관광지 약국, 다점포 매장 그룹을 대상으로, **매장 운영 표준화 · 콘텐츠 실행 · AI 활용 · 성장 구조** 를 설명한다.

- **작성일:** 2026-05-23
- **분류:** Work Order (Implementation Ready)
- **대상 서비스:** Neture (`services/web-neture`)
- **대상 영역:** O4O 사업자 유형 상세 Landing — 매장 기반 사업 그룹
- **신규 경로:** `/o4o/business/store-group`
- **선행 WO:**
  - [WO-O4O-NETURE-BUSINESS-LANDING-COMMON-V1](WO-O4O-NETURE-BUSINESS-LANDING-COMMON-V1.md)
  - [WO-O4O-NETURE-BUSINESS-LANDING-COOPERATIVE-V1](WO-O4O-NETURE-BUSINESS-LANDING-COOPERATIVE-V1.md)
  - [WO-O4O-NETURE-CASE-PAGES-V1](WO-O4O-NETURE-CASE-PAGES-V1.md)
- **대표 사례:**
  - `/o4o/cases/pharmacy-group-stores`
  - `/o4o/cases/cosmetics-tourism-store`

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
- 기능보다 사업자 *Pain → Gain → 적용 흐름* 중심
- 사례는 실제 `/o4o/cases/pharmacy-group-stores`, `/o4o/cases/cosmetics-tourism-store` 로 연결
- 구현 판단 자율 — 본 WO 는 *구조와 메시지*, 시각 표현은 구현자 판단
- smoke test 후 결과 보고

---

## 1. 작업 범위

### 1.1 신규 페이지

- `services/web-neture/src/pages/o4o/O4OBusinessStoreGroupPage.tsx` (`/o4o/business/store-group`)

### 1.2 라우트 추가

[services/web-neture/src/App.tsx](../../services/web-neture/src/App.tsx)

```tsx
<Route path="/o4o/business/store-group" element={<O4OBusinessStoreGroupPage />} />
```

### 1.3 진입 링크 활성화

`/o4o/business` 의 **매장 기반 사업 그룹** 카드의 *"준비 중"* 버튼을 실제 링크 `/o4o/business/store-group` 로 변경.

수정 대상: `services/web-neture/src/pages/o4o/O4OBusinessLandingPage.tsx`

### 1.4 범위 외

- `/o4o/business/supplier`, `/professional`, `/region` 구현 (2차)
- 사례 이미지 제작
- 문의 폼 구현
- KPI 환산 모델
- 실제 객단가 / 체류 시간 수치 생성

---

## 2. 페이지 역할

본 페이지는 다음 질문에 답한다.

- 매장 수가 늘어날 때 왜 O4O 가 필요한가?
- 매장별 운영·콘텐츠·직원 응대 격차를 어떻게 줄일 수 있는가?
- 디지털 사이니지·QR·POP·AI 콘텐츠가 매장 실행에 어떻게 연결되는가?
- 매장 그룹은 O4O 를 통해 어떤 성장 구조를 만들 수 있는가?

---

## 3. 페이지 구조

```text
Hero
   ↓
매장 그룹의 현재 Pain
   ↓
O4O 가 만드는 3 가지 경쟁력
   ↓
적용 흐름 (5-단)
   ↓
대표 사례 2 개 연결
   ↓
다음 단계 CTA
```

---

## 4. Hero

### 4.1 제목

> 매장이 늘어도 운영 기준과 고객 경험을 유지합니다

### 4.2 부제 (2 줄)

> O4O 는 여러 매장의 콘텐츠·디스플레이·응대 흐름을 연결해
>
> 매장 그룹이 일관된 운영과 더 강한 고객 경험을 만들도록 돕습니다.

### 4.3 강조 축 (배지/태그)

```text
매장 경쟁력 · 운영·데이터 경쟁력 · 성장 경쟁력
```

### 4.4 Hero CTA (4 버튼)

| 라벨 | 진입 |
|------|------|
| 창고형·다점포 사례 보기 | `/o4o/cases/pharmacy-group-stores` |
| 관광 화장품 사례 보기 | `/o4o/cases/cosmetics-tourism-store` |
| 내 사업에 적용해 보기 | `/o4o/apply` |
| 공통 사업자 유형 보기 | `/o4o/business` |

> 4 버튼이 시각적으로 무거우면 *사례 2 버튼* 은 본문 카드에 흡수하고 Hero 는 *적용해 보기 + 유형 보기* 2 버튼만으로 단순화 가능 — 구현자 판단.

---

## 5. 매장 그룹의 현재 Pain

카드 또는 리스트로 5 항목 표시.

```text
매장 수가 늘어나면 운영 기준을 일관되게 유지하기 어렵습니다.

매장별 콘텐츠, POP, 디스플레이 활용 수준이 달라집니다.

직원 교육과 고객 응대 품질이 매장마다 달라질 수 있습니다.

신규 매장 셋업과 운영 표준화에 반복 비용이 들어갑니다.

관광객 대상 매장처럼 짧은 시간 안에 설명이 필요한 환경에서는 다국어·콘텐츠 대응 부담이 커집니다.
```

> 카피 미세 조정은 구현자 자율. 단 *수치 / 절박감 과장* 금지.

---

## 6. O4O 가 만드는 3 가지 경쟁력

### 6.1 매장 경쟁력

> 매장을 단순 판매 공간이 아니라 정보와 설명이 전달되는 공간으로 만듭니다.
>
> 콘텐츠·QR·POP·디지털 사이니지를 통해 고객이 더 쉽게 상품과 서비스를 이해할 수 있습니다.

### 6.2 운영·데이터 경쟁력

> 여러 매장의 콘텐츠와 운영 흐름을 한 기준으로 맞출 수 있습니다.
>
> AI와 데이터는 반복 설명과 운영 격차를 줄이는 데 활용됩니다.

### 6.3 성장 경쟁력

> 매장이 늘어나도 같은 기준의 콘텐츠와 실행 자산을 사용할 수 있습니다.
>
> 신규 매장 확장이나 세미 프랜차이즈 구조를 만들 때 반복 가능한 운영 기반이 됩니다.

---

## 7. 적용 흐름 (5-단)

```text
공통 상품·서비스 운영 기준 정리
   ↓
콘텐츠 · QR · POP · 디지털 사이니지 자산 구축
   ↓
매장별 실행과 고객 응대 지원
   ↓
매장 반응과 운영 데이터 확인
   ↓
신규 매장 확장 / 자체 상품 / 그룹 운영 표준화로 확장
```

> 시각 표현(stepper / 가로 띠 / 카드 + 화살표)은 구현자 자율. `/o4o/competitiveness`, `/o4o/business/cooperative` 와 동일 패턴 권장.

---

## 8. 대표 사례 연결 (2 카드)

### 8.1 사례 1 — 창고형·다점포 약국

| 항목 | 내용 |
|------|------|
| 사례 제목 | 창고형·다점포 약국: 매장이 늘어도 운영 기준을 유지하는 구조 |
| slug | `pharmacy-group-stores` |
| 카드 요약 | 매장 수가 늘어나며 운영·콘텐츠·직원 응대의 격차가 벌어집니다. O4O는 공통 콘텐츠와 디지털 사이니지·QR·POP 자산을 그룹 단위로 운영해 매장별 실행 격차를 줄입니다. |
| 자세히 보기 | `/o4o/cases/pharmacy-group-stores` |

### 8.2 사례 2 — 관광객 대상 화장품 매장

| 항목 | 내용 |
|------|------|
| 사례 제목 | 관광객 대상 화장품 매장: 짧은 시간 안에 상품을 이해시키는 구조 |
| slug | `cosmetics-tourism-store` |
| 카드 요약 | 관광객 대상 매장은 짧은 시간 안에 다국어로 상품을 설명해야 합니다. O4O는 다국어 콘텐츠·QR·디지털 사이니지로 상품 설명을 지원하고, 관광객 반응을 매장 그룹 단위로 모을 수 있도록 돕습니다. |
| 자세히 보기 | `/o4o/cases/cosmetics-tourism-store` |

---

## 9. 다음 단계 CTA

페이지 하단:

| 라벨 | 진입 |
|------|------|
| 내 사업에 적용해 보기 | `/o4o/apply` |
| 공통 사업자 유형 보기 | `/o4o/business` |
| 창고형·다점포 사례 보기 | `/o4o/cases/pharmacy-group-stores` |
| 관광 화장품 사례 보기 | `/o4o/cases/cosmetics-tourism-store` |

---

## 10. 내부 용어 처리 (강제)

다음 표현은 *단독* 노출 금지:

| 내부 용어 | 노출 표현 |
|----------|----------|
| Event Offer | 공동 구매 · 특가 행사 |
| Market Trial | 신제품 시장 검증 · 시장 반응 확인 |
| Operator | 운영 파트너 · 공동 운영자 |
| Store Execution | 매장에서 실행 |
| HUB | 공동 콘텐츠 · 공유 자산 |
| RBAC / Tenant / Boundary / Producer / Visibility | 0 등장 |

> 신뢰 가교가 필요하면 *괄호 안 병기* 허용. 본 WO 에서는 단독 변환 표현 우선.

---

## 11. 사전 동기화 (필수)

```bash
git status
git pull origin main
git status   # 본인 변경 분리 확인
```

선행 WO (`BUSINESS-LANDING-COMMON-V1`, `BUSINESS-LANDING-COOPERATIVE-V1`, `CASE-PAGES-V1`) 의 main 반영 여부 확인. 미반영 시 본 WO 시작 전 반영 완료 대기.

특히 `O4OBusinessLandingPage.tsx` 는 선행 협동조합 WO 와 본 WO 가 모두 수정. 충돌 방지 위해 순차 실행 권장.

---

## 12. 커밋·푸시 규칙

- **본인 변경 파일만 staging** — `git add .` 금지, 파일 명시
- 예상 파일:
  - `services/web-neture/src/pages/o4o/O4OBusinessStoreGroupPage.tsx` (신규)
  - `services/web-neture/src/pages/o4o/O4OBusinessLandingPage.tsx` (매장 그룹 카드 진입 링크 활성화)
  - `services/web-neture/src/App.tsx` (라우트)
- 예상 밖 변경 파일이 staging 후보에 등장하면 중단 후 보고

**커밋 메시지**

```
feat(neture): WO-O4O-NETURE-BUSINESS-LANDING-STORE-GROUP-V1 — 매장 그룹 상세 Landing 추가
```

---

## 13. 검증

### 13.1 빌드·타입체크

```bash
pnpm --filter @o4o/web-neture build
pnpm --filter @o4o/web-neture typecheck   # 또는 tsc --noEmit
```

### 13.2 배포 후 브라우저 검증

확인 경로:

```text
/o4o/business/store-group
/o4o/business
```

검증 항목:

- `/o4o/business/store-group` 렌더링 정상
- Hero (제목·부제·강조 축·CTA) 표시
- 매장 그룹 Pain 5 항목 표시
- 3 경쟁력 (매장·운영·데이터·성장) 표시
- 적용 흐름 5-단 표시
- 대표 사례 2 카드 표시
- 다음 단계 CTA 정상 연결
- `/o4o/business` 의 매장 기반 사업 그룹 카드 *"준비 중"* → 활성 링크로 전환됨
- 매장 기반 사업 그룹 카드 클릭 → `/o4o/business/store-group` 정상 진입
- 창고형·다점포 사례 보기 → `/o4o/cases/pharmacy-group-stores` 정상 진입
- 관광 화장품 사례 보기 → `/o4o/cases/cosmetics-tourism-store` 정상 진입
- 내 사업에 적용해 보기 → `/o4o/apply` 정상 진입
- 모바일 (320–414px) 레이아웃 확인

### 13.3 키워드/용어 검사

- **내부 용어 단독 0** — `Event Offer`, `Market Trial`, `Operator`, `Store Execution`, `HUB`, `RBAC` (병기 허용, 단독 금지)
- **임의 수치 0** — `%`, `배`, `만 원`, `만 명` 등 0
- **"작은 사업자" 0** — 전부 "소규모 사업자"

---

## 14. 산출물

- `services/web-neture/src/pages/o4o/O4OBusinessStoreGroupPage.tsx` — 신규
- `services/web-neture/src/pages/o4o/O4OBusinessLandingPage.tsx` — 매장 그룹 카드 진입 링크 활성화
- [services/web-neture/src/App.tsx](../../services/web-neture/src/App.tsx) — `/o4o/business/store-group` 라우트 추가
- 배포 후 `/o4o/business/store-group` 동작 + `/o4o/business` 카드 활성화 확인

---

## 15. 완료 보고 항목

1. 수정 파일 목록
2. 라우트 추가 결과
3. 빌드/타입체크 결과
4. 배포 리비전·서비스
5. 브라우저 검증 결과 (§13.2 항목별)
6. 사례 카드 연결 결과 (2 사례)
7. `/o4o/business` 카드 활성화 확인
8. 키워드/용어 검사 결과 (§13.3)
9. 잔여 이슈 / 후속 권장 사항

---

## 16. 후속 WO 후보

본 WO 완료 시 **1차 O4O 사업자 소개 구조 완성**.

2 차 사이클 (사례 자료 확보 후 점진 진행):

- `WO-O4O-NETURE-BUSINESS-LANDING-SUPPLIER-V1` — 공급망 / 제조사
- `WO-O4O-NETURE-BUSINESS-LANDING-PROFESSIONAL-V1` — 전문 서비스
- `WO-O4O-NETURE-BUSINESS-LANDING-REGION-V1` — 지역 운영

기타:

- `/o4o/apply` 본격 확장 (현재 가벼운 진입 페이지)
- 사례 자료 점진 채움 (운영 화면 / 콘텐츠 예시 / 진술 인용)

---

*Version: V1 (2026-05-23)*
*Status: Work Order — Implementation Ready*
