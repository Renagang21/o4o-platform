# OPERATOR_UI_REALIGNMENT_V1

> **O4O Platform — Admin / Operator UI 재정렬 설계**
>
> WO-O4O-OPERATOR-UI-REALIGNMENT-V1
>
> Status: **Design Complete**
> Version: 1.0
> Created: 2026-02-17

---

## 0. 이 문서의 지위

이 문서는 `ADMIN_OPERATOR_ROLE_POLICY_V1`에서 정의한 권한 철학을
**UI 메뉴 구조에 반영하기 위한 설계 분석**이다.

- 코드 수정 없음. 설계 분석만 수행.
- 구현은 별도 Work Order로 분리.

### 분류 기준

| 분류 | 정의 | 예시 |
|------|------|------|
| **구조 (S)** | 생성/삭제/정책/역할/기준 설정 | 카테고리 생성, 역할 부여, 설정 변경 |
| **상태 (O)** | 일상 운영/CRUD/처리/조회 | 콘텐츠 관리, 주문 처리, 리포트 조회 |
| **공통 (C)** | Admin/Operator 모두 접근 | 대시보드, 기본 조회 |

### 판정 기준

```
Admin (구조) = 이 기능이 없으면 서비스 구조가 달라지는가?
Operator (상태) = 이 기능이 없어도 서비스 구조는 동일한가?
```

---

## 1. Neture — 현재 메뉴 분석

### 1.1 Admin 영역 (`/workspace/admin`)

| # | 메뉴 | 경로 | 분류 | 판정 |
|---|------|------|------|------|
| 1 | 사용자 관리 | `/admin/users` | **S** | Admin 유지 |
| 2 | 상품 관리 | `/admin/products` | O | **Operator로 이동 권장** |
| 3 | 주문 관리 | `/admin/orders` | O | **Operator로 이동 권장** |
| 4 | 공급자 관리 | `/admin/suppliers` | S | Admin 유지 |
| 5 | 판매자 관리 | `/admin/sellers` | S | Admin 유지 |
| 6 | 시스템 설정 | `/admin/settings` | S | Admin 유지 |
| 7 | AI 엔진 설정 | `/admin/ai/engines` | S | Admin 유지 |
| 8 | AI 정책 | `/admin/ai/policy` | S | Admin 유지 |
| 9 | 자산 품질 | `/admin/ai/asset-quality` | O | **Operator로 이동 권장** |
| 10 | 비용 관리 | `/admin/ai/cost` | S | Admin 유지 |
| 11 | Context 자산 | `/admin/ai/context-assets` | S | Admin 유지 |
| 12 | 답변 합성 규칙 | `/admin/ai/composition-rules` | S | Admin 유지 |
| 13 | AI 카드 리포트 | `/admin/ai-card-report` | O | **Operator로 이동 권장** |
| 14 | AI 비즈니스팩 | `/admin/ai-business-pack` | S | Admin 유지 |
| 15 | AI 운영 | `/admin/ai-operations` | O | **Operator로 이동 권장** |
| 16 | 운영자 관리 | `/admin/operators` | S | Admin 유지 |
| 17 | 이메일 설정 | `/admin/settings/email` | S | Admin 유지 |

### 1.2 Operator 영역 (`/workspace/operator`)

| # | 메뉴 | 경로 | 분류 | 판정 |
|---|------|------|------|------|
| 1 | 대시보드 | `/operator` | C | Operator 유지 |
| 2 | AI 리포트 | `/operator/ai-report` | O | Operator 유지 |
| 3 | 알림 설정 | `/operator/settings/notifications` | O | Operator 유지 |
| 4 | 가입 요청 | `/operator/registrations` | O | Operator 유지 |
| 5 | 포럼 관리 | `/operator/forum-management` | O | Operator 유지 |
| 6 | 공급 대시보드 | `/operator/supply` | O | Operator 유지 |

### 1.3 불일치 요약

| 불일치 | 현재 위치 | 권장 위치 | 사유 |
|--------|----------|----------|------|
| 상품 관리 | Admin | **Operator** | 상품 CRUD는 상태 관리 |
| 주문 관리 | Admin | **Operator** | 주문 처리는 상태 관리 |
| AI 자산 품질 | Admin | **Operator** | 품질 모니터링은 운영 |
| AI 카드 리포트 | Admin | **Operator** | 리포트 조회는 운영 |
| AI 운영 | Admin | **Operator** | 일상 AI 운영은 상태 |

**불일치 5건** / 전체 23건 = **22% 불일치율**

---

## 2. GlycoPharm — 현재 메뉴 분석

### 2.1 Operator 영역 (`/operator`)

GlycoPharm은 Admin 영역이 **없다** (Operator만 존재).

| # | 메뉴 | 경로 | 분류 | 판정 |
|---|------|------|------|------|
| 1 | 대시보드 | `/operator` | C | 유지 |
| 2 | 약국 네트워크 | `/operator/pharmacies` | S | **Admin 분리 권장** |
| 3 | 신청 관리 | `/operator/applications` | O | 유지 |
| 4 | 상품 관리 | `/operator/products` | O | 유지 |
| 5 | 주문 관리 | `/operator/orders` | O | 유지 |
| 6 | 재고/공급 | `/operator/inventory` | O | 유지 |
| 7 | 정산 관리 | `/operator/settlements` | O | 유지 |
| 8 | 분석/리포트 | `/operator/analytics` | O | 유지 |
| 9 | 청구 리포트 | `/operator/reports` | O | 유지 |
| 10 | 청구 미리보기 | `/operator/billing-preview` | O | 유지 |
| 11 | 인보이스 | `/operator/invoices` | O | 유지 |
| 12 | 마케팅 | `/operator/marketing` | O | 유지 |
| 13 | 포럼 신청 | `/operator/forum-requests` | O | 유지 |
| 14 | 포럼 관리 | `/operator/forum-management` | O | 유지 |
| 15 | Trial 관리 | `/operator/market-trial` | O | 유지 |
| 16 | 콘텐츠 허브 | `/operator/signage/content` | O | 유지 |
| 17 | 콘텐츠 라이브러리 | `/operator/signage/library` | O | 유지 |
| 18 | 내 사이니지 | `/operator/signage/my` | O | 유지 |
| 19 | 회원 관리 | `/operator/users` | S | **Admin 분리 권장** |
| 20 | 고객지원 | `/operator/support` | O | 유지 |
| 21 | 설정 | `/operator/settings` | S | **Admin 분리 권장** |

### 2.2 불일치 요약

| 불일치 | 현재 위치 | 권장 위치 | 사유 |
|--------|----------|----------|------|
| 약국 네트워크 | Operator | **Admin** | 네트워크 구조 관리 |
| 회원 관리 | Operator | **Admin** | 역할/회원 구조 관리 |
| 설정 | Operator | **Admin** | 시스템 정책 설정 |

**불일치 3건** / 전체 21건 = **14% 불일치율**

**참고:** GlycoPharm은 Admin 영역 자체가 없어 구조성 기능이 Operator에 혼재.
Admin 영역 신설이 선행되어야 함.

---

## 3. K-Cosmetics — 현재 메뉴 분석

### 3.1 Operator 영역 (`/operator`)

K-Cosmetics도 Admin 영역이 **없다** (Operator만 존재).

| # | 메뉴 | 경로 | 분류 | 판정 |
|---|------|------|------|------|
| 1 | 대시보드 | `/operator` | C | 유지 |
| 2 | 내 매장 | `/operator/store-cockpit` | O | 유지 |
| 3 | 매장 네트워크 | `/operator/stores` | S | **Admin 분리 권장** |
| 4 | 신청 관리 | `/operator/applications` | O | 유지 |
| 5 | 상품 관리 | `/operator/products` | O | 유지 |
| 6 | 주문 관리 | `/operator/orders` | O | 유지 |
| 7 | 재고/공급 | `/operator/inventory` | O | 유지 |
| 8 | 정산 관리 | `/operator/settlements` | O | 유지 |
| 9 | 분석/리포트 | `/operator/analytics` | O | 유지 |
| 10 | 마케팅 | `/operator/marketing` | O | 유지 |
| 11 | 사이니지 콘텐츠 | `/operator/signage/content` | O | 유지 |
| 12 | 회원 관리 | `/operator/users` | S | **Admin 분리 권장** |
| 13 | 고객지원 | `/operator/support` | O | 유지 |
| 14 | 설정 | `/operator/settings` | S | **Admin 분리 권장** |

### 3.2 불일치 요약

| 불일치 | 현재 위치 | 권장 위치 | 사유 |
|--------|----------|----------|------|
| 매장 네트워크 | Operator | **Admin** | 네트워크 구조 관리 |
| 회원 관리 | Operator | **Admin** | 역할/회원 구조 관리 |
| 설정 | Operator | **Admin** | 시스템 정책 설정 |

**불일치 3건** / 전체 14건 = **21% 불일치율**

---

## 4. GlucoseView — 현재 메뉴 분석

### 4.1 Admin 영역 (`/admin`)

GlucoseView의 Admin은 단일 페이지 (대시보드만).

| # | 메뉴 | 경로 | 분류 | 판정 |
|---|------|------|------|------|
| 1 | Admin 대시보드 | `/admin` | C | 유지 |

### 4.2 Operator 영역 (`/operator/glucoseview`)

| # | 메뉴 | 경로 | 분류 | 판정 |
|---|------|------|------|------|
| 1 | 신청 목록 | `/operator/glucoseview/applications` | O | 유지 |
| 2 | 신청 상세 | `/operator/glucoseview/applications/:id` | O | 유지 |
| 3 | AI 리포트 | `/operator/glucoseview/ai-report` | O | 유지 |

### 4.3 불일치 요약

**불일치 0건.** GlucoseView는 기능이 최소화되어 현재 구조가 정책에 부합.

단, Admin 영역에 구조 관리 기능(승인 정책 설정, 회원 관리)이 **부재**하므로
향후 기능 추가 시 Admin에 배치해야 함.

---

## 5. KPA Society — 현재 메뉴 분석

### 5.1 KPA-a Hub/Operator (`/hub`, `/operator`)

| # | 메뉴 | 경로 | 분류 | 판정 |
|---|------|------|------|------|
| 1 | Hub 대시보드 | `/hub` | C | 유지 |
| 2 | AI 리포트 | `/operator/ai-report` | O | 유지 |
| 3 | 포럼 관리 | `/operator/forum-management` | O | 유지 |
| 4 | 포럼 분석 | `/operator/forum-analytics` | O | 유지 |
| 5 | 회원 관리 | `/operator/members` | S | **Admin 이동 권장** |
| 6 | 콘텐츠 관리 | `/operator/content` | O | 유지 |
| 7 | 사이니지 콘텐츠 | `/operator/signage/content` | O | 유지 |
| 8 | 법률 관리 | `/operator/legal` | S | **Admin 이동 권장** |
| 9 | 감사 로그 | `/operator/audit-logs` | O | 유지 (조회만) |
| 10 | 운영자 관리 | `/operator/operators` | S | Admin 유지 (이미 `kpa:admin` only) |

### 5.2 KPA-a Admin (`/demo/admin`)

| # | 메뉴 | 경로 | 분류 | 판정 |
|---|------|------|------|------|
| 1 | 대시보드 | `/demo/admin/dashboard` | C | 유지 |
| 2 | 플랫폼 운영 | `/demo/admin/kpa-dashboard` | C | 유지 |
| 3 | 분회 관리 | `/demo/admin/divisions` | S | 유지 |
| 4 | 회원 관리 | `/demo/admin/members` | S | 유지 |
| 5 | 위원회 관리 | `/demo/admin/committee-requests` | S | 유지 |
| 6 | 조직 가입 요청 | `/demo/admin/organization-requests` | O | **Operator 이동 권장** |
| 7 | 서비스 등록 | `/demo/admin/service-enrollments` | O | **Operator 이동 권장** |
| 8 | 간사 관리 | `/demo/admin/stewards` | S | 유지 |
| 9 | 신상신고 | `/demo/admin/annual-report` | O | **Operator 이동 권장** |
| 10 | 연회비 | `/demo/admin/fee` | S | 유지 (정책 설정) |
| 11 | 공지사항 | `/demo/admin/news` | O | **Operator 이동 권장** |
| 12 | 자료실 | `/demo/admin/docs` | O | **Operator 이동 권장** |
| 13 | 안내 영상 | `/demo/admin/signage/content` | O | **Operator 이동 권장** |
| 14 | 게시판 | `/demo/admin/forum` | O | **Operator 이동 권장** |
| 15 | 임원 관리 | `/demo/admin/officers` | S | 유지 |
| 16 | 설정 | `/demo/admin/settings` | S | 유지 |

### 5.3 KPA-b Branch Admin (`/branch-services/:id/admin`)

| # | 메뉴 | 경로 | 분류 | 판정 |
|---|------|------|------|------|
| 1 | 대시보드 | `.../admin/dashboard` | C | 유지 |
| 2 | 공지사항 | `.../admin/news` | O | **Operator 이동 권장** |
| 3 | 게시판 관리 | `.../admin/forum` | O | **Operator 이동 권장** |
| 4 | 자료실 | `.../admin/docs` | O | **Operator 이동 권장** |
| 5 | 임원 관리 | `.../admin/officers` | S | 유지 |
| 6 | 분회 설정 | `.../admin/settings` | S | 유지 |

### 5.4 KPA-b Branch Operator (`/branch-services/:id/operator`)

| # | 메뉴 | 경로 | 분류 | 판정 |
|---|------|------|------|------|
| 1 | 대시보드 | `.../operator/dashboard` | C | 유지 |
| 2 | 포럼 관리 | `.../operator/forum-management` | O | 유지 |
| 3 | 콘텐츠 허브 | `.../operator/signage/content` | O | 유지 |
| 4 | 운영자 관리 | `.../operator/operators` | S | Admin 이동 검토 |

### 5.5 불일치 요약

| 불일치 | 현재 위치 | 권장 위치 | 사유 |
|--------|----------|----------|------|
| 회원 관리 | Operator (KPA-a) | **Admin** | 회원 구조 관리 |
| 법률 관리 | Operator (KPA-a) | **Admin** | 정책성 기능 |
| 조직 가입 요청 | Admin (KPA-a) | **Operator** | 승인 처리는 운영 |
| 서비스 등록 | Admin (KPA-a) | **Operator** | 등록 처리는 운영 |
| 신상신고 | Admin (KPA-a) | **Operator** | 일상 처리 |
| 공지사항 | Admin (KPA-a) | **Operator** | 콘텐츠 CRUD |
| 자료실 | Admin (KPA-a) | **Operator** | 콘텐츠 CRUD |
| 안내 영상 | Admin (KPA-a) | **Operator** | 콘텐츠 CRUD |
| 게시판 | Admin (KPA-a) | **Operator** | 콘텐츠 CRUD |
| 공지사항 | Branch Admin | **Branch Operator** | 콘텐츠 CRUD |
| 게시판 관리 | Branch Admin | **Branch Operator** | 콘텐츠 CRUD |
| 자료실 | Branch Admin | **Branch Operator** | 콘텐츠 CRUD |

**불일치 12건** / 전체 36건 = **33% 불일치율**

---

## 6. 전체 불일치 요약

| 서비스 | 전체 메뉴 | 불일치 | 불일치율 | 주요 원인 |
|--------|---------|--------|---------|----------|
| **Neture** | 23 | 5 | 22% | 상품/주문/AI운영이 Admin에 혼재 |
| **GlycoPharm** | 21 | 3 | 14% | Admin 영역 미존재 → 구조기능이 Operator에 |
| **K-Cosmetics** | 14 | 3 | 21% | Admin 영역 미존재 → 구조기능이 Operator에 |
| **GlucoseView** | 4 | 0 | 0% | 최소 기능, 정합 |
| **KPA Society** | 36 | 12 | 33% | 콘텐츠 CRUD가 Admin에, 구조기능이 Operator에 |
| **합계** | **98** | **23** | **23%** | |

---

## 7. 재배치 설계안

### 7.1 이동 제안 (Admin → Operator)

| 서비스 | 메뉴 | 현재 | 권장 | 우선순위 |
|--------|------|------|------|---------|
| Neture | 상품 관리 | Admin | Operator | P2 |
| Neture | 주문 관리 | Admin | Operator | P2 |
| Neture | AI 자산 품질 | Admin | Operator | P3 |
| Neture | AI 카드 리포트 | Admin | Operator | P3 |
| Neture | AI 운영 | Admin | Operator | P3 |
| KPA-a | 조직 가입 요청 | Admin | Operator | P1 |
| KPA-a | 서비스 등록 | Admin | Operator | P1 |
| KPA-a | 신상신고 | Admin | Operator | P2 |
| KPA-a | 공지사항 | Admin | Operator | P1 |
| KPA-a | 자료실 | Admin | Operator | P1 |
| KPA-a | 안내 영상 | Admin | Operator | P1 |
| KPA-a | 게시판 | Admin | Operator | P1 |
| KPA-b | 공지사항 | Branch Admin | Branch Operator | P1 |
| KPA-b | 게시판 관리 | Branch Admin | Branch Operator | P1 |
| KPA-b | 자료실 | Branch Admin | Branch Operator | P1 |

### 7.2 이동 제안 (Operator → Admin)

| 서비스 | 메뉴 | 현재 | 권장 | 우선순위 |
|--------|------|------|------|---------|
| GlycoPharm | 약국 네트워크 | Operator | Admin (신설) | P2 |
| GlycoPharm | 회원 관리 | Operator | Admin (신설) | P2 |
| GlycoPharm | 설정 | Operator | Admin (신설) | P2 |
| K-Cosmetics | 매장 네트워크 | Operator | Admin (신설) | P2 |
| K-Cosmetics | 회원 관리 | Operator | Admin (신설) | P2 |
| K-Cosmetics | 설정 | Operator | Admin (신설) | P2 |
| KPA-a | 회원 관리 | Operator | Admin | P1 |
| KPA-a | 법률 관리 | Operator | Admin | P2 |

---

## 8. 권장 메뉴 구조도

### 8.1 Neture 권장 구조

```
Admin (/workspace/admin)
├── 사용자 관리
├── 공급자 관리
├── 판매자 관리
├── 운영자 관리
├── AI 설정
│   ├── AI 엔진 설정
│   ├── AI 정책
│   ├── 비용 관리
│   ├── Context 자산
│   ├── 답변 합성 규칙
│   └── AI 비즈니스팩
├── 이메일 설정
└── 시스템 설정

Operator (/workspace/operator)
├── 대시보드
├── 상품 관리          ← Admin에서 이동
├── 주문 관리          ← Admin에서 이동
├── AI 리포트
├── AI 자산 품질       ← Admin에서 이동
├── AI 카드 리포트     ← Admin에서 이동
├── AI 운영           ← Admin에서 이동
├── 포럼 관리
├── 가입 요청
├── 공급 대시보드
└── 알림 설정
```

### 8.2 GlycoPharm 권장 구조

```
Admin (/admin)                    ← 신설
├── 약국 네트워크 구조 관리        ← Operator에서 이동
├── 회원 관리                     ← Operator에서 이동
└── 설정                         ← Operator에서 이동

Operator (/operator)              ← 유지
├── 대시보드
├── 신청 관리
├── 상품 관리
├── 주문 관리
├── 재고/공급
├── 정산 관리
├── 분석/리포트
├── 청구 관련 (리포트, 미리보기, 인보이스)
├── 마케팅
├── 포럼 관련 (신청, 관리)
├── Trial 관리
├── 사이니지 (콘텐츠, 라이브러리, 내 사이니지)
└── 고객지원
```

### 8.3 K-Cosmetics 권장 구조

```
Admin (/admin)                    ← 신설
├── 매장 네트워크 구조 관리        ← Operator에서 이동
├── 회원 관리                     ← Operator에서 이동
└── 설정                         ← Operator에서 이동

Operator (/operator)              ← 유지
├── 대시보드
├── 내 매장
├── 신청 관리
├── 상품 관리
├── 주문 관리
├── 재고/공급
├── 정산 관리
├── 분석/리포트
├── 마케팅
├── 사이니지 콘텐츠
└── 고객지원
```

### 8.4 KPA Society 권장 구조

```
KPA-a Admin (/demo/admin)
├── 대시보드
├── 플랫폼 운영
├── 분회 관리
├── 회원 관리            ← Operator에서 이동
├── 위원회 관리
├── 간사 관리
├── 임원 관리
├── 연회비 (정책)
├── 법률 관리            ← Operator에서 이동
├── 운영자 관리
└── 설정

KPA-a Operator (/operator)
├── Hub 대시보드
├── AI 리포트
├── 포럼 관리
├── 포럼 분석
├── 콘텐츠 관리
├── 사이니지 콘텐츠
├── 감사 로그
├── 조직 가입 요청       ← Admin에서 이동
├── 서비스 등록          ← Admin에서 이동
├── 신상신고             ← Admin에서 이동
├── 공지사항             ← Admin에서 이동
├── 자료실               ← Admin에서 이동
├── 안내 영상            ← Admin에서 이동
└── 게시판               ← Admin에서 이동

KPA-b Branch Admin
├── 대시보드
├── 임원 관리
└── 분회 설정

KPA-b Branch Operator
├── 대시보드
├── 공지사항             ← Branch Admin에서 이동
├── 게시판 관리          ← Branch Admin에서 이동
├── 자료실               ← Branch Admin에서 이동
├── 콘텐츠 허브
└── 운영자 관리
```

---

## 9. 구현 우선순위

### P1 — 높음 (정책과 명백히 충돌)

| # | 서비스 | 이동 | 사유 |
|---|--------|------|------|
| 1 | KPA-a | 콘텐츠 CRUD 7건 Admin → Operator | 콘텐츠 관리는 명백한 운영 |
| 2 | KPA-a | 회원 관리 Operator → Admin | 회원 구조는 명백한 Admin |
| 3 | KPA-b | 콘텐츠 CRUD 3건 Branch Admin → Branch Operator | 분회 콘텐츠도 운영 |

### P2 — 중간 (개선 권장)

| # | 서비스 | 이동 | 사유 |
|---|--------|------|------|
| 4 | GlycoPharm | Admin 영역 신설 + 구조기능 3건 이동 | Admin 영역 자체가 미존재 |
| 5 | K-Cosmetics | Admin 영역 신설 + 구조기능 3건 이동 | Admin 영역 자체가 미존재 |
| 6 | Neture | 상품/주문 관리 Admin → Operator | CRUD는 운영 |
| 7 | KPA-a | 법률 관리, 신상신고 | 분류 경계선 항목 |

### P3 — 낮음 (점진 개선)

| # | 서비스 | 이동 | 사유 |
|---|--------|------|------|
| 8 | Neture | AI 운영성 기능 3건 Admin → Operator | AI 기능 재정렬 |

---

## 10. 후속 Work Order 준비

이 설계를 구현하기 위해 다음 Work Order가 필요하다:

| WO | 범위 | 우선순위 | 예상 영향 |
|----|------|---------|----------|
| WO-KPA-ADMIN-OPERATOR-MENU-REALIGNMENT-V1 | KPA-a/b 메뉴 재배치 | P1 | 라우트 이동, Guard 유지 |
| WO-GLYCOPHARM-ADMIN-AREA-V1 | GlycoPharm Admin 영역 신설 | P2 | 신규 라우트 + Guard |
| WO-K-COSMETICS-ADMIN-AREA-V1 | K-Cosmetics Admin 영역 신설 | P2 | 신규 라우트 + Guard |
| WO-NETURE-OPERATOR-EXPANSION-V1 | Neture Operator 확장 | P2 | 라우트 이동 |

---

## 11. 금지 사항

| 금지 | 이유 |
|------|------|
| 이 문서에 의한 코드 수정 | 설계 분석 단계 |
| Guard 변경 | 별도 WO 필수 |
| 라우트 삭제 | 별도 WO 필수 |
| 접근 매트릭스 변경 | ROLE_GUARD_TEST_BASELINE_V1 Freeze |

---

*Updated: 2026-02-17*
*WO: WO-O4O-OPERATOR-UI-REALIGNMENT-V1*
