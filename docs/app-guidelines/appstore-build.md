# AppStore Build Guide

**버전:** 2.0.0
**상태:** Active

---

## 1. Purpose

AppStore 패키지의 빌드 전략과 설정 규칙을 정의한다.

## 2. Overview

O4O Platform은 두 가지 빌드 전략을 사용한다:

| 전략 | 용도 | dist 생성 |
|------|------|----------|
| **Source-based** | Frontend 전용 | dummy |
| **Hybrid** | Backend 포함 | entities만 |

## 3. Build Strategy

### Source-based (Frontend 전용)

- Vite가 빌드 시 직접 번들링
- TypeScript 컴파일 스킵
- 사용: Admin Dashboard, Main Site 전용

### Hybrid (Backend 포함)

- Backend는 TypeScript 컴파일
- Frontend는 source export
- 사용: entities/lifecycle 포함 앱

## 4. Package Config

| 패키지 타입 | exports | build script |
|-------------|---------|--------------|
| Frontend 전용 | `./src/admin-ui/index.ts` | `echo 'Skipping'` |
| Backend 포함 | `./dist/index.js` | `tsc -p tsconfig.json` |

## 5. Build Commands

```bash
# 로컬 개발
pnpm dev                    # Admin/Main Vite dev server

# CI/CD 빌드
pnpm run build:packages     # 공통 패키지만
pnpm run type-check         # 전체 타입 체크
```

## 6. Rules

1. **Backend 포함 시 Hybrid 필수**: entities 사용 앱은 dist 빌드 필요.
2. **Path Alias 사용**: 상대 경로 대신 `@/*`, `@o4o/*` 사용.
3. **index.ts export 필수**: backend 요소는 index.ts에서 export해야 Module Loader가 인식.
4. **prebuild 설정**: API Server는 prebuild에서 앱 entities 빌드.
5. **Vite alias 등록**: Admin에서 사용하는 앱은 vite.config.ts에 alias 추가.

---

## Related Documents

- [backend-structure.md](./backend-structure.md)
- [manifest-guideline.md](./manifest-guideline.md)

---
*최종 업데이트: 2025-12-10*
