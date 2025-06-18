@echo off
REM Git Sparse Checkout 비활성화 및 전체 동기화 복원 스크립트 (Windows)

echo 🔄 Git Sparse Checkout 비활성화 중...

REM Sparse Checkout 비활성화
git config core.sparseCheckout false

REM sparse-checkout 파일 삭제
if exist .git\info\sparse-checkout del .git\info\sparse-checkout

REM 모든 파일 다시 체크아웃
git read-tree -m -u HEAD

echo ✅ 전체 저장소 동기화로 복원되었습니다!

REM 상태 확인
echo.
echo 📁 services\ 디렉토리 확인:
if exist services\ (
    dir services\ /b
) else (
    echo services\ 디렉토리를 찾을 수 없습니다.
)

pause
