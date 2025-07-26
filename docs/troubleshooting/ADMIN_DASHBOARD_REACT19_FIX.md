# Admin Dashboard React 19 오류 해결 가이드

## 문제 상황
브라우저에서 `admin.neture.co.kr` 접속 시 빈 화면과 함께 콘솔 오류 발생:
```
Uncaught TypeError: Cannot read properties of undefined (reading 'useLayoutEffect')
```

## 원인 분석
React 19에서 기본 내보내기(default export) 방식이 변경되어 발생하는 호환성 문제입니다.

## 해결 방법

### 1. GitHub 코드 수정 (완료)
`apps/admin-dashboard/src/main.tsx` 파일의 React import 수정:

```typescript
// 변경 전 (React 18 스타일)
import React from 'react'
import ReactDOM from 'react-dom/client'

// 변경 후 (React 19 스타일)
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
```

### 2. 서버 작업 필요사항

#### CI/CD 완료 후 서버에서 실행할 명령어:

```bash
# 1. o4o-webserver 접속
ssh ubuntu@13.125.144.8

# 2. 배포 확인
ls -la /var/www/admin.neture.co.kr/
# index.html과 assets 폴더가 최신으로 업데이트되었는지 확인

# 3. 파일 권한 확인
sudo chown -R www-data:www-data /var/www/admin.neture.co.kr/
sudo chmod -R 755 /var/www/admin.neture.co.kr/

# 4. Nginx 재시작 (필요시)
sudo systemctl reload nginx

# 5. 브라우저 캐시 클리어
# Chrome: Ctrl+Shift+R 또는 F12 > Network > Disable cache 체크
```

### 3. 추가 확인사항

#### 로컬에서 확인
```bash
cd apps/admin-dashboard
npm run build
# 빌드 성공 확인

# dist 폴더 내용 확인
ls -la dist/
```

#### 빌드 결과
- ✅ 빌드 성공
- ✅ 모든 청크 생성 완료
- ⚠️ TailwindCSS v4 관련 경고 (기능에는 영향 없음)

## 결론
1. **GitHub 코드 수정**: ✅ 완료
2. **서버 작업**: CI/CD 파이프라인 실행 후 위 명령어로 확인 필요
3. **브라우저 캐시**: 강제 새로고침 필요

## 문제 해결 확인 방법
1. CI/CD 파이프라인 실행 대기
2. 서버에서 파일 업데이트 확인
3. 브라우저 캐시 클리어 후 재접속
4. F12 콘솔에서 오류 없는지 확인