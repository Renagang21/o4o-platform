#!/bin/bash

# O4O Platform 삭제 가능한 파일들의 구체적인 목록 생성

echo "🗑️ Creating specific deletion target list..."

SAFE_DELETE_LIST="safe-to-delete-files.txt"
REVIEW_DELETE_LIST="review-before-delete-files.txt"
ARCHIVE_LIST="archive-recommended-files.txt"

# 안전하게 삭제 가능한 파일들
echo "# 안전하게 삭제 가능한 파일들" > "$SAFE_DELETE_LIST"
echo "# Generated on: $(date)" >> "$SAFE_DELETE_LIST"
echo "" >> "$SAFE_DELETE_LIST"

echo "## 테스트 파일들" >> "$SAFE_DELETE_LIST"
find apps -name "*.test.tsx" -o -name "*.test.ts" -o -name "*.spec.ts" -o -name "*.spec.tsx" | while read file; do
    size=$(stat -c%s "$file" 2>/dev/null || echo "0")
    echo "$file ($size bytes)" >> "$SAFE_DELETE_LIST"
done

echo "" >> "$SAFE_DELETE_LIST"
echo "## __tests__ 디렉토리" >> "$SAFE_DELETE_LIST"
find apps -type d -name "__tests__" | while read dir; do
    size=$(du -sb "$dir" 2>/dev/null | cut -f1)
    echo "$dir/ ($size bytes total)" >> "$SAFE_DELETE_LIST"
done

echo "" >> "$SAFE_DELETE_LIST"
echo "## 백업 파일들" >> "$SAFE_DELETE_LIST"
find apps -type d -name "*backup*" -o -name "*-backup" | while read dir; do
    size=$(du -sb "$dir" 2>/dev/null | cut -f1)
    echo "$dir/ ($size bytes total)" >> "$SAFE_DELETE_LIST"
done

echo "" >> "$SAFE_DELETE_LIST"
echo "## 명시적으로 주석 처리된 import 파일들" >> "$SAFE_DELETE_LIST"
# admin-dashboard에서 주석 처리된 파일들
echo "apps/admin-dashboard/src/pages/dashboard/Dashboard.tsx (Not used - 주석 명시)" >> "$SAFE_DELETE_LIST"

# 검토 필요한 파일들
echo "# 검토 후 삭제 고려 파일들" > "$REVIEW_DELETE_LIST"
echo "# Generated on: $(date)" >> "$REVIEW_DELETE_LIST"
echo "" >> "$REVIEW_DELETE_LIST"

echo "## 중복 기능 파일들 (사용하는 것과 미사용하는 것 비교 필요)" >> "$REVIEW_DELETE_LIST"
echo "apps/admin-dashboard/src/pages/Users/UserList.tsx vs UsersListBulk.tsx" >> "$REVIEW_DELETE_LIST"
echo "apps/admin-dashboard/src/pages/Users/UserDetail.tsx (여러 버전 존재)" >> "$REVIEW_DELETE_LIST"
echo "apps/admin-dashboard/src/pages/Users/UserForm.tsx (여러 버전 존재)" >> "$REVIEW_DELETE_LIST"
echo "apps/admin-dashboard/src/components/common/ScreenOptions.tsx vs ScreenOptionsEnhanced.tsx" >> "$REVIEW_DELETE_LIST"

echo "" >> "$REVIEW_DELETE_LIST"
echo "## 큰 파일들 (향후 사용 가능성 검토 필요)" >> "$REVIEW_DELETE_LIST"
echo "apps/admin-dashboard/src/pages/admin/ThemeApprovals.tsx (26KB)" >> "$REVIEW_DELETE_LIST"
echo "apps/admin-dashboard/src/pages/affiliate/AffiliatePerformanceDashboard.tsx (14KB)" >> "$REVIEW_DELETE_LIST"
echo "apps/admin-dashboard/src/pages/affiliate/AffiliatePolicyPage.tsx (18KB)" >> "$REVIEW_DELETE_LIST"
echo "apps/admin-dashboard/src/pages/forms/FormBuilder.tsx (20KB)" >> "$REVIEW_DELETE_LIST"

echo "" >> "$REVIEW_DELETE_LIST"
echo "## main-site 미사용 페이지들 (라우터에 없음)" >> "$REVIEW_DELETE_LIST"
find apps/main-site/src/pages -name "*.tsx" | while read file; do
    basename_file=$(basename "$file" .tsx)
    if ! grep -q "$basename_file" apps/main-site/src/App.tsx; then
        size=$(stat -c%s "$file" 2>/dev/null || echo "0")
        echo "$file ($size bytes)" >> "$REVIEW_DELETE_LIST"
    fi
done

# 아카이브 권장 파일들
echo "# 아카이브 권장 파일들 (삭제하지 말고 보관)" > "$ARCHIVE_LIST"
echo "# Generated on: $(date)" >> "$ARCHIVE_LIST"
echo "" >> "$ARCHIVE_LIST"

echo "## 미완성 기능들 (향후 완성 예정)" >> "$ARCHIVE_LIST"
echo "apps/admin-dashboard/src/pages/content/ (대부분의 고급 기능들)" >> "$ARCHIVE_LIST"
echo "apps/admin-dashboard/src/components/forms/ (Form Builder 기능)" >> "$ARCHIVE_LIST"
echo "apps/admin-dashboard/src/components/template/ (Template Builder 기능)" >> "$ARCHIVE_LIST"

echo "" >> "$ARCHIVE_LIST"
echo "## 정책 설정 관련 (중요한 비즈니스 로직)" >> "$ARCHIVE_LIST"
find apps/admin-dashboard/src -name "*Policy*" | while read file; do
    size=$(stat -c%s "$file" 2>/dev/null || echo "0")
    echo "$file ($size bytes)" >> "$ARCHIVE_LIST"
done

# 요약 통계 생성
echo ""
echo "📊 DELETION ANALYSIS SUMMARY"
echo "============================"

safe_files=$(grep -v "^#" "$SAFE_DELETE_LIST" | grep -v "^$" | wc -l)
review_files=$(grep -v "^#" "$REVIEW_DELETE_LIST" | grep -v "^$" | wc -l)  
archive_files=$(grep -v "^#" "$ARCHIVE_LIST" | grep -v "^$" | wc -l)

echo "✅ Safe to delete: $safe_files files/directories"
echo "⚠️  Review needed: $review_files files"
echo "🔄 Archive recommended: $archive_files files"

# 실제 삭제 스크립트 생성
echo ""
echo "🚀 Generating deletion scripts..."

# Phase 1 삭제 스크립트
cat > delete-phase1-safe.sh << 'EOF'
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
EOF

chmod +x delete-phase1-safe.sh

# Phase 2 검토 스크립트 (실행하지 말고 검토용)
cat > delete-phase2-review.sh << 'EOF'
#!/bin/bash

# Phase 2: 검토 필요한 파일들 (실행 전에 반드시 수동 확인 필요!)
echo "⚠️ Phase 2: Review before deleting these files!"
echo "This script is for reference only. Manual review required."

echo "Files to review:"
echo "=================="
cat review-before-delete-files.txt
echo ""
echo "❌ Script not executed for safety. Review manually!"
EOF

chmod +x delete-phase2-review.sh

echo "Created files:"
echo "- $SAFE_DELETE_LIST (안전 삭제 목록)"
echo "- $REVIEW_DELETE_LIST (검토 필요 목록)"  
echo "- $ARCHIVE_LIST (아카이브 권장 목록)"
echo "- delete-phase1-safe.sh (안전 삭제 스크립트)"
echo "- delete-phase2-review.sh (검토용 참조 스크립트)"

echo ""
echo "⚠️ 주의사항:"
echo "1. delete-phase1-safe.sh 실행 전에 git commit 필수"
echo "2. Phase 2 파일들은 반드시 수동으로 검토"
echo "3. 중요한 파일들은 아카이브 권장"