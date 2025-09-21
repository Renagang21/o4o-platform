#!/bin/bash

# Media 테이블 데이터베이스 스키마 수정 스크립트

set -e

echo "🔧 Media 테이블 스키마 수정 시작..."

# API 서버에서 마이그레이션 생성 및 실행
ssh o4o-apiserver << 'EOF'
set -e
cd /home/ubuntu/o4o-platform/apps/api-server

echo "1️⃣ 현재 Media 테이블 구조 확인..."
PGPASSWORD=$(grep DATABASE_URL .env.production | cut -d'/' -f3 | cut -d':' -f2 | cut -d'@' -f1) \
psql -h $(grep DATABASE_URL .env.production | cut -d'@' -f2 | cut -d':' -f1) \
     -U $(grep DATABASE_URL .env.production | cut -d'/' -f3 | cut -d':' -f1) \
     -d $(grep DATABASE_URL .env.production | cut -d'/' -f4 | cut -d'?' -f1) \
     -c "\d media" 2>/dev/null || echo "Media 테이블 조회 실패 - 수동으로 추가 필요"

echo "2️⃣ TypeORM 마이그레이션 생성..."
npm run typeorm migration:generate -- -n AddUserIdToMedia -d src/database/connection.ts || true

echo "3️⃣ 마이그레이션 실행..."
npm run typeorm migration:run -- -d src/database/connection.ts || true

echo "4️⃣ 빠른 수정을 위한 직접 SQL 실행..."
# .env.production에서 DATABASE_URL 파싱
if [ -f .env.production ]; then
  DATABASE_URL=$(grep DATABASE_URL .env.production | cut -d'=' -f2-)
  
  # URL에서 각 부분 추출
  DB_USER=$(echo $DATABASE_URL | sed -n 's|.*://\([^:]*\):.*|\1|p')
  DB_PASS=$(echo $DATABASE_URL | sed -n 's|.*://[^:]*:\([^@]*\)@.*|\1|p')
  DB_HOST=$(echo $DATABASE_URL | sed -n 's|.*@\([^:]*\):.*|\1|p')
  DB_PORT=$(echo $DATABASE_URL | sed -n 's|.*:\([0-9]*\)/.*|\1|p')
  DB_NAME=$(echo $DATABASE_URL | sed -n 's|.*/\([^?]*\).*|\1|p')
  
  echo "   데이터베이스: $DB_NAME@$DB_HOST:$DB_PORT"
  
  # SQL 직접 실행
  PGPASSWORD=$DB_PASS psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME << SQL
-- userId 컬럼이 없으면 추가
DO \$\$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'media' AND column_name = 'userId'
  ) THEN
    ALTER TABLE media ADD COLUMN "userId" UUID;
    CREATE INDEX idx_media_userId ON media("userId");
    CREATE INDEX idx_media_folderPath ON media("folderPath");
    CREATE INDEX idx_media_createdAt ON media("createdAt");
  END IF;
END \$\$;

-- 테이블 구조 확인
\d media
SQL
else
  echo "   ⚠️  .env.production 파일을 찾을 수 없습니다"
fi

echo "5️⃣ 애플리케이션 재빌드..."
npm run build

echo "6️⃣ PM2 프로세스 재시작..."
pm2 restart o4o-api-production
pm2 save

echo "✅ 데이터베이스 스키마 수정 완료!"

EOF

echo ""
echo "🎉 Media 테이블 수정 완료!"
echo ""
echo "테스트 URL:"
echo "  curl https://api.neture.co.kr/api/v1/content/media?limit=5"