# 결제 시스템 설정 가이드

## 📋 개요

O4O 플랫폼의 토스페이먼츠 기반 결제 시스템 설정 가이드입니다.

---

## 🔑 토스페이먼츠 API 키 발급

### 1. 토스페이먼츠 개발자 센터 접속
- https://developers.tosspayments.com/

### 2. 회원가입 및 로그인

### 3. API 키 발급
1. [내 개발 정보] 메뉴 클릭
2. 테스트/라이브 키 확인
   - **테스트 키**: 개발 및 테스트용
   - **라이브 키**: 실제 결제용

---

## ⚙️ 환경변수 설정

### 로컬 개발 환경

```bash
# apps/api-server/.env.development

# Toss Payments Configuration
TOSS_CLIENT_KEY=test_ck_xxxxxxxxxxxxxxxxxxxxxxxxxx
TOSS_SECRET_KEY=test_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TOSS_API_URL=https://api.tosspayments.com/v1
```

### 프로덕션 환경 (서버)

```bash
# SSH 접속
ssh o4o-api

# 환경변수 파일 편집
cd o4o-platform
vim .env-apiserver

# 파일 끝에 추가
# Toss Payments Configuration
TOSS_CLIENT_KEY=live_ck_xxxxxxxxxxxxxxxxxxxxxxxxxx
TOSS_SECRET_KEY=live_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TOSS_API_URL=https://api.tosspayments.com/v1

# 저장 후 PM2 재시작
pm2 restart o4o-api-server --update-env
```

---

## 🚀 배포

### 1. 코드 배포

```bash
# 로컬에서 커밋/푸시
git add .
git commit -m "feat: update payment system"
git push origin main

# 서버에서 풀
ssh o4o-api
cd o4o-platform
git pull origin main
```

### 2. 마이그레이션 실행

```bash
cd apps/api-server
npx typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts
```

### 3. 빌드 및 재시작

```bash
pnpm run build
pm2 restart o4o-api-server --update-env
```

---

## 📊 데이터베이스 테이블

### `payments`
결제 정보 저장 (토스페이먼츠 연동)

### `payment_settlements`
정산 정보 저장
- 공급자 정산 (D+3)
- 파트너 커미션 (D+7)
- 플랫폼 수수료 (즉시)

### `payment_webhooks`
결제 상태 변경 웹훅 로그

---

## 🔗 API 엔드포인트

### 결제 준비
```http
POST /api/v1/payments/prepare
Content-Type: application/json
Authorization: Bearer {token}

{
  "orderId": "uuid",
  "amount": 50000,
  "orderName": "상품명 외 2건",
  "customerEmail": "buyer@example.com",
  "successUrl": "https://example.com/payment/success",
  "failUrl": "https://example.com/payment/fail"
}
```

### 결제 승인
```http
POST /api/v1/payments/confirm
Content-Type: application/json

{
  "paymentKey": "tpk_xxx",
  "orderId": "uuid",
  "amount": 50000
}
```

### 결제 취소
```http
POST /api/v1/payments/{paymentKey}/cancel
Content-Type: application/json
Authorization: Bearer {token}

{
  "cancelReason": "고객 요청",
  "cancelAmount": 50000
}
```

---

## 🧪 테스트

### 테스트 카드 정보

```
카드번호: 5570-0000-0000-0000
유효기간: 12/28
CVC: 123
```

### 웹훅 테스트

로컬 환경에서 웹훅 테스트를 위해 ngrok 사용:

```bash
# ngrok 설치
npm install -g ngrok

# ngrok 실행 (포트 4000)
ngrok http 4000

# 토스페이먼츠 개발자센터에서 웹훅 URL 설정
https://xxxx.ngrok.io/api/v1/payments/webhook
```

---

## ⚠️ 주의사항

### 1. API 키 보안
- `.env` 파일은 절대 Git에 커밋하지 말 것
- 라이브 키는 절대 노출되지 않도록 관리

### 2. 금액 검증
- 클라이언트에서 전달받은 금액과 서버에서 계산한 금액이 일치하는지 항상 확인

### 3. 웹훅 서명 검증
- 웹훅 요청의 서명을 검증하여 위변조 방지 (TODO: 구현 필요)

### 4. 멱등성 처리
- 결제 승인/취소 요청의 중복 처리 방지

---

## 📚 참고 문서

- [토스페이먼츠 개발 가이드](https://docs.tosspayments.com/)
- [결제 게이트웨이 설계](./PAYMENT_GATEWAY_DESIGN.md)
- [API 문서](https://api.neture.co.kr/api-docs)

---

**작성일**: 2025-10-21
**버전**: 1.0
