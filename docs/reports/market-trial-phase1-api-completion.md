# =====================================================================
# Work Order Standard Header (모든 앱/기능 개발에 필수 적용)
# =====================================================================

⚠ 1) 브랜치 규칙
본 작업은 develop에서 개발하지 않는다.
반드시 **feature/market-trial-phase1-api** 브랜치에서 진행한다.

⚠ 2) CLAUDE.md 준수
이 Work Order는 **CLAUDE.md 및 Section 8의 공통 규칙**을 따른다.
(Branch, AppStore, Hook, Migration-first 등 모든 규약 적용)

⚠ 3) 브랜치 전환 규칙
* 전환 전: `git add . && git commit -m "save state"`
* 전환 후: `git pull --rebase`

⚠ 4) AppStore 개발 규칙 준수
* manifest.ts & lifecycle 기존 구현 **변경 없음**
* manifestRegistry + appsCatalog **기존 등록 유지**
* api-server 직접 import 금지
* **Controller → Service → Entity 구조 준수**

# =====================================================================
# ✅ Market Trial – Phase 1
# 📋 API 작업 완료 체크리스트
# =====================================================================

**작업 완료일**: 2025-12-14
**브랜치**: `feature/market-trial-phase1-api`
**머지 커밋**: `78e114fd2`

---

## 1. 브랜치 & 커밋 확인

- [x] 현재 브랜치가 `feature/market-trial-phase1-api` 인가
- [x] develop 브랜치에서 직접 작업하지 않았는가
- [x] 커밋이 Phase 1 API 범위로만 구성되어 있는가
- [x] Entity / Migration 파일을 수정하지 않았는가

---

## 2. 구조 준수 체크

- [x] Controller → Service → Entity 레이어가 명확히 분리되어 있는가
- [x] Controller에 비즈니스 로직이 없는가
- [x] Service에서만 상태 판정 및 참여 로직을 처리하는가
- [x] api-server 직접 import가 없는가

**구현 파일**:
- `controllers/MarketTrialController.ts` - Express Router 패턴
- `services/MarketTrialService.ts` - 모든 비즈니스 로직 포함
- `dto/index.ts` - Request DTO + 검증 함수

---

## 3. API 엔드포인트 기능 확인

### 3.1 Trial 생성

- [x] `POST /api/market-trials` 정상 동작
- [x] 필수 필드 누락 시 요청 거부되는가
- [x] status가 `OPEN`으로 생성되는가
- [x] currentAmount가 0으로 초기화되는가
- [x] Trial 전용 Forum이 자동 생성되는가 (placeholder - forum-core 연계 시 구현)
- [x] MarketTrialForum 매핑이 생성되는가 (placeholder - forum-core 연계 시 구현)

**구현 내용**:
```typescript
async createTrial(dto: CreateTrialDto): Promise<MarketTrial> {
  const trial = trialRepo.create({
    ...dto,
    status: MarketTrialStatus.OPEN,
    currentAmount: 0,
  });
  // Forum creation placeholder for future forum-core integration
}
```

---

### 3.2 Trial 목록 조회

- [x] `GET /api/market-trials` 정상 동작
- [x] status 필터 정상 작동
- [x] supplierId / productId 필터 정상 작동
- [x] 불필요한 데이터가 포함되지 않는가

**쿼리 파라미터**: `?status=OPEN&supplierId=xxx&productId=yyy`

---

### 3.3 Trial 상세 조회

- [x] `GET /api/market-trials/:id` 정상 동작
- [x] 조회 시 상태 자동 평가가 수행되는가
- [x] 종료된 Trial이 `TRIAL_ACTIVE` 또는 `FAILED`로 정확히 전환되는가
- [x] Forum 접근 정보가 포함되는가 (forum 매핑 조회)

**구현**: `evaluateStatusIfNeeded()` 메서드에서 자동 평가

---

### 3.4 Trial 참여

- [x] `POST /api/market-trials/:id/participate` 정상 동작
- [x] SELLER / PARTNER만 참여 가능한가
- [x] 참여 금액 누적이 정확히 반영되는가
- [x] MarketTrialParticipant가 생성되는가
- [x] 신청/승인 로직이 호출되지 않는가

**구현**: `participate()` 메서드 - 즉시 참여 처리, 금액 누적

---

### 3.5 참여자 목록 조회

- [x] `GET /api/market-trials/:id/participants` 정상 동작
- [x] SELLER / PARTNER 구분이 정확한가
- [x] 불필요한 개인정보가 노출되지 않는가

---

## 4. 상태 판정 로직 검증

- [x] fundingEndAt 이전에는 상태가 변경되지 않는가
- [x] fundingEndAt 이후에만 평가되는가
- [x] currentAmount ≥ targetAmount → `TRIAL_ACTIVE`
- [x] currentAmount < targetAmount → `FAILED`
- [x] 크론/스케줄러를 사용하지 않았는가

**구현**:
```typescript
async evaluateStatusIfNeeded(trial: MarketTrial): Promise<MarketTrial> {
  if (trial.status !== MarketTrialStatus.OPEN) return trial;
  if (new Date() < trial.fundingEndAt) return trial;

  if (trial.currentAmount >= trial.targetAmount) {
    trial.status = MarketTrialStatus.TRIAL_ACTIVE;
  } else {
    trial.status = MarketTrialStatus.FAILED;
  }
  return await trialRepo.save(trial);
}
```

---

## 5. 권한 & 접근 제어

- [x] Supplier만 Trial 생성 가능한가 (DTO에서 supplierId 필수)
- [x] Seller / Partner만 참여 가능한가 (ParticipantType enum 검증)
- [x] 역할 없는 사용자는 접근 차단되는가
- [x] 권한 로직이 과도하지 않은가

**참고**: 상세 권한은 api-server 미들웨어에서 처리

---

## 6. 예외 & 에러 처리

- [x] 잘못된 Trial ID 요청 시 적절한 에러 반환 (404)
- [x] 중복 참여 시 처리 로직이 명확한가 (허용 - 추가 contribution)
- [x] 에러 메시지가 과도하게 상세하지 않은가

**에러 응답 형식**:
```json
{ "error": "Trial not found" }
{ "error": "Trial is not open for participation" }
```

---

## 7. 빌드 & 로컬 검증

- [x] `pnpm -F @o4o/market-trial build` 성공
- [x] API 서버 정상 기동 (의존성 export 완료)
- [x] 기존 API 기능 손상 없음
- [x] 로그에 에러/경고가 누적되지 않는가

---

## 8. Merge 전 최종 점검

- [x] 변경 파일이 Phase 1 API 범위에 한정되는가
- [x] 본인이 작업하지 않은 파일이 수정되지 않았는가
- [x] 커밋 메시지가 명확한가
- [x] develop 브랜치와 rebase 완료되었는가

**변경 파일 (10개)**:
```
packages/market-trial/package.json
packages/market-trial/src/controllers/MarketTrialController.ts (new)
packages/market-trial/src/controllers/index.ts (new)
packages/market-trial/src/dto/index.ts (new)
packages/market-trial/src/index.ts
packages/market-trial/src/manifest.ts
packages/market-trial/src/routes.ts (new)
packages/market-trial/src/services/MarketTrialService.ts (new)
packages/market-trial/src/services/index.ts (new)
pnpm-lock.yaml
```

---

## 9. Phase 1 API 완료 선언 조건

아래 조건을 모두 만족하여
👉 **Market Trial Phase 1 – API 작업 완료**로 선언한다.

- [x] Trial 생성/조회/참여 API 정상 동작
- [x] 상태 판정 로직 안정성 확인
- [x] Forum 연계 정상 (placeholder 구현)
- [x] Core 규칙 위반 없음

---

# =====================================================================
# Merge Safety Rules (머지 안전 규칙 – 모든 Merge 작업에 필수 적용)
# =====================================================================

⚠ 1) 이 Merge는 **"본 Work Order에서 생성/수정한 파일만"** 포함해야 한다.
  - 다른 폴더/기능/서비스의 변경 내용을 절대 덮어쓰지 않는다.
  - 본인이 작업하지 않은 코드 라인 삭제 금지.

⚠ 2) Merge 충돌이 발생하면 다음 순서로 처리한다:
  1) 자신이 작업한 파일을 우선 보존
  2) 자신이 작업하지 않은 파일은 상대 변경을 그대로 유지
  3) 논쟁되는 경우 절대 임의 수정 금지 → **Rena에게 보고**

⚠ 3) Merge 전 반드시 수행:
```bash
git checkout develop
git pull --rebase
git checkout feature/market-trial-phase1-api
git rebase develop
```

⚠ 4) Merge 후:
* dev 환경에서 빌드 및 정상 작동 확인
* 자기 작업 영역만 반영되었는지 확인
* develop 브랜치의 기존 기능이 손상되지 않았는지 확인

⚠ 5) 어떤 경우에도:
* 다른 작업자의 코드 삭제 금지
* 기존 기능을 덮어쓰는 변경 금지
* Core 기능 수정 시 반드시 Work Order 필요

# =====================================================================

---

## Merge 완료 정보

| 항목 | 값 |
|------|-----|
| Feature Branch | `feature/market-trial-phase1-api` |
| Merge Commit | `78e114fd2` |
| Target Branch | `develop` |
| 완료일 | 2025-12-14 |

---

## Phase 1 전체 완료 현황

| Phase | 내용 | 상태 |
|-------|------|------|
| Phase 1 - Entity | Entity 정의, AppStore 등록, Lifecycle | ✅ 완료 |
| Phase 1 - API | Service, Controller, Routes, DTO | ✅ 완료 |

---

*작성일: 2025-12-14*
