# Beta Lock Rules

> **Status**: Active Policy
> **Created**: 2025-12-25
> **Phase**: P3 - Beta Readiness Consolidation
> **Authority**: CLAUDE.md 종속

---

## 1. 이 문서의 지위

이 문서는 **Beta Phase 진입 후 코드 변경 정책**을 정의한다.

* Alpha Phase에서 검증된 Reference와 Core를 **FROZEN** 상태로 고정
* Beta Phase에서 허용/금지되는 변경 유형 명시
* 긴급 수정(Hotfix) 프로세스 정의

---

## 2. FROZEN 목록

### 2.1 FROZEN 상태 정의

| 속성 | 설명 |
|------|------|
| **수정 불가** | 구조적 변경, 인터페이스 변경, 의존성 변경 금지 |
| **읽기 전용** | 복사하여 신규 앱 생성만 허용 |
| **예외 승인** | 명시적 Work Order + 2회 이상 반복 검증 필요 |

### 2.2 FROZEN 컴포넌트

| 컴포넌트 | 경로 | 동결 버전 | 동결 일자 |
|----------|------|----------|----------|
| **Core API** | `apps/api-server` | G10 | 2025-12-25 |
| **App API Reference** | `apps/app-api-reference` | G10 | 2025-12-25 |
| **Web Server Reference** | `apps/web-server-reference` | G10 | 2025-12-25 |

### 2.3 FROZEN 파일 목록 (상세)

#### Core API (apps/api-server)
```
src/
├── auth/           # 인증 모듈 전체
├── common/         # 공통 유틸리티
├── config/         # 설정
└── main.ts         # 엔트리포인트
```

#### App API Reference (apps/app-api-reference)
```
src/
├── config/env.ts           # 환경 설정
├── middleware/auth.middleware.ts  # 인증 미들웨어
├── routes/health.routes.ts # Health 엔드포인트
├── routes/api.routes.ts    # API 라우트 템플릿
├── utils/validation.ts     # 유효성 검증
└── main.ts                 # 엔트리포인트
```

#### Web Server Reference (apps/web-server-reference)
```
src/
├── config/         # 설정
├── middleware/     # 미들웨어
├── routes/         # 라우트
└── main.ts         # 엔트리포인트
```

---

## 3. Beta Phase 변경 정책

### 3.1 허용되는 변경

| 변경 유형 | 조건 | 예시 |
|----------|------|------|
| **신규 App API 생성** | Reference 복사 + 도메인 구현 | `supplier-api`, `partner-api` |
| **도메인 로직 구현** | 기존 앱 내 비즈니스 로직 | 새로운 엔드포인트, 서비스 로직 |
| **Mock → 실제 구현** | Alpha Mock을 실제 구현으로 교체 | 메모리 → DB, 시뮬레이션 → 실제 연동 |
| **버그 수정** | Hotfix 프로세스 준수 | 런타임 에러, 데이터 오류 |
| **문서 업데이트** | 코드 변경 없는 문서화 | README, 가이드 추가 |

### 3.2 금지되는 변경

| 변경 유형 | 사유 | 대안 |
|----------|------|------|
| **Reference 구조 변경** | Alpha에서 검증된 구조 보존 | 신규 앱에서 확장 |
| **Core API 인터페이스 변경** | 기존 앱 호환성 유지 | 새 버전 엔드포인트 추가 |
| **인증 방식 변경** | 전체 앱 영향 | Post-Beta 계획 |
| **공통 타입 변경** | 타입 안정성 | 도메인별 확장 타입 사용 |
| **의존성 메이저 버전 업그레이드** | 호환성 위험 | 마이너/패치만 허용 |

### 3.3 조건부 허용

| 변경 유형 | 조건 | 승인 권한 |
|----------|------|----------|
| **Reference 버그 수정** | 명확한 버그 + 2개 이상 앱에서 동일 문제 발생 | Work Order 필수 |
| **공통 유틸리티 추가** | 기존 유틸리티 수정 없음 | 코드 리뷰 |
| **새로운 미들웨어 추가** | 기존 미들웨어 체인 영향 없음 | 코드 리뷰 |

---

## 4. Hotfix 프로세스

### 4.1 Hotfix 정의

**Hotfix**는 Beta Phase에서 FROZEN 컴포넌트 또는 프로덕션에 영향을 주는 긴급 수정이다.

### 4.2 Hotfix 조건

Hotfix가 허용되려면 아래 조건을 **모두** 충족해야 한다.

| 조건 | 설명 |
|------|------|
| **프로덕션 영향** | 실제 서비스 장애 또는 심각한 버그 |
| **우회 불가** | 도메인 레벨에서 해결 불가 |
| **최소 변경** | 문제 해결에 필요한 최소한의 수정 |
| **롤백 가능** | 수정 실패 시 즉시 롤백 가능 |

### 4.3 Hotfix 워크플로우

```
1. 문제 발생 → 영향 범위 확인
2. Hotfix 필요성 판단 (§4.2 조건 확인)
3. Hotfix Work Order 작성
   - 문제 설명
   - 영향 받는 컴포넌트
   - 수정 내용 (최소화)
   - 롤백 계획
4. 수정 구현 (feature/hotfix-* 브랜치)
5. 테스트 (type-check, build, 수동 검증)
6. 긴급 배포
7. 모니터링 (24시간)
8. Hotfix 문서화
```

### 4.4 Hotfix 브랜치 규칙

```bash
# Hotfix 브랜치 생성
git checkout main
git checkout -b feature/hotfix-<issue-id>

# 수정 후
git push origin feature/hotfix-<issue-id>

# 긴급 머지 (main 직접)
git checkout main
git merge feature/hotfix-<issue-id>
git push origin main

# develop에도 반영
git checkout develop
git merge main
git push origin develop
```

---

## 5. 변경 승인 매트릭스

| 변경 대상 | 일반 개발 | 코드 리뷰 | Work Order | 금지 |
|----------|----------|----------|------------|------|
| 신규 App API | ✅ | - | - | - |
| 기존 App 도메인 로직 | ✅ | - | - | - |
| Reference 파일 복사 | ✅ | - | - | - |
| 공통 유틸리티 추가 | - | ✅ | - | - |
| 새로운 미들웨어 | - | ✅ | - | - |
| Reference 버그 수정 | - | - | ✅ | - |
| Reference 구조 변경 | - | - | - | ❌ |
| Core API 인터페이스 | - | - | - | ❌ |
| 인증 방식 | - | - | - | ❌ |

---

## 6. Beta Phase 목표

### 6.1 Beta 성공 조건

| 조건 | 측정 방법 |
|------|----------|
| **5개 App API 안정 운영** | Forum, Commerce, LMS, Dropshipping, Supplier 정상 동작 |
| **프로덕션 배포 성공** | Cloud Run 배포 + Health 체크 통과 |
| **Reference Drift 0%** | 모든 앱이 Reference 패턴 유지 |
| **Hotfix 0건** | Beta 기간 중 FROZEN 컴포넌트 수정 없음 |

### 6.2 Beta → Production 전환 조건

| 조건 | 설명 |
|------|------|
| **4주 안정 운영** | Hotfix 없이 4주 운영 |
| **Mock 교체 완료** | 최소 1개 앱에서 Mock → 실제 구현 |
| **문서 완성** | 운영 가이드, API 문서 완성 |

---

## 7. 예외 처리

### 7.1 FROZEN 해제 조건

FROZEN 상태를 해제하려면 아래 조건을 **모두** 충족해야 한다.

| 조건 | 설명 |
|------|------|
| **명시적 Work Order** | 변경 사유, 영향 범위, 테스트 계획 포함 |
| **2개 이상 앱 검증** | 동일 문제가 2개 이상 앱에서 발생 |
| **전체 앱 테스트** | 변경 후 모든 앱 type-check, build 통과 |
| **롤백 계획** | 실패 시 즉시 롤백 가능 |

### 7.2 예외 승인 프로세스

```
1. 예외 요청 Work Order 작성
2. 영향 분석 (모든 앱 확인)
3. 최소 수정안 설계
4. 테스트 계획 수립
5. 수정 구현 (feature/exception-* 브랜치)
6. 전체 앱 검증
7. 승인 후 머지
8. 문서 업데이트
```

---

## 8. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-12-25 | 1.0 | 초기 작성 (P3 Phase) |

---

*This document is part of the P3 Phase - Beta Readiness Consolidation.*
*Authority: CLAUDE.md 종속*
