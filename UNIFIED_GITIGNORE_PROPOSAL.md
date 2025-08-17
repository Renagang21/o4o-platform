# 🎯 통합 .gitignore 기준안 제안서

## 📋 현재 .gitignore 분석 결과

### 현재 구조 (145줄)
1. **의존성 관리** (6줄): node_modules, npm/yarn/pnpm 디버그 로그
2. **빌드 결과물** (6줄): dist/, build, .next, out, *.map, .vite
3. **환경 변수** (14줄): .env 및 관련 파일들 (example 제외)
4. **OS 파일** (8줄): .DS_Store, Thumbs.db 등
5. **IDE 설정** (5줄): .vscode, .idea, vim swap 파일
6. **로그 파일** (5줄): logs 디렉토리, 각종 로그 파일
7. **테스트/커버리지** (5줄): coverage, test-results, playwright
8. **임시 파일** (다수): backup, tmp, temp 등
9. **보안 파일** (3줄): *.pem, *.ppk, *.p12
10. **프로젝트 특화** (다수): CLAUDE.md, 리포트 파일들

### 발견된 문제점
- ❌ 프론트엔드 앱들이 Git에서 제외됨 (apps/main-site/ 등)
- ⚠️ 일부 패턴이 중복됨 (.env.* 와 개별 .env.xxx 파일)
- ⚠️ 환경별 특화 규칙 부재
- ⚠️ 백업 파일 패턴이 여러 곳에 분산

---

## 🚀 제안: 3개 환경 통합 .gitignore 기준안

```gitignore
# ================================
# O4O Platform - Unified .gitignore
# 적용 환경: 로컬, 웹서버, API서버
# 최종 수정: 2025-08-17
# ================================

# === 1. 의존성 및 패키지 관리 ===
node_modules/
**/node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*
.pnpm-store/
.npm
.yarn/cache
.yarn/install-state.gz

# === 2. 빌드 결과물 ===
dist/
**/dist/
build/
**/build/
.next/
out/
.vite/
*.map
*.tsbuildinfo
.turbo/

# === 3. 환경 변수 (중요: 보안) ===
# 모든 .env 파일 제외
.env
.env.*
# 예제 파일은 포함
!.env.example
!.env.*.example
# 백업 파일 제외
*.env.backup*
.env.backup*

# === 4. 로그 파일 ===
logs/
*.log
*-debug.log
*-error.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# === 5. IDE 및 에디터 ===
.vscode/
.idea/
.cursor/
*.swp
*.swo
*.swn
*~
.project
.classpath
.c9/
*.sublime-project
*.sublime-workspace

# === 6. OS 생성 파일 ===
.DS_Store
.DS_Store?
._*
Thumbs.db
ehthumbs.db
Desktop.ini
.Spotlight-V100
.Trashes
*.lnk

# === 7. 테스트 및 커버리지 ===
coverage/
.nyc_output/
test-results/
playwright-report/
playwright/.cache/
*.lcov
.jest/

# === 8. 캐시 파일 ===
.cache/
.eslintcache
.stylelintcache
.parcel-cache/
.next/cache/

# === 9. 임시 파일 ===
tmp/
temp/
*.tmp
*.temp
*.bak
*.backup
*.old
*.orig
*.save

# === 10. 보안 및 인증서 ===
*.pem
*.ppk
*.p12
*.key
*.cert
*.crt
*.csr
.aws/
.ssh/

# === 11. 데이터베이스 ===
*.sqlite
*.sqlite3
*.db
data/

# === 12. 압축 파일 ===
*.zip
*.tar.gz
*.tgz
*.rar
*.7z

# === 13. PM2 및 프로세스 관리 ===
.pm2/
.dev-pids/
pids/
*.pid
*.seed
*.pid.lock

# === 14. 업로드 및 미디어 ===
uploads/
public/uploads/
media/

# === 15. 프로젝트 특화 파일 ===
# Claude Code 관련
CLAUDE.md
CLAUDE_*.md
!CLAUDE.md.example

# 임시 리포트 (루트만)
/*_REPORT.md
/*_ANALYSIS.md
!README.md

# 로컬 설정
*.local
!.env.local.example

# === 16. 문서 생성물 ===
docs/generated/
api-docs/

# === 17. 환경별 특화 (선택적) ===
# 로컬 개발 전용
scratch/
.sandbox/

# 서버 전용 (주석 처리됨, 필요시 활성화)
# /deployment-scripts/
# /server-configs/

# === 18. 기타 ===
# 대용량 데이터 파일
*.dat
*.mmdb
*.csv
*.xlsx

# 백업 디렉토리
.backup/
backups/
backup/
```

---

## 📊 개선 사항 요약

### 추가된 항목
✅ **패키지 매니저 캐시**: .yarn/cache, .pnpm-store
✅ **추가 빌드 도구**: .turbo
✅ **추가 IDE**: .cursor, .c9
✅ **프로세스 관리**: .pm2, pids
✅ **업로드 디렉토리**: uploads/, media/
✅ **문서 생성물**: docs/generated

### 정리된 항목
✅ **환경변수 섹션 통합**: 중복 제거 및 단순화
✅ **백업 파일 통합**: 한 섹션으로 정리
✅ **주석 추가**: 각 섹션별 명확한 설명

### 환경별 고려사항
1. **로컬**: scratch/, .sandbox/ 추가
2. **웹서버**: 정적 파일 관련 패턴
3. **API서버**: 데이터베이스, 로그 중심

---

## 🔧 적용 방법

### 1단계: 백업
```bash
cp .gitignore .gitignore.backup.$(date +%Y%m%d)
```

### 2단계: 새 .gitignore 적용
```bash
# 제안된 내용으로 .gitignore 교체
```

### 3단계: Git 캐시 정리
```bash
git rm -r --cached .
git add .
git status  # 변경사항 확인
```

### 4단계: 커밋
```bash
git commit -m "chore: 통합 .gitignore 적용"
```

---

## ⚠️ 주의사항

1. **dist/ 폴더**: 빌드 결과물은 Git에서 제외 권장
2. **환경변수**: 모든 .env 파일 제외, example만 포함
3. **백업 필수**: 적용 전 반드시 기존 파일 백업
4. **테스트 필요**: 각 환경에서 정상 작동 확인

---

## 📈 기대 효과

- ✅ **보안 강화**: 민감 파일 확실한 제외
- ✅ **일관성**: 3개 환경 통일된 규칙
- ✅ **유지보수 용이**: 명확한 섹션 구분
- ✅ **성능 개선**: 불필요한 파일 추적 방지

---

*제안일: 2025-08-17*
*작성 환경: 웹서버(o4o-webserver)*