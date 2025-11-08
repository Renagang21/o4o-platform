# 사용자 관리 시스템 현황 조사 (Current State Audit)

> **조사 기간**: 2025-01-08
> **조사 범위**: FE, API, DB, ACL, Flows
> **목적**: 단일 사용자 관리 → 역할 분리형 전환을 위한 현황 파악

---

## 📋 조사 문서 목록

| # | 문서 | 설명 | 완성도 |
|---|------|------|--------|
| 01 | [FE 인벤토리](./01_inventory_fe_current.md) | 라우팅, 메뉴, 화면, Auth 상태관리 | ✅ 100% |
| 02 | [API 인벤토리](./02_inventory_api_current.md) | 엔드포인트, 권한 처리, 인증/가입 흐름 | ✅ 100% |
| 03 | [DB 스키마](./03_schema_current.md) | User 엔티티, 역할 필드, 확장 테이블 | ✅ 100% |
| 04 | [현재 흐름](./04_flows_current.md) | 가입, 로그인, 역할 변경 시퀀스 | ✅ 100% |
| 05 | [ACL 매트릭스](./05_acl_matrix_current.md) | 역할×리소스×행위 권한 표 | ✅ 100% |
| 06 | [격차 분석](./06_gap_analysis.md) | 현재 vs 목표 격차 및 우선순위 | ✅ 100% |
| 07 | [최소 추천 정리](./07_recommendations_preV2.md) | V2 전환 전 필수 선행 작업 | ✅ 100% |

---

## 🔍 주요 발견사항 (Key Findings)

### 1. 일관성 부재 (Inconsistency)

**드롭쉬핑 vs 일반 사용자**:
- ✅ **드롭쉬핑**: 역할별 메뉴 분리 (`공급자`, `판매자`, `파트너`)
- ❌ **일반 사용자**: 단일 "사용자" 메뉴로 통합
- ⚠️ **모순**: 같은 시스템 내에 **두 가지 접근 방식** 혼재

**증거**:
- `apps/admin-dashboard/src/config/wordpressMenuFinal.tsx:L100-132`

---

### 2. API ↔ FE 불일치 (API-FE Mismatch)

**API는 준비되어 있으나 FE는 미사용**:
- ✅ **API 로그인 응답**: `roles[]`, `activeRole`, `canSwitchRoles` 반환
- ❌ **FE에서 무시**: FE는 `user.role`만 사용
- ⚠️ **낭비**: API에서 준비한 다중 역할 데이터를 FE에서 사용하지 않음

**증거**:
- API: `apps/api-server/src/routes/auth.ts:L76-99`
- FE: `packages/auth-context/src/AuthProvider.tsx:L171` (`isAdmin: user?.role === 'admin'`)

---

### 3. 3중 역할 필드 혼재 (Triple Role Fields)

**데이터 중복 및 불일치 위험**:
```typescript
// User 엔티티
role: UserRole;          // 1. 레거시 단일
roles: string[];         // 2. 레거시 다중
dbRoles: Role[];         // 3. 신규 다중 (ManyToMany)
activeRole: Role | null; // 4. 현재 활성 역할
```

**문제**:
- ❌ **데이터 중복**: 같은 정보를 4곳에 저장
- ❌ **불일치 위험**: 4곳이 서로 다를 가능성
- ❌ **성능 저하**: `hasRole()`이 3곳을 모두 체크
- ⚠️ **마이그레이션 미완료**: 레거시 필드 제거 안 됨

**증거**:
- `apps/api-server/src/entities/User.ts:L40-78, L198-206`

---

### 4. 승인 흐름 부분 구현 (Partial Approval Flow)

**일반 vs 드롭쉬핑**:
- ❌ **일반 회원가입**: 즉시 `ACTIVE` 상태 (승인 없음)
- ✅ **드롭쉬핑 신청**: 별도 승인 흐름 **존재** (추정)
- ⚠️ **일관성 부재**: 역할에 따라 다른 흐름

**증거**:
- `apps/api-server/src/routes/auth.ts:L149-150` (signup → ACTIVE)
- `apps/admin-dashboard/src/config/wordpressMenuFinal.tsx:L129` (드롭쉬핑 승인 관리 메뉴)

---

### 5. 권한 체계 미완성 (Incomplete ACL)

**하드코딩된 권한**:
- ❌ **User.ts에 직접 작성**: `getAllPermissions()` 메소드 내부
- ❌ **DB 미사용**: Permission 테이블 없음 (추정)
- ❌ **UI 없음**: 권한 관리 화면 부재

**증거**:
- `apps/api-server/src/entities/User.ts:L221-237`

---

## 📊 격차 요약 (Gap Summary)

### 우선순위별 작업 (Prioritized by Impact × Effort)

#### P0 (Critical) - 즉시 해결 필요

| 작업 | 영역 | 예상 시간 | 이유 |
|------|------|----------|------|
| signup 시 PENDING 상태로 생성 | API | 1h | 보안/컴플라이언스 |
| 역할별 라우트 추가 | FE | 4h | 운영 편의성 |
| 역할별 메뉴 추가 | FE | 2h | UX 개선 |
| 승인 API 구현 | API | 8h | 보안/컴플라이언스 |

**총**: 15시간 (2일)

#### P1 (High) - 다음 스프린트

| 작업 | 영역 | 예상 시간 | 이유 |
|------|------|----------|------|
| 역할별 목록 화면 구현 | FE | 16h | UX 개선 |
| 레거시 역할 필드 정리 | DB | 8h | 데이터 일관성 |
| ApprovalLog 사용 시작 | API | 4h | 감사 로그 |
| FE Auth에 activeRole 사용 | FE | 2h | 기능 완성 |

**총**: 30시간 (4일)

#### P2 (Medium) - 여유 있을 때

| 작업 | 영역 | 예상 시간 | 이유 |
|------|------|----------|------|
| Permission 테이블 구현 | DB | 16h | 확장성 |
| 권한 기반 ACL 미들웨어 | API | 8h | 보안 강화 |
| JWT에 activeRole 추가 | API | 4h | 기능 완성 |

**총**: 28시간 (3.5일)

---

## ⚠️ 리스크 (Risks)

### High Risk

| 리스크 | 영향 | 확률 | 완화 방안 |
|--------|------|------|----------|
| **레거시 데이터 손실** | 🔴 Critical | Medium | 마이그레이션 전 백업, 롤백 계획 |
| **기존 사용자 로그인 실패** | 🔴 Critical | Low | PENDING 사용자만 차단, 기존 ACTIVE 유지 |
| **FE-API 불일치** | 🟡 High | High | API 먼저 구현 후 FE 업데이트 |

---

## ✅ V2 전환 전 필수 작업 (Pre-V2 Checklist)

**완료해야 V2 설계로 넘어갈 수 있습니다**:

### 1. 용어/상수 표준화
- [ ] UserRole enum 통일 (FE ↔ API)
- [ ] UserStatus enum 정리 (`ACTIVE` → `APPROVED`)
- [ ] 하드코딩 문자열 제거

### 2. 공통 컴포넌트 분리
- [ ] UserListBase, UserFormBase 추출
- [ ] ApprovalButton, RoleChip, StatusBadge 추출

### 3. 권한 미들웨어
- [ ] `requireRole()` 미들웨어 구현
- [ ] 주요 라우트에 적용

### 4. 레거시 필드 마이그레이션
- [ ] `role` → `dbRoles` 데이터 이행
- [ ] `roles[]` → `dbRoles` 데이터 이행
- [ ] 데이터 검증 (불일치 제로)

### 5. 테스트 데이터
- [ ] 역할별 테스트 계정 생성
- [ ] Seeder 스크립트 작성

---

## 📁 파일 트리 (File Tree)

```
docs/dev/investigations/user-refactor_2025-11/current-state-audit/
├── README.md                         # 이 파일
├── 01_inventory_fe_current.md        # FE 라우팅, 메뉴, Auth
├── 02_inventory_api_current.md       # API 엔드포인트, 인증
├── 03_schema_current.md              # DB User 엔티티, 역할 필드
├── 04_flows_current.md               # 가입, 로그인 시퀀스
├── 05_acl_matrix_current.md          # 권한 매트릭스
├── 06_gap_analysis.md                # 격차 분석 + 우선순위
└── 07_recommendations_preV2.md       # V2 전환 전 필수 작업
```

---

## 🔗 관련 문서 (Related Documents)

- **기존 조사**: `docs/dev/investigations/user-refactor_2025-11/`
- **다음 문서**: `V2_design.md` (역할 분리형 전환 설계안)

---

## 👥 연락처 (Contact)

- **작성자**: Claude Code
- **검증**: ⏳ Pending
- **문의**: 프로젝트 관리자에게 문의

---

**최종 업데이트**: 2025-01-08
**버전**: 1.0.0
**상태**: ✅ 조사 완료, ⏳ Pre-V2 작업 대기 중
