# WO-O4O-COMMUNITY-CROSSSERVICE-FULL-CENSUS-AND-COMMONIZATION-AUDIT-V1

**커뮤니티 전 서비스 사용자-facing 기능 전수 census 및 공통화 상태 감사**

- 상태: 실행 대기 (핸드오프)
- 성격: **조사 전용** — 구현·리팩토링·파일 이동 없음
- 선행: `WO-O4O-FORUM-SERVICE-SCOPE-DETAIL-AND-WRITE-COMMONIZATION-V1` (완료 · `ac3d9694e`)
- 보류: `WO-O4O-COMMUNITY-FORUM-INTERACTION-AND-WRITE-BOUNDARY-COMMONIZATION-V1` — 본 census 결과로 우선순위를 재산정한 뒤 재개한다

---

## 1. 목표 · 배경

지금까지 커뮤니티 공통화는 **포럼 축으로 좁게** 진행됐다. 그러나 실제 사용자-facing 커뮤니티 영역은
포럼 밖에도 별도 축이 존재한다. KPA 라우트만 봐도 `/services/lms`, `/guide/features/resources`,
`/guide/features/content`, `/guide/features/production-materials` 등이 포럼과 무관한 독립 축으로 있다.

포럼 하나를 다 정리해도 커뮤니티 전체의 중복 규모는 알 수 없다. 따라서 다음 작업은 포럼 interaction 이
아니라, **커뮤니티 전체 모집단을 먼저 확정하는 census** 다.

목표: KPA-Society 를 출발점으로 **K-Cosmetics · Neture · GlycoPharm · PharmacyHub** 의 사용자-facing
커뮤니티 기능을 코드에서 전수 조사하고, 기능 단위마다 공통화 상태를 판정해 **다음 큰 작업 묶음**의
근거를 만든다.

**모집단은 기존 WO·CHECK·IR 목록에서 만들지 않는다.** 문서는 과거 시점 기록이라 누락·과대 기록이 섞여
있다. route · page · component · API client · backend route/controller · shared package 를 **코드에서 직접**
훑어 기능 단위를 먼저 확정하고, 문서는 판정 보조 근거로만 참조한다.

---

## 2. 승인 범위

읽기 전용 조사 + 산출물 문서 1건 작성.

### 2-1. 조사 축 (최소 — 이보다 좁히지 않는다)

| # | 축 |
|---|---|
| 1 | 커뮤니티 홈 / 허브 |
| 2 | 포럼 (목록 · 상세 · 작성 · 수정 · 삭제) |
| 3 | 콘텐츠 |
| 4 | 강의 / LMS |
| 5 | 자료실 / Resources |
| 6 | 교육 · 제작자료 (production materials) |
| 7 | 커뮤니티 활동 / 최신글 / 피드 |
| 8 | 개설 신청 · 내 신청 · 내 활동 |
| 9 | 멤버십 / 폐쇄형 커뮤니티 |
| 10 | 검색 |
| 11 | 댓글 · 좋아요 등 interaction |
| 12 | **각 서비스에만 존재하는 추가 커뮤니티 기능** (축 11개에 안 들어가는 것 전부) |

12번은 선택 항목이 아니다. 축에 안 맞는 기능을 버리지 말고 서비스별로 반드시 열거한다.

### 2-2. 조사 대상 계층 (기능 단위 확정 근거)

- 프론트: `services/web-*/src/App.tsx` route 트리 · `pages/**` · `components/**` · `services/*Api.ts`
- 백엔드: `apps/api-server/src/routes/**` mount · `controllers/**` · 관련 middleware
- 공통: `packages/**` (shared-space-ui · forum-core · content-core · lms-client · screen-content-core 등)

### 2-3. 판정 라벨 (기능 단위마다 정확히 하나)

| 라벨 | 의미 |
|---|---|
| `FULLY_COMMON` | 공통 패키지 UI + 공통 백엔드 계약을 그대로 소비. 서비스 코드는 설정·주입만 |
| `CORE_ONLY` | 백엔드/로직은 공통이나 화면은 서비스별 구현 |
| `VIEW_DUPLICATED` | 서비스별로 실질 동일한 화면이 복제돼 있음 (공통화 후보 1순위) |
| `SERVICE_SPECIFIC` | 해당 서비스 고유 기능 — 공통화 대상 아님 (사유 필수) |
| `NOT_IMPLEMENTED` | 그 서비스에 해당 기능 없음 |
| `OUT_OF_SCOPE` | 사용자-facing 커뮤니티가 아님 (operator/admin 전용 등 — 사유 필수) |

### 2-4. 필수 산출 집계

```text
전체 모집단: N
FULLY_COMMON: n
CORE_ONLY: n
VIEW_DUPLICATED: n
SERVICE_SPECIFIC: n
NOT_IMPLEMENTED: n
OUT_OF_SCOPE: n
미조사: 0
```

**`미조사: 0` 이 아니면 이 WO 는 완료가 아니다.** 판정이 어려운 항목은 미조사로 남기지 말고
근거와 함께 `SERVICE_SPECIFIC` 또는 `OUT_OF_SCOPE` 로 판정하고 불확실성을 명시한다.

---

## 3. 실행 순서

1. **KPA-Society 기준 축 확정** — KPA route 트리 전수 → 12축에 매핑 → 축에 없는 기능은 12번에 적재.
   KPA 는 공통 구조의 reference implementation(CLAUDE.md §13)이므로 모집단 골격을 여기서 만든다.
2. **기능 단위 정의 고정** — "화면 1개 = 기능 1개" 가 아니라 **사용자 동선 단위**로 자른다
   (예: 포럼 목록/상세/작성은 별개 기능, 목록의 정렬·검색 옵션은 별개 기능 아님).
   기능 단위 목록을 먼저 확정한 뒤 서비스별 조사에 들어간다.
3. **서비스별 확장 조사** — K-Cosmetics → Neture → GlycoPharm → PharmacyHub 순으로
   같은 기능 단위 표를 채운다. 각 서비스에만 있는 기능은 그 시점에 모집단에 추가한다.
4. **공통 패키지 역방향 대조** — `packages/**` 에서 export 된 커뮤니티 부품별 **실 소비처 수**를 센다.
   export 는 있는데 소비 0인 부품, 반대로 공통 부품이 있는데 복제 화면을 쓰는 서비스를 찾아낸다.
   (참고 함정: 소비 0인데 dependency 만 남은 사례가 실제로 있다.)
5. **백엔드 계약 대조** — 기능별로 서비스가 공통 route 를 쓰는지 서비스 prefix route 를 쓰는지,
   컨트롤러가 공유인지 복제인지 기록한다. 격리 축(serviceKey / organizationId / storeId)도 함께 적는다.
6. **판정 · 집계** — 모든 기능 단위에 라벨 부여 → §2-4 집계 산출.
7. **작업 묶음 제안** — 중복 규모(=`VIEW_DUPLICATED` 기능 수 × 소비 서비스 수) 기준으로
   상위 3~5개 묶음을 제안한다. 예: `콘텐츠+자료실`, `LMS/강의`, `포럼 interaction`.
   각 묶음마다 예상 범위 · 선행 조건 · 리스크를 한 단락씩 적는다. **후속 WO 본문은 쓰지 않는다.**
8. **산출물 작성 · 커밋 · 푸시.**

### 산출물

`docs/investigations/IR-O4O-COMMUNITY-CROSSSERVICE-FULL-CENSUS-V1.md` 1건.

포함 항목:
- 조사 방법 · 기능 단위 정의 기준 · 모집단 확정 경로 (문서가 아닌 코드에서 왔다는 근거)
- 기능 × 5서비스 판정 매트릭스 (전 기능 · 전 서비스 · 빈칸 없음)
- §2-4 집계
- 공통 패키지 소비처 카운트 표
- 백엔드 계약·격리 축 대조표
- 서비스 고유 기능 목록 (축 12)
- 작업 묶음 제안 상위 3~5개 (규모 근거 포함)
- 판정 불확실 항목과 그 사유

---

## 4. 제외 범위

- **모든 구현 · 리팩토링 · 파일 이동 · route 변경 · 패키지 추출** — 본 WO 는 조사 전용이다
- 발견한 결함 수정 (범위 밖 수정 금지 · 보고만)
- 후속 WO 본문 작성 (묶음 제안까지만)
- operator / admin 콘솔 (사용자-facing 아님 → `OUT_OF_SCOPE` 로 판정만)
- 매장(store) 운영 화면 · 태블릿 · QR · POP — 커뮤니티가 아니다. 단 커뮤니티 화면과 자료를
  공유하는 접점이 있으면 접점만 기록한다
- DB 스키마 조사 (필요 시 read-only SELECT 로 실재 여부 확인은 허용, 구조 변경 제안은 범위 밖)
- 기존 WO/CHECK/IR 문서 정리·상태 표기 변경 (CLAUDE.md §16 기준 발견 시 보고만)

---

## 5. 중지 조건

- 모집단이 **200 기능 단위를 초과**할 조짐 — 기능 단위 정의가 너무 잘게 쪼개졌다는 신호다.
  중지하고 절단 기준을 보고한 뒤 재확정한다
- 사용자-facing / operator 경계가 코드로 판정되지 않는 영역이 한 축 전체에 걸칠 때
- 조사 중 **프로덕션 노출 보안 결함**(인증 없는 커뮤니티 write, 서비스 경계 누락 등)을 발견한 경우
  → 즉시 중지 · 증거와 함께 보고 (수정은 별도 WO)
- 다른 세션 WIP 와 파일 충돌
- 조사만으로 판정 불가해 실행·배포 검증이 필요한 항목이 다수(5건 이상) 발생

---

## 6. 검증 · Git

**검증** (조사 전용이므로 빌드 검증은 불필요)

- 매트릭스 빈칸 0 · `미조사: 0` 자체 확인
- 무작위 표본 10개 기능을 코드 경로로 역추적해 판정이 실제 코드와 일치하는지 재확인 (표본 목록 기록)
- 집계 합이 전체 모집단 N 과 일치하는지 확인

**Git**

- 브랜치: `work/commonization-community` (main 직접 push · 병합 금지)
- `git add .` 금지 — path-specific stage
- 커밋 1건: `docs(ir): 커뮤니티 전 서비스 census (WO-O4O-COMMUNITY-CROSSSERVICE-FULL-CENSUS-AND-COMMONIZATION-AUDIT-V1)`

---

## 7. 완료 보고

- WO 제목 포함 · 한국어 · 기술 식별자 원문 유지
- §2-4 집계를 **그대로** 포함
- 작업 묶음 제안 상위 3~5개를 규모 근거와 함께 요약
- 판정 불확실 항목 · 조사 중 발견한 결함(수정하지 않은 것) 명시
- 문서 정합 한 줄 (CLAUDE.md §16-5)
- 산출물 문서 클릭 가능한 링크
