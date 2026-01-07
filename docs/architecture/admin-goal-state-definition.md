# Admin Goal State Definition v1.0

> **Work Order ID**: WO-ADMIN-GOAL-STATE-DEFINITION-V1
> **Status**: APPROVED & FIXED
> **Date**: 2026-01-07
> **Type**: Definition (Decision & Boundary Fixing Only)

---

## 1. Admin Goal State (확정)

> **관리자(admin.neture.co.kr)는
> "플랫폼 운영자가
> 여러 서비스를 한 눈에 이해하고,
> 필요한 결정을 내리고,
> 그 결정의 결과를 추적할 수 있는
> 운영 중심 콘솔"이다.**

이 문장은 모든 Admin 작업의 **합격/탈락 기준**이다.

---

## 2. 핵심 결정 사항 (FIXED)

### 2.1 Yaksa Hub → 서비스 관리 도구

| 항목 | 결정 |
|------|------|
| 역할 | **서비스 관리 도구** |
| 정의 | 일반 서비스(약사회 SaaS)의 관리 화면 |
| 범위 | 기능설정, 콘텐츠관리 중심 |
| 제외 | 조직 포털 기능 (별도 서비스로 분리 필요) |

**영향**:
- Yaksa Hub는 다른 서비스 관리 도구와 동일한 패턴 적용
- 조직(지부/분회) 운영 기능은 별도 설계 필요
- Admin 메뉴 구조 단순화

---

### 2.2 Membership → 플랫폼 범용 Core

| 항목 | 결정 |
|------|------|
| 범위 | **플랫폼 범용 Core** |
| 정의 | 모든 서비스에서 사용 가능한 공통 회원/멤버십 시스템 |
| 위치 | Admin Core 메뉴 |
| 확장 | 서비스별 확장은 Extension 패턴으로 처리 |

**영향**:
- Membership은 Core 기능으로 Admin에 통합
- KPA 전용 기능은 Yaksa Extension으로 분리
- 공통 회원 관리 UI 단일화

---

### 2.3 Site Builder → 각 서비스 내부 도구

| 항목 | 결정 |
|------|------|
| 위치 | **각 서비스(App) 내부** |
| 정의 | Admin Core에서 제외 |
| 관리 | 각 서비스가 자체 Site Builder 관리 |
| Admin 역할 | 없음 (서비스 내부 책임) |

**영향**:
- Admin 복잡도 대폭 감소
- Site Builder 관련 Admin 메뉴 제거 대상
- 각 서비스는 자체 사이트 관리 도구 보유

---

### 2.4 Reporting → 의사결정 요약 도구

| 항목 | 결정 |
|------|------|
| 목적 | **의사결정 요약 도구** |
| 정의 | 운영자가 판단을 내릴 수 있는 요약/대시보드 중심 |
| 범위 | KPI, 트렌드, 알림 요약 |
| 제외 | Raw Data 조회, 상세 로그 열람 |

**영향**:
- Reporting은 대시보드/요약 화면으로 제한
- 상세 데이터 조회는 Admin 범위 아님
- 개발자용 로그 조회 UI 제거 대상

---

## 3. Admin 책임 경계 (Boundary)

### 3.1 Admin이 하는 것 ✅

| 영역 | 설명 |
|------|------|
| 서비스 상태 모니터링 | 여러 서비스의 건강 상태 한 눈에 확인 |
| 사용자/권한 관리 | 플랫폼 전체 사용자 및 역할 관리 |
| 공통 설정 관리 | 플랫폼 레벨 설정 (테마, 환경 등) |
| 의사결정 지원 | KPI, 요약 리포트, 알림 |
| App/Extension 관리 | AppStore 기반 앱 설치/활성화 |

### 3.2 Admin이 하지 않는 것 ❌

| 영역 | 이유 |
|------|------|
| 개발자 디버깅 도구 | 운영자용 아님 |
| 로그 원본 조회 | Raw Data는 Admin 범위 아님 |
| 실험적 기능 토글 UI | 안정성 보장 필요 |
| 서비스 내부 전용 설정 | 각 서비스 책임 |
| Site Builder | 서비스 내부 도구로 이동 |
| 조직 포털 기능 | 별도 서비스로 분리 |

---

## 4. 후속 작업 결정

### 4.1 재설계 대상 (🔴)

| 대상 | 작업 |
|------|------|
| Yaksa Hub 메뉴 구조 | 서비스 관리 도구 패턴으로 재구성 |
| Reporting 메뉴 | 대시보드 중심으로 재설계 |
| 조직 관리 기능 | Yaksa Hub에서 분리, 별도 설계 |

### 4.2 삭제 대상 (❌)

| 대상 | 이유 |
|------|------|
| Site Builder 메뉴 | 서비스 내부로 이동 |
| Site Instances 메뉴 | 존재하지 않는 페이지 |
| Notifications 메뉴 | 존재하지 않는 페이지 |
| Logs 메뉴 | Admin 범위 아님 (개발자 도구) |

### 4.3 유지 대상 (⭕)

| 대상 | 상태 |
|------|------|
| 서비스별 Admin 페이지 | 유지 |
| CMS V2 | 유지 |
| AppStore | 유지 |
| 인증/권한 관리 | 유지 (Core) |
| Membership | 유지 (Core로 통합) |

---

## 5. 실행 완료 Work Order

### 5.1 WO-ADMIN-LEGACY-CLEANUP-V2 ✅ (완료: 2026-01-07)

삭제 완료 항목:
- Site Builder 메뉴 및 페이지 폴더
- Site Instances 메뉴
- Notifications 메뉴 및 페이지
- Logs 메뉴
- deployment 페이지 폴더
- SiteBuilderTest 테스트 페이지

### 5.2 WO-ADMIN-ARCHITECTURE-RESTRUCTURE-V1 ✅ (완료: 2026-01-07)

재구성 완료 항목:
- Admin 메뉴 3영역 구조로 재정렬 (Core / Services / Insights)
- Membership을 Core 영역으로 통합
- Yaksa Hub를 Services 영역의 서비스 관리 도구로 재구성
- Reporting을 Insights 영역의 대시보드 중심 도구로 재배치
- 서비스별 메뉴 통합 (Applications → 각 서비스 하위로 이동)

### 5.3 최종 메뉴 구조 (v2.0)

```
Admin
├─ Overview (Dashboard)
├─ Core
│  ├─ Users & Roles
│  ├─ Membership (Dashboard, Members, Verifications)
│  └─ Platform Settings
├─ CMS (Post Types, Fields, Views, Pages)
├─ AppStore (Browse Apps, Installed Apps)
├─ Services ─────────────────────────────
│  ├─ Yaksa (KPA) - Service Dashboard, Forum, AI Insight, CGM
│  ├─ Glycopharm - Pharmacies, Products, Applications
│  ├─ GlucoseView - Vendors, Profiles, Connections, Applications
│  ├─ K-Cosmetics - Dashboard, Links, Routines, Earnings, Commissions
│  ├─ Neture - Products, Partners
│  └─ Digital Signage - Operations, Displays, Media, Schedules
└─ Insights ─────────────────────────────
   ├─ Content Manager
   └─ Reports (Overview, Submissions, Templates)
```

---

## 6. 판단 기준 체크리스트

새로운 Admin 기능 추가 시 다음 질문에 모두 "Yes"여야 함:

- [ ] 운영자(비개발자)가 사용할 기능인가?
- [ ] 플랫폼 전체 또는 다수 서비스에 영향을 미치는가?
- [ ] 의사결정 또는 운영 행위를 지원하는가?
- [ ] Raw Data가 아닌 요약/판단 정보를 제공하는가?
- [ ] 기존 Goal State 정의와 충돌하지 않는가?

---

## 7. 서명

이 문서는 Admin 재설계의 **헌법**이다.
이 문서 없이 Admin 작업을 시작하지 않는다.

**Approved**: 2026-01-07
**Version**: 1.1
**Status**: IMPLEMENTED (모든 Work Order 완료)
**Last Updated**: 2026-01-07
