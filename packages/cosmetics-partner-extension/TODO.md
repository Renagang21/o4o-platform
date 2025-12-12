# Cosmetics Partner Extension - TODO

## Phase 6-A: 기본 구현 완료

### Completed Tasks

- [x] **STEP 0**: 패키지 구조 생성
  - `packages/cosmetics-partner-extension/` 생성
  - package.json, tsconfig.json 설정

- [x] **STEP 1**: manifest.ts 작성
  - appId: `cosmetics-partner-extension`
  - type: `extension`
  - dependencies: `dropshipping-core`, `dropshipping-cosmetics`
  - Admin menus: Dashboard, Links, Routines, Earnings

- [x] **STEP 2**: Entity 정의
  - `PartnerProfile`: 파트너 프로필 (추천 코드, 상태, 통계)
  - `PartnerLink`: 추천 링크 (클릭/전환 추적)
  - `PartnerRoutine`: 루틴 (스킨케어 제품 조합)
  - `PartnerEarnings`: 수익 (커미션, 보너스, 출금)

- [x] **STEP 3**: Service 구현
  - `PartnerProfileService`: 프로필 CRUD, 추천 코드 생성
  - `PartnerLinkService`: 링크 생성, 클릭/전환 추적
  - `PartnerRoutineService`: 루틴 CRUD, 발행/비발행
  - `PartnerEarningsService`: 수익 기록, 정산, 출금

- [x] **STEP 4**: Controller 구현
  - Profile, Link, Routine, Earnings 각각 REST API

- [x] **STEP 5**: Routes 등록
  - `/api/v1/cosmetics-partner/*` 라우트

- [x] **STEP 6**: Frontend Skeleton
  - `PartnerDashboard.tsx`
  - `PartnerLinksPage.tsx`
  - `PartnerRoutinesPage.tsx`
  - `PartnerEarningsPage.tsx`
  - Shortcodes 4개

- [x] **STEP 7**: Lifecycle Hooks
  - install, activate, deactivate, uninstall

- [x] **STEP 8**: 타입 체크 통과

---

## Remaining Tasks (후속 Phase)

### Phase 6-B: Admin Dashboard 통합

- [ ] AdminService에 cosmetics-partner-extension 등록
- [ ] Admin Dashboard 메뉴 활성화
- [ ] 파트너 관리 페이지 (관리자용)

### Phase 6-C: API 통합 및 테스트

- [ ] api-server의 ModuleLoader에 등록
- [ ] Routes 실제 연결
- [ ] Postman/API 테스트

### Phase 6-D: Commission System 확장

- [ ] 상품별/브랜드별 커미션 설정
- [ ] 캠페인별 특별 커미션
- [ ] 정산 자동화

### Phase 6-E: Frontend 완성

- [ ] React Query/SWR 데이터 연동
- [ ] 실시간 통계 차트
- [ ] 링크 생성 UI 위저드
- [ ] 루틴 편집기 (Drag & Drop)

### Phase 6-F: 인플루언서 기능

- [ ] 팔로워 시스템
- [ ] 인플루언서 랭킹
- [ ] 브랜드 협업 요청

---

## API Endpoints Summary

### Profile
- `POST /api/v1/cosmetics-partner/profile` - 프로필 생성
- `GET /api/v1/cosmetics-partner/profile/me` - 내 프로필
- `PUT /api/v1/cosmetics-partner/profile` - 프로필 수정
- `GET /api/v1/cosmetics-partner/profiles` - 목록 (관리자)

### Links
- `POST /api/v1/cosmetics-partner/links` - 링크 생성
- `GET /api/v1/cosmetics-partner/links` - 내 링크 목록
- `GET /api/v1/cosmetics-partner/links/stats` - 링크 통계
- `POST /api/v1/cosmetics-partner/links/:id/click` - 클릭 추적
- `POST /api/v1/cosmetics-partner/links/:id/convert` - 전환 기록

### Routines
- `POST /api/v1/cosmetics-partner/routines` - 루틴 생성
- `GET /api/v1/cosmetics-partner/routines` - 내 루틴 목록
- `GET /api/v1/cosmetics-partner/routines/public` - 공개 루틴
- `POST /api/v1/cosmetics-partner/routines/:id/publish` - 발행

### Earnings
- `GET /api/v1/cosmetics-partner/earnings` - 수익 목록
- `GET /api/v1/cosmetics-partner/earnings/summary` - 수익 요약
- `POST /api/v1/cosmetics-partner/earnings/withdraw` - 출금 요청

---

*Last Updated: 2025-12-12*
