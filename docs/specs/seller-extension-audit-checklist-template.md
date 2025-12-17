# Seller Extension Audit Checklist Template

> **용도**: Seller 계열 Extension App의 일관된 감사(Audit)를 위한 표준 체크리스트
> **적용 대상**: cosmetics-seller-extension, 향후 유사 Seller Extension
> **작성일**: 2024-12-17
> **버전**: 1.0

---

## 사용 방법

1. 각 섹션의 체크 항목을 순서대로 점검
2. 상태: ✅ 완료 | ⚠️ 부분 완료 | ❌ 미완료 | N/A 해당없음
3. 비고에 세부 사항 기록
4. "판단 필요" 항목은 리팩토링 Work Order에서 결정

---

## 1. App 기본 구조

### 1.1 manifest.ts 구성

| 점검 항목 | 상태 | 비고 |
|----------|------|------|
| manifest.ts 파일 존재 | | |
| appId 정의 (kebab-case) | | |
| displayName (한글명) 정의 | | |
| type: 'extension' 명시 | | |
| version 정의 (semver) | | |
| category 정의 | | |
| extends (확장 대상 Core) 명시 | | |
| dependencies 정의 | | |
| ownsTables 목록 일치 | | |
| cpt (Custom Post Types) 정의 | | |
| acfFieldGroups 정의 | | |
| routes 경로 목록 | | |
| permissions 권한 목록 | | |
| uninstallPolicy 정의 | | |

### 1.2 AppStore 등록

| 점검 항목 | 상태 | 비고 |
|----------|------|------|
| appsCatalog.ts 등록 여부 | | |
| status 필드 정의 | | |
| serviceGroups 분류 | | |
| dependencies 정합성 | | |
| incompatibleWith 충돌 앱 명시 | | |

### 1.3 Package.json

| 점검 항목 | 상태 | 비고 |
|----------|------|------|
| name 패키지명 규칙 준수 (@o4o/) | | |
| version 일치 (manifest와 동일) | | |
| type: "module" (ESM) | | |
| main/types/exports 경로 | | |
| dependencies 적정성 | | |
| devDependencies 적정성 | | |
| scripts.build 정의 | | |
| scripts.type-check 정의 | | |
| scripts.test 정의 | | |

---

## 2. Backend 구조

### 2.1 Entity (DB Schema)

| 점검 항목 | 상태 | 비고 |
|----------|------|------|
| Entity 파일 위치 (backend/entities/) | | |
| Entity 개수 (manifest.ownsTables 일치) | | |
| Primary Key 정의 (UUID) | | |
| 필수 컬럼 정의 | | |
| Index 정의 | | |
| createdAt/updatedAt 타임스탬프 | | |
| Soft FK (UUID 참조) 패턴 | | |
| metadata (JSONB) 컬럼 유무 | | |

**Entity 목록**:
| Entity명 | 테이블명 | 상태 | 비고 |
|----------|----------|------|------|
| | | | |

### 2.2 Service

| 점검 항목 | 상태 | 비고 |
|----------|------|------|
| Service 파일 위치 (backend/services/) | | |
| Repository 주입 패턴 | | |
| CRUD 메서드 구현 | | |
| 비즈니스 로직 분리 | | |
| DTO 타입 정의 | | |
| 에러 핸들링 | | |
| 트랜잭션 처리 | | |

**Service 목록**:
| Service명 | 역할 | 상태 | 비고 |
|-----------|------|------|------|
| | | | |

### 2.3 Controller

| 점검 항목 | 상태 | 비고 |
|----------|------|------|
| Controller 파일 위치 (backend/controllers/) | | |
| Service 주입 | | |
| Request/Response 처리 | | |
| 응답 형식 일관성 | | |
| HTTP Status Code 적정성 | | |
| 입력 검증 | | |

**Controller 목록**:
| Controller명 | 엔드포인트 수 | 상태 | 비고 |
|--------------|--------------|------|------|
| | | | |

### 2.4 Routes

| 점검 항목 | 상태 | 비고 |
|----------|------|------|
| Routes 파일 위치 (backend/routes/) | | |
| Base path 정의 (/api/v1/...) | | |
| RESTful 네이밍 | | |
| HTTP Method 적정성 | | |
| 인증 미들웨어 적용 | | |
| 권한 검사 미들웨어 | | |

**API 엔드포인트 목록**:
| Method | Path | Controller.Method | 인증 | 비고 |
|--------|------|-------------------|------|------|
| | | | | |

---

## 3. Lifecycle

| 점검 항목 | 상태 | 비고 |
|----------|------|------|
| lifecycle/ 폴더 존재 | | |
| install.ts 또는 통합 파일 | | |
| activate.ts 또는 통합 파일 | | |
| deactivate.ts 또는 통합 파일 | | |
| uninstall.ts 또는 통합 파일 | | |
| 실제 동작 가능 여부 | | |
| 불필요/비어있는 hook | | |
| Route 등록 로직 | | |
| Entity 등록 로직 | | |

---

## 4. Frontend

### 4.1 구조

| 점검 항목 | 상태 | 비고 |
|----------|------|------|
| frontend/ 폴더 존재 | | |
| pages/ 폴더 존재 | | |
| components/ 폴더 존재 | | |
| index.ts export 정의 | | |

### 4.2 페이지

| 페이지명 | 역할 | 상태 | 비고 |
|----------|------|------|------|
| | | | |

### 4.3 Shortcodes

| Shortcode명 | Component | 상태 | 비고 |
|-------------|-----------|------|------|
| | | | |

### 4.4 ViewSystem 연동

| 점검 항목 | 상태 | 비고 |
|----------|------|------|
| ViewTemplate 정의 | | |
| ViewComponent 등록 | | |
| Route 연동 | | |

---

## 5. Cross-App Dependency

### 5.1 의존 관계

| 점검 항목 | 상태 | 비고 |
|----------|------|------|
| Core 의존성 명확 | | |
| 다른 Extension 의존 유무 | | |
| 순환 의존 없음 | | |

**의존 관계 맵**:
```
[이 앱]
  ├── depends on:
  └── used by:
```

### 5.2 책임 경계

| 점검 항목 | 상태 | 비고 |
|----------|------|------|
| 중복 기능 없음 | | |
| 책임 범위 명확 | | |
| 다른 앱으로 이관 필요 기능 | | |

---

## 6. 테스트 / 안정성

### 6.1 테스트

| 점검 항목 | 상태 | 비고 |
|----------|------|------|
| jest.config.cjs 존재 | | |
| __tests__/ 폴더 존재 | | |
| Service Unit Test | | |
| Controller Unit Test | | |
| Integration Test | | |
| API Test | | |

### 6.2 Type Safety

| 점검 항목 | 상태 | 비고 |
|----------|------|------|
| type-check 통과 | | |
| any 타입 최소화 | | |
| DTO 타입 정의 완전성 | | |

### 6.3 Runtime

| 점검 항목 | 상태 | 비고 |
|----------|------|------|
| disabled-apps 등록 여부 | | |
| ESM import 확장자 | | |
| 런타임 에러 없음 | | |

---

## 7. 종합 평가

### 7.1 Status Summary

| 항목 | 상태 |
|------|------|
| App 기본 구조 | |
| Backend 구조 | |
| Lifecycle | |
| Frontend | |
| Cross-App | |
| 테스트 | |
| **Overall** | |

### 7.2 Critical Issues

| 이슈 | 심각도 | 설명 |
|------|--------|------|
| | | |

### 7.3 Action Items

| 항목 | 우선순위 | 담당 | 비고 |
|------|----------|------|------|
| | | | |

### 7.4 판단 필요 사항

| 항목 | 옵션 | 비고 |
|------|------|------|
| | | |

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2024-12-17 | 초안 작성 |
