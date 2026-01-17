# WO-DIGITAL-SIGNAGE-PHASE2-EXECUTION-V1

> **Work Order**: Digital Signage Core App – Production Build 실행 작업 요청서
> **Phase**: 2 (Production-Ready Build)
> **Version**: 1.1
> **Created**: 2026-01-17
> **Status**: Ready for Execution

---

## 1. 목적

본 Work Order는 Phase 1 아키텍처 설계를 기반으로,
Digital Signage Core App을 **즉시 실서비스 가능한 형태로 개발**하기 위한
정식 "실행 지시서(Execution Order)"이다.

### 1.1 목표
- Core API 100% 구현
- 12개 Entity Production-level 구현
- Player 24/7 운영 안정성 확보
- Admin 및 Store UI 완성
- AI 콘텐츠 기본 기능 통합
- 확장앱(약국·화장품·관광·판매자)이 붙을 수 있는 Core 완성

### 1.2 범위 요약

| 구분 | 항목 |
|------|------|
| TypeORM Entity | 12개 신규 Entity 생성 |
| Core API | 50+ REST Endpoints |
| Player | 오프라인 지원, 4가지 UI 모드 |
| Admin Dashboard | 플랫폼 관리 화면 (20+ 페이지) |
| Store Dashboard | 매장별 운영 화면 |
| AI 연동 | 콘텐츠 자동 생성/추천 (5종) |
| 인프라 | Cloud Run + Storage + BigQuery |

### 1.3 참조 문서
- [digital-signage-core-feature-spec-v1.md](./digital-signage-core-feature-spec-v1.md)
- [digital-signage-unified-entity-diagram-v0.1.md](./digital-signage-unified-entity-diagram-v0.1.md)
- [digital-signage-ux-flow-spec-v1.md](./digital-signage-ux-flow-spec-v1.md)
- [digital-signage-extension-boundaries-v1.md](./digital-signage-extension-boundaries-v1.md)
- [digital-signage-phase2-production-plan-v1.md](./digital-signage-phase2-production-plan-v1.md)

---

## 2. 작업 범위 (Execution Scope)

### 2.A TypeORM Entity 구현 (12개 전부)

**요구사항:**
- Production 요구사항(Soft Delete, Versioning, Multi-tenant, Index) 포함
- 기존 Glycopharm 엔티티 폐기 및 대체
- Migration 파일 생성 및 테스트
- 개발 및 스테이징 환경 DB와 연동 테스트

**Entity 목록:**

| # | Entity | 위치 | 특이사항 |
|---|--------|------|----------|
| 1 | SignagePlaylist | `libs/cms-core/src/entities/signage/` | soft delete, versioning |
| 2 | SignagePlaylistItem | 동일 | sortOrder, sourceType |
| 3 | SignageMedia | 동일 | tags[], category |
| 4 | SignageSchedule | 동일 | days_of_week[], priority |
| 5 | SignageTemplate | 동일 | layoutConfig JSONB |
| 6 | SignageTemplateZone | 동일 | zoneType enum |
| 7 | SignageLayoutPreset | 동일 | presetData JSONB |
| 8 | SignageContentBlock | 동일 | blockType, settings |
| 9 | SignageMediaTag | 동일 | N:M 관계 |
| 10 | SignagePlaylistShare | 동일 | 공유 추적 |
| 11 | SignageAiGenerationLog | 동일 | AI 생성 이력 |
| 12 | SignageAnalytics | 동일 | 집계 데이터 |

**완료 기준:**
- [ ] 모든 엔티티 책임 정의 반영
- [ ] 관계(1:N, N:N, FK) 정확히 연결
- [ ] ESM 순환 참조 규칙 준수 (string relation)
- [ ] DDL 검증 완료

---

### 2.B Core API 전체 구현

**API 규모:** 약 50개 이상의 엔드포인트

**구현 항목:**
- Channel API (CRUD + Status)
- Playlist API (CRUD + Reorder)
- Schedule API (CRUD + Resolution Engine)
- Media API (CRUD + Upload + YouTube)
- Template API (CRUD + Zone Management)
- Analytics API (Playback Stats + Device Health)
- Device Registration / Heartbeat / Playback Logging

**완료 기준:**
- [ ] 모든 엔드포인트 동작
- [ ] Swagger/OpenAPI 문서 생성
- [ ] RBAC(Role) 기반 권한 검증 완료
- [ ] 단위 테스트 80% 이상

---

### 2.C Player Production 업그레이드

**업무 항목:**
- 오프라인 캐싱 (IndexedDB 기반)
- 자동 복구 / 에러 폴백
- Heartbeat 주기 설정 (30초)
- Playback 로그 전송 안정화 (배치)
- Zero-UI / Minimal / Interactive / Preview 모드 분리
- 로컬 스토리지 기반 캐싱 엔진 구축
- Preload(Next-3) 기능 구현

**완료 기준:**
- [ ] 24시간 무중단 테스트 통과
- [ ] 메모리 누수 없음
- [ ] 플레이 중 오류율 0.1% 이하

---

### 2.D Admin Dashboard 개발

**업무 항목:**
- 대시보드 홈 (장치 상태, 재생 통계)
- 채널 관리 CRUD
- 플레이리스트 편집기 (D&D)
- 스케줄 캘린더 뷰
- 콘텐츠 라이브러리
- 템플릿 관리
- Analytics UI (Playback, Device Health)
- 시스템 설정

**완료 기준:**
- [ ] 관리자 모든 엔드포인트 대응
- [ ] AGTable / Slate Theme 적용
- [ ] 최소 20개 이상의 정식 페이지 완성

---

### 2.E Store Dashboard (매장 운영자용)

**업무 항목:**
- 내 장치 관리
- 플레이리스트 구성
- 미디어 업로드
- 공급자 콘텐츠 승인/거부
- 스케줄 구성
- 미리보기 Player
- HQ 콘텐츠 섹션 (본사 필수 콘텐츠)

**완료 기준:**
- [ ] 매장에서 실제 운영 가능한 흐름 완성
- [ ] API → UI 완전 연동
- [ ] 매장별 데이터 격리 확인

---

### 2.F AI 콘텐츠 기능 통합

**업무 항목:**
- 배너 자동 생성
- 프로모션 카드 생성
- 이미지 리사이징
- 텍스트 자동 배치
- 매장별 추천 콘텐츠

**완료 기준:**
- [ ] AI 1차 기능 5종 동작
- [ ] 템플릿과 연동 가능
- [ ] 자동 생성 로그 기록

---

### 2.G 배포/운영 환경 구축

**업무 항목:**
- Cloud Run 서비스 4종 구성
- Storage 버킷 구조 생성
- CI/CD 자동 배포 파이프라인
- BigQuery 로깅 파이프라인
- 운영 대시보드 구축

**완료 기준:**
- [ ] Dev → Staging → Production 자동 배포
- [ ] Heartbeat/Playback 대시보드 실시간 표시

---

## 3. Sprint 실행 계획

### Sprint 2-1: Core Entity & Base API (Week 1-2)

| # | Task | 파일/위치 | DoD |
|---|------|----------|-----|
| 1-12 | 12개 Entity 구현 | `libs/cms-core/src/entities/signage/` | soft delete, versioning 포함 |
| 13 | Base Repository 패턴 | `libs/cms-core/src/repositories/` | Generic CRUD |
| 14 | Playlist CRUD API | `services/api/src/modules/signage/` | 5 endpoints |
| 15 | Media CRUD API | 동일 | 5 endpoints |
| 16 | Migration 스크립트 | `libs/cms-core/src/migrations/` | 12개 테이블 |

**완료 기준:**
- [ ] 12개 Entity TypeORM 정의 완료
- [ ] ESM 순환 참조 규칙 준수 (string relation)
- [ ] Migration 스크립트 생성
- [ ] 기본 CRUD 테스트 통과

---

### Sprint 2-2: Schedule & Channel API (Week 3-4)

| # | Task | 파일/위치 | DoD |
|---|------|----------|-----|
| 1 | Schedule CRUD API | `services/api/src/modules/signage/` | 우선순위 충돌 검사 포함 |
| 2 | Schedule Resolution Engine | 동일 | 현재 시간 기준 playlist 결정 |
| 3 | Channel-Playlist Binding | 동일 | slotKey 또는 직접 binding |
| 4 | Channel Status API | 동일 | online/offline 판정 |
| 5 | Heartbeat 수신 API | 동일 | fire-and-forget 패턴 |
| 6 | PlaybackLog 수신 API | 동일 | 비동기 저장 |
| 7 | Channel Statistics API | 동일 | 일/주/월 집계 |

**완료 기준:**
- [ ] Schedule 우선순위 로직 테스트 통과
- [ ] 채널 상태 실시간 조회 가능
- [ ] Heartbeat 1000 req/s 처리 가능

---

### Sprint 2-3: Media & Template API (Week 5-6)

| # | Task | 파일/위치 | DoD |
|---|------|----------|-----|
| 1 | Media Upload API | `services/api/src/modules/signage/` | 청크 업로드 |
| 2 | YouTube/Vimeo 연동 | 동일 | embed ID 추출 |
| 3 | Template CRUD API | 동일 | layoutConfig 저장 |
| 4 | Template Zone API | 동일 | 영역 관리 |
| 5 | Analytics API | 동일 | 재생 통계 집계 |

**완료 기준:**
- [ ] 대용량 파일 업로드 테스트 통과
- [ ] YouTube 썸네일 자동 추출
- [ ] Template 레이아웃 저장/조회 동작

---

### Sprint 2-4: Player Core Upgrade (Week 7-8)

| # | Task | 파일/위치 | DoD |
|---|------|----------|-----|
| 1 | PlayerConfigProvider | `services/signage-player-web/src/` | 4가지 모드 지원 |
| 2 | Zero-UI Mode | 동일 | 전체화면 자동재생 |
| 3 | Minimal Mode | 동일 | 진행바 + 다음 콘텐츠 표시 |
| 4 | Interactive Mode | 동일 | 터치 네비게이션 |
| 5 | Preview Mode | 동일 | 관리자 미리보기 |
| 6 | Offline Cache Manager | 동일 | IndexedDB 기반 |
| 7 | Stale-While-Revalidate | 동일 | 캐시 우선 전략 |
| 8 | Heartbeat Reporter | 동일 | 30초 간격 |
| 9 | PlaybackLog Reporter | 동일 | 배치 전송 |
| 10 | Error Recovery | 동일 | 자동 재시도 로직 |

**완료 기준:**
- [ ] 오프라인 상태에서 24시간 연속 재생 가능
- [ ] 4가지 모드 전환 테스트 통과
- [ ] 네트워크 복구 시 자동 동기화

---

### Sprint 2-5: Admin Dashboard (Week 9-10)

| # | Task | 파일/위치 | DoD |
|---|------|----------|-----|
| 1 | Signage Overview Page | `services/web-admin/src/pages/signage/` | 전체 현황 대시보드 |
| 2 | Channel Management Page | 동일 | CRUD + 상태 모니터링 |
| 3 | Playlist Management Page | 동일 | 드래그앤드롭 정렬 |
| 4 | Media Library Page | 동일 | 업로드 + YouTube 연동 |
| 5 | Schedule Management Page | 동일 | 캘린더 뷰 |
| 6 | Template Editor Page | 동일 | 레이아웃 편집기 |
| 7 | Analytics Dashboard | 동일 | 재생 통계 차트 |
| 8 | Service Config Page | 동일 | 서비스별 설정 |

**완료 기준:**
- [ ] 모든 CRUD 화면 완성
- [ ] 드래그앤드롭 정렬 동작
- [ ] 실시간 채널 상태 표시

---

### Sprint 2-6: Store Dashboard + AI (Week 11-12)

| # | Task | 파일/위치 | DoD |
|---|------|----------|-----|
| 1 | My Signage Overview | `services/web-glycopharm/src/pages/signage/` | 내 채널 현황 |
| 2 | My Playlists Page | 동일 | 플레이리스트 관리 |
| 3 | Content Library Page | 동일 | 본사 제공 + 내 콘텐츠 |
| 4 | Quick Schedule Page | 동일 | 간편 스케줄 설정 |
| 5 | Preview & Test Page | 동일 | 실시간 미리보기 |
| 6 | AI Content Generator API | `services/api/src/modules/signage/ai/` | 프롬프트 기반 생성 |
| 7 | Seasonal Recommendation | 동일 | 계절/시간대 추천 |
| 8 | Auto-thumbnail Generator | 동일 | 비디오 썸네일 추출 |

**완료 기준:**
- [ ] 매장별 데이터 격리 확인
- [ ] HQ 콘텐츠 강제 표시 동작
- [ ] AI 콘텐츠 생성 API 동작

---

### Sprint 2-7: Production Deployment (Week 13-14)

| # | Task | 파일/위치 | DoD |
|---|------|----------|-----|
| 1 | Production Migration | Supabase | 12개 테이블 생성 |
| 2 | Data Migration Script | `scripts/` | Glycopharm 데이터 이관 |
| 3 | Cloud Run 배포 | GCP | signage-player-web 배포 |
| 4 | CDN 설정 | Cloudflare | 미디어 캐싱 |
| 5 | Monitoring 설정 | Cloud Monitoring | 알림 규칙 |
| 6 | Load Testing | k6 | 1000 동시접속 테스트 |
| 7 | Documentation | `docs/` | 운영 가이드 |
| 8 | Rollback Plan | `docs/` | 장애 대응 절차 |
| 9 | 파일럿 매장 테스트 | - | 실제 매장 1곳 |

**완료 기준:**
- [ ] Production 배포 완료
- [ ] 데이터 이관 검증 완료
- [ ] 부하 테스트 통과
- [ ] 운영 문서 완성
- [ ] 파일럿 매장 성공

---

## 4. Definition of Done (전체)

### 4.1 기능 기준
- [ ] Server API 100% 구현
- [ ] Player 안정성 보장 (24시간 무중단)
- [ ] Admin/Store UI 완전 구현

### 4.2 품질 기준
- [ ] TypeScript strict mode 통과
- [ ] ESLint 에러 0개
- [ ] Unit Test Coverage ≥ 80%
- [ ] ESM 순환 참조 규칙 준수
- [ ] API p95 응답 200ms 이하
- [ ] 재생 오류율 < 0.1%
- [ ] 보안: 인증·권한 완전 적용

### 4.3 운영 기준
- [ ] Cloud Run + Cloud Storage + BigQuery 완전 구축
- [ ] Monitoring + Alerting 활성
- [ ] Production 배포 완료
- [ ] 운영 가이드 문서 완성
- [ ] 롤백 절차 문서화
- [ ] 실제 매장 1곳에서 파일럿 성공

---

## 5. 리스크 및 대응

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|----------|
| TypeORM ESM 이슈 | 높음 | string relation 패턴 엄격 적용 |
| 오프라인 동기화 충돌 | 중간 | Last-Write-Wins + 충돌 로그 |
| AI API 비용 | 중간 | 일일 한도 설정, 캐싱 |
| 대용량 미디어 처리 | 중간 | CDN + 청크 업로드 |

---

## 6. 커뮤니케이션

### 6.1 진행 보고
- **일일**: Slack 채널에 완료 Task 공유
- **주간**: Sprint 진행률 리포트
- **Sprint 종료**: Demo + 회고

### 6.2 이슈 에스컬레이션
- **기술 이슈**: 즉시 Slack 공유
- **일정 지연**: 1일 이상 지연 시 즉시 보고
- **아키텍처 변경**: 승인 후 진행

---

## 7. 실행 지시

본 Work Order는 Digital Signage Core App 개발팀에게
Phase 2의 **정식 실행 지시**로 활용한다.

### 즉시 착수 항목:
- ✔ Sprint 2-1 시작
- ✔ 12개 Entity 구현 착수
- ✔ Migration 스크립트 작성

---

## 8. 승인

| 역할 | 이름 | 승인일 |
|------|------|--------|
| Tech Lead | | |
| Product Owner | | |
| DevOps | | |

---

**Document Version**: 1.1
**Created**: 2026-01-17
**Updated**: 2026-01-17
**Status**: Ready for Execution
