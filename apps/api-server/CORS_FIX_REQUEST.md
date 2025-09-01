# API Server CORS Configuration Fix Request

## 문제 설명
현재 admin.neture.co.kr에서 api.neture.co.kr로의 API 호출 시 CORS 오류가 발생하고 있습니다.

### 오류 메시지
```
Access to XMLHttpRequest at 'https://api.neture.co.kr/api/auth/login' 
from origin 'https://admin.neture.co.kr' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 현재 설정 분석

### main.ts (라인 261-319)
현재 CORS 설정은 다음과 같이 구성되어 있습니다:

```typescript
const corsOptions: CorsOptions = {
  origin: function (origin: string | undefined, callback) {
    const allowedOrigins = [
      // ... 기타 origin들 ...
      "https://admin.neture.co.kr",
      "http://admin.neture.co.kr",
      "https://api.neture.co.kr",
      "http://api.neture.co.kr",
      // ... 
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};
```

## 문제점 진단

1. **CORS 헤더 누락**: API 서버가 실제로 CORS 헤더를 응답에 포함하지 않고 있음
2. **Preflight 요청 처리**: OPTIONS 요청에 대한 처리가 제대로 되지 않을 가능성
3. **프록시/로드밸런서 설정**: AWS ALB나 Nginx에서 CORS 헤더가 제거될 가능성

## 해결 방안

### 1. 즉시 적용 가능한 수정 (main.ts)

```typescript
// main.ts 라인 322 이후에 추가
// CORS 미들웨어 적용 전에 모든 OPTIONS 요청에 대한 명시적 처리
app.use((req, res, next) => {
  // CORS 헤더를 명시적으로 설정
  const origin = req.headers.origin as string;
  const allowedOrigins = [
    "https://admin.neture.co.kr",
    "https://shop.neture.co.kr",
    "https://neture.co.kr",
    "https://www.neture.co.kr",
    "https://api.neture.co.kr"
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  
  // OPTIONS 요청은 즉시 성공 응답
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  
  next();
});

// 기존 CORS 미들웨어 적용
app.use(cors(corsOptions));
```

### 2. 에러 핸들러 수정 (middleware/errorHandler.ts)

에러 핸들러에서도 CORS 헤더가 유지되도록 보장:

```typescript
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // CORS 헤더 유지
  const origin = req.headers.origin as string;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  // 기존 에러 처리 로직...
};
```

### 3. Nginx 설정 확인 (서버 측)

API 서버 앞단의 Nginx 설정에서 CORS 헤더가 제거되지 않도록 확인:

```nginx
location /api {
    proxy_pass http://localhost:4000;
    
    # CORS 헤더 전달
    proxy_pass_header Access-Control-Allow-Origin;
    proxy_pass_header Access-Control-Allow-Credentials;
    proxy_pass_header Access-Control-Allow-Methods;
    proxy_pass_header Access-Control-Allow-Headers;
    
    # OPTIONS 요청 처리
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' 'https://admin.neture.co.kr' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With, Accept, Origin' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Max-Age' '86400' always;
        return 204;
    }
}
```

## 테스트 방법

1. **로컬 테스트**
```bash
# API 서버 시작
cd apps/api-server
npm run dev

# 다른 터미널에서 CORS 테스트
curl -X OPTIONS https://api.neture.co.kr/api/auth/login \
  -H "Origin: https://admin.neture.co.kr" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

2. **브라우저 테스트**
- Chrome DevTools > Network 탭 열기
- admin.neture.co.kr에서 로그인 시도
- Preflight OPTIONS 요청과 실제 POST 요청의 응답 헤더 확인

## 작업 우선순위

1. **긴급 (즉시 적용)**
   - main.ts에 명시적 CORS 헤더 설정 추가
   - 배포 및 테스트

2. **중요 (24시간 내)**
   - Nginx 설정 확인 및 수정
   - AWS ALB 설정 확인 (Health Check가 CORS 헤더를 제거하지 않는지)

3. **선택사항**
   - 환경변수로 allowed origins 관리
   - CORS 설정 모니터링 추가

## 예상 소요 시간
- 코드 수정 및 테스트: 30분
- 배포 및 검증: 30분
- 총 예상 시간: 1시간

## 영향 범위
- admin.neture.co.kr: 로그인 및 API 호출 정상화
- shop.neture.co.kr: API 호출 정상화
- 기타 서브도메인: 영향 없음

## 롤백 계획
문제 발생 시 이전 버전으로 즉시 롤백:
```bash
git revert HEAD
npm run build
pm2 restart o4o-api
```

## 담당자
- API 서버 개발팀
- DevOps 팀 (Nginx/AWS 설정)

## 참고 사항
- 현재 설정은 이론적으로 정상이나 실제 응답에 헤더가 없는 상황
- 미들웨어 순서나 프록시 설정 문제일 가능성이 높음
- 프로덕션 환경의 로그 확인 필요 (`pm2 logs o4o-api`)