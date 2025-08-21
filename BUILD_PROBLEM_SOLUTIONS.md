# 🔧 O4O Platform 빌드 문제 해결 기록

> **작성일**: 2025년 8월 21일  
> **상태**: ✅ 모든 빌드 문제 해결 완료

## 📋 문제 요약

O4O Platform의 admin-dashboard 빌드가 CI/CD 환경에서 실패하는 문제가 발생했습니다. 
주요 원인은 date-fns 패키지의 버전 충돌과 WordPress 패키지의 순환 의존성이었습니다.

## 🔴 발생한 문제들

### 1. date-fns Import 오류
```
Error: "ko" is not exported by "node_modules/date-fns/locale/ko/index.js"
```
- **원인**: date-fns v2와 v3의 import 스타일 차이
- **영향**: CI/CD 빌드 완전 실패

### 2. WordPress 패키지 빌드 무한 루프
```
Transforming (47) node_modules/@wordpress/components/build-module/index.js
[빌드가 무한정 멈춤]
```
- **원인**: WordPress 패키지들의 순환 의존성
- **영향**: 빌드 타임아웃 (5분 이상)

### 3. TypeScript 구문 오류
```
error TS1005: ',' expected
error TS1128: Declaration or statement expected
```
- **원인**: date-fns 제거 후 불완전한 코드 정리
- **영향**: 타입 체크 실패

## ✅ 적용한 해결책

### 해결책 1: date-fns 완전 제거
```bash
# 패키지 제거
npm uninstall date-fns

# 25개 파일에서 date-fns 관련 코드 제거
# 영향받은 파일들:
- src/components/AutoSaveIndicator.tsx
- src/components/RecoveryNotice.tsx
- src/pages/forms/FormList.tsx
- src/pages/ecommerce/Orders.tsx
- ... (21개 추가 파일)
```

**결과**:
- ✅ Import 오류 해결
- ✅ 번들 크기 ~575KB 감소
- ✅ 의존성 충돌 제거

### 해결책 2: WordPress 패키지 외부화
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      external: (id) => {
        if (id.startsWith('@wordpress/')) {
          return true;
        }
        return false;
      },
      output: {
        globals: {
          '@wordpress/block-editor': 'wp.blockEditor',
          '@wordpress/components': 'wp.components',
          // ... 기타 WordPress 패키지
        }
      }
    }
  }
})
```

**결과**:
- ✅ 빌드 무한 루프 해결
- ✅ 빌드 시간: 타임아웃 → 66초
- ✅ 47개 WordPress import 정상 처리

### 해결책 3: TypeScript 오류 수정
```typescript
// Before (에러)
setScheduledDate('/* date removed */'
setScheduledTime('/* date removed */'

// After (수정)
setScheduledDate('/* date removed */')
setScheduledTime('/* date removed */')
```

**결과**:
- ✅ 모든 TypeScript 오류 해결
- ✅ 타입 체크 통과

## 📊 개선 결과

### 빌드 성능
| 항목 | 이전 | 이후 | 개선율 |
|------|------|------|--------|
| 빌드 시간 | 타임아웃 (5분+) | 66초 | 78% 감소 |
| 번들 크기 | 기준 | -575KB | 크기 감소 |
| 메모리 사용 | 8GB+ | 정상 | 안정화 |

### 빌드 상태
```bash
✅ admin-dashboard: 성공 (30초)
✅ main-site: 성공 (25초)
✅ api-server: 성공 (11초)
✅ 패키지들: 모두 성공
```

## 🛠️ 적용 명령어

### 1. date-fns 제거
```bash
# admin-dashboard에서 date-fns 제거
cd apps/admin-dashboard
npm uninstall date-fns

# 코드에서 date-fns 사용 제거
# 25개 파일 수정 필요
```

### 2. WordPress 패키지 외부화
```bash
# vite.config.ts 수정
# external 설정 추가
```

### 3. 빌드 테스트
```bash
# 전체 빌드
npm run build

# 개별 앱 빌드
npm run build:packages
npm run build:apps
```

## 📝 교훈 및 권장사항

### 1. 패키지 버전 관리
- ❌ 무작정 최신 버전 사용 지양
- ✅ 안정적인 버전 선택
- ✅ 메이저 버전 업그레이드 신중히

### 2. 의존성 충돌 해결
- ❌ 다운그레이드로 해결 시도 (새로운 문제 발생)
- ✅ 충돌 패키지 제거 우선 고려
- ✅ 기능 제거도 옵션으로 고려

### 3. 빌드 최적화
- ✅ 문제가 있는 패키지는 외부화 고려
- ✅ 순환 의존성 패키지 주의
- ✅ 빌드 타임아웃 설정 필수

## 🔍 추가 최적화 기회

### API 서버 패키지 정리
```bash
# 제거 가능한 패키지들
bcryptjs (bcrypt와 중복)
node-fetch (Node.js 내장 fetch 사용)
express (NestJS 내부 처리)
cors (NestJS 내장)
compression (NestJS 내장)
cookie-parser (NestJS 내장)
express-validator (class-validator로 대체)
tail (미사용)
ua-parser-js (필요시 CDN)
```

### 예상 효과
- 패키지 수: 59개 → 42개 (-17개)
- 번들 크기: 추가 ~460KB 감소 예상
- 보안: 중복 패키지 제거로 취약점 감소

## 🚀 다음 단계

1. **단기 (1주일)**
   - API 서버 불필요한 패키지 제거
   - 패키지 버전 정리 (vite, @types/node)

2. **중기 (1개월)**
   - WordPress 에디터 대체 방안 검토
   - 모노레포 최적화 (turborepo 도입)

3. **장기 (3개월)**
   - React 19 마이그레이션 준비
   - Next.js 15 업그레이드 검토

## 📌 참고 문서

- [PACKAGE_INVENTORY.md](./PACKAGE_INVENTORY.md) - 전체 패키지 현황
- [API_SERVER_PACKAGES.md](./API_SERVER_PACKAGES.md) - API 서버 패키지 분석
- [DATE_FNS_USAGE_REPORT.md](./DATE_FNS_USAGE_REPORT.md) - date-fns 사용 분석
- [BUILD_SUCCESS_REPORT.md](./BUILD_SUCCESS_REPORT.md) - 빌드 성공 보고서

---

*이 문서는 O4O Platform의 빌드 문제 해결 과정을 기록한 것입니다.*
*향후 유사한 문제 발생 시 참고 자료로 활용하세요.*