# O4O Platform 배포 빠른 시작 가이드

## 🚀 빠른 배포

### 문서만 배포 (가장 빠름)
```bash
./scripts/deploy-main.sh docs --force
```
- 빌드/테스트 건너뜀
- 1-2초 내 완료
- 문서 수정 시 사용

### 전체 시스템 배포
```bash
./scripts/deploy-main.sh all --force
```
- 모든 검증 + 빌드 + 배포
- API, Web, Nginx 모두 배포

### API 서버만 배포
```bash
./scripts/deploy-main.sh api --force
```

### 웹 대시보드만 배포
```bash
./scripts/deploy-main.sh web --force
```

## 📋 배포 옵션

| 옵션 | 설명 | 권장 |
|------|------|------|
| `--force` | 확인 없이 즉시 배포 | ✅ 권장 |
| `--skip-build` | 빌드 건너뛰기 | 테스트용 |
| `--skip-tests` | 검증 건너뛰기 | 비권장 |
| `--dry-run` | 시뮬레이션만 | 테스트용 |

## 💡 팁

1. **`--force` 플래그 사용 권장**: 대화형 확인을 건너뛰고 즉시 배포
2. **문서 수정 시**: `docs --force` 사용 (초고속)
3. **코드 변경 시**: `all --force` 또는 특정 타겟 사용

## 📝 배포 로그

모든 배포 로그는 `~/.o4o-deploy-logs/` 디렉토리에 저장됩니다.

```bash
# 최근 배포 로그 확인
ls -lt ~/.o4o-deploy-logs/ | head -5
```

## 🔧 문제 해결

### SSH 연결 실패
```bash
# SSH 설정 확인
ssh webserver "echo '연결 성공'"
ssh o4o-apiserver "echo '연결 성공'"
```

### 권한 문제
```bash
# 스크립트 실행 권한 부여
chmod +x scripts/*.sh
```

## 🎯 일반적인 사용 사례

### 사례 1: 매뉴얼 문서 업데이트
```bash
# 문서 수정 후
git add docs/
git commit -m "docs: Update manual"
git push
./scripts/deploy-main.sh docs --force
```

### 사례 2: 새 기능 배포
```bash
# 코드 변경 후
git add .
git commit -m "feat: New feature"
git push
./scripts/deploy-main.sh all --force
```

### 사례 3: 긴급 핫픽스
```bash
# 긴급 수정 후
git add .
git commit -m "fix: Emergency fix"
git push
./scripts/deploy-main.sh api --force  # 또는 web --force
```
