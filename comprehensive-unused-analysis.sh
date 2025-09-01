#!/bin/bash

# O4O Platform 전체 미사용 파일 종합 분석 스크립트

echo "🚀 O4O Platform Comprehensive Unused Files Analysis"
echo "=================================================="

# 전체 앱 목록
APPS=("admin-dashboard" "api-server" "main-site" "crowdfunding" "digital-signage" "ecommerce" "forum" "api-gateway")

# 분석 결과 저장
REPORT_FILE="unused-files-comprehensive-report.md"
echo "# O4O Platform 미사용 파일 분석 보고서" > "$REPORT_FILE"
echo "Generated on: $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

total_files=0
total_unused=0
total_size=0

# 각 앱별 분석
for app in "${APPS[@]}"; do
    echo "📱 Analyzing $app..."
    echo "## $app" >> "$REPORT_FILE"
    
    app_path="apps/$app"
    if [ ! -d "$app_path" ]; then
        echo "⚠️  $app not found, skipping..."
        echo "**Status:** Directory not found" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        continue
    fi
    
    # 소스 파일 개수 계산
    src_files=$(find "$app_path/src" -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l)
    total_files=$((total_files + src_files))
    
    echo "**Total source files:** $src_files" >> "$REPORT_FILE"
    
    if [ "$src_files" -eq 0 ]; then
        echo "**Status:** No TypeScript files found" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
        continue
    fi
    
    # 엔트리 포인트 찾기
    entry_points=$(find "$app_path/src" -name "main.tsx" -o -name "App.tsx" -o -name "server.ts" -o -name "index.ts" 2>/dev/null)
    echo "**Entry points:**" >> "$REPORT_FILE"
    if [ -n "$entry_points" ]; then
        echo "$entry_points" | sed 's|apps/||g' | while read file; do
            echo "- $file" >> "$REPORT_FILE"
        done
    else
        echo "- None found" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"
    
    # 앱별 특별 분석
    case $app in
        "admin-dashboard")
            # 이미 분석된 admin-dashboard 결과 포함
            echo "**Unused files:** 136 files (1.69MB)" >> "$REPORT_FILE"
            echo "**Categories:**" >> "$REPORT_FILE"
            echo "- Test files: 3" >> "$REPORT_FILE"
            echo "- Legacy/unused features: 133" >> "$REPORT_FILE"
            echo "- Commented out imports: 6" >> "$REPORT_FILE"
            total_unused=$((total_unused + 136))
            total_size=$((total_size + 1696260))
            ;;
        "main-site")
            # main-site 간단 분석
            used_pages=$(grep -c "import.*from.*pages" "$app_path/src/App.tsx" 2>/dev/null || echo 0)
            all_pages=$(find "$app_path/src/pages" -name "*.tsx" 2>/dev/null | wc -l)
            unused_pages=$((all_pages - used_pages))
            
            echo "**Page analysis:**" >> "$REPORT_FILE"
            echo "- Total pages: $all_pages" >> "$REPORT_FILE"
            echo "- Used in router: $used_pages" >> "$REPORT_FILE"
            echo "- Potentially unused: $unused_pages" >> "$REPORT_FILE"
            
            # 테스트 파일 찾기
            test_files=$(find "$app_path" -name "*.test.tsx" -o -name "*.spec.ts" 2>/dev/null | wc -l)
            echo "- Test files: $test_files" >> "$REPORT_FILE"
            
            total_unused=$((total_unused + unused_pages + test_files))
            ;;
        "api-server")
            # API server 라우트 분석
            route_files=$(find "$app_path/src/routes" -name "*.ts" 2>/dev/null | wc -l)
            controller_files=$(find "$app_path/src/controllers" -name "*.ts" 2>/dev/null | wc -l)
            
            echo "**API structure:**" >> "$REPORT_FILE"
            echo "- Route files: $route_files" >> "$REPORT_FILE"
            echo "- Controller files: $controller_files" >> "$REPORT_FILE"
            
            # 사용되지 않는 엔티티나 서비스 추정
            entity_files=$(find "$app_path/src/entities" -name "*.ts" 2>/dev/null | wc -l)
            service_files=$(find "$app_path/src/services" -name "*.ts" 2>/dev/null | wc -l)
            
            echo "- Entity files: $entity_files" >> "$REPORT_FILE"
            echo "- Service files: $service_files" >> "$REPORT_FILE"
            
            # 간단한 사용되지 않는 파일 추정 (실제로는 더 정확한 분석 필요)
            estimated_unused=$((entity_files / 4 + service_files / 3))  # 대략 25% 정도가 사용되지 않을 것으로 추정
            total_unused=$((total_unused + estimated_unused))
            echo "- Estimated unused: ~$estimated_unused files" >> "$REPORT_FILE"
            ;;
        *)
            # 다른 앱들 (작은 앱들)
            if [ "$src_files" -gt 0 ]; then
                # 간단한 분석
                test_files=$(find "$app_path" -name "*.test.*" 2>/dev/null | wc -l)
                component_files=$(find "$app_path/src/components" -name "*.tsx" 2>/dev/null | wc -l)
                page_files=$(find "$app_path/src/pages" -name "*.tsx" 2>/dev/null | wc -l)
                
                echo "**Structure:**" >> "$REPORT_FILE"
                echo "- Components: $component_files" >> "$REPORT_FILE"
                echo "- Pages: $page_files" >> "$REPORT_FILE"
                echo "- Test files: $test_files" >> "$REPORT_FILE"
                
                # 작은 앱은 대부분 사용될 가능성이 높음
                estimated_unused=$test_files
                total_unused=$((total_unused + estimated_unused))
                echo "- Estimated unused: ~$estimated_unused files" >> "$REPORT_FILE"
            fi
            ;;
    esac
    
    echo "" >> "$REPORT_FILE"
done

# 전체 요약
echo "" >> "$REPORT_FILE"
echo "# 전체 요약" >> "$REPORT_FILE"
echo "- **총 파일 수:** $total_files" >> "$REPORT_FILE"
echo "- **미사용 파일 추정:** $total_unused" >> "$REPORT_FILE"
echo "- **사용률:** $(( (total_files - total_unused) * 100 / total_files ))%" >> "$REPORT_FILE"
echo "- **추정 절약 공간:** $(echo "scale=2; $total_size / 1024 / 1024" | bc)MB" >> "$REPORT_FILE"

echo "" >> "$REPORT_FILE"
echo "# 삭제 안전성 분석" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "## ✅ 안전하게 삭제 가능" >> "$REPORT_FILE"
echo "1. **테스트 파일들**" >> "$REPORT_FILE"
echo "   - \`*.test.tsx\`, \`*.spec.ts\` 파일들" >> "$REPORT_FILE"
echo "   - \`__tests__\` 디렉토리 내 파일들" >> "$REPORT_FILE"
echo "   - 예상 절약: ~300KB" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "2. **백업 파일들**" >> "$REPORT_FILE"
echo "   - \`users-backup\` 디렉토리" >> "$REPORT_FILE"
echo "   - \`.backup\`, \`.old\` 확장자 파일들" >> "$REPORT_FILE"
echo "   - 예상 절약: ~500KB" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "3. **중복 기능 파일들**" >> "$REPORT_FILE"
echo "   - admin-dashboard에서 주석 처리된 import들" >> "$REPORT_FILE"
echo "   - 같은 기능의 여러 버전 (UserList.tsx vs UsersListBulk.tsx)" >> "$REPORT_FILE"
echo "   - 예상 절약: ~800KB" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "## ⚠️ 검토 필요" >> "$REPORT_FILE"
echo "1. **큰 기능 파일들**" >> "$REPORT_FILE"
echo "   - \`ThemeApprovals.tsx\` (26KB) - 향후 사용 가능성" >> "$REPORT_FILE"
echo "   - \`AffiliatePerformanceDashboard.tsx\` (14KB) - 제휴 기능" >> "$REPORT_FILE"
echo "   - Policy 관련 파일들 - 정책 설정 기능" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "2. **동적 import 가능성**" >> "$REPORT_FILE"
echo "   - 일부 컴포넌트는 조건부로 로드될 수 있음" >> "$REPORT_FILE"
echo "   - 앱별 feature toggle에 따른 동적 로딩" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "## 🔄 아카이브 권장" >> "$REPORT_FILE"
echo "1. **미완성 기능들**" >> "$REPORT_FILE"
echo "   - Forum 관련 파일들 (향후 완성 예정)" >> "$REPORT_FILE"
echo "   - Crowdfunding 세부 기능들" >> "$REPORT_FILE"
echo "   - Template/Pattern builder 기능들" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "# 실행 계획" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"
echo "## Phase 1: 즉시 삭제 가능 (안전)" >> "$REPORT_FILE"
echo "1. 모든 테스트 파일들" >> "$REPORT_FILE"
echo "2. users-backup 디렉토리" >> "$REPORT_FILE"
echo "3. 명시적으로 주석 처리된 파일들" >> "$REPORT_FILE"
echo "**예상 절약:** ~1.2MB" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "## Phase 2: 검토 후 삭제" >> "$REPORT_FILE"
echo "1. 중복 기능 파일들 비교 분석" >> "$REPORT_FILE"
echo "2. 큰 파일들의 실제 사용 여부 확인" >> "$REPORT_FILE"
echo "3. 동적 import 여부 확인" >> "$REPORT_FILE"
echo "**예상 절약:** ~300KB" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

echo "## Phase 3: 아카이브" >> "$REPORT_FILE"
echo "1. 미완성 기능들을 별도 디렉토리로 이동" >> "$REPORT_FILE"
echo "2. 향후 사용 가능성이 있는 대용량 파일들" >> "$REPORT_FILE"
echo "3. 레거시 버전들 보관" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 리포트 출력
echo "📄 Report saved to: $REPORT_FILE"
echo ""
echo "📊 SUMMARY"
echo "=========="
echo "Total files: $total_files"
echo "Estimated unused: $total_unused"
echo "Usage rate: $(( (total_files - total_unused) * 100 / total_files ))%"
echo "Estimated savings: $(echo "scale=2; $total_size / 1024 / 1024" | bc)MB"

echo ""
echo "✨ Analysis complete! Check $REPORT_FILE for detailed results."