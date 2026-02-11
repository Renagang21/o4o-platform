# WO-OPERATOR-DASHBOARD-UX-V1-FREEZE

> **상태**: FREEZE (변경 금지 기준선)
> **작성일**: 2026-02-11
> **적용 범위**: O4O Platform 전체
> **성격**: Operator Dashboard UX v1 공식 표준 선언

---

## 0. 목적 (Purpose)

본 문서는 O4O Platform 전반에서 사용되는 **Operator Dashboard UX v1**을
공식 기준선(Frozen Baseline)으로 고정하기 위한 문서이다.

이 기준선은 **운영자의 판단 속도와 일관성**을 최우선 목표로 하며,
이후 신규 서비스·기능 추가 시 **재설계·확장·변형을 허용하지 않는다.**

---

## 1. 적용 범위 (Scope)

본 기준은 아래 모든 서비스에 **이미 적용되었으며**,
향후 생성되는 모든 서비스에도 **의무 적용**된다.

| 서비스 | 적용 상태 |
|--------|-----------|
| KPA-a (커뮤니티) | ✅ |
| KPA-b (지부/분회 데모) | ✅ |
| KPA-c (독립 분회 서비스) | ✅ |
| GlycoPharm | ✅ |
| Neture | ✅ |
| K-Cosmetics | ✅ |
| 향후 신규 서비스 | **의무 적용** |

---

## 2. Operator Dashboard의 역할 정의

### 핵심 정의

> **Operator Dashboard는 관리 화면이 아니다.**
> **운영자가 3초 안에 '지금 개입이 필요한가'를 판단하기 위한 신호판이다.**

### 명확한 책임 범위

- Operator Dashboard는 **판단만 제공**
- 실제 설정 변경, 정책 결정, 구조 수정은 **다른 화면에서 수행**
- AI는 **제안만 가능**, 자동 실행은 허용하지 않음

---

## 3. UX 구조 (고정 — 변경 금지)

### 3-1. Hero Summary (필수)

- 상태: **정상 / 주의 / 점검 필요** (3단계 고정)
- 상태 라벨 + **서브 메시지 필수**
- StatusDot **3개 고정**
  - 서비스별 의미는 다르나 구조는 동일

### 3-2. Action Signal Cards (3개 고정)

| 항목 | 규칙 |
|------|------|
| 카드 수 | **항상 3개** |
| 목적 | 판단 → 즉시 이동 |
| 구성 | 상태 라벨 + 판단 문구 + 이동 링크 |
| 서비스별 차이 | **문구와 연결 경로만 다름** |

예시 영역 (서비스별 명칭만 변경):
- 포럼 / 콘텐츠 / 운영자
- 매장 / 주문 / 운영
- 파트너 / 콘텐츠 / 커뮤니티 등

### 3-3. Recent Activity (참고 영역)

- 최대 **5건**
- 콘텐츠 + 포럼 + 기타 이벤트 혼합 가능
- **판단 기준으로 사용 금지**
- 보조 정보 성격만 허용

---

## 4. 명시적 금지 사항 (절대 금지)

다음 항목은 **UX v1 기준선에서 금지**된다.

- 숫자 KPI 나열형 대시보드
- 그래프/차트 중심 구성
- 카드 4개 이상 확장
- Operator Dashboard에서 설정/정책 변경
- 자동 조치(AI가 실행하는 행동)
- 서비스별 독자적 Operator UX 설계

---

## 5. AI 사용 원칙 (Freeze)

- AI는 **판단 보조만 가능**
- 상태 요약, 신호 해석, 문구 제안 허용
- **자동 적용 / 자동 실행 / 자동 전환 전부 금지**
- AI 기능 확장은 **v2 논의 대상**

---

## 6. 기존 대시보드 처리 원칙

- 기존 숫자 나열형 대시보드는 **삭제하지 않음**
- `/overview`, `/cockpit` 등 보존 경로 유지
- 기본 진입점은 **항상 Signal 기반 Operator Dashboard**

---

## 7. 개발 규칙 반영

### 필수 반영

- `CLAUDE.md` — Operator Dashboard UX v1 Freeze 항목 추가
- `AGENTS.md` — 신규 서비스 생성 체크리스트에 포함

### 향후 모든 WO 작성 시 포함 문구

> "본 작업은 Operator Dashboard UX v1 기준선을 변경하지 않는다."

---

## 8. 종료 선언 (Freeze 선언)

본 문서 작성 시점을 기준으로
**Operator Dashboard UX v1은 설계·구현·적용이 완료되었으며,
추가 변경 없이 운영 단계로 진입한다.**

---

## 구현 파일 목록

### 신규 생성

| 서비스 | 파일 | WO |
|--------|------|-----|
| KPA-a | `web-kpa-society/src/pages/operator/KpaOperatorDashboard.tsx` | WO-KPA-A-OPERATOR-DASHBOARD-UX-V1 |
| KPA-c | `web-kpa-society/src/pages/branch-operator/BranchOperatorDashboard.tsx` | WO-KPA-C-BRANCH-OPERATOR-DASHBOARD-UX-V1 |
| GlycoPharm | `web-glycopharm/src/pages/operator/GlycoPharmOperatorDashboard.tsx` | WO-GLYCOPHARM-OPERATOR-DASHBOARD-UX-V1 |
| Neture | `web-neture/src/pages/operator/NetureOperatorDashboard.tsx` | WO-NETURE-OPERATOR-DASHBOARD-UX-V1 |
| K-Cosmetics | `web-k-cosmetics/src/pages/operator/KCosmeticsOperatorDashboard.tsx` | WO-K-COSMETICS-OPERATOR-DASHBOARD-UX-V1 |

### 수정 (라우트 교체)

| 서비스 | 파일 | 변경 내용 |
|--------|------|----------|
| KPA-a | `web-kpa-society/src/routes/OperatorRoutes.tsx` | index → KpaOperatorDashboard |
| KPA-a | `web-kpa-society/src/pages/operator/index.ts` | export 추가 |
| GlycoPharm | `web-glycopharm/src/App.tsx` | index → GlycoPharmOperatorDashboard, legacy → /cockpit |
| Neture | `web-neture/src/App.tsx` | index → NetureOperatorDashboard, legacy → /overview |
| Neture | `web-neture/src/pages/operator/index.ts` | export 추가 |
| K-Cosmetics | `web-k-cosmetics/src/App.tsx` | index → KCosmeticsOperatorDashboard, legacy → /overview |

---

## 다음 단계 (Freeze 이후)

- Option A: **Admin Dashboard — 서비스 단위 Signal 요약**
- Option B: **Operator UX v2 (AI 판단 보조 확장)**
  → 최소 운영 데이터 확보 후 논의

---

*Frozen: 2026-02-11*
*Version: 1.0*
