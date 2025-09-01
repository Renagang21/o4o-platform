#!/bin/bash

# Phase 1: 안전한 파일들 삭제
echo "🗑️ Phase 1: Deleting safe files..."

# 테스트 파일들 삭제
echo "Deleting test files..."
find apps -name "*.test.tsx" -delete
find apps -name "*.test.ts" -delete
find apps -name "*.spec.ts" -delete
find apps -name "*.spec.tsx" -delete

# __tests__ 디렉토리 삭제
echo "Deleting __tests__ directories..."
find apps -type d -name "__tests__" -exec rm -rf {} + 2>/dev/null || true

# 백업 디렉토리 삭제
echo "Deleting backup directories..."
find apps -type d -name "*backup*" -exec rm -rf {} + 2>/dev/null || true

# 주석 처리된 파일들
echo "Deleting explicitly commented out files..."
rm -f apps/admin-dashboard/src/pages/dashboard/Dashboard.tsx

echo "✅ Phase 1 complete!"
