# O4O Platform 배포 스크립트 가이드

## 📋 개요

O4O Platform의 배포 스크립트가 표준화되고 통합되었습니다. 이제 더 간단하고 안전하며 일관된 방식으로 배포할 수 있습니다.

## 🚀 주요 개선사항

### 1. 통합된 배포 시스템
- **단일 진입점**: `deploy-main.sh`로 모든 배포 작업 수행
- **일관된 인터페이스**: 모든 스크립트가 동일한 옵션과 사용법 제공
- **표준화된 로그**: 모든 배포 과정이 구조화된 로그로 기록

### 2. 안전한 배포 프로세스
- **배포 전 검증**: Git 상태, 빌드 테스트, 타입 체크, Lint 검사
- **SSH 연결 확인**: 배포 전 서버 연결 상태 확인
- **DRY RUN 모드**: 실제 배포 없이 시뮬레이션 가능
- **자동 백업**: 배포 시 기존 파일 자동 백업

### 3. 유연한 배포 옵션
- **선택적 배포**: API, Web, Nginx 개별 또는 전체 배포
- **스킵 옵션**: 빌드나 테스트 과정 건너뛰기 가능
- **강제 배포**: 확인 프롬프트 없이 자동 진행
- **빠른 배포**: 개발 중 신속한 배포를 위한 전용 스크립트

## 📚 스크립트 목록

### 🎯 메인 배포 스크립트

#### `scripts/deploy-main.sh` (표준 배포)
- **용도**: 프로덕션 배포의 표준 방법
- **특징**: 완전한 검증, 안전한 배포, 상세한 로그
- **권장**: 모든 정식 배포에 사용

```bash
# 전체 배포 (권장)
./scripts/deploy-main.sh

# API 서버만 배포
./scripts/deploy-main.sh api

# 웹 서버만 배포  
./scripts/deploy-main.sh web

# Nginx 설정만 배포
./scripts/deploy-main.sh nginx

# 옵션 사용
./scripts/deploy-main.sh all --skip-build    # 빌드 건너뛰기
./scripts/deploy-main.sh all --skip-tests    # 테스트 건너뛰기
./scripts/deploy-main.sh all --force         # 확인 없이 배포
./scripts/deploy-main.sh all --dry-run       # 시뮬레이션만
```

#### `scripts/deploy-quick.sh` (빠른 배포)
- **용도**: 개발 중 빠른 반복 배포
- **특징**: 테스트 스킵, 확인 없음, 최소 빌드
- **권장**: 개발 환경에서 빠른 테스트용

```bash
# 전체 빠른 배포
./scripts/deploy-quick.sh

# API 서버만 빠른 배포
./scripts/deploy-quick.sh api

# 웹 서버만 빠른 배포
./scripts/deploy-quick.sh web
```

#### `scripts/deploy-status.sh` (상태 확인)
- **용도**: 배포된 서비스들의 상태 확인
- **특징**: 웹 서비스, SSH 연결, 프로세스 상태 종합 체크

```bash
# 전체 서비스 상태 확인
./scripts/deploy-status.sh
```

### 📜 레거시 스크립트 (호환성 유지)

기존 스크립트들도 여전히 사용 가능합니다:
- `./scripts/deploy-all.sh`
- `./scripts/deploy-api.sh`
- `./scripts/deploy-web.sh`
- `./scripts/deploy.sh`
- `./scripts/deploy-unified.sh`

## 🛠️ 배포 프로세스

### 1. 배포 전 검증 단계
```
✅ Git 상태 확인 (커밋되지 않은 변경사항 경고)
✅ 패키지 빌드 테스트
✅ TypeScript 타입 체크
✅ ESLint 검사
✅ console.log 검사 (프로덕션 코드)
```

### 2. 빌드 단계
```
✅ 의존성 설치 확인
✅ 패키지 빌드 (types, utils, ui, auth 등)
✅ 빌드 결과 검증
```

### 3. 배포 실행
```
✅ SSH 연결 테스트
✅ 파일 백업 (자동)
✅ 소스 코드 동기화
✅ 원격 빌드 및 설치
✅ 서비스 재시작
✅ 헬스 체크
```

### 4. 배포 후 검증
```
✅ 서비스 상태 모니터링
✅ 웹 접근 테스트
✅ 배포 결과 요약
```

## 🔧 고급 사용법

### DRY RUN으로 안전하게 테스트
```bash
# 실제 배포 없이 전체 과정 시뮬레이션
./scripts/deploy-main.sh all --dry-run
```

### 개발 중 빠른 반복 배포
```bash
# 테스트 없이 빠른 API 배포
./scripts/deploy-quick.sh api
```

### 문제 발생 시 상태 확인
```bash
# 현재 서비스 상태 종합 확인
./scripts/deploy-status.sh
```

### 로그 확인
```bash
# 배포 로그 디렉토리
ls ~/.o4o-deploy-logs/

# 최신 배포 로그 확인
tail -f ~/.o4o-deploy-logs/deploy-*.log
```

## 🎯 사용 시나리오별 권장사항

### 📊 프로덕션 배포 (정식 릴리스)
```bash
# 1. 코드 변경사항 커밋
git add .
git commit -m "feat: 새로운 기능 추가"
git push

# 2. 표준 배포 (모든 검증 포함)
./scripts/deploy-main.sh all

# 3. 배포 후 상태 확인
./scripts/deploy-status.sh
```

### 🔧 개발 중 테스트 배포
```bash
# 빠른 배포로 테스트
./scripts/deploy-quick.sh all

# 문제 발생 시 상태 확인
./scripts/deploy-status.sh
```

### 🚨 긴급 수정 배포
```bash
# 테스트 스킵하고 강제 배포
./scripts/deploy-main.sh all --skip-tests --force
```

### 🧪 안전한 배포 사전 확인
```bash
# 실제 배포 전 시뮬레이션
./scripts/deploy-main.sh all --dry-run

# 문제 없으면 실제 배포
./scripts/deploy-main.sh all
```

## 📝 주요 변경사항

### 이전 vs 현재

| 항목 | 이전 | 현재 |
|------|------|------|
| 스크립트 수 | 20+ 개 분산 | 3개 주요 스크립트 |
| 사용법 | 스크립트마다 다름 | 표준화된 인터페이스 |
| 검증 | 일부만 지원 | 완전한 배포 전 검증 |
| 로그 | 일관성 없음 | 구조화된 로그 시스템 |
| 안전성 | 기본적 | 백업, DRY RUN, 상태 확인 |
| 유지보수 | 어려움 | 중앙화된 관리 |

### 호환성
- 기존 스크립트들은 여전히 작동합니다
- 점진적으로 새로운 스크립트로 마이그레이션 권장
- 기존 CI/CD 파이프라인은 그대로 유지 가능

## 🚀 다음 단계

1. **새로운 배포 스크립트 사용 시작**
   ```bash
   ./scripts/deploy-main.sh --help
   ```

2. **팀 내 배포 가이드라인 업데이트**
   - 프로덕션: `deploy-main.sh` 사용
   - 개발: `deploy-quick.sh` 사용
   - 상태 확인: `deploy-status.sh` 사용

3. **배포 자동화 개선**
   - GitHub Actions에서 새 스크립트 활용
   - 배포 알림 시스템 연동
   - 배포 메트릭 수집

이제 더 안전하고 효율적인 배포가 가능합니다! 🎉