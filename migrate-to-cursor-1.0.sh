#!/bin/bash

# Cursor 1.0 마이그레이션 스크립트
# o4o-platform 프로젝트용

echo "🚀 Cursor 1.0 마이그레이션 시작..."
echo "   프로젝트: o4o-platform"
echo "   버전: Cursor 1.0 Enhanced"
echo ""

# 1. 프로젝트 상태 확인
echo "🔍 프로젝트 상태 확인..."
if [ ! -f "package.json" ]; then
    echo "❌ package.json을 찾을 수 없습니다. o4o-platform 루트에서 실행하세요."
    exit 1
fi

project_name=$(node -p "require('./package.json').name")
if [ "$project_name" != "o4o-platform" ]; then
    echo "❌ o4o-platform 프로젝트가 아닙니다. 현재: $project_name"
    exit 1
fi

echo "✅ o4o-platform 프로젝트 확인됨"

# 2. .cursor 디렉토리 생성
echo ""
echo "📁 .cursor 디렉토리 구조 생성..."
mkdir -p .cursor/rules
mkdir -p .cursor/templates
echo "✅ .cursor 디렉토리 구조 생성 완료"

# 3. 기존 cursorrules.txt 백업
if [ -f "cursorrules.txt" ]; then
    echo ""
    echo "💾 기존 cursorrules.txt 백업..."
    cp cursorrules.txt cursorrules.txt.backup
    echo "✅ cursorrules.txt → cursorrules.txt.backup"
fi

# 4. Rules 파일 존재 확인
echo ""
echo "📋 Cursor 1.0 Rules 확인..."
rules_count=0

if [ -f ".cursor/rules/o4o-architecture.mdc" ]; then
    echo "✅ o4o-architecture.mdc (프로젝트 아키텍처)"
    rules_count=$((rules_count + 1))
else
    echo "❌ o4o-architecture.mdc 누락"
fi

if [ -f ".cursor/rules/backend-dev.mdc" ]; then
    echo "✅ backend-dev.mdc (API 개발 가이드)"
    rules_count=$((rules_count + 1))
else
    echo "❌ backend-dev.mdc 누락"
fi

if [ -f ".cursor/rules/frontend-dev.mdc" ]; then
    echo "✅ frontend-dev.mdc (React 컴포넌트 가이드)"
    rules_count=$((rules_count + 1))
else
    echo "❌ frontend-dev.mdc 누락"
fi

if [ -f ".cursor/rules/testing-guide.mdc" ]; then
    echo "✅ testing-guide.mdc (테스트 작성 가이드)"
    rules_count=$((rules_count + 1))
else
    echo "❌ testing-guide.mdc 누락"
fi

if [ -f ".cursor/rules/ai-integration.mdc" ]; then
    echo "✅ ai-integration.mdc (AI 서비스 통합)"
    rules_count=$((rules_count + 1))
else
    echo "❌ ai-integration.mdc 누락"
fi

echo "📊 Rules 파일: $rules_count/5개 설정됨"

# 5. MCP 설정 확인
echo ""
echo "🔌 MCP (Model Context Protocol) 설정 확인..."
if [ -f ".cursor/mcp.json" ]; then
    echo "✅ MCP 설정 파일 존재"
    
    # MCP 서버 개수 확인
    if command -v node >/dev/null 2>&1; then
        mcp_servers=$(node -p "Object.keys(require('./.cursor/mcp.json').mcpServers || {}).length" 2>/dev/null || echo "0")
        echo "📊 MCP 서버: $mcp_servers개 설정됨"
    fi
else
    echo "❌ MCP 설정 파일 누락"
fi

# 6. 개발 스크립트 확인
echo ""
echo "🛠️ 개발 스크립트 확인..."
script_count=0
required_scripts=(
    "dev:smart"
    "cursor:migrate" 
    "cursor:health-check"
    "cursor:generate-component"
    "cursor:generate-api"
    "cursor:sync-team"
    "setup:mcp"
    "setup:git-hooks"
)

for script in "${required_scripts[@]}"; do
    if node -p "require('./package.json').scripts['$script']" >/dev/null 2>&1; then
        echo "✅ $script"
        script_count=$((script_count + 1))
    else
        echo "❌ $script 누락"
    fi
done

echo "📊 개발 스크립트: $script_count/${#required_scripts[@]}개 설정됨"

# 7. 의존성 설치
echo ""
echo "📦 필수 의존성 확인 및 설치..."

# 루트 의존성 확인
if [ ! -d "node_modules" ]; then
    echo "📥 루트 의존성 설치 중..."
    npm install
fi

# MCP 서버 글로벌 설치
echo "📦 MCP 서버 패키지 설치..."
mcp_packages=(
    "@modelcontextprotocol/server-filesystem"
    "@modelcontextprotocol/server-postgres" 
    "@modelcontextprotocol/server-memory"
    "@modelcontextprotocol/server-github"
)

for package in "${mcp_packages[@]}"; do
    if npm list -g "$package" >/dev/null 2>&1; then
        echo "✅ $package (이미 설치됨)"
    else
        echo "📥 $package 설치 중..."
        npm install -g "$package" || echo "⚠️ $package 설치 실패 (수동 설치 필요)"
    fi
done

# 8. Git hooks 설정
echo ""
echo "🪝 Git hooks 설정..."
if [ -f "scripts/setup-git-hooks.js" ]; then
    node scripts/setup-git-hooks.js || echo "⚠️ Git hooks 설정 실패 (수동 설정 필요)"
else
    echo "⚠️ Git hooks 설정 스크립트 없음"
fi

# 9. 환경변수 확인
echo ""
echo "🌍 환경변수 설정 확인..."
if [ -f ".env" ]; then
    echo "✅ .env 파일 존재"
else
    if [ -f ".env.example" ]; then
        echo "📝 .env.example에서 .env 파일 생성..."
        cp .env.example .env
        echo "✅ .env 파일 생성됨 (설정 필요)"
    else
        echo "⚠️ .env 파일 없음 (수동 생성 필요)"
    fi
fi

# 10. 최종 상태 확인
echo ""
echo "🏥 마이그레이션 상태 확인..."
if [ -f "scripts/cursor-health-check.js" ]; then
    node scripts/cursor-health-check.js
else
    echo "⚠️ 헬스체크 스크립트 없음"
fi

# 11. 결과 요약
echo ""
echo "=" .repeat 60
echo "📊 Cursor 1.0 마이그레이션 결과"
echo "=" .repeat 60
echo "📋 Rules: $rules_count/5개"
echo "🔌 MCP: $([ -f ".cursor/mcp.json" ] && echo "설정됨" || echo "누락")"
echo "🛠️ 스크립트: $script_count/${#required_scripts[@]}개"
echo "📦 패키지: 확인 완료"
echo "🪝 Git Hooks: 설정 시도됨"
echo "🌍 환경변수: $([ -f ".env" ] && echo "존재" || echo "누락")"

# 12. 다음 단계 안내
echo ""
echo "🎯 다음 단계:"
echo "=" .repeat 40

if [ $rules_count -eq 5 ] && [ -f ".cursor/mcp.json" ] && [ $script_count -eq ${#required_scripts[@]} ]; then
    echo "🟢 완벽! 모든 설정이 완료되었습니다."
    echo ""
    echo "1. Cursor IDE 재시작"
    echo "2. npm run dev:smart (스마트 개발 환경 시작)"
    echo "3. Background Agent 활성화: Cmd/Ctrl+E"
    echo "4. Long Context Chat 테스트: @codebase"
else
    echo "🟡 일부 설정이 누락되었습니다."
    echo ""
    echo "1. 누락된 파일들을 확인하세요"
    echo "2. npm run cursor:health-check (상세 진단)"
    echo "3. 문서 참조: docs-hub/guides/"
fi

echo ""
echo "⚙️ Cursor IDE 설정 확인사항:"
echo "   1. Settings > Rules에서 Project Rules 활성화"
echo "   2. Settings > MCP에서 서버 목록 확인"
echo "   3. Features > Copilot++에서 Chunked Streaming 활성화"
echo "   4. Features > Background Agent 활성화"
echo "   5. Chat에서 Long Context Chat 활성화"

echo ""
echo "📚 상세 가이드 문서:"
echo "   - Coding/docs-hub/guides/cursor-1.0-setup-guide.md"
echo "   - Coding/docs-hub/guides/cursor-1.0-rules-guide.md"
echo "   - Coding/docs-hub/guides/cursor-1.0-mcp-guide.md"
echo "   - Coding/docs-hub/guides/cursor-1.0-workflow-guide.md"
echo "   - Coding/docs-hub/guides/cursor-1.0-team-guide.md"

echo ""
echo "🆘 문제 해결:"
echo "   - npm run cursor:health-check (전체 진단)"
echo "   - npm run setup:mcp (MCP 재설정)"
echo "   - npm run cursor:sync-team (팀 설정 동기화)"

echo ""
echo "✅ Cursor 1.0 마이그레이션 완료!"
echo "🎉 Happy coding with Cursor 1.0 Enhanced Development!"
