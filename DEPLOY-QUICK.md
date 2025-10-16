# 빠른 배포 가이드 (Quick Deploy Guide)

## 🚀 자동 배포 (권장)

### 1. 코드 수정 후 커밋 & 푸시
```bash
git add .
git commit -m "fix: your changes"
git push origin main
```

### 2. GitHub Actions 확인
- **URL**: https://github.com/Renagang21/o4o-platform/actions
- **예상 시간**: 2-3분
- **상태**: 초록색 체크 = 성공

### 3. 배포 확인
```bash
# 스크립트로 확인
./scripts/check-deployment.sh

# 또는 직접 확인
curl -s https://admin.neture.co.kr/version.json
```

---

## 🔍 배포가 안될 때

### 체크리스트

1. **변경된 파일이 트리거 조건에 맞는지 확인**
   ```bash
   # 마지막 커밋의 변경 파일 확인
   git diff --name-only HEAD~1 HEAD
   ```

   | 앱 | 트리거 경로 |
   |---|---|
   | Admin | `apps/admin-dashboard/**` |
   | Main Site | `apps/main-site/**` |
   | API Server | `apps/api-server/**` |
   | 공통 | `packages/**` |

2. **GitHub Actions 로그 확인**
   - Actions 탭 → 최근 workflow 클릭
   - 실패한 step 확인
   - 에러 메시지 읽기

3. **수동 트리거**
   - GitHub → Actions → 해당 workflow 선택
   - "Run workflow" 버튼 클릭

---

## 🛠️ 문제 해결

### "Workflow가 트리거되지 않음"

**원인**: 변경 파일이 `paths` 필터에 해당하지 않음

**해결**:
```bash
# workflow 파일 자체를 수정해서 트리거
touch .github/workflows/deploy-admin.yml
git add .github/workflows/deploy-admin.yml
git commit -m "chore: trigger deployment"
git push
```

### "배포는 되었는데 반영 안됨"

**원인**: 브라우저 캐시

**해결**:
1. 강력한 새로고침: `Ctrl + Shift + R` (또는 `Cmd + Shift + R`)
2. 시크릿 모드에서 확인
3. 캐시 완전 삭제: 개발자 도구 → Application → Clear site data

### "빌드는 성공했는데 배포 실패"

**원인**: SSH 인증 또는 서버 권한 문제

**해결**:
1. GitHub Actions 로그에서 정확한 에러 확인
2. Secrets 설정 확인 (Settings → Secrets and variables → Actions)
   - `WEB_HOST`: 웹서버 IP
   - `WEB_USER`: SSH 사용자명
   - `WEB_SSH_KEY`: SSH private key
   - `API_HOST`: API 서버 IP
   - `API_USER`: SSH 사용자명
   - `API_SSH_KEY`: SSH private key

---

## 📊 배포 상태 모니터링

### 실시간 확인
```bash
# 배포 상태 확인
./scripts/check-deployment.sh

# 지속적으로 확인 (10초마다)
watch -n 10 ./scripts/check-deployment.sh
```

### version.json 직접 확인
```bash
# Admin Dashboard
curl -s https://admin.neture.co.kr/version.json | jq

# Main Site
curl -s https://neture.co.kr/version.json | jq

# API Server 헬스체크
curl -s https://api.neture.co.kr/api/health | jq
```

---

## 🎯 빠른 참조

| 작업 | 명령어 |
|------|--------|
| 배포 상태 확인 | `./scripts/check-deployment.sh` |
| 로컬 빌드 | `pnpm run build` |
| Admin만 빌드 | `pnpm run build:admin` |
| GitHub Actions | https://github.com/Renagang21/o4o-platform/actions |
| 최근 커밋 | `git log --oneline -5` |

---

## 🆘 긴급 상황

### 롤백이 필요할 때

```bash
# 서버에 백업이 자동 생성됨
# SSH로 접속해서 백업 확인
ls -lt /var/www/admin.neture.co.kr.backup.*

# 백업 복구 (예시)
sudo rm -rf /var/www/admin.neture.co.kr/*
sudo cp -r /var/www/admin.neture.co.kr.backup.20251016_143000/* /var/www/admin.neture.co.kr/
sudo systemctl reload nginx
```

### 배포 시스템 전체 점검

```bash
# 1. 로컬 빌드 테스트
pnpm run build:admin

# 2. GitHub Actions workflow 문법 확인
cd .github/workflows
cat deploy-admin.yml

# 3. SSH 연결 테스트
ssh -i ~/.ssh/your-key user@host "echo 'SSH OK'"
```

---

**마지막 업데이트**: 2025-10-16
