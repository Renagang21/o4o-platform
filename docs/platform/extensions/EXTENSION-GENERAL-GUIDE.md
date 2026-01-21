# Extension 개발 일반 가이드

> **문서 상태**: 기준 문서 (확정)
> **적용 범위**: 모든 Extension 개발
> **관련 문서**: `CONTENT-CORE-OVERVIEW.md`, `LMS-CORE-EXTENSION-PRINCIPLES.md`

---

## 1. Extension이란

Extension은 o4o 플랫폼의 Core 기능을 확장하는 독립 모듈이다.

### 1.1 Core와 Extension의 관계

```
Core (불변)
  └─ Extension (확장)
       └─ Feature (기능 구현)
```

- Core는 플랫폼의 핵심 기능을 제공한다
- Extension은 Core를 확장하되, Core를 수정하지 않는다
- Feature는 Extension 내에서 구체적인 기능을 구현한다

### 1.2 Extension의 특징

| 특징 | 설명 |
|------|------|
| 독립성 | Core 없이 단독 동작 불가, 다른 Extension 없이 동작 가능 |
| 확장성 | Core 기능을 확장하되, Core를 수정하지 않음 |
| 격리성 | 다른 Extension에 영향을 주지 않음 |

---

## 2. Extension 개발 원칙

### 2.1 Core 의존 방향

```
Extension → Core (허용)
Core → Extension (금지)
Extension → Extension (금지)
```

### 2.2 데이터 소유권

- Extension은 자신만의 데이터를 소유한다
- Core 데이터를 직접 수정하지 않는다
- Core 데이터가 필요하면 Core API를 통해 접근한다

### 2.3 이벤트 기반 통신

- Core는 이벤트를 발행한다
- Extension은 필요한 이벤트를 구독한다
- Extension 간 직접 통신은 금지한다

---

## 3. Extension 구조

### 3.1 디렉토리 구조

```
extensions/
└─ {extension-name}/
   ├─ src/
   │  ├─ index.ts          # Extension 진입점
   │  ├─ handlers/         # 이벤트 핸들러
   │  ├─ services/         # 비즈니스 로직
   │  └─ entities/         # Extension 전용 엔티티
   ├─ manifest.json        # Extension 메타데이터
   └─ README.md
```

### 3.2 manifest.json

```json
{
  "name": "extension-name",
  "version": "1.0.0",
  "displayName": "Extension 표시명",
  "description": "Extension 설명",
  "core": {
    "required": ["lms-core"],
    "optional": []
  },
  "events": {
    "subscribe": ["lms.enrollment.created"],
    "publish": []
  },
  "permissions": ["lms.enrollment.read"]
}
```

---

## 4. Extension 등록

### 4.1 등록 절차

1. manifest.json 작성
2. Extension 코드 구현
3. Core에 Extension 등록
4. 이벤트 핸들러 바인딩

### 4.2 등록 코드

```typescript
// Extension 진입점 (index.ts)
import { ExtensionRegistry } from '@o4o/core';
import manifest from '../manifest.json';
import { handlers } from './handlers';

export function register() {
  ExtensionRegistry.register({
    manifest,
    handlers,
    onActivate: () => {
      console.log('Extension activated');
    },
    onDeactivate: () => {
      console.log('Extension deactivated');
    }
  });
}
```

---

## 5. 이벤트 처리

### 5.1 이벤트 구독

```typescript
// handlers/enrollment.handler.ts
import { EventHandler } from '@o4o/core';

export const onEnrollmentCreated: EventHandler<'lms.enrollment.created'> = async (event) => {
  const { enrollmentId, userId, courseId } = event.payload;

  // Extension 비즈니스 로직
  await processNewEnrollment(enrollmentId, userId, courseId);
};
```

### 5.2 핸들러 규칙

| 규칙 | 설명 |
|------|------|
| 멱등성 | 동일 이벤트 중복 처리 시 동일 결과 |
| 실패 격리 | 핸들러 실패가 Core에 영향 없음 |
| 비동기 | 긴 작업은 백그라운드로 위임 |

---

## 6. 권한 시스템

### 6.1 권한 선언

```json
{
  "permissions": [
    "lms.enrollment.read",
    "lms.progress.read",
    "lms.progress.write"
  ]
}
```

### 6.2 권한 체크

- Core가 권한 체크를 수행한다
- Extension은 선언된 권한 범위 내에서만 동작한다
- 권한 없는 작업 시도 시 에러 발생

---

## 7. 메뉴 등록

### 7.1 운영자 대시보드 메뉴

```typescript
{
  menuId: 'ext-feature',
  label: '기능 관리',
  path: '/admin/ext/feature',
  icon: 'feature-icon',
  requiredPermissions: ['ext.feature.read']
}
```

### 7.2 메뉴 규칙

- Extension 영역 내에서만 메뉴 등록
- Core 메뉴 영역 침범 금지
- 최대 2단계 깊이

> 📄 상세: `OPERATOR-DASHBOARD-NAVIGATION.md`

---

## 8. 금지 사항

### 절대 금지

| 항목 | 설명 |
|------|------|
| Core 코드 수정 | Extension에서 Core 수정 금지 |
| Core DB 직접 접근 | Core 테이블 직접 쿼리 금지 |
| Extension 간 의존 | 다른 Extension 직접 호출 금지 |
| 전역 상태 오염 | Core 전역 상태 수정 금지 |

### 권장하지 않음

| 항목 | 대안 |
|------|------|
| 동기 이벤트 처리 | 비동기 처리로 전환 |
| 긴 트랜잭션 | 작은 단위로 분리 |
| 하드코딩 설정 | 환경변수 또는 설정 파일 |

---

## 9. 테스트

### 9.1 단위 테스트

```typescript
describe('EnrollmentHandler', () => {
  it('should process new enrollment', async () => {
    const event = createMockEvent('lms.enrollment.created', {
      enrollmentId: 'enr-1',
      userId: 'user-1',
      courseId: 'course-1'
    });

    await onEnrollmentCreated(event);

    // 검증
  });
});
```

### 9.2 통합 테스트

- Core와 함께 테스트
- 이벤트 발행-구독 흐름 검증
- 권한 체크 동작 검증

---

## 10. 배포

### 10.1 배포 절차

1. 버전 업데이트 (manifest.json)
2. 테스트 통과 확인
3. Extension 빌드
4. Core 업데이트 없이 Extension만 배포

### 10.2 버전 관리

- Semantic Versioning 사용
- 하위 호환성 유지 권장
- Breaking Change 시 Major 버전 업

---

## 11. 기준 적용 시점

이 기준은 다음 작업에 선행하여 적용된다:

- 새 Extension 개발
- 기존 Extension 수정
- Extension 구조 설계

---

## 12. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2026-01-19 | 1.0 | 최초 작성 |

---

*이 문서는 o4o 플랫폼 개발의 기준 문서입니다. 변경 시 CLAUDE.md 규칙에 따라 승인이 필요합니다.*
