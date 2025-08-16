# O4O Platform 서버 동기화 문제 분석 보고서

## 📋 Executive Summary

O4O Platform에서 서버와 GitHub 저장소 간의 구조 불일치로 인한 동기화 문제가 발생하고 있습니다. 주요 원인은 PM2 설정의 하드코딩된 경로와 CI/CD 배포 경로의 차이입니다.

---

## 🔍 현재 상황 분석

### 1. 디렉토리 구조 분석

#### GitHub 저장소 (정상)
```
/o4o-platform/
├── apps/
│   ├── admin-dashboard/    ✅ 최신 코드
│   ├── api-server/
│   └── main-site/
├── packages/
└── deployment/
```

#### 서버 예상 구조 (문제)
```
/home/ubuntu/o4o-platform/
├── apps/                   ✅ CI/CD가 배포하는 위치
│   └── admin-dashboard/
└── services/               ❌ PM2가 실행하는 위치 (구버전)
    └── admin-dashboard/
```

### 2. 핵심 문제점 발견

#### PM2 설정 파일의 하드코딩 문제
```javascript
// deployment/pm2/ecosystem.config.js (47번 줄)
cwd: '/home/sohae21/Coding/o4o-platform/apps/admin-dashboard',  // ❌ 잘못된 경로
```

#### CI/CD 배포 경로
```yaml
# .github/workflows/deploy-admin-dashboard.yml (257번 줄)
cwd: '${{ env.DEPLOY_PATH }}/apps/admin-dashboard',  // ✅ 올바른 경로
```

### 3. 문제 발생 원인

1. **PM2 설정 불일치**
   - 로컬 개발자 경로가 하드코딩됨 (`/home/sohae21/`)
   - 서버 경로와 맞지 않음 (`/home/ubuntu/`)

2. **경로 중복 가능성**
   - 이전에 services/ 구조를 사용했을 가능성
   - 마이그레이션 과정에서 잔재 남음

3. **동기화 실패**
   - CI/CD는 apps/에 배포
   - PM2는 services/에서 실행 (또는 잘못된 경로)
   - 결과: 최신 코드가 반영되지 않음

---

## 📊 문제점 우선순위 정리

| 우선순위 | 문제 | 영향도 | 긴급도 | 해결 난이도 |
|---------|------|--------|--------|------------|
| 1 | PM2 경로 하드코딩 | 🔴 높음 | 🔴 긴급 | 🟢 쉬움 |
| 2 | services/ 디렉토리 잔재 | 🟡 중간 | 🟡 보통 | 🟢 쉬움 |
| 3 | CI/CD와 PM2 동기화 | 🔴 높음 | 🔴 긴급 | 🟡 보통 |
| 4 | 환경별 설정 관리 | 🟡 중간 | 🟢 낮음 | 🟡 보통 |

---

## 🛠️ 해결방안

### 방안 1: PM2 설정 파일 수정 (권장) ⭐

**장점:**
- 즉시 적용 가능
- 리스크 최소
- CI/CD와 완벽히 동기화

**단점:**
- 없음

**실행 단계:**
```javascript
// deployment/pm2/ecosystem.config.js 수정
{
  name: 'o4o-admin-dashboard',
  script: 'serve',
  interpreter: 'none',
  args: '-s dist -l 3001',
  cwd: process.env.PM2_APP_PATH || '/home/ubuntu/o4o-platform/apps/admin-dashboard',
  // ... 나머지 설정
}
```

### 방안 2: 심볼릭 링크 생성 (임시)

**장점:**
- 빠른 해결
- 기존 설정 유지

**단점:**
- 임시방편
- 혼란 가중

**실행 명령:**
```bash
ln -s /home/ubuntu/o4o-platform/apps /home/ubuntu/o4o-platform/services
```

### 방안 3: CI/CD 배포 경로 변경 (비권장)

**장점:**
- 없음

**단점:**
- 표준 구조 위반
- 추가 혼란 야기

---

## 📋 단계별 실행 계획

### Phase 1: 즉시 수정 (5분)
1. **PM2 설정 파일 수정**
   ```bash
   # GitHub에서
   - deployment/pm2/ecosystem.config.js의 47번 줄 수정
   - cwd를 동적 경로로 변경
   ```

2. **커밋 및 푸시**
   ```bash
   git add deployment/pm2/ecosystem.config.js
   git commit -m "fix: PM2 admin-dashboard 경로 하드코딩 제거"
   git push
   ```

### Phase 2: 서버 적용 (10분)
1. **서버 접속 및 동기화**
   ```bash
   ssh ubuntu@admin.neture.co.kr
   cd /home/ubuntu/o4o-platform
   git pull origin main
   ```

2. **PM2 재시작**
   ```bash
   pm2 delete o4o-admin-dashboard
   pm2 start deployment/pm2/ecosystem.config.js --only o4o-admin-dashboard
   pm2 save
   ```

### Phase 3: 검증 (5분)
1. **상태 확인**
   ```bash
   pm2 list
   pm2 logs o4o-admin-dashboard
   ```

2. **웹 접속 테스트**
   - https://admin.neture.co.kr 접속
   - MultiThemeContext 에러 해결 확인

### Phase 4: 정리 작업 (선택사항)
1. **구버전 디렉토리 제거**
   ```bash
   # services/ 디렉토리가 있다면
   rm -rf /home/ubuntu/o4o-platform/services
   ```

2. **로그 확인**
   ```bash
   tail -f /home/ubuntu/o4o-platform/logs/admin-dashboard-error.log
   ```

---

## 🚨 리스크 평가 및 대응

### 리스크 1: PM2 프로세스 중단
- **영향**: 서비스 일시 중단 (1-2분)
- **대응**: 사용자 적은 시간대 작업

### 리스크 2: 경로 오류
- **영향**: PM2 시작 실패
- **대응**: 백업 ecosystem 파일 준비

### 리스크 3: 권한 문제
- **영향**: 파일 접근 불가
- **대응**: sudo 권한 확인

---

## 💡 권장사항

### 1. 즉시 조치 사항
- **PM2 설정 파일의 하드코딩 경로 수정** (최우선)
- 환경 변수를 활용한 동적 경로 설정

### 2. 단기 개선 사항
- services/ 디렉토리 완전 제거
- PM2 설정을 CI/CD 워크플로우에 통합

### 3. 장기 개선 사항
- 환경별 설정 파일 분리 (development, staging, production)
- 인프라 코드화 (IaC) 도입 검토
- 배포 자동화 강화

### 4. 모니터링 강화
- PM2 상태 알림 설정
- 배포 후 자동 헬스체크
- 로그 중앙화

---

## 📊 예상 결과

### 수정 전
```
CI/CD → /apps/admin-dashboard/ (최신 코드) ✅
PM2   → /services/admin-dashboard/ (구버전) ❌
결과: 404 에러, 최신 기능 미반영
```

### 수정 후
```
CI/CD → /apps/admin-dashboard/ (최신 코드) ✅
PM2   → /apps/admin-dashboard/ (최신 코드) ✅
결과: 정상 작동, 모든 기능 사용 가능
```

---

## 🎯 결론

현재 문제의 근본 원인은 **PM2 설정 파일의 하드코딩된 경로**입니다. 이를 수정하면 모든 문제가 해결됩니다.

**추천 작업 순서:**
1. PM2 설정 파일 수정 (GitHub)
2. 서버에서 git pull
3. PM2 재시작
4. 검증

예상 소요 시간: **20분**
서비스 중단 시간: **1-2분**

---

*작성일: 2025-07-19*
*작성자: Claude Code Assistant*