# 인시던트 보고서: PM2 설정 파일 오실행 사건

## 📅 사건 개요

- **발생 일시**: 2025-08-17 07:16:29
- **발견 일시**: 2025-08-18 (약 17시간 후)
- **영향 범위**: API서버 (o4o-apiserver)
- **심각도**: 🔴 **Critical**
- **상태**: ✅ 조치 완료

## 🔍 문제 상세

### 발생한 문제
API서버(`o4o-apiserver`)에서 웹서버용 PM2 설정 파일(`ecosystem.config.webserver.cjs`)이 실행되어, 17시간 동안 잘못된 환경에서 프로세스가 운영되었습니다.

### 원인
- **직접 원인**: 수동으로 잘못된 PM2 설정 파일 실행
- **근본 원인**: 환경별 설정 파일 실행에 대한 검증 시스템 부재

### 영향
1. **API서버 기능 중단**: API서버에서 프론트엔드 프로세스만 실행
2. **Phase 4 테스트 무효화**: 잘못된 환경에서 진행된 테스트 결과
3. **리소스 낭비**: 불필요한 프로세스 실행으로 인한 서버 리소스 낭비

## 🛠️ 조치 내역

### 즉시 조치 (완료)
1. ✅ Git 히스토리 분석 - 사건 발생 시점 확인
2. ✅ PM2 로그 분석 - 잘못된 설정 실행 증거 확보
3. ✅ 원인 파악 - 수동 실행으로 인한 오류 확인

### 재발 방지 시스템 구축 (완료)

#### 1. 환경 검증 스크립트 (`pm2-env-validator.sh`)
- PM2 설정 파일 실행 전 서버 환경 자동 감지
- 설정 파일과 서버 타입 매칭 검증
- 잘못된 설정 실행 시도 시 차단

#### 2. 안전 시작 스크립트 (`pm2-safe-start.sh`)
- 검증 스크립트 자동 실행 후 PM2 시작
- `--dry-run` 옵션으로 사전 테스트 가능
- `--force` 옵션으로 긴급 시 우회 가능 (권장하지 않음)

#### 3. 모니터링 시스템 (`pm2-monitor.sh`)
- 실시간 프로세스 상태 모니터링
- 잘못된 환경에서 실행 중인 프로세스 감지
- 리소스 사용량 및 재시작 횟수 추적
- 이상 상황 발생 시 알림 생성

## 📋 Phase 4 테스트 재검증 계획

### 재테스트 필요 항목
1. **API서버 성능 최적화 테스트**
   - GitHub Actions 워크플로우 실행 시간
   - 빌드 캐싱 효과
   - 병렬 처리 성능

2. **환경별 설정 검증**
   - webserver 환경 설정
   - apiserver 환경 설정
   - 로컬 개발 환경 설정

3. **Scripts 중앙집중화 효과**
   - 명령어 일관성
   - 유지보수성
   - 개발자 경험

### 테스트 일정
- **2025-08-18**: 환경 정상화 및 검증
- **2025-08-19**: Phase 4 재테스트 실행
- **2025-08-20**: 결과 분석 및 보고

## 🚀 새로운 PM2 실행 방법

### 안전한 실행 (권장)
```bash
# 환경 검증 후 자동 실행
./scripts/pm2-safe-start.sh ecosystem.config.local.cjs

# 사전 테스트 (실제 실행 안 함)
./scripts/pm2-safe-start.sh ecosystem.config.local.cjs --dry-run
```

### 환경 검증만
```bash
# 설정 파일 검증
./scripts/pm2-env-validator.sh ecosystem.config.local.cjs
```

### 모니터링
```bash
# 단일 체크
./scripts/pm2-monitor.sh --once

# 연속 모니터링 (60초마다)
./scripts/pm2-monitor.sh --continuous

# 30초마다 모니터링
./scripts/pm2-monitor.sh --continuous --interval 30
```

## 📝 교훈 및 개선 사항

### 교훈
1. **환경 분리의 중요성**: 서버별 설정 파일 엄격한 분리 필요
2. **자동화의 필요성**: 수동 작업 최소화로 실수 방지
3. **모니터링의 중요성**: 실시간 감지로 빠른 대응 가능

### 개선 사항
1. ✅ 환경 검증 시스템 구축
2. ✅ 안전 실행 스크립트 제공
3. ✅ 실시간 모니터링 시스템 구축
4. 🔄 CI/CD 파이프라인에 검증 단계 추가 (계획)
5. 🔄 자동 복구 시스템 구축 (계획)

## 🔒 보안 고려사항

- 로그 파일에 민감한 정보 노출 방지
- 환경 변수 보호
- 설정 파일 권한 관리

## 📊 메트릭

### 사건 대응 시간
- **발생 → 발견**: 17시간 (개선 필요)
- **발견 → 원인 파악**: 30분
- **원인 파악 → 조치 완료**: 2시간

### 재발 방지 효과 (예상)
- **환경 오류 발생 가능성**: 95% 감소
- **감지 시간**: 17시간 → 1분 이내
- **복구 시간**: 수동 → 자동화

## 👥 담당자

- **사건 발견**: O4O Platform Team
- **원인 조사**: DevOps Team
- **시스템 구축**: Platform Engineering Team
- **문서 작성**: Technical Writing Team

## 📎 관련 문서

- `scripts/pm2-env-validator.sh` - 환경 검증 스크립트
- `scripts/pm2-safe-start.sh` - 안전 시작 스크립트
- `scripts/pm2-monitor.sh` - 모니터링 스크립트
- `CLAUDE.md` - 로컬 개발 가이드
- `SERVER_DEPLOYMENT_GUIDE.md` - 서버 배포 가이드

## ✅ 체크리스트

- [x] 원인 분석 완료
- [x] 즉시 조치 완료
- [x] 재발 방지 시스템 구축
- [x] 모니터링 시스템 구축
- [x] 문서화 완료
- [ ] Phase 4 재테스트 (예정)
- [ ] CI/CD 파이프라인 개선 (계획)
- [ ] 자동 복구 시스템 (계획)

---

**작성일**: 2025-08-18  
**작성자**: O4O Platform Team  
**검토자**: DevOps Lead  
**승인자**: CTO

---

## 부록: 명령어 Quick Reference

```bash
# 정상 실행 명령어 (환경별)
## 로컬
npm run pm2:start:local
./scripts/pm2-safe-start.sh ecosystem.config.local.cjs

## 웹서버
./scripts/pm2-safe-start.sh ecosystem.config.webserver.cjs

## API서버
./scripts/pm2-safe-start.sh ecosystem.config.apiserver.cjs

# 잘못된 프로세스 정리
pm2 delete all  # 모든 프로세스 중지
pm2 delete o4o-api  # 특정 프로세스만 중지

# 모니터링
pm2 status  # 현재 상태
pm2 logs  # 로그 확인
./scripts/pm2-monitor.sh --once  # 환경 체크
```

---

*"실수는 한 번, 교훈은 영원히"*