#!/bin/bash
# 원클릭 선택적 동기화 설정 스크립트

echo "🎯 O4O Platform 선택적 동기화 설정 마법사"
echo "=================================================="
echo ""

# 현재 상태 확인
echo "📊 현재 Git 상태 확인 중..."
if [ ! -d ".git" ]; then
    echo "❌ Git 저장소가 아닙니다. o4o-platform 디렉토리에서 실행해주세요."
    exit 1
fi

echo "✅ Git 저장소 확인됨"
echo "📁 현재 위치: $(pwd)"
echo "🌿 현재 브랜치: $(git branch --show-current)"
echo ""

# 서버 선택
echo "🖥️  어떤 서버에 설정할까요?"
echo "1) o4o-apiserver (API 서버 - Medusa)"
echo "2) o4o-webserver (웹 서버 - Frontend)"
echo "3) 전체 동기화 복원"
echo "4) 취소"
echo ""
read -p "선택하세요 (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🚀 o4o-apiserver 설정 시작..."
        
        # 백업
        echo "💾 현재 설정 백업 중..."
        cp -f .git/info/sparse-checkout .git/info/sparse-checkout.backup 2>/dev/null || true
        
        # API 서버 설정 적용
        bash setup-apiserver-sync.sh
        
        echo ""
        echo "✅ o4o-apiserver 설정 완료!"
        echo "📦 동기화된 파일:"
        echo "   - services/api-server/ (Medusa 백엔드)"
        echo "   - 공통 설정 파일들"
        echo "   - scripts/, docs/ 등"
        ;;
        
    2)
        echo ""
        echo "🚀 o4o-webserver 설정 시작..."
        
        # 백업
        echo "💾 현재 설정 백업 중..."
        cp -f .git/info/sparse-checkout .git/info/sparse-checkout.backup 2>/dev/null || true
        
        # 웹 서버 설정 적용
        bash setup-webserver-sync.sh
        
        echo ""
        echo "✅ o4o-webserver 설정 완료!"
        echo "📦 동기화된 파일:"
        echo "   - services/main-site/ (웹 프론트엔드)"
        echo "   - 공통 설정 파일들"
        echo "   - scripts/, docs/ 등"
        ;;
        
    3)
        echo ""
        echo "🔄 전체 동기화 복원 중..."
        bash reset-full-sync.sh
        echo "✅ 전체 저장소 동기화로 복원됨!"
        ;;
        
    4)
        echo "❌ 설정이 취소되었습니다."
        exit 0
        ;;
        
    *)
        echo "❌ 잘못된 선택입니다."
        exit 1
        ;;
esac

echo ""
echo "🎉 설정이 완료되었습니다!"
echo ""
echo "📋 다음 단계:"
echo "1. git pull 테스트: git pull origin main"
echo "2. 파일 확인: ls -la services/"
echo "3. 상태 확인: git status"
echo ""
echo "📚 자세한 가이드: SELECTIVE_SYNC_GUIDE.md 참고"
echo "🔧 문제 발생시: bash reset-full-sync.sh (전체 복원)"
