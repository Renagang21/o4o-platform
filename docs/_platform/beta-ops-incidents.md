# Beta Operations Incidents Log

> **Status**: Active (장애 기록)
> **Phase**: BETA-OPS-1
> **Started**: 2025-12-25
> **Authority**: CLAUDE.md 종속

---

## 1. 문서 목적

Beta Phase에서 발생하는 **장애 및 이상 현상을 기록**한다.

**원칙:**
- 즉시 수정하지 않는다
- 장애 여부를 명확히 판정한다
- Hotfix 필요 여부를 판단한다

---

## 2. 장애 판정 기준 (BETA-OPS-1 정의)

### 2.1 장애 분류

| 상황 | 판정 | 코드 |
|------|------|------|
| CI 실패 (build/type) | ❌ 장애 | INC-CI |
| 배포 성공 + ready 실패 | ⚠️ 장애 | INC-READY |
| ready OK + 도메인 500 | ❌ 장애 | INC-DOMAIN |
| mock 데이터 오류 | ⭕ 허용 | ALLOWED-MOCK |
| 인증 실패 (Core 연동) | ❌ 장애 | INC-AUTH |

### 2.2 Hotfix 허용 범위

**허용:**
- 런타임 에러 수정
- 보안 취약점
- 로그/가드/검증 로직 보완

**금지:**
- 엔드포인트 추가
- 도메인 모델 변경
- Reference 수정
- Core 경계 변경

---

## 3. 장애 기록 템플릿

```markdown
### INC-XXXX: [제목]

| 항목 | 값 |
|------|-----|
| 발생일시 | YYYY-MM-DD HH:mm |
| 발견자 | (자동/수동) |
| 영향 범위 | (앱 이름) |
| 분류 | (INC-CI/INC-READY/INC-DOMAIN/INC-AUTH) |
| 판정 | (장애/허용) |
| Hotfix 필요 | (Yes/No) |

**현상:**
(상세 설명)

**원인:**
(분석 결과)

**조치:**
(Hotfix 여부 및 내용)

**교훈:**
(향후 방지책)
```

---

## 4. 장애 기록

### Week 1 (2025-12-25 ~ 2025-12-31)

#### 2025-12-25

**관찰된 이상 현상:**

| 시간 | 현상 | 분류 | 판정 |
|------|------|------|------|
| - | - | - | - |

> 현재 장애 0건

---

## 5. 장애 통계

### 5.1 주간 통계

| 주차 | 장애 건수 | Hotfix 건수 | 비고 |
|------|----------|-------------|------|
| Week 1 | 0 | 0 | 초기 진입 |

### 5.2 분류별 통계

| 분류 | 누적 건수 | 비고 |
|------|----------|------|
| INC-CI | 0 | - |
| INC-READY | 0 | - |
| INC-DOMAIN | 0 | - |
| INC-AUTH | 0 | - |
| ALLOWED-MOCK | 0 | 허용 항목 |

---

## 6. Hotfix 이력

### 6.1 Hotfix 목록

| ID | 날짜 | 대상 | 내용 | 승인 |
|----|------|------|------|------|
| - | - | - | - | - |

> 현재 Hotfix 0건

### 6.2 Hotfix 프로세스 (참조)

```
1. 장애 발생 → 장애 기록 (본 문서)
2. Hotfix 필요 판단
3. beta-lock-rules.md 허용 범위 확인
4. Hotfix Work Order 작성
5. feature/hotfix-* 브랜치 생성
6. 수정 → 테스트 → 머지
7. 본 문서에 Hotfix 기록
```

---

## 7. 판정 사례 (예시)

### 7.1 장애로 판정하는 경우

**사례 1: CI 빌드 실패**
```
현상: pnpm -F @o4o/forum-api build 실패
분류: INC-CI
판정: ❌ 장애
Hotfix: Yes (빌드 오류 수정 허용)
```

**사례 2: 인증 연동 실패**
```
현상: requireAuth 미들웨어에서 Core API 연결 실패
분류: INC-AUTH
판정: ❌ 장애
Hotfix: Yes (연결 로직 수정 허용)
```

### 7.2 허용으로 판정하는 경우

**사례 1: Mock 데이터 오류**
```
현상: mockProducts 배열에 잘못된 데이터 포함
분류: ALLOWED-MOCK
판정: ⭕ 허용
Hotfix: No (Alpha Mock은 수정 대상 아님)
```

**사례 2: DB 미연결 상태**
```
현상: /health/ready 503 (DB 미연결)
분류: 의도된 상태 (Non-Operational)
판정: ⭕ 허용
Hotfix: No (G1 이후 해결)
```

---

## 8. 관련 문서

| 문서 | 역할 |
|------|------|
| [beta-ops-log.md](./beta-ops-log.md) | 일일 운영 로그 |
| [beta-lock-rules.md](./beta-lock-rules.md) | Hotfix 허용 범위 |
| [deployment-status-definition.md](./deployment-status-definition.md) | 상태 판정 기준 |

---

## 9. 변경 이력

| 날짜 | 버전 | 변경 내용 |
|------|------|----------|
| 2025-12-25 | 1.0 | 초기 작성 (BETA-OPS-1 시작) |

---

*This document records all incidents during Beta Phase.*
*Judgment criteria are fixed by BETA-OPS-1 Work Order.*
*Authority: CLAUDE.md 종속*
