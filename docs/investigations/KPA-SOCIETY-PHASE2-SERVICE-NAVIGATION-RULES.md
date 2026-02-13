# KPA-Society Phase 2: Service Navigation Rules

> **Phase 2 설계 문서 — 구현 코드/SQL 없음**
>
> 작성일: 2026-02-06
> 상위 Work Order: WO-KPA-SOCIETY-PHASE2-MEMBERSHIP-DATAFLOW-V1

---

## 1. 서비스 이동 판단 체크리스트

사용자가 서비스 A에서 서비스 B로 이동할 때,
다음 순서로 **고정된 판단**을 수행한다.

```
Step 1: 로그인 상태 확인
  └── 미로그인 → 로그인 모달 표시

Step 2: Account 상태 확인
  └── Account.status ≠ ACTIVE → 접근 차단 (사유 표시)

Step 3: 대상 서비스의 Membership 필요 여부 확인
  ├── 불필요 (SVC-B 데모) → 즉시 접근 허용
  └── 필요 → Step 4로

Step 4: 대상 서비스 Membership 존재 여부 확인
  ├── 없음 → 서비스 가입 안내 표시
  └── 있음 → Step 5로

Step 5: Membership 상태 확인
  ├── pending → 승인 대기 안내 표시
  ├── suspended → 정지 사유 표시
  ├── withdrawn → 재가입 안내 표시
  └── active → 접근 허용
```

---

## 2. 서비스별 접근 정책

### 2.1 SVC-A (커뮤니티) 접근

| 조건 | 결과 |
|------|------|
| 미로그인 | 일부 공개 콘텐츠 열람 가능, 참여 시 로그인 요구 |
| Account ACTIVE + Membership 없음 | 현재는 발생 불가 (가입 = SVC-A Membership 자동 생성) |
| Account ACTIVE + Membership pending | 승인 대기 페이지 |
| Account ACTIVE + Membership active | 전체 이용 가능 |

### 2.2 SVC-B (데모) 접근

| 조건 | 결과 |
|------|------|
| 미로그인 | 접근 가능 (데모이므로 제한 없음) |
| 로그인 상태 | 접근 가능 (Membership 불요) |

### 2.3 SVC-C (분회 서비스) 접근

| 조건 | 결과 |
|------|------|
| 미로그인 | 로그인 요구 |
| Account ACTIVE + SVC-A Membership 없음/비활성 | SVC-A 가입 먼저 안내 |
| Account ACTIVE + SVC-A active + SVC-C 없음 | 분회 가입 안내 표시 |
| Account ACTIVE + SVC-A active + SVC-C pending | 분회 승인 대기 안내 |
| Account ACTIVE + SVC-A active + SVC-C active | 전체 이용 가능 |

### 2.4 약국 경영 서비스 접근

| 조건 | 결과 |
|------|------|
| 미로그인 | 로그인 요구 |
| pharmacist_role ≠ pharmacy_owner | "약국 개설자만 이용 가능" 안내 |
| pharmacy_owner + 서비스 미신청 | PharmacyApprovalGatePage |
| pharmacy_owner + 서비스 승인 대기 | 승인 대기 안내 |
| pharmacy_owner + 서비스 승인 완료 | 약국 대시보드 접근 |

---

## 3. "같은 아이디로 로그인 없이 이동" 가능 조건

### 3.1 현행 (동일 도메인)

kpa-society.co.kr 내의 3개 서비스는 **동일 SPA** 안에 있으므로:

| 이동 | 재로그인 필요 | 이유 |
|------|-------------|------|
| 커뮤니티 → 데모 | X | 동일 AuthProvider, 동일 토큰 |
| 커뮤니티 → 분회 | X | 동일 AuthProvider, 동일 토큰 |
| 데모 → 분회 | X | 동일 AuthProvider, 동일 토큰 |
| 분회 → 커뮤니티 | X | 동일 AuthProvider, 동일 토큰 |

### 3.2 조건 명시

**재로그인 없이 이동이 가능한 조건:**

1. 동일 도메인 (kpa-society.co.kr) 내 이동
2. 동일 AuthProvider 하위 라우트 간 이동
3. localStorage 토큰이 유효한 상태
4. Account.status = ACTIVE

**재로그인이 필요한 경우:**

1. 토큰 만료 (→ 자동 갱신 시도 → 실패 시 로그인 모달)
2. 다른 도메인으로 이동 (neture.co.kr, glycopharm.co.kr 등)
3. Account.status가 ACTIVE에서 SUSPENDED로 변경된 경우

---

## 4. 서비스 전환 UI 설계 개념

### 4.1 상단 내비게이션 구조

```
┌──────────────────────────────────────────────────┐
│  KPA Society  │  커뮤니티  │  분회  │  약국경영   │
│               │  (SVC-A)  │(SVC-C) │  (조건부)  │
└──────────────────────────────────────────────────┘
```

| 메뉴 | 표시 조건 | 클릭 시 |
|------|----------|--------|
| 커뮤니티 | 항상 | `/` 이동 |
| 분회 | SVC-A active | `/branch-services` 이동 |
| 약국경영 | pharmacy_owner + 서비스 승인 | `/pharmacy` 이동 |

### 4.2 서비스 전환 시 판단 흐름 (프론트엔드)

```
사용자가 "분회" 메뉴 클릭
  │
  ├── Step 1: useAuth() → user 확인
  │   └── null → openLoginModal()
  │
  ├── Step 2: SVC-A Membership 확인
  │   └── 비활성 → "커뮤니티 가입이 필요합니다" 안내
  │
  ├── Step 3: SVC-C Membership 확인 (향후)
  │   ├── 없음 → "분회 가입 안내" 표시
  │   └── pending → "승인 대기 중" 표시
  │
  └── Step 4: 이동 허용
        → /branch-services 라우트로 이동
```

---

## 5. 에러/차단 상태별 사용자 안내

### 5.1 안내 메시지 정의

| 상태 | 안내 메시지 | 액션 |
|------|-----------|------|
| 미로그인 | "로그인이 필요합니다" | 로그인 모달 |
| Account PENDING | "가입 승인 대기 중입니다" | 승인 대기 페이지 |
| Account SUSPENDED | "계정이 정지되었습니다. 관리자에게 문의하세요" | 문의 링크 |
| Account REJECTED | "가입이 거부되었습니다" | 재신청 또는 문의 |
| Membership 없음 | "이 서비스를 이용하려면 가입이 필요합니다" | 가입 신청 버튼 |
| Membership pending | "서비스 가입 승인을 기다리고 있습니다" | 대기 안내 |
| Membership suspended | "서비스 이용이 정지되었습니다" | 문의 링크 |
| pharmacist_role ≠ pharmacy_owner | "약국 개설자만 이용할 수 있는 서비스입니다" | 돌아가기 |

---

## 6. 현행 → 설계 간 Gap 분석

### 6.1 현행 구현 상태

| 판단 항목 | 현행 구현 | 설계 필요 |
|----------|----------|----------|
| 로그인 상태 확인 | O (useAuth) | 유지 |
| Account 상태 확인 | 부분적 (로그인 시만) | 서비스 이동 시에도 확인 필요 |
| Membership 확인 | X (SVC-A만, 별도 확인 없음) | 서비스별 Membership 확인 추가 |
| 약국 개설자 확인 | O (PharmacyPage 분기) | 유지 |
| 분회 Membership 확인 | X (없음) | 향후 추가 |

### 6.2 현행에서 즉시 적용 가능한 것

| # | 항목 | 이유 |
|---|------|------|
| 1 | 로그인 상태 확인 | 이미 구현됨 |
| 2 | 서비스 간 토큰 공유 | 이미 동작함 (동일 AuthProvider) |
| 3 | 약국 경영 접근 제어 | 이미 구현됨 (PharmacyPage + ApprovalGate) |

### 6.3 향후 구현이 필요한 것

| # | 항목 | Phase |
|---|------|-------|
| 1 | SVC-A Membership 상태 확인 가드 | Phase 3 |
| 2 | SVC-C Membership 생성/확인 흐름 | Phase 3+ |
| 3 | 서비스 전환 내비게이션 UI | Phase 3 |
| 4 | 에러/차단 상태 통일 안내 컴포넌트 | Phase 3 |

---

## 7. 보안 고려사항

### 7.1 프론트엔드 vs 백엔드 판단

| 판단 | 프론트엔드 | 백엔드 | 비고 |
|------|----------|--------|------|
| 로그인 상태 | O (UI 가드) | O (미들웨어) | 이중 검증 |
| Membership 상태 | O (UI 가드) | O (API 미들웨어) | **백엔드가 최종 권한** |
| 역할 확인 | O (UI 조건부 렌더링) | O (requireKpaScope) | **백엔드가 최종 권한** |

### 7.2 원칙

> **프론트엔드 판단은 UX 목적이다.**
> **실제 접근 제어는 반드시 백엔드 미들웨어에서 수행한다.**
>
> - 프론트엔드: "이 메뉴를 보여줄 것인가" (UX)
> - 백엔드: "이 API를 호출할 수 있는가" (보안)

---

*Phase 2 설계 문서 3/3*
*상태: Complete*
