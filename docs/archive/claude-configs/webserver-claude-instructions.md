# o4o-webserver Claude Code 지시사항

**이 내용을 o4o-webserver의 CLAUDE.md에 추가해주세요.**

## 📋 작업 요청

웹서버(13.125.144.8)의 CLAUDE.md 파일에 아래의 Smart Build System 섹션을 추가해주세요.

## 추가할 내용

```markdown
## 🎯 Smart Build System (중요)

**웹서버는 여러 프론트엔드 앱을 관리하므로, 변경된 부분만 빌드하는 것이 중요합니다.**

### 1. 가장 자주 사용하는 명령어 (이것만 기억!)

```bash
# 🔥 핵심 명령어
npm run build:changed       # 현재 변경된 파일만 감지해서 빌드
npm run build:after-pull    # git pull 후 변경된 것만 빌드

# 웹서버 일반 워크플로우
git pull origin main        # 최신 코드 받기
npm run build:after-pull    # 변경된 것만 자동 빌드

# 빌드된 파일 배포
sudo cp -r apps/main-site/dist/* /var/www/neture.co.kr/
sudo cp -r apps/admin-dashboard/dist/* /var/www/admin.neture.co.kr/
sudo chown -R www-data:www-data /var/www/
```

### 2. 웹서버 전용 빌드 명령어

```bash
# 웹 앱들만 안전하게 빌드 (메모리 최적화)
npm run build:safe:web      # main-site, admin-dashboard, ecommerce 빌드

# 개별 앱 빌드 (자주 사용)
npm run build:web           # 메인 사이트만
npm run build:admin         # 관리자 대시보드만
npm run build:ecommerce     # 이커머스만

# 스마트 빌드 확인
npm run build:smart:check   # 무엇이 빌드될지 미리보기
```

### 3. 빌드 시나리오별 가이드

| 상황 | 추천 명령어 | 설명 |
|------|------------|------|
| **GitHub Actions 배포 후** | `npm run build:after-pull` | CI/CD로 받은 변경사항만 빌드 |
| **특정 앱 수정** | `npm run build:[app]` | 해당 앱만 빌드 (예: build:admin) |
| **메모리 부족 시** | `npm run build:safe:web` | 타임아웃/재시도로 안전하게 빌드 |
| **전체 재구축** | `npm run build:smart:full` | 모든 웹 앱 강제 빌드 |
| **빌드 전 확인** | `npm run build:smart:check` | 빌드 대상 미리보기 |

### 4. 웹서버 배포 프로세스

```bash
# 1. 최신 코드 가져오기
git pull origin main

# 2. 변경된 것만 빌드
npm run build:after-pull

# 3. 빌드 성공 확인
ls -la apps/*/dist/

# 4. 웹 디렉토리에 배포
# Main Site
sudo rm -rf /var/www/neture.co.kr/*
sudo cp -r apps/main-site/dist/* /var/www/neture.co.kr/

# Admin Dashboard  
sudo rm -rf /var/www/admin.neture.co.kr/*
sudo cp -r apps/admin-dashboard/dist/* /var/www/admin.neture.co.kr/

# 권한 설정
sudo chown -R www-data:www-data /var/www/

# 5. 배포 확인
curl -I http://localhost  # nginx 응답 확인
```

### 5. 빌드 문제 해결

#### 빌드가 멈추는 경우
```bash
# 1. 안전 모드로 빌드
npm run build:safe:web

# 2. 개별 앱씩 빌드
npm run build:web
npm run build:admin
npm run build:ecommerce
```

#### 메모리 부족 시
```bash
# 1. 메모리 확인
free -h

# 2. 불필요한 프로세스 종료
pm2 stop all  # PM2 프로세스 중지 (API 서버가 없으므로 안전)

# 3. 순차적 빌드
npm run build:safe:web
```

### 6. 스마트 빌드 동작 원리

1. **변경 감지**: `git diff`로 변경된 파일 확인
2. **의존성 분석**:
   - packages/types, utils 변경 → 모든 웹 앱 재빌드
   - 개별 앱 변경 → 해당 앱만 빌드
3. **빌드 최적화**: 불필요한 빌드 스킵으로 시간 단축

### 7. 주의사항

- **API 서버는 빌드하지 않음** (43.202.242.215에서 관리)
- **빌드 후 항상 /var/www/ 디렉토리에 배포 필요**
- **nginx 설정 변경 시 `sudo nginx -s reload` 필요**
```

## 작업 순서

1. 웹서버에서 CLAUDE.md 파일 열기
2. 위 내용을 적절한 위치에 추가 (기존 Quick Commands 섹션 대체 또는 보완)
3. 파일 저장 후 커밋
4. 필요시 웹서버 특화 내용 추가 조정

## 추가 고려사항

- 웹서버는 API 서버를 빌드하지 않으므로 `build:api` 관련 명령어는 제외
- 배포 경로가 `/var/www/` 디렉토리임을 강조
- nginx 관련 설정 및 재시작 명령어 포함
- 메모리 제약이 있을 수 있으므로 안전 빌드 옵션 강조

이 내용을 o4o-webserver의 Claude Code에 전달하여 CLAUDE.md를 업데이트하도록 하세요.