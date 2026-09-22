#!/bin/bash
#
# WO-O4O-ADMIN-CI-CD-AFFECTED-SCOPE-AND-DUPLICATE-WORK-REDUCTION-V1
#   — `ci-pipeline.yml` 안에 인라인으로 있던 console.log 게이트를 그대로 옮긴 것.
#
# 옮긴 이유: Admin-only 변경의 fast path 는 저장소 전체가 아니라
# `apps/admin-dashboard` 만 검사한다. 같은 grep 을 workflow YAML 두 곳에 복사해 두면
# 한쪽만 고쳐지는 drift 가 생긴다. 검사 내용(제외 목록 · 필터)은 **무수정 이전**이다.
#
# 사용법:
#   bash scripts/ci/check-console-log.sh            # 기본 범위: apps/
#   bash scripts/ci/check-console-log.sh apps/admin-dashboard/
#
set -e

SCAN_DIR="${1:-apps/}"

# Find all console.log statements, excluding comments, test files, CLI scripts, config files, migrations, and logger utilities
# Also exclude main.tsx/main.ts files (entry points with startup logs)
CONSOLE_LOGS=$(grep -r "console\.log" "$SCAN_DIR" --include="*.ts" --include="*.tsx" \
  --exclude-dir=node_modules --exclude-dir=dist \
  --exclude-dir=test --exclude-dir=e2e \
  --exclude-dir=scripts \
  --exclude-dir=cli \
  --exclude-dir=vscode-extension \
  --exclude="*test*" --exclude="*spec*" \
  --exclude="vite.config.ts" --exclude="*.config.ts" \
  --exclude="logger.ts" --exclude="*logger*.ts" \
  --exclude="cli.ts" \
  --exclude="*-job.ts" \
  --exclude="main.tsx" \
  --exclude="main.ts" \
  --exclude="migrate.ts" \
  | grep -v "//.*console\.log" \
  | grep -v "^\s*//" \
  | grep -v "\*.*console\.log" \
  | grep -v "database/migrations/" || true)

if [ -n "$CONSOLE_LOGS" ]; then
  echo "❌ Found console.log statements in production code ($SCAN_DIR):"
  echo "$CONSOLE_LOGS"
  exit 1
else
  echo "✅ No console.log statements found in production code ($SCAN_DIR)"
fi
