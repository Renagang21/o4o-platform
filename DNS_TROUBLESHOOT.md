# 🔍 DNS 설정 문제 해결 가이드

## 현재 상황
- ✅ neture.co.kr: 정상 작동 (13.125.144.8)
- ❌ auth.neture.co.kr: DNS 미해석
- ❌ api.neture.co.kr: DNS 미해석

---

## 🚨 가능한 원인들

### 1. AWS Lightsail DNS 설정 확인
```
가능한 문제:
1. DNS 존이 neture.co.kr이 아닌 다른 이름으로 설정됨
2. A 레코드가 저장되지 않음
3. TTL이 너무 길게 설정됨 (기본 3600초 = 1시간)
```

### 2. DNS 네임서버 확인
```bash
# 도메인의 네임서버 확인
whois neture.co.kr | grep -i "name server"

# AWS Lightsail DNS를 사용 중인지 확인
# 예상 네임서버:
# ns-xxx.awsdns-xx.com
# ns-xxx.awsdns-xx.net
# ns-xxx.awsdns-xx.org
# ns-xxx.awsdns-xx.co.uk
```

---

## 🔧 즉시 확인할 사항

### 1. AWS Lightsail 콘솔에서 확인
```
1. AWS Lightsail 콘솔 로그인
2. "네트워킹" 탭 클릭
3. "DNS 존" 섹션 확인

확인 사항:
- neture.co.kr DNS 존이 있는가?
- 해당 존 클릭 후 레코드 목록 확인
- api, auth A 레코드가 있는가?
```

### 2. 레코드 형식 확인
```
올바른 형식:
┌─────────────────────────────────────────┐
│ 레코드 이름    │ 타입 │ 값              │
├─────────────────────────────────────────┤
│ @             │ A    │ 13.125.144.8    │
│ www           │ A    │ 13.125.144.8    │
│ api           │ A    │ 13.125.144.8    │  ← 이것
│ auth          │ A    │ 13.125.144.8    │  ← 이것
└─────────────────────────────────────────┘

잘못된 예시:
- api.neture.co.kr (전체 도메인 입력 X)
- *.neture.co.kr (와일드카드 X)
```

### 3. 다른 DNS 제공자 사용 중인 경우
```
만약 가비아, 카페24 등 다른 DNS를 사용 중이라면:
1. 해당 업체 관리 페이지 접속
2. DNS 관리 메뉴
3. A 레코드 추가:
   - 호스트: api
   - IP: 13.125.144.8
   - 호스트: auth  
   - IP: 13.125.144.8
```

---

## 🚀 대안 방법

### Option 1: nginx 서브경로 방식 (즉시 가능)
```nginx
# neture.co.kr/auth/* 로 접근
location /auth/ {
    proxy_pass http://localhost:5000/;
}

# neture.co.kr/api/* 로 접근  
location /api/ {
    proxy_pass http://localhost:4000/;
}
```

### Option 2: 임시 hosts 파일 설정 (개발용)
```bash
# Windows: C:\Windows\System32\drivers\etc\hosts
# Linux/Mac: /etc/hosts

13.125.144.8 auth.neture.co.kr
13.125.144.8 api.neture.co.kr
```

### Option 3: 현재 도메인에서 바로 시작
```bash
# 일단 neture.co.kr에서 모든 서비스 운영
# 추후 서브도메인 분리
```

---

## 📊 DNS 전파 상태 확인 도구

### 온라인 도구
1. https://www.whatsmydns.net/
   - auth.neture.co.kr 입력
   - 전 세계 DNS 서버 확인

2. https://dnschecker.org/
   - 더 많은 지역 서버 확인

3. Google DNS 직접 확인
```bash
# Google Public DNS (8.8.8.8) 사용
nslookup auth.neture.co.kr 8.8.8.8
```

---

## 🎯 권장 조치

### 즉시 실행
1. **AWS Lightsail DNS 존 확인**
   - 정확한 레코드 설정 여부
   - TTL 값 확인 (300초 권장)

2. **대안 방식으로 진행**
   - nginx 서브경로 방식 사용
   - neture.co.kr/auth, neture.co.kr/api

3. **도메인 네임서버 확인**
   - 실제 DNS 제공자 확인
   - 해당 제공자에서 설정

---

## 💡 빠른 해결책

DNS 설정이 복잡하다면, 일단 서브경로 방식으로 진행:

```bash
# SSH 접속
ssh ubuntu@13.125.144.8

# nginx 설정 수정
sudo nano /etc/nginx/sites-available/neture.co.kr

# 다음 내용 추가:
location /auth/ {
    proxy_pass http://localhost:5000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /api/ {
    proxy_pass http://localhost:4000/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

# nginx 재시작
sudo nginx -t
sudo systemctl reload nginx
```

이렇게 하면:
- https://neture.co.kr/auth → Auth 서비스
- https://neture.co.kr/api → API 서비스

서브도메인 없이도 즉시 사용 가능합니다!