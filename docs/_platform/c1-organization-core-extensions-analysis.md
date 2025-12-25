# Organization-Core Extensions Analysis (C1-1)

> **Phase**: C1 - Core Extension Cleanup
> **Core**: organization-core
> **분석일**: 2025-12-25
> **상태**: 분석 완료

---

## 1. Core 패키지 상태

### organization-core (FROZEN)
- **버전**: 1.0.0
- **상태**: FROZEN (R4 확정)
- **Entities**: Organization, OrganizationMember, RoleAssignment
- **Services**: OrganizationService, OrganizationMemberService, PermissionService
- **Lifecycle**: ✅ 완결 (install, activate, deactivate, uninstall)

---

## 2. 확장앱 분류

### 2.1 통합 Extension (Cross-Core)

| 패키지 | 역할 | 연결 Core | Lifecycle |
|--------|------|-----------|-----------|
| organization-forum | organization + forum 통합 | forum-core | ⚠️ 불완전 |
| organization-lms | organization + lms 통합 | lms-core | ✅ 완결 |

### 2.2 역할 기반 Extension (Yaksa 수직 스택)

| 패키지 | 역할 | 의존성 | Lifecycle |
|--------|------|--------|-----------|
| membership-yaksa | 회원 관리 | organization-core | ✅ 완결 |
| member-yaksa | 회원 앱 (소비자용) | membership-yaksa | ⚠️ uninstall 누락 |
| reporting-yaksa | 신상신고 | membership-yaksa | ✅ 완결 |
| annualfee-yaksa | 연회비 | membership-yaksa | ⚠️ 구조 비표준 |
| yaksa-admin | 관리자 센터 | membership-yaksa | ⚠️ uninstall 누락 |
| yaksa-accounting | 간이 장부 | membership-yaksa | ✅ 완결 (Phase 0) |

### 2.3 인프라 Extension

| 패키지 | 역할 | 의존성 | Lifecycle |
|--------|------|--------|-----------|
| yaksa-scheduler | 작업 스케줄러 | 없음 (독립) | ✅ 완결 |

---

## 3. 의존성 그래프

```
organization-core (FROZEN)
├── organization-forum ─→ forum-core
├── organization-lms ─→ lms-core
└── membership-yaksa
    ├── member-yaksa (회원 앱)
    ├── reporting-yaksa (신상신고)
    ├── annualfee-yaksa (연회비)
    ├── yaksa-admin (관리 센터)
    └── yaksa-accounting (간이 장부)

yaksa-scheduler (독립 인프라)
└── 사용처: membership-yaksa, annualfee-yaksa (peerDependency)
```

---

## 4. 발견된 이슈

### 4.1 Critical (즉시 수정 필요)

| 이슈 | 패키지 | 상태 | 조치 |
|------|--------|------|------|
| uninstall.ts 누락 | member-yaksa | ❌ | 생성 필요 |
| uninstall.ts 누락 | yaksa-admin | ❌ | 생성 필요 |
| lifecycle 파일 불완전 | organization-forum | ⚠️ | activate, deactivate 누락 |

### 4.2 High (이번 Phase에서 수정)

| 이슈 | 패키지 | 설명 |
|------|--------|------|
| manifest 비표준 | annualfee-yaksa | services 필드 구조, routes vs routesExport |
| manifest 비표준 | yaksa-accounting | 커스텀 필드 사용 (adminMenu, optionalApps) |

### 4.3 Medium (문서화 권고)

| 이슈 | 설명 |
|------|------|
| type vs appType | 일부 패키지 `type`, 일부 `appType` 사용 |
| dependencies 구조 | core[] vs apps[] 혼용 |
| yaksa-scheduler 독립성 | peerDependency 관계 문서화 필요 |

---

## 5. 확장 패턴 판정

### 5.1 수직 통합 스택 (Vertical Integration)

```
Core → Primary Extension → Feature Extensions
organization-core → membership-yaksa → [member-yaksa, reporting-yaksa, ...]
```

**판정**: ✅ 올바른 패턴
- Core는 순수하게 유지
- Primary Extension이 도메인 로직 담당
- Feature Extension은 UI/워크플로우 담당

### 5.2 수평 통합 (Cross-Core Integration)

```
Core A + Core B → Integration Extension
organization-core + forum-core → organization-forum
```

**판정**: ✅ 올바른 패턴
- 얇은 레이어 (Thin Layer) 원칙 준수
- 자체 테이블 없음 (통합만 수행)

### 5.3 인프라 유틸리티

```
yaksa-scheduler (독립)
← 사용: membership-yaksa, annualfee-yaksa
```

**판정**: ✅ 올바른 패턴
- Core 의존성 없음
- peerDependency로 선언

---

## 6. 조치 계획

### 6.1 즉시 수정 (이 브랜치에서)

- [ ] member-yaksa/src/lifecycle/uninstall.ts 생성
- [ ] yaksa-admin/src/lifecycle/uninstall.ts 생성
- [ ] organization-forum/src/lifecycle/activate.ts 생성
- [ ] organization-forum/src/lifecycle/deactivate.ts 생성

### 6.2 표준화 (권고, 선택)

- [ ] manifest 필드 통일 (appType 사용)
- [ ] dependencies 구조 통일 (core[], extensions[], optional[])

### 6.3 문서화

- [ ] yaksa-scheduler 독립성 문서화
- [ ] 수직 통합 스택 패턴 문서화

---

## 7. 존치 근거 명확화

| 패키지 | 존치 이유 | 삭제/병합 필요 |
|--------|-----------|----------------|
| organization-core | FROZEN Core | ❌ 불가 |
| organization-forum | 얇은 통합 레이어 | ❌ 불필요 |
| organization-lms | 얇은 통합 레이어 | ❌ 불필요 |
| membership-yaksa | 도메인 로직 담당 | ❌ 불필요 |
| member-yaksa | 소비자 UI | ❌ 불필요 |
| reporting-yaksa | 컴플라이언스 워크플로우 | ❌ 불필요 |
| annualfee-yaksa | 재정 워크플로우 | ❌ 불필요 |
| yaksa-admin | 관리자 UI 집합체 | ❌ 불필요 |
| yaksa-accounting | 운영 도구 (Phase 0) | ❌ 불필요 |
| yaksa-scheduler | 인프라 유틸리티 | ❌ 불필요 |

---

## 8. 결론

**organization-core 확장앱 생태계 판정: ✅ 건강함**

- 아키텍처 패턴: 올바름
- 의존성 구조: 깔끔함 (순환 없음)
- 역할 분리: 명확함
- 긴밀 결합: 없음

**필요 조치**: Lifecycle 파일 완결 (4개 파일 생성)

---

*Phase C1-1 분석 완료*
*작성일: 2025-12-25*
