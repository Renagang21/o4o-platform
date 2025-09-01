#!/bin/bash

# O4O Platform 사용되지 않는 페이지 분석 스크립트

echo "🔍 Finding unused pages in admin-dashboard..."
echo "=================================================="

# 1. App.tsx에서 import되는 페이지들 목록 추출
USED_PAGES_FILE="/tmp/used_pages.txt"
grep -o "@/pages/[^'\"]*" apps/admin-dashboard/src/App.tsx | \
    sed 's|@/pages/||g' | \
    sed 's|\.tsx.*||g' | \
    sed 's|/\*.*\*/||g' | \
    sort -u > "$USED_PAGES_FILE"

echo "📋 Pages imported in App.tsx: $(wc -l < $USED_PAGES_FILE)"

# 2. 실제 존재하는 모든 페이지 파일들 목록
ALL_PAGES_FILE="/tmp/all_pages.txt"
find apps/admin-dashboard/src/pages -name "*.tsx" -type f | \
    sed 's|apps/admin-dashboard/src/pages/||g' | \
    sed 's|\.tsx$||g' | \
    sort > "$ALL_PAGES_FILE"

echo "📁 Total page files found: $(wc -l < $ALL_PAGES_FILE)"

# 3. 사용되지 않는 페이지들 찾기
UNUSED_PAGES_FILE="/tmp/unused_pages.txt"
comm -23 "$ALL_PAGES_FILE" "$USED_PAGES_FILE" > "$UNUSED_PAGES_FILE"

echo ""
echo "❌ UNUSED PAGES ($(wc -l < $UNUSED_PAGES_FILE) files):"
echo "=================================================="

# 카테고리별 분류
echo ""
echo "🧪 TEST FILES:"
grep -E "(test|spec|Test|demo)" "$UNUSED_PAGES_FILE" | while read file; do
    size=$(stat -c%s "apps/admin-dashboard/src/pages/$file.tsx" 2>/dev/null || echo "0")
    echo "  - $file.tsx ($size bytes)"
done

echo ""
echo "📚 LEGACY/UNUSED FEATURES:"
grep -vE "(test|spec|Test|demo)" "$UNUSED_PAGES_FILE" | while read file; do
    size=$(stat -c%s "apps/admin-dashboard/src/pages/$file.tsx" 2>/dev/null || echo "0")
    # 파일 내용 미리보기로 용도 파악
    if [ -f "apps/admin-dashboard/src/pages/$file.tsx" ]; then
        first_comment=$(head -n 10 "apps/admin-dashboard/src/pages/$file.tsx" | grep -E "^\s*[*/]*\s*" | head -n 3 | tr -d '*/' | xargs)
        echo "  - $file.tsx ($size bytes)"
        [ -n "$first_comment" ] && echo "    📝 $first_comment"
    fi
done

# 4. 주석 처리된 import들 확인
echo ""
echo "💭 COMMENTED OUT IMPORTS:"
echo "=================================================="
grep "// const.*= lazy" apps/admin-dashboard/src/App.tsx | while read line; do
    page=$(echo "$line" | grep -o "@/pages/[^')]*" | sed 's|@/pages/||g')
    echo "  - $page (commented out in App.tsx)"
done

# 5. 총 절약 가능한 공간 계산
echo ""
echo "💾 SPACE ANALYSIS:"
echo "=================================================="

total_size=0
unused_count=0

while read file; do
    if [ -f "apps/admin-dashboard/src/pages/$file.tsx" ]; then
        size=$(stat -c%s "apps/admin-dashboard/src/pages/$file.tsx")
        total_size=$((total_size + size))
        unused_count=$((unused_count + 1))
    fi
done < "$UNUSED_PAGES_FILE"

echo "📊 Unused files: $unused_count"
echo "💽 Total size: $(echo "scale=2; $total_size / 1024" | bc)KB"

# 6. 추천 사항 출력
echo ""
echo "🎯 RECOMMENDATIONS:"
echo "=================================================="
echo "✅ SAFE TO DELETE:"
echo "  - Test files (*.test.tsx, *Test.tsx, demo files)"
echo "  - Files with 'backup', 'old', 'legacy' in name"
echo ""
echo "⚠️  REVIEW NEEDED:"
echo "  - Large unused feature files (>10KB)"
echo "  - Files that might be used by other routes"
echo "  - Files that might be loaded dynamically"
echo ""
echo "🔍 NEXT STEPS:"
echo "1. Check if any unused files are imported in other components"
echo "2. Verify test files are actually not needed"
echo "3. Review large unused files for potential future use"
echo "4. Consider archiving instead of deleting important features"

# 정리
rm -f "$USED_PAGES_FILE" "$ALL_PAGES_FILE" "$UNUSED_PAGES_FILE"

echo ""
echo "✨ Analysis complete!"