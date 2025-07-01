# 02-operations 🛠️ 운영 & 문제 해결

프로젝트 운영 중 발생하는 문제들의 해결법과 일상적인 운영 작업 가이드입니다.

## 🔥 긴급상황 대응

### 사이트가 안 보일 때
1. [문제 해결 가이드](troubleshooting.md#사이트가-안-보일-때-5분-해결법) 참조
2. `pm2 restart all`
3. `npm run build:all`

### Git 충돌/동기화 문제
1. [Git 동기화 가이드](troubleshooting.md#git-동기화-충돌-해결) 참조
2. 안전한 stash → reset → pop 절차

## 📋 주요 운영 문서

### 🔧 [문제 해결 가이드](troubleshooting.md)
- 긴급상황 5분 해결법
- 자주 발생하는 문제 해결
- 환경변수, 포트, 빌드 문제
- Medusa, TipTap 등 라이브러리별 문제
- 시스템 모니터링 명령어

### 📝 현재 상태 관리
- [알려진 문제들](known-issues.md) - 현재 해결 중인 이슈들
- [정기 점검](maintenance.md) - 주기적으로 확인할 항목들
- [Git 작업플로우](git-workflow.md) - 안전한 협업 방법

## ⚡ 빠른 명령어 참조

```bash
# 상태 확인
pm2 status
pm2 logs --lines 20
git status

# 긴급 재시작
pm2 restart all
npm run build:all

# 안전한 Git 동기화
git stash push -m "backup-$(date +%Y%m%d_%H%M)"
git fetch origin && git reset --hard origin/main
```

## 🔍 문제 유형별 바로가기

- **환경설정 문제** → [../01-setup/environment-setup.md](../01-setup/environment-setup.md)
- **빌드/배포 문제** → [troubleshooting.md#빌드-실패-문제](troubleshooting.md)
- **서버 충돌** → [troubleshooting.md#포트-충돌-문제](troubleshooting.md)
- **의존성 문제** → [troubleshooting.md#npm-yarn-의존성-문제](troubleshooting.md)
- **버전 불일치** → [troubleshooting.md#medusa-버전-불일치-문제](troubleshooting.md)

## 📊 모니터링 대시보드

```bash
# 실시간 모니터링
pm2 monit

# 시스템 리소스
df -h && free -h

# 로그 확인
pm2 logs --lines 50
```

## 🆘 최후의 수단

문제 해결이 안 될 때:
1. [troubleshooting.md#복구-불가능할-때](troubleshooting.md) 참조
2. 전체 재설치 절차
3. 백업에서 복구

---

**문제 해결 후**: 해결 방법을 [troubleshooting.md](troubleshooting.md)에 추가해 주세요!