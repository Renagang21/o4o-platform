# 🌐 DNS 설정 가이드 - O4O Platform

## DNS A 레코드 설정

| 도메인 | IP 주소 | 서버 역할 |
|--------|---------|-----------|
| neture.co.kr | 13.125.144.8 | 웹서버 |
| admin.neture.co.kr | 13.125.144.8 | 웹서버 |
| **api.neture.co.kr** | **43.202.242.215** | **API 서버** |

## DNS 설정 확인 방법

### 1. 현재 설정 확인
```bash
# 각 도메인의 현재 IP 확인
nslookup api.neture.co.kr
nslookup admin.neture.co.kr
nslookup neture.co.kr

# 또는 dig 사용
dig api.neture.co.kr +short
dig admin.neture.co.kr +short
```

### 2. 올바른 응답 예시
```bash
# api.neture.co.kr 조회 시
$ nslookup api.neture.co.kr
Server:		8.8.8.8
Address:	8.8.8.8#53

Name:	api.neture.co.kr
Address: 43.202.242.215  ✅ 정상

# admin.neture.co.kr 조회 시  
$ nslookup admin.neture.co.kr
Server:		8.8.8.8
Address:	8.8.8.8#53

Name:	admin.neture.co.kr
Address: 13.125.144.8  ✅ 정상
```

## DNS 수정 절차

### 1. DNS 제공업체 접속
- Cloudflare, Route53, 가비아 등 사용 중인 DNS 서비스 관리 패널 접속

### 2. A 레코드 수정
```
Type: A
Name: api
Value: 43.202.242.215
TTL: 300 (5분) 또는 Auto
Proxy: Disabled (Cloudflare의 경우)
```

### 3. 저장 및 전파 대기
- 일반적으로 5-30분 소요
- TTL이 낮을수록 빠르게 전파

## 문제 해결

### DNS 캐시 클리어
```bash
# Mac
sudo dscacheutil -flushcache

# Linux
sudo systemctl restart systemd-resolved

# Windows
ipconfig /flushdns
```

## 서버별 역할 정리

### 웹서버 (13.125.144.8)
- **역할**: 프론트엔드 애플리케이션 서빙
- **실행 중인 서비스**:
  - nginx (웹서버)
  - PM2 (Node.js 프로세스 관리)
  - 프론트엔드 빌드 파일들

### API 서버 (43.202.242.215)
- **역할**: REST API 제공
- **실행 중인 서비스**:
  - Node.js API Server (Port 3001)
  - PostgreSQL (Port 5432)
  - Redis (Port 6379)
  - nginx (리버스 프록시)

## 테스트

```bash
# DNS 확인
nslookup api.neture.co.kr

# API 헬스체크
curl https://api.neture.co.kr/health

# CORS 테스트
curl -I -X OPTIONS https://api.neture.co.kr/api/v1/auth/login \
  -H 'Origin: https://admin.neture.co.kr'
```

---

**작성일**: 2025년 8월 19일
**중요도**: 🔴 CRITICAL - DNS 설정은 모든 서비스 접근성의 기초입니다