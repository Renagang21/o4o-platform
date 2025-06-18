#!/bin/bash
# Git Sparse Checkout 비활성화 및 전체 동기화 복원 스크립트

echo "🔄 Git Sparse Checkout 비활성화 중..."

# Sparse Checkout 비활성화
git config core.sparseCheckout false

# sparse-checkout 파일 삭제
rm -f .git/info/sparse-checkout

# 모든 파일 다시 체크아웃
git read-tree -m -u HEAD

echo "✅ 전체 저장소 동기화로 복원되었습니다!"
echo "📊 현재 체크아웃된 파일 수: $(git ls-files | wc -l)개"

# 상태 확인
echo ""
echo "📁 services/ 디렉토리 확인:"
ls -la services/ 2>/dev/null || echo "services/ 디렉토리를 찾을 수 없습니다."
