#!/bin/bash

# API 서버 업로드 디렉토리 문제 해결 스크립트
# 목적: uploads 디렉토리를 public/uploads로 통합

set -e

echo "🔧 API 서버 업로드 디렉토리 수정 시작..."

# SSH 연결 확인
if ! ssh -o ConnectTimeout=5 o4o-apiserver "echo 'SSH connection successful'" > /dev/null 2>&1; then
  echo "❌ SSH 연결 실패. ~/.ssh/config를 확인하세요."
  exit 1
fi

echo "📂 현재 디렉토리 상태 확인..."
ssh o4o-apiserver "ls -la /home/ubuntu/o4o-platform/ | grep -E 'uploads|public'"

echo "🔄 디렉토리 구조 정리 중..."

# 원격 서버에서 실행할 명령어들
ssh o4o-apiserver << 'EOF'
set -e
cd /home/ubuntu/o4o-platform

echo "1️⃣ public/uploads 디렉토리 구조 생성..."
sudo mkdir -p public/uploads/{images,documents,videos,audio,others}

echo "2️⃣ 기존 uploads 내용을 public/uploads로 이동..."
# images 디렉토리가 있으면 이동
if [ -d "uploads/images" ]; then
  echo "   - images 이동 중..."
  sudo cp -r uploads/images/* public/uploads/images/ 2>/dev/null || true
fi

# documents 디렉토리가 있으면 이동
if [ -d "uploads/documents" ]; then
  echo "   - documents 이동 중..."
  sudo cp -r uploads/documents/* public/uploads/documents/ 2>/dev/null || true
fi

# videos 디렉토리가 있으면 이동
if [ -d "uploads/videos" ]; then
  echo "   - videos 이동 중..."
  sudo cp -r uploads/videos/* public/uploads/videos/ 2>/dev/null || true
fi

# audio 디렉토리가 있으면 이동
if [ -d "uploads/audio" ]; then
  echo "   - audio 이동 중..."
  sudo cp -r uploads/audio/* public/uploads/audio/ 2>/dev/null || true
fi

# others 디렉토리가 있으면 이동
if [ -d "uploads/others" ]; then
  echo "   - others 이동 중..."
  sudo cp -r uploads/others/* public/uploads/others/ 2>/dev/null || true
fi

# themes는 특별 처리 (필요한 경우)
if [ -d "uploads/themes" ]; then
  echo "   - themes 디렉토리 발견 (별도 처리)"
  sudo mkdir -p public/uploads/themes
  sudo cp -r uploads/themes/* public/uploads/themes/ 2>/dev/null || true
fi

echo "3️⃣ 권한 설정..."
# PM2로 실행 중인 프로세스 사용자 확인
PM2_USER=$(ps aux | grep "node.*main.js" | grep -v grep | awk '{print $1}' | head -1)
if [ -z "$PM2_USER" ]; then
  PM2_USER="ubuntu"
fi
echo "   PM2 실행 사용자: $PM2_USER"

# 권한 설정
sudo chown -R $PM2_USER:$PM2_USER public/uploads
sudo chmod -R 755 public/uploads

echo "4️⃣ 백업 생성 (기존 uploads 디렉토리)..."
BACKUP_NAME="uploads_backup_$(date +%Y%m%d_%H%M%S)"
sudo mv uploads $BACKUP_NAME
echo "   백업 위치: /home/ubuntu/o4o-platform/$BACKUP_NAME"

echo "5️⃣ 심볼릭 링크 생성 (호환성 유지)..."
ln -s public/uploads uploads
echo "   uploads -> public/uploads 링크 생성 완료"

echo "6️⃣ 최종 상태 확인..."
echo "   📁 public/uploads 구조:"
ls -la public/uploads/
echo ""
echo "   📁 업로드된 파일 수:"
find public/uploads -type f | wc -l
echo ""
echo "   💾 총 크기:"
du -sh public/uploads/

EOF

echo ""
echo "7️⃣ PM2 프로세스 재시작..."
ssh o4o-apiserver "pm2 restart o4o-api && pm2 save"

echo ""
echo "✅ 업로드 디렉토리 수정 완료!"
echo ""
echo "📋 다음 단계:"
echo "1. 웹사이트에서 미디어 업로드 테스트"
echo "2. 기존 이미지들이 정상적으로 표시되는지 확인"
echo "3. 문제가 없으면 백업 디렉토리 삭제:"
echo "   ssh o4o-apiserver 'rm -rf /home/ubuntu/o4o-platform/uploads_backup_*'"
echo ""
echo "⚠️  문제 발생 시 백업 복원:"
echo "   ssh o4o-apiserver 'cd /home/ubuntu/o4o-platform && rm uploads && mv uploads_backup_* uploads'"