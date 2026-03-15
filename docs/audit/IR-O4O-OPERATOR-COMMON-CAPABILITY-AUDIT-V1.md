# IR-O4O-OPERATOR-COMMON-CAPABILITY-AUDIT-V1

> **O4O Platform — Operator / Admin 공통 Capability 조사 보고서**
> Date: 2026-03-15
> Status: Investigation Complete
> Supersedes: IR-O4O-OPERATOR-DASHBOARD-AUDIT-V1 (범위 확장 + KPA 분리 + GlucoView 추가)

---

## 1. 조사 목적

O4O 플랫폼의 운영자(Admin / Operator) 구조가 서비스마다 일관되지 않으며, 다음 문제가 발견된다:

- Admin / Operator 기능 역전
- Admin / Operator 라우트 미분리
- Deprecated 메뉴 존재
- 미연결 메뉴 존재

이 조사는 **플랫폼 공통 운영자 Capability 구조를 도출**하기 위한 것이다.

---

## 2. 조사 대상

| Service | 포함 여부 | 비고 |
|---------|:--------:|------|
| neture | O | |
| k-cosmetics | O | |
| glycopharm | O | |
| glucoseview | O | |
| kpa-a (Platform Admin/Operator) | O | |
| kpa-b (Branch Operator) | O | Operator만 조사 |
| kpa-b (Branch Admin/지부 운영자) | **X** | 플랫폼 공통 구조와 상이 |
| kpa-c (Intranet) | O | |

**KPA-b 지부 Admin 제외 이유**: 회원 가입 승인 없음, 분회 가입 시 자동 지부 가입, 리스트 관리 중심 — 플랫폼 공통 Capability 분석 왜곡 가능.

---

## 3. 조사 1 — Dashboard Route

| Service | Admin Route | Operator Route | 분리 여부 | 비고 |
|---------|-----------|---------------|:--------:|------|
| **Neture** | `/workspace/admin` | `/workspace/operator` | YES | ROUTE_OVERRIDES 사용 |
| **GlycoPharm** | `/admin` | `/admin` | **NO** | 동일 경로, AdminIndexRedirect에서 내부 분기 |
| **K-Cosmetics** | `/admin` | `/operator` | YES | 표준 매핑 |
| **GlucoView** | `/admin` (단일 페이지) | `/operator` | YES | Admin은 단일 페이지, Operator가 실제 관리 |
| **KPA-a** | `/demo/admin` | `/operator` | YES | Admin→구조 관리, Operator→운영 관리 |
| **KPA-b Operator** | — | `/branch-services/:id/operator` | — | Branch 단위 |
| **KPA-c** | — | `/intranet` (+ `/intranet/operator`) | — | 조직 단위 |

### Route 문제

| # | 문제 | 서비스 | 설명 |
|---|------|--------|------|
| R1 | Admin/Operator 동일 경로 | GlycoPharm | 둘 다 `/admin` → 역할 혼동 가능 |
| R2 | Admin 단일 페이지 | GlucoView | `/admin` = 단일 승인 페이지, 실질적 관리는 `/operator` |

---

## 4. 조사 2 — Dashboard Menu

### 4.1 Neture

| Role | 메뉴 수 | 주요 메뉴 |
|------|:------:|----------|
| Admin | 27 | 대시보드, 운영자, 문의메시지, 공급자승인/목록, 상품승인/Masters/Import, 파트너목록/정산, 정산/수수료, 커뮤니티, AI대시보드/카드규칙/비즈니스팩, 이메일설정 |
| Operator | 10 | 대시보드, 가입승인, 공급현황, 사이니지, CMS, 포럼관리, AI리포트/카드리포트/운영/AssetQuality, 알림설정 |

### 4.2 GlycoPharm

| Role | 메뉴 수 | 주요 메뉴 |
|------|:------:|----------|
| Admin | 4 | 대시보드, 약국네트워크, 회원관리, 설정 |
| Operator | 23 | 대시보드, 신청관리, 상품관리, 주문관리, 재고/공급, 정산관리, 분석/리포트, 청구리포트/미리보기/인보이스, 마케팅, 포럼신청/관리, Trial관리, 콘텐츠허브/라이브러리/사이니지/HQ미디어/플레이리스트/템플릿, 고객지원, AI리포트, 회원관리 |

### 4.3 K-Cosmetics

| Role | 메뉴 수 | 주요 메뉴 |
|------|:------:|----------|
| Admin | 4 | 대시보드, 매장네트워크, 회원관리, 설정 |
| Operator | 16 | 대시보드, 내매장, 신청관리, 상품관리, 주문관리, 재고/공급, 정산관리, 분석/리포트, 마케팅, 사이니지콘텐츠/HQ미디어/플레이리스트/템플릿, 고객지원, AI리포트, 회원관리 |

### 4.4 GlucoView

| Role | 메뉴 수 | 주요 메뉴 |
|------|:------:|----------|
| Admin | 1 | 단일 승인 페이지 (+ admin-dashboard에서 Vendor/ViewProfile/Connection 관리) |
| Operator | 5 | 신청관리, 회원관리, 상품관리, 매장관리, AI리포트 |

### 4.5 KPA-a

| Role | 메뉴 수 | 주요 메뉴 |
|------|:------:|----------|
| Admin | 11 | 대시보드, 플랫폼운영, 분회관리, 회원관리, 위원회관리, 신상신고, 연회비, 임원관리, 설정 |
| Operator | 24 | 대시보드(5-Block), 커뮤니티관리, 포럼관리/분석, 콘텐츠관리, 사이니지(콘텐츠허브/HQ미디어/플레이리스트/템플릿), 법률관리, 감사로그, 뉴스, 자료실, 포럼, 회원관리, 조직가입요청, 약국서비스신청, 상품신청관리, 매장관리/상세, 채널관리, 운영자관리, AI리포트 |

### 4.6 KPA-b Operator

| Role | 메뉴 수 | 주요 메뉴 |
|------|:------:|----------|
| Branch Operator | 10 | 대시보드(5-Block), 포럼관리, 사이니지콘텐츠, 운영자관리, 뉴스, 포럼, 자료실 |

### 4.7 KPA-c (Intranet)

| Role | 메뉴 수 | 주요 메뉴 |
|------|:------:|----------|
| Intranet Operator | 17 | 대시보드(7-Section), 공지, 일정, 문서, 사이니지콘텐츠, 회의, 공동구매, 운영자대시보드, 피드백, 조직설정 |

---

## 5. 조사 3 — Capability Mapping

### 전체 Capability 목록

각 서비스 메뉴를 기능 단위(Capability)로 매핑한다.

| # | Capability | Neture Admin | Neture Oper | Glyco Admin | Glyco Oper | KCos Admin | KCos Oper | GlucoV Oper | KPA-a Admin | KPA-a Oper | KPA-b Oper | KPA-c |
|---|-----------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| C01 | **User/Member Management** | O | — | O | O | O | O | O | O | O | — | — |
| C02 | **Registration/Approval** | — | O | O | O | — | O | O | — | O | — | — |
| C03 | **Content CMS** | — | O | — | — | — | — | — | — | O | O | O |
| C04 | **Forum Management** | — | O | — | O | — | — | — | — | O | O | — |
| C05 | **Signage/Media** | — | O | — | O | — | O | — | — | O | O | O |
| C06 | **AI/Analytics** | O | O | — | O | — | O | O | — | O | — | — |
| C07 | **System Settings** | O | O | O | — | O | — | — | O | — | — | O |
| C08 | **Store Management** | — | — | — | — | — | O | O | — | O | — | — |
| C09 | **Product Management** | O | — | — | O | — | O | O | — | O | — | — |
| C10 | **Order Management** | O | — | — | O | — | O | — | — | — | — | — |
| C11 | **Settlement/Finance** | O | — | — | O | — | O | — | O | — | — | O |
| C12 | **Supplier/Vendor Mgmt** | O | — | — | — | — | — | — | — | — | — | — |
| C13 | **Partner Management** | O | — | — | — | — | — | — | — | — | — | — |
| C14 | **Marketing** | — | — | — | O | — | O | — | — | — | — | — |
| C15 | **Community Hub** | O | — | — | — | — | — | — | — | O | — | — |
| C16 | **Support/CS** | — | — | — | O | — | O | — | — | — | — | — |
| C17 | **Legal Management** | — | — | — | — | — | — | — | — | O | — | — |
| C18 | **Audit Log** | — | — | — | — | — | — | — | — | O | — | — |
| C19 | **Organization Structure** | — | — | O | — | O | — | — | O | — | — | O |
| C20 | **LMS/Education** | — | — | — | — | — | — | — | — | — | — | O |
| C21 | **Group Buy** | — | — | — | — | — | — | — | — | — | — | O |
| C22 | **Meeting/Schedule** | — | — | — | — | — | — | — | — | — | — | O |
| C23 | **Operator Management** | — | — | — | — | — | — | — | — | O | O | — |

---

## 6. 조사 4 — Capability 분류

### COMMON (3개 이상 서비스에 존재)

| # | Capability | 존재 서비스 | 비고 |
|---|-----------|-----------|------|
| C01 | **User/Member Management** | Neture, GlycoPharm, K-Cosmetics, GlucoView, KPA-a | 가장 보편적 |
| C02 | **Registration/Approval** | Neture, GlycoPharm, K-Cosmetics, GlucoView, KPA-a | 가입/신청 승인 |
| C05 | **Signage/Media** | Neture, GlycoPharm, K-Cosmetics, KPA-a, KPA-b, KPA-c | 6개 서비스 공통 |
| C06 | **AI/Analytics** | Neture, GlycoPharm, K-Cosmetics, GlucoView, KPA-a | 5개 서비스 공통 |
| C07 | **System Settings** | Neture, GlycoPharm, K-Cosmetics, KPA-a, KPA-c | 5개 서비스 |
| C09 | **Product Management** | Neture, GlycoPharm, K-Cosmetics, GlucoView, KPA-a | 5개 서비스 |
| C04 | **Forum Management** | Neture, GlycoPharm, KPA-a, KPA-b | 4개 서비스 |
| C03 | **Content CMS** | Neture, KPA-a, KPA-b, KPA-c | 4개 서비스 |
| C08 | **Store Management** | K-Cosmetics, GlucoView, KPA-a | 3개 서비스 |
| C10 | **Order Management** | Neture, GlycoPharm, K-Cosmetics | 3개 서비스 |
| C11 | **Settlement/Finance** | Neture, GlycoPharm, K-Cosmetics, KPA (연회비) | 3~4개 서비스 |

### SERVICE_SPECIFIC (1~2개 서비스에만 존재)

| # | Capability | 서비스 | 비고 |
|---|-----------|--------|------|
| C12 | Supplier/Vendor Management | Neture | Neture 고유 공급자 구조 |
| C13 | Partner Management | Neture | Neture 고유 파트너 구조 |
| C14 | Marketing | GlycoPharm, K-Cosmetics | 마케팅 메뉴 |
| C15 | Community Hub (Ads/Sponsors) | Neture, KPA-a | 커뮤니티 광고/스폰서 |
| C16 | Support/CS | GlycoPharm, K-Cosmetics | 고객지원 |
| C17 | Legal Management | KPA-a | 약관/정책 관리 |
| C18 | Audit Log | KPA-a | 감사 로그 |
| C19 | Organization Structure | GlycoPharm(Admin), K-Cosmetics(Admin), KPA-a(Admin), KPA-c | 조직/분회/네트워크 구조 관리 |
| C20 | LMS/Education | KPA-c | 연수교육 (Intranet 연동) |
| C21 | Group Buy | KPA-c | 공동구매 (KPA 특화) |
| C22 | Meeting/Schedule | KPA-c | 회의/일정 (Intranet 특화) |
| C23 | Operator Management | KPA-a, KPA-b | 운영자 계정 관리 |

### DEPRECATED

| # | 메뉴 | 서비스 | 상태 |
|---|------|--------|------|
| D1 | 주문 관리 | GlycoPharm Operator | Backend deprecated ("Phase 4-A: Legacy deprecated, returns empty") |
| D2 | 재고/공급 | GlycoPharm Operator | Backend 부분 구현 |
| D3 | `/demo/admin` 경로 | KPA-a Admin | Legacy demo prefix 잔존 |

---

## 7. 조사 5 — Admin / Operator 역할 구조

| Service | Admin 메뉴 | Operator 메뉴 | 역전 여부 | Admin 역할 | Operator 역할 |
|---------|:---------:|:------------:|:---------:|-----------|--------------|
| **Neture** | 27 | 10 | **정상** | 플랫폼 관리 (공급자, 상품, 파트너, 정산) | 운영 (가입, 콘텐츠, 포럼, AI) |
| **GlycoPharm** | 4 | 23 | **역전** | 구조 관리만 (약국, 회원, 설정) | 전체 운영 |
| **K-Cosmetics** | 4 | 16 | **역전** | 구조 관리만 (매장, 회원, 설정) | 전체 운영 |
| **GlucoView** | 1 | 5 | **역전** | 승인 페이지만 | 전체 운영 |
| **KPA-a** | 11 | 24 | **역전** | 조직 구조 관리 | 전체 운영 |
| **KPA-b Oper** | — | 10 | — | (제외) | Branch 운영 |
| **KPA-c** | — | 17 | — | — | 조직 운영 |

### 역전 분석

**Neture만 정상** — Admin이 플랫폼 관리 권한을 갖고, Operator가 일상 운영 수행.

**나머지 4개 서비스(GlycoPharm, K-Cosmetics, GlucoView, KPA-a)**: Admin = "구조 관리자", Operator = "실무 운영자"로 설계됨. 기능 수로만 보면 역전이나, **의도적 설계**일 가능성 높음.

- **Admin**: 네트워크/조직 구조 관리 (드물게 변경)
- **Operator**: 일상 운영 관리 (매일 사용)

이 패턴이 의도적이라면, 명칭보다는 **기능 분담의 명확성**이 중요.

---

## 8. 조사 6 — Routing 문제

| # | 문제 | 서비스 | 설명 | 심각도 |
|---|------|--------|------|:------:|
| R1 | Admin/Operator 동일 라우트 | GlycoPharm | 둘 다 `/admin` → 역할 혼동 | HIGH |
| R2 | Admin 사실상 미사용 | GlucoView | `/admin` = 단일 페이지, 실질 관리는 admin-dashboard 앱에서 수행 | MEDIUM |
| R3 | Demo prefix 잔존 | KPA-a | `/demo/admin/*` → production에서 `/demo` prefix 부적절 | LOW |
| R4 | RoleGuard 누락 없음 | 전체 | 모든 operator/admin 라우트에 RoleGuard 적용 확인 | OK |

---

## 9. 최종 산출물

### 9.1 서비스별 운영자 구조 요약

| Service | Admin 메뉴 | Operator 메뉴 | 분리 여부 | 평가 |
|---------|:---------:|:------------:|:---------:|:----:|
| **Neture** | 27 | 10 | 완전 분리 | 정상 |
| **GlycoPharm** | 4 | 23 | 미분리 (`/admin` 공유) | 정비 필요 |
| **K-Cosmetics** | 4 | 16 | 분리 | 정상 (역할 명확화 필요) |
| **GlucoView** | 1 | 5 | 분리 | 정상 (Admin 최소화 의도적) |
| **KPA-a** | 11 | 24 | 분리 | 정상 (구조/운영 분리) |
| **KPA-b Oper** | — | 10 | — | 정상 (Branch 단위) |
| **KPA-c** | — | 17 | — | 정상 (조직 단위) |

### 9.2 플랫폼 공통 Capability (COMMON)

운영자 플랫폼이 **기본으로 제공해야 하는 Capability**:

```
1. User/Member Management     — 회원 관리
2. Registration/Approval       — 가입/신청 승인
3. Signage/Media Console       — 사이니지/미디어 관리
4. AI/Analytics                — AI 리포트/분석
5. System Settings             — 시스템 설정
6. Product Management          — 상품 관리
7. Forum Management            — 포럼 관리
8. Content CMS                 — 콘텐츠 관리 (뉴스, 자료실)
9. Store Management            — 매장 관리
10. Order Management           — 주문 관리
11. Settlement/Finance         — 정산/재무 관리
```

### 9.3 서비스 특화 Capability (SERVICE_SPECIFIC)

```
Neture:       Supplier Management, Partner Management
GlycoPharm:   Marketing, Support/CS
K-Cosmetics:  Marketing, Support/CS
KPA-a:        Legal Management, Audit Log, Community Hub, Operator Management
KPA-c:        LMS/Education, Group Buy, Meeting/Schedule, Organization Structure
GlucoView:    Vendor Management (admin-dashboard 앱 경유)
```

### 9.4 Deprecated 메뉴

```
GlycoPharm Operator:  주문 관리 (Backend deprecated)
GlycoPharm Operator:  재고/공급 (Backend 부분 구현)
KPA-a Admin:          /demo/admin 경로 (demo prefix 잔존)
```

---

## 10. 다음 단계 권장

### Phase 1: 라우팅 정비

**WO-O4O-DASHBOARD-ROUTING-NORMALIZE-V1**
- GlycoPharm: Admin/Operator 라우트 분리 (`/admin` vs `/operator`)
- KPA-a: `/demo/admin` → `/admin` 경로 정리

### Phase 2: Admin/Operator 역할 명확화

**WO-O4O-ADMIN-OPERATOR-ROLE-CLARIFICATION-V1**
- 각 서비스에서 Admin = "구조 관리자" vs Operator = "운영 관리자" 역할 정의 표준화
- GlycoPharm/K-Cosmetics Admin 기능 보강 또는 역할 의도 문서화

### Phase 3: 공통 Capability 플랫폼화

**WO-O4O-OPERATOR-COMMON-CAPABILITY-PLATFORM-V1**
- 11개 COMMON Capability를 플랫폼 표준 모듈로 정의
- 각 서비스는 COMMON + SERVICE_SPECIFIC 조합으로 대시보드 구성
- Deprecated 메뉴 제거

---

*End of IR-O4O-OPERATOR-COMMON-CAPABILITY-AUDIT-V1*
