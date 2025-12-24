# O4O Platform Infrastructure Migration: GCP 단일 운영 선언

> **문서 상태**: Active
> **작성일**: 2024-12-24
> **Work Order**: WO-GEN-PLATFORM-INFRA-MIGRATION-CLOSE
> **Phase**: R5 완료

---

## 1. 공식 선언

> **O4O 플랫폼의 운영 인프라는 GCP(Google Cloud Platform) 단일 체계입니다.**
> **AWS는 더 이상 운영 인프라로 사용하지 않습니다.**

---

## 2. 현재 인프라 현황 (GCP)

### 2.1 Core API (Cloud Run)

| 항목 | 값 |
|------|-----|
| **서비스명** | o4o-core-api |
| **프로젝트** | netureyoutube |
| **리전** | asia-northeast3 (서울) |
| **플랫폼** | Cloud Run (managed) |
| **이미지 저장소** | Artifact Registry |

### 2.2 CI/CD 파이프라인

| 워크플로우 | 대상 | 배포 위치 |
|------------|------|-----------|
| `deploy-api.yml` | API Server | Cloud Run |
| `deploy-admin.yml` | Admin Dashboard | 웹서버 (13.125.144.8) |
| `deploy-main-site.yml` | Main Site | 웹서버 (13.125.144.8) |
| `deploy-nginx.yml` | Nginx 설정 | 웹서버 |

### 2.3 웹서버 (Nginx Proxy)

| 항목 | 값 |
|------|-----|
| **IP** | 13.125.144.8 |
| **역할** | Static hosting + Reverse proxy |
| **대상** | admin.neture.co.kr, neture.co.kr |
| **Backend** | Cloud Run API로 프록시 |

---

## 3. AWS 종료 체크리스트

### 3.1 확인 완료 항목

- [x] EC2 API 서버 (43.202.242.215) - **종료됨**
- [x] GitHub Actions에서 AWS 배포 코드 - **제거됨**
- [x] SSH 배포 스크립트 AWS 참조 - **제거됨**

### 3.2 삭제 대상 (차기 Work Order)

> **주의**: 실제 삭제는 별도 Work Order로 진행

| 자산 유형 | 확인 사항 | 상태 |
|-----------|-----------|------|
| EC2 인스턴스 | 완전 종료 확인 | 확인 필요 |
| EBS 볼륨 | 스냅샷 잔존 여부 | 확인 필요 |
| Elastic IP | 고정 IP 해제 여부 | 확인 필요 |
| Security Groups | 미사용 그룹 정리 | 확인 필요 |
| IAM 사용자/역할 | 배포용 계정 정리 | 확인 필요 |

### 3.3 비용 확인

```
AWS 월 비용 목표: $0
- EC2: $0 (종료됨)
- EBS: $0 (삭제 필요)
- 기타: 확인 필요
```

---

## 4. 운영 기준 (확정)

### 4.1 "운영 서버"의 정의

| 용어 | 의미 |
|------|------|
| **운영 서버** | Cloud Run (o4o-core-api) |
| **운영 API** | https://o4o-core-api-xxxxxxxxxx.asia-northeast3.run.app |
| **프로덕션 배포** | main 브랜치 push → Cloud Run 자동 배포 |

### 4.2 금지 사항

- AWS EC2로의 배포 시도
- 신규 AWS 리소스 생성
- AWS 관련 GitHub Secrets 추가

### 4.3 허용 사항

- Cloud Run 서비스 스케일링 조정
- GCP 리소스 추가 (필요시)
- 웹서버(13.125.144.8)의 Nginx 설정 변경

---

## 5. 참조 문서

- `.github/workflows/deploy-api.yml` - Cloud Run 배포 워크플로우
- `cloud-deploy/` - Cloud Run 설정 파일
- `CLAUDE.md` 섹션 8 - 인프라 정보

---

## 6. 변경 이력

| 날짜 | 변경 내용 | 담당 |
|------|-----------|------|
| 2024-12-24 | 문서 생성, GCP 단일 운영 선언 | WO-GEN-PLATFORM-INFRA-MIGRATION-CLOSE |

---

*이 문서는 CLAUDE.md에 종속되며, 인프라 운영의 공식 기준입니다.*
