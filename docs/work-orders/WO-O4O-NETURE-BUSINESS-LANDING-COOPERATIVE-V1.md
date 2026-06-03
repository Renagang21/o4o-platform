# WO-O4O-NETURE-BUSINESS-LANDING-COOPERATIVE-V1

> **목적:** Neture O4O 사업자 유형 Landing 중 1순위 대상인 **사업자 연합체 / 협동조합 상세 Landing** `/o4o/business/cooperative` 를 만든다.
>
> 본 페이지는 특히 **약국 협동조합**을 대표 사례로 삼아, 공동 구매·자체 상품·회원사 운영 지원·성장 구조를 설명한다.

- **작성일:** 2026-05-23
- **분류:** Work Order (Implementation Ready)
- **대상 서비스:** Neture (`services/web-neture`)
- **대상 영역:** O4O 사업자 유형 상세 Landing — 사업자 연합체
- **신규 경로:** `/o4o/business/cooperative`
- **선행 WO:**
  - [WO-O4O-NETURE-BUSINESS-LANDING-COMMON-V1](WO-O4O-NETURE-BUSINESS-LANDING-COMMON-V1.md)
  - [WO-O4O-NETURE-CASE-PAGES-V1](WO-O4O-NETURE-CASE-PAGES-V1.md)
- **선행 CHECK:**
  - [CHECK-O4O-NETURE-BUSINESS-TARGET-STRUCTURE-V1](../investigations/CHECK-O4O-NETURE-BUSINESS-TARGET-STRUCTURE-V1.md)
  - [CHECK-O4O-NETURE-BUSINESS-CASE-STRUCTURE-V1](../investigations/CHECK-O4O-NETURE-BUSINESS-CASE-STRUCTURE-V1.md)

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
- 사례는 실제 `/o4o/cases/pharmacy-cooperative` 로 연결
- 구현 판단 자율 — 본 WO 는 *구조와 메시지*, 시각 표현은 구현자 판단
- smoke test 후 결과 보고

---

## 1. 작업 범위

### 1.1 신규 페이지

- `services/web-neture/src/pages/o4o/O4OBusinessCooperativePage.tsx` (`/o4o/business/cooperative`)

### 1.2 라우트 추가

[services/web-neture/src/App.tsx](../../services/web-neture/src/App.tsx)

```tsx
<Route path="/o4o/business/cooperative" element={<O4OBusinessCooperativePage />} />
```

### 1.3 진입 링크 활성화

`/o4o/business` 의 **사업자 연합체** 카드의 *"준비 중"* 버튼을 실제 링크 `/o4o/business/cooperative` 로 변경.

수정 대상: `services/web-neture/src/pages/o4o/O4OBusinessLandingPage.tsx`

### 1.4 범위 외

- `/o4o/business/store-group` 구현 (다음 WO)
- `/o4o/business/supplier`, `/professional`, `/region` 구현 (2차)
- 사례 이미지 제작
- 문의 폼 구현
- KPI 환산 모델
- 실제 PB 상품 수치 생성

---

## 2. 페이지 역할

본 페이지는 다음 질문에 답한다.

- 협동조합·협회·전문가 단체가 O4O 를 왜 필요로 하는가?
- 회원사에게 어떤 실질 지원을 줄 수 있는가?
- 공동 구매를 넘어 어떤 경쟁력을 만들 수 있는가?
- 자체 상품과 공동 운영 구조로 어떻게 확장할 수 있는가?

---

## 3. 페이지 구조

```text
Hero
   ↓
협동조합의 현재 Pain
   ↓
O4O 가 만드는 3 가지 경쟁력
   ↓
적용 흐름 (5-단)
   ↓
대표 사례 연결
   ↓
다음 단계 CTA
```

---

## 4. Hero

### 4.1 제목

> 협동조합의 공동 대응을 사업 경쟁력으로 바꿉니다

### 4.2 부제 (2 줄)

> O4O 는 회원사의 구매·상품·운영 지원을 연결해
>
> 협동조합이 더 강한 공동 경쟁력을 만들도록 돕습니다.

### 4.3 강조 축 (배지/태그)

```text
구매 경쟁력 · 상품 경쟁력 · 성장 경쟁력
```

### 4.4 Hero CTA (3 버튼)

| 라벨 | 진입 |
|------|------|
| 대표 사례 보기 | `/o4o/cases/pharmacy-cooperative` |
| 내 사업에 적용해 보기 | `/o4o/apply` |
| 공통 사업자 유형 보기 | `/o4o/business` |

---

## 5. 협동조합의 현재 Pain

카드 또는 리스트로 4 항목 표시.

```text
공동 구매는 운영하지만 회원사별 판매 실행력은 다릅니다.

같은 상품을 들여와도 매장 안 설명력과 콘텐츠 활용 수준이 다릅니다.

회원 약국이 늘어날수록 운영 지원과 정보 전달 부담이 커집니다.

자체 상품이나 PB를 만들고 싶어도 시장 검증과 콘텐츠 운영이 어렵습니다.
```

> 카피 미세 조정은 구현자 자율. 단 *수치 / 절박감 과장* 금지.

---

## 6. O4O 가 만드는 3 가지 경쟁력

### 6.1 구매 경쟁력

> 회원사가 함께 구매하고 더 좋은 조건을 만들 수 있습니다.
>
> 특가 행사와 공동 구매를 단순 공급이 아니라 매장 실행까지 연결합니다.

### 6.2 상품 경쟁력

> 시장 반응이 좋은 상품은 자체 상품이나 PB 로 발전시킬 수 있습니다.
>
> 작게 검증하고, 반응을 보며, 협동조합의 차별화 상품으로 키울 수 있습니다.

### 6.3 성장 경쟁력

> 회원사 지원을 표준화하고 공동 콘텐츠와 운영 자산을 축적할 수 있습니다.
>
> 협동조합이 단순 구매 조직을 넘어 회원사의 성장 기반이 됩니다.

---

## 7. 적용 흐름 (5-단)

```text
공동 구매 상품 선정
   ↓
콘텐츠 · POP · QR · 디지털 사이니지 자료 제공
   ↓
회원사 매장 실행
   ↓
시장 반응 확인
   ↓
자체 상품 / PB / 공동 행사로 확장
```

> 시각 표현(카드 + 화살표 / stepper / 가로 띠)은 구현자 자율. `/o4o/competitiveness` 와 `/o4o/cases/{slug}` 패턴 재활용 권장.

---

## 8. 대표 사례 연결

사례 카드 1 개로 연결.

| 항목 | 내용 |
|------|------|
| 사례 제목 | 약국 협동조합: 공동 구매에서 자체 상품까지 |
| slug | `pharmacy-cooperative` |
| 카드 요약 | 회원 약국들이 공동 구매는 이미 운영하지만 매장 안 판매 콘텐츠와 자체 상품은 부족합니다. O4O는 공동 구매 상품에 콘텐츠·POP·QR·디지털 사이니지를 함께 제공해 회원 약국의 실행 격차를 줄입니다. |
| 자세히 보기 | `/o4o/cases/pharmacy-cooperative` |

---

## 9. 다음 단계 CTA

페이지 하단:

| 라벨 | 진입 |
|------|------|
| 내 사업에 적용해 보기 | `/o4o/apply` |
| 공통 사업자 유형 보기 | `/o4o/business` |
| 대표 사례 보기 | `/o4o/cases/pharmacy-cooperative` |

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

선행 WO (`BUSINESS-LANDING-COMMON-V1`, `CASE-PAGES-V1`) 의 main 반영 여부 확인. 미반영 시 본 WO 시작 전 반영 완료 대기.

---

## 12. 커밋·푸시 규칙

- **본인 변경 파일만 staging** — `git add .` 금지, 파일 명시
- 예상 파일:
  - `services/web-neture/src/pages/o4o/O4OBusinessCooperativePage.tsx` (신규)
  - `services/web-neture/src/pages/o4o/O4OBusinessLandingPage.tsx` (사업자 연합체 카드 진입 링크 활성화)
  - `services/web-neture/src/App.tsx` (라우트)
- 예상 밖 변경 파일이 staging 후보에 등장하면 중단 후 보고

**커밋 메시지**

```
feat(neture): WO-O4O-NETURE-BUSINESS-LANDING-COOPERATIVE-V1 — 협동조합 상세 Landing 추가
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
/o4o/business/cooperative
/o4o/business
```

검증 항목:

- `/o4o/business/cooperative` 렌더링 정상
- Hero (제목·부제·강조 축·3 CTA) 표시
- 협동조합 Pain 4 항목 표시
- 3 경쟁력 (구매·상품·성장) 표시
- 적용 흐름 5-단 표시
- 대표 사례 카드 표시
- 다음 단계 CTA 3 버튼 정상 연결
- `/o4o/business` 의 사업자 연합체 카드 *"준비 중"* → 활성 링크로 전환됨
- 사업자 연합체 카드 클릭 → `/o4o/business/cooperative` 정상 진입
- 대표 사례 보기 → `/o4o/cases/pharmacy-cooperative` 정상 진입
- 내 사업에 적용해 보기 → `/o4o/apply` 정상 진입
- 모바일 (320–414px) 레이아웃 확인

### 13.3 키워드/용어 검사

- **내부 용어 단독 0** — `Event Offer`, `Market Trial`, `Operator`, `Store Execution`, `HUB`, `RBAC` (병기 허용, 단독 금지)
- **임의 수치 0** — `%`, `배`, `만 원`, `만 명` 등 0
- **"작은 사업자" 0** — 전부 "소규모 사업자"

---

## 14. 산출물

- `services/web-neture/src/pages/o4o/O4OBusinessCooperativePage.tsx` — 신규
- `services/web-neture/src/pages/o4o/O4OBusinessLandingPage.tsx` — 사업자 연합체 카드 진입 링크 활성화
- [services/web-neture/src/App.tsx](../../services/web-neture/src/App.tsx) — `/o4o/business/cooperative` 라우트 추가
- 배포 후 `/o4o/business/cooperative` 동작 + `/o4o/business` 카드 활성화 확인

---

## 15. 완료 보고 항목

1. 수정 파일 목록
2. 라우트 추가 결과
3. 빌드/타입체크 결과
4. 배포 리비전·서비스
5. 브라우저 검증 결과 (§13.2 항목별)
6. 사례 카드 연결 결과
7. `/o4o/business` 카드 활성화 확인
8. 키워드/용어 검사 결과 (§13.3)
9. 잔여 이슈 / 후속 권장 사항

---

## 16. 후속 WO

- `WO-O4O-NETURE-BUSINESS-LANDING-STORE-GROUP-V1` — 매장 그룹 상세 Landing (다음)
- (2차) `WO-O4O-NETURE-BUSINESS-LANDING-SUPPLIER-V1`
- (2차) `WO-O4O-NETURE-BUSINESS-LANDING-PROFESSIONAL-V1`
- (2차) `WO-O4O-NETURE-BUSINESS-LANDING-REGION-V1`

---

*Version: V1 (2026-05-23)*
*Status: Work Order — Implementation Ready*
