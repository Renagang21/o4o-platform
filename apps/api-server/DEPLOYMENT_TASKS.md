# API 서버 배포 작업 지시사항

CI/CD 파이프라인이 완료된 후 다음 작업을 순서대로 실행해주세요:

## 1. 최신 코드 가져오기
```bash
cd ~/o4o-platform
git pull origin main
```

## 2. 의존성 설치 및 빌드
```bash
cd apps/api-server
pnpm install
npm run build
```

## 3. 데이터베이스 마이그레이션 실행
```bash
# shipments 테이블 생성을 위한 마이그레이션 실행
NODE_ENV=production npm run migration:run
```

## 4. PM2 서버 재시작
```bash
pm2 restart api-server --update-env
```

## 5. 서버 상태 확인
```bash
# PM2 프로세스 상태 확인
pm2 status api-server

# 로그 확인 (에러가 없는지 확인)
pm2 logs api-server --lines 50

# Health check 엔드포인트 테스트
curl http://localhost:3001/health
```

## 6. API 엔드포인트 테스트
```bash
# custom-post-types 엔드포인트 테스트
curl https://api.neture.co.kr/api/v1/custom-post-types

# posts 엔드포인트 테스트
curl https://api.neture.co.kr/api/v1/posts?post_type=post&page=1&limit=20
```

## 예상 결과
- ✅ shipments 테이블과 shipment_tracking_history 테이블이 생성됨
- ✅ API 서버가 정상적으로 재시작됨
- ✅ /api/v1/custom-post-types 엔드포인트가 404 대신 정상 응답
- ✅ /api/v1/posts 엔드포인트가 500 에러 없이 정상 작동

## 문제 발생 시
1. 마이그레이션 실패 시: 
   - `pm2 logs api-server --lines 100`로 에러 확인
   - 데이터베이스 연결 정보 확인 (.env.production)

2. PM2 재시작 실패 시:
   - `pm2 delete api-server` 후 다시 시작
   - `NODE_ENV=production pm2 start dist/main.js --name api-server -i 2`

3. API 엔드포인트 에러 시:
   - TypeORM 엔티티 동기화 확인
   - 빌드 파일 정상 생성 확인 (dist 폴더)