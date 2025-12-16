# Disabled App Policy

> **@contract** - 이 문서는 Disabled App의 상태 분류 및 처리 정책을 정의합니다.
> 변경 시 `CLAUDE.md` 참조 및 승인 필요

## 1. 목적

Disabled App을 숨기지 않고, 상태와 사유를 명확히 관리하여:
- 플랫폼 상태의 투명성 확보
- 복구 우선순위 결정 용이
- Admin UI에서 의미 있는 정보 제공

## 2. 상태 정의 (DisabledAppStatus)

| 상태 | 정의 | Admin UI 표시 | 복구 우선순위 |
|------|------|---------------|---------------|
| `broken` | 빌드/런타임 에러로 사용 불가 | 🔴 빨간색 배지 | 높음 |
| `incomplete` | 개발 미완료, 필수 기능 미구현 | 🟡 노란색 배지 | 중간 |
| `paused` | 의도적 중단, 정상 작동하나 비활성화 | 🟠 주황색 배지 | 낮음 |
| `deprecated` | 폐기 예정, 사용 금지 권장 | ⚫ 회색 배지 | 해당없음 |

## 3. 메타데이터 구조

```typescript
interface DisabledAppMetadata {
  status: 'broken' | 'incomplete' | 'paused' | 'deprecated';
  reason: string;      // 비활성화 사유
  nextAction: string;  // 다음 조치 사항
  disabledAt: string;  // ISO 날짜
  trackingId?: string; // GitHub Issue 등 추적 ID
}
```

## 4. 파일 위치

| 파일 | 역할 |
|------|------|
| `packages/types/src/app-manifest.ts` | 타입 정의 |
| `apps/api-server/src/app-manifests/disabled-apps.registry.ts` | 비활성 앱 레지스트리 |
| `apps/api-server/src/app-manifests/index.ts` | 활성 앱 레지스트리 |

## 5. 분류 기준

### 5.1 broken (빌드/런타임 에러)

다음 조건 중 하나 이상 해당:
- `pnpm -F <package> build` 실패
- import 시 MODULE_NOT_FOUND 에러
- 런타임 TypeError/ReferenceError
- ESM 확장자 누락

**예시:**
```
- yaksa-scheduler: 타입 정의 불일치
- cosmetics-*-extension: ESM import 확장자 누락
- health-extension: 존재하지 않는 export 참조
```

### 5.2 incomplete (개발 미완료)

다음 조건 중 하나 이상 해당:
- 필수 의존성 미등록
- lifecycle 훅 미구현
- 핵심 기능 미구현

**예시:**
```
- platform-core: api-server dependencies 미등록
- auth-core: api-server dependencies 미등록
```

### 5.3 paused (의도적 중단)

다음 조건 해당:
- 기능은 완성되었으나 비즈니스 결정으로 중단
- 테스트 완료 후 배포 대기
- 리소스 부족으로 일시 중단

### 5.4 deprecated (폐기 예정)

다음 조건 해당:
- 대체 앱으로 마이그레이션 완료
- 12개월 이상 사용 없음
- 명시적 폐기 결정

## 6. Admin UI 표시 규칙

### 6.1 앱스토어 목록

```
[활성 앱] - 정상 표시
[비활성 앱] - 상태 배지 + 사유 표시

예:
┌─────────────────────────────────┐
│ 🔴 yaksa-scheduler              │
│ 상태: broken                     │
│ 사유: TypeScript 빌드 에러       │
│ 조치: 타입 정의 수정 필요        │
└─────────────────────────────────┘
```

### 6.2 숨김 금지

- Disabled App을 Admin UI에서 숨기지 않음
- 상태와 사유를 항상 표시
- 설치/활성화 버튼 비활성화 + 툴팁으로 사유 안내

## 7. 복구 프로세스

### 7.1 복구 Work Order 생성

```markdown
# WO: <app-id> 복구

## 현재 상태
- 상태: broken
- 사유: [disabled-apps.registry.ts에서 복사]

## 복구 작업
1. [nextAction 내용]
2. 빌드 테스트
3. 런타임 테스트
4. 레지스트리 업데이트

## 완료 기준
- pnpm -F <package> build 성공
- api-server 시작 성공
- Admin UI에서 정상 표시
```

### 7.2 복구 완료 시

1. `disabled-apps.registry.ts`에서 해당 앱 제거
2. `app-manifests/index.ts`에서 import/registry 활성화
3. 테스트 및 배포

## 8. 현재 비활성 앱 현황 (2024-12-15)

| App ID | 상태 | 사유 |
|--------|------|------|
| yaksa-scheduler | broken | 타입 정의 불일치 |
| cosmetics-partner-extension | broken | ESM import 확장자 누락 |
| cosmetics-seller-extension | broken | ESM import 확장자 누락 |
| cosmetics-supplier-extension | broken | ESM import 확장자 누락 |
| lms-marketing | broken | TypeScript 빌드 에러 |
| health-extension | broken | 존재하지 않는 export 참조 |
| platform-core | incomplete | api-server dependencies 미등록 |
| auth-core | incomplete | api-server dependencies 미등록 |

---

*Created: 2024-12-15*
*Last Updated: 2024-12-15*
*Status: Active Policy*
