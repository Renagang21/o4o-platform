#!/bin/bash
# 롤백 스크립트 - 자동 생성됨

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "롤백을 시작합니다..."
echo "프로젝트 루트: $PROJECT_ROOT"

cd "$PROJECT_ROOT"

# src/partner/ 복원
if [[ -d "$SCRIPT_DIR/src-partner-backup" ]]; then
    echo "src/partner/ 복원 중..."
    cp -r "$SCRIPT_DIR/src-partner-backup" src/partner/
    echo "src/partner/ 복원 완료"
fi

# dist/partner/ 복원
if [[ -d "$SCRIPT_DIR/dist-partner-backup" ]]; then
    echo "dist/partner/ 복원 중..."
    mkdir -p dist
    cp -r "$SCRIPT_DIR/dist-partner-backup" dist/partner/
    echo "dist/partner/ 복원 완료"
fi

# nodemon.json 복원 (수동으로 되돌려야 함)
echo ""
echo "⚠️  수동 복원 필요:"
echo "nodemon.json 파일에서 src/partner 관련 설정을 되돌려주세요"

echo "롤백이 완료되었습니다."
echo "Git 커밋 상태를 확인하고 필요시 git reset을 수행하세요."