# O4O Operator Core Extraction — Verify Checklist V1 (Hybrid)

> **상위 문서**: `CLAUDE.md` · `docs/architecture/OPERATOR-CORE-DESIGN-V1.md` · `docs/architecture/OPERATOR-DATATABLE-POLICY-V1.md`
> **버전**: V1
> **작성일**: 2026-05-03
> **상태**: Active Standard — 모든 Operator Core 추출 작업의 검증 표준
> **WO**: WO-O4O-OPERATOR-CORE-EXTRACTION-VERIFY-CHECKLIST-V1
>
> 본 문서는 Operator 영역에서 `@o4o/operator-core-ui` 모듈 추출 후 **각 서비스 마이그레이션 단계마다 적용**하는 표준 검증 절차를 정의한다. Stores 모듈 첫 적용 사례에서 도출된 hybrid 검증 패턴(Step A 자동 + Step B 수동 + Step C 판정)을 표준화한 것이다.

---

## 1. 핵심 원칙 — 역할 분리

> **"Claude Code 는 안정성을 확인하고, 사용자는 '느낌'을 확인한다."**

| 영역 | 누가 | 무엇 |
|---|---|---|
| 🤖 **Step A — 기술 검증** | Claude Code (자동) | API / 배포 / 번들 / 로그 / 계약 |
| 👤 **Step B — UX 검증** | 사용자 (수동, 5분) | 첫 인상 / 레이아웃 / 인터랙션 / 미세 UX |
| 🧭 **Step C — 판정** | 협의 | PASS → soak / FAIL → 수정 |

**전제**: Step A 만으로는 운영 검증이 부족. 반드시 Step B 와 결합되어야 한다.

---

## 2. Step A — Claude Code 자동 검증

### 2.1 A-1. API / 데이터

| 항목 | 검증 방법 |
|---|---|
| `GET /api/v1/operator/{module}` 응답 (no-auth → 401) | curl + envelope 형식 확인 |
| 응답 envelope 표준 (`{success, ...}`) | factory 반환과 일치 확인 |
| listX / getX adapter 함수 배포 확인 | bundle grep |
| 검색 query 반영 (코드 번들에 존재) | bundle grep |
| pagination params 반영 (코드 번들에 존재) | bundle grep |

### 2.2 A-2. 페이지 동작

| 항목 | 검증 방법 |
|---|---|
| `/operator/{module}` Cloud Run direct URL 접근 (HTTP 200) | curl |
| 활성 revision (배포 후) | gcloud run revisions list |
| Module 컴포넌트 코드 배포 확인 | OperatorRoutes chunk 또는 모듈 chunk grep |
| 서비스 config 토큰 (예: tableId, typeLabels) 배포 확인 | bundle grep |
| Row click navigation 코드 보존 | thin wrapper 의 navigate 호출 grep |

### 2.3 A-3. 에러 검증

| 항목 | 검증 방법 |
|---|---|
| 서비스 web 컨테이너 ERROR (배포 후 30분~1시간) | `gcloud logging read severity>=ERROR` |
| API operator/{module} 4xx/5xx (운영 트래픽) | gcloud logging |
| Cloud Run Deploy 최종 conclusion | `gh run view` |

### 2.4 A-4. 상태 처리

| 항목 | 검증 방법 |
|---|---|
| loading state 코드 존재 | use{Module}Query loading 반환 확인 |
| empty state 메시지 prop 전달 | `emptyMessage` 정상 |
| error banner UI | error state + alert 코드 확인 |

### Step A PASS 조건

```text
- 모든 A-1 ~ A-4 항목 ✅
- 배포 conclusion = success
- 운영 ERROR 0건
- 운영 4xx/5xx 0건 (테스트 호출 제외)
```

---

## 3. Step B — 사용자 수동 검증 (5분)

> **목표: "기존보다 이상해졌는가?"** — 기능이 아닌 **느낌 기준**.

### 3.1 추천 빠른 체크 순서 (5분)

```text
1. /operator/{module} 접속 (어색함 발견 즉시)
2. 검색어 아무거나 입력 → 즉각 반응 확인
3. 페이지 이동 1회 (pagination 자연스러움)
4. 아무 row 클릭 → detail 정상 이동
```

→ 4 단계에서 어색함이 발견되면 즉시 FAIL.

### 3.2 B-1. 첫 인상 (가장 중요)

```text
[ ] 기존 페이지와 "다르게 느껴지지 않는가?"
[ ] UI 가 어색하지 않은가?
[ ] 정보가 더 보기 어려워지지 않았는가?
```

### 3.3 B-2. 목록 UI

```text
[ ] 컬럼 정렬 / 배치 자연스러운가
[ ] 텍스트 깨짐 / 줄바꿈 문제 없는가
[ ] 서비스별 typeLabel (예: 약국 / 매장) 정상 표시
[ ] 날짜 / 숫자 포맷 정상
[ ] colorScheme (slate/primary/pink) 서비스 톤과 일치
```

### 3.4 B-3. 인터랙션

```text
[ ] 검색 → 즉각 반응 (체감 1초 이내)
[ ] pagination 위치 / UX 자연스러운가
[ ] row click 클릭감 자연스러운가
[ ] 체크박스 selection 정상 (selectable=true 인 경우)
[ ] headerExtras / rowActionsExtra slot UI 위치 적절
```

### 3.5 B-4. 미세 UX

```text
[ ] 클릭 시 딜레이 체감 없는가
[ ] 버튼 간격 / 정렬 이상 없는가
[ ] hover 상태 자연스러운가
[ ] 스크롤 UX 문제 없는가
```

### 3.6 B-5. 기존 대비 회귀

```text
[ ] 기존 기능 빠진 것 없는가
[ ] 기존보다 불편해진 부분 없는가
[ ] 응답 시간 / 데이터 양 변화 없는가
```

### Step B PASS 조건

```text
- 어색함 없음
- 기능 정상
- UX 위화감 없음
```

→ Step C 로 이동.

---

## 4. Step C — 판정 + Soak

### 4.1 Step A + B 모두 PASS

→ **1주 soak 진행**:
```text
[ ] 운영 중 추가 ERROR 발생 없음
[ ] 사용자 피드백(불편 / 회귀) 없음
[ ] Cloud Run 안정 (로그 / 응답 시간)
```

→ 1주 soak PASS 시 다음 서비스 마이그레이션 진행 가능.

### 4.2 Step A FAIL 또는 Step B FAIL

→ **즉시 수정**:
- Step A FAIL: 코드 / 배포 / 로그 문제 root cause 분석 후 수정 commit
- Step B FAIL: UI/UX 문제 발견 → 패키지 또는 thin wrapper 수정
- 수정 후 **Step A/B 재검증**

### 4.3 마이그레이션 단계 진행 매트릭스 (참고)

| 단계 | 검증 방식 |
|---|---|
| Step 0 — 패키지 신설 | Step A 만 (deploy 영향 0) |
| Step 1 — 첫 서비스 (KPA) | **Step A + B + Soak 1주** |
| Step 2 — 두 번째 서비스 (Glyco) | Step A + B + Soak 1주 |
| Step 3 — 세 번째 서비스 (K-Cos) | Step A + B + Soak 1주 |

→ 각 서비스 단계마다 **본 체크리스트 1회 적용**.

---

## 5. 적용 범위

본 체크리스트는 다음 모듈 추출 작업에 **공통 재사용**:

| 모듈 | 현재 상태 |
|---|---|
| **Stores Management** | Step 0+1+2 완료 (KPA Step 1 완료 시점에 본 체크리스트 적용) |
| **Users / Members** | Phase 2 — `EditUserModal` 우선 후보 |
| **Forum Analytics** | Phase 3 |
| **AI Report** | 향후 후보 |
| **다른 Core UI + Service Logic 모듈** | 동일 절차 |

→ 새 모듈 추출 시 본 문서 §2 ~ §4 를 그대로 적용한다.

---

## 6. 활용 주의사항

### 6.1 Step A 만 PASS 일 때 진행 금지
> "기술 검증만 통과했다고 운영 가능한 것은 아니다."

Step A 가 잡지 못하는 영역:
- 컬럼 위치 / 텍스트 가독성 / 시각적 회귀
- 인터랙션 체감 (검색 반응 속도, 페이지 전환 부드러움)
- 사용자 워크플로우 끊김
- 데이터 다양성에 따른 예외 (긴 텍스트, 특수문자, 빈 필드 등)

→ Step B 없이 Soak 진행 금지.

### 6.2 Step B 만으로 진행 금지
> "사람이 보면 기술 회귀를 못 잡는다."

Step B 가 잡지 못하는 영역:
- 배포 누락 (이전 버전 캐시 사용 중)
- API 변경 미반영 (네트워크 탭 안 보면 모름)
- 로그 ERROR / 비동기 실패 (UI 에 안 드러남)

→ Step A 없이 단순 "괜찮아 보임" 으로 PASS 처리 금지.

### 6.3 Soak 1주 단축 금지
> "각 서비스 마이그레이션 사이 soak 는 OPERATOR-CORE-DESIGN-V1 §10 금지 사항이다."

Step B PASS 후에도 1주 운영 모니터링 후 다음 서비스 진행. 이전 단계의 문제가 며칠 후 발견되는 경우가 있다.

---

## 7. 결론

> **Operator Core 추출 작업은 본 체크리스트 없이 완료되었다고 선언하지 않는다.**

본 체크리스트는 다음을 보장한다:
- 기술적 회귀 차단 (Step A)
- UX 회귀 차단 (Step B)
- 단계 사이 안정성 확보 (Step C — Soak)

새 Operator Core 모듈 추출 PR 은 본 문서를 인용하여 검증 결과를 첨부한다.

---

## 8. 참고 자료

- 상위 설계: [OPERATOR-CORE-DESIGN-V1.md](OPERATOR-CORE-DESIGN-V1.md)
- DataTable 정책: [OPERATOR-DATATABLE-POLICY-V1.md](OPERATOR-DATATABLE-POLICY-V1.md)
- 통합 상태 분석: [OPERATOR-INTEGRATION-STATE-V1.md](OPERATOR-INTEGRATION-STATE-V1.md)
- 첫 적용 사례: `WO-O4O-OPERATOR-STORES-CORE-EXTRACTION-V1` (Step 0+1+2 commit `513232c27`, lucide-react fix `97df1dfb6`)
- 선례 (LMS V2 SOAK 패턴): [LMS-CLIENT-EXTRACTION-V2-COMPLETE.md](LMS-CLIENT-EXTRACTION-V2-COMPLETE.md) §5
