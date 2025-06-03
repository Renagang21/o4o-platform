# 04. 서버 인스턴스 구성 및 배포 환경

본 문서는 AWS Lightsail 기반의 현재 인프라 구조를 정리한 문서입니다.  
두 개의 인스턴스를 운영 중이며, 프론트엔드와 API 서버가 분리되어 있습니다.

---

## 🌐 서버 구성 요약

| 구성 요소       | 인스턴스 이름        | 설명 |
|----------------|----------------------|------|
| 프론트엔드 서버 | o4o-webserver        | neture.co.kr에서 React 기반 SPA 제공 |
| API 서버        | o4o-apiserver        | Medusa 기반 커머스 API 처리용 |

---

## 🖥️ o4o-webserver (프론트엔드)

| 항목               | 값 |
|--------------------|----|
| AWS 리전           | ap-northeast-2a |
| 퍼블릭 IPv4        | 13.125.144.8 |
| 퍼블릭 IPv6        | 2406:da12:395:a000:690a:15d7:3b3d:f179 |
| 프라이빗 IPv4      | 172.26.11.95 |
| SSH 사용자         | ubuntu |
| SSH 키             | aws-o4o-webserver-ssh-key.pem |
| 주요 서비스        | `neture.co.kr`, `main-site` 빌드 serve, Nginx reverse proxy 사용 |

---

## 🛠️ o4o-apiserver (백엔드, API 서버)

| 항목               | 값 |
|--------------------|----|
| 퍼블릭 IPv4        | 43.202.242.215 |
| 퍼블릭 IPv6        | 2406:da12:395:a000:fcf2:949d:557a:8e55 |
| 프라이빗 IPv4      | 172.26.8.62 |
| SSH 사용자         | ubuntu |
| SSH 키             | aws-o4o-apiserver-ssh-key.pem |
| 주요 서비스        | Medusa API 서버 (인증, 상품, 주문 등 관리) |
| 계획된 연동        | PostgreSQL, 파일 저장, Redis 캐시 등 외부 연동 예정 |

---

## 🔄 배포 및 실행 방식

- **Frontend (`main-site`)**
  - `npm run build` 후 `serve -s dist -l 3000`
  - PM2 프로세스 사용
  - Nginx를 통해 443 포트 HTTPS 프록시 처리

- **Backend (Medusa API)**
  - `medusa develop` 또는 `medusa start` (설치 예정)
  - PostgreSQL 연동 포함
  - 추후 Redis, S3 등 연계 고려

---

## 📌 운영상 유의사항

- 두 인스턴스 모두 듀얼스택(IPv4/IPv6) 활성화
- 백엔드 메모리 부족 또는 의존성 오류로 인한 재설치 이력 있음
- SSH 키 분리 관리 필수

