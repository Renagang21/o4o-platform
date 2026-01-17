# WO-DIGITAL-SIGNAGE-PHASE2-EXECUTION-V1

> **Work Order**: Digital Signage Phase 2 실행 Work Order
> **Phase**: 2 (Production-Ready Build)
> **Version**: 1.0
> **Created**: 2026-01-17
> **Status**: Ready for Execution

---

## 1. 실행 개요

### 1.1 목표
Phase 1 아키텍처 설계를 기반으로 **Production-Ready Digital Signage Core App**을 구축한다.

### 1.2 범위
| 구분 | 항목 |
|------|------|
| TypeORM Entity | 12개 신규 Entity 생성 |
| Core API | 50+ REST Endpoints |
| Player | 오프라인 지원, 4가지 UI 모드 |
| Admin Dashboard | 플랫폼 관리 화면 |
| Store Dashboard | 매장별 운영 화면 |
| AI 연동 | 콘텐츠 자동 생성/추천 |

### 1.3 참조 문서
- [digital-signage-core-feature-spec-v1.md](./digital-signage-core-feature-spec-v1.md)
- [digital-signage-unified-entity-diagram-v0.1.md](./digital-signage-unified-entity-diagram-v0.1.md)
- [digital-signage-ux-flow-spec-v1.md](./digital-signage-ux-flow-spec-v1.md)
- [digital-signage-extension-boundaries-v1.md](./digital-signage-extension-boundaries-v1.md)
- [digital-signage-phase2-production-plan-v1.md](./digital-signage-phase2-production-plan-v1.md)

---

## 2. Sprint 실행 계획

### Sprint 2-1: Core Entity & Base API (Week 1-2)

#### 목표
TypeORM Entity 12개 생성 및 기본 CRUD API 구현

#### 작업 항목

| # | Task | 파일/위치 | DoD |
|---|------|----------|-----|
| 1 | SignagePlaylist Entity | `libs/cms-core/src/entities/signage/` | soft delete, versioning 포함 |
| 2 | SignagePlaylistItem Entity | 동일 | sortOrder, sourceType 포함 |
| 3 | SignageMedia Entity | 동일 | tags[], category 포함 |
| 4 | SignageSchedule Entity | 동일 | days_of_week[], priority 포함 |
| 5 | SignageTemplate Entity | 동일 | layoutConfig JSONB |
| 6 | SignageTemplateZone Entity | 동일 | zoneType enum |
| 7 | SignageLayoutPreset Entity | 동일 | presetData JSONB |
| 8 | SignageContentBlock Entity | 동일 | blockType, settings |
| 9 | SignageMediaTag Entity | 동일 | N:M 관계 |
| 10 | SignagePlaylistShare Entity | 동일 | 공유 추적 |
| 11 | SignageAiGenerationLog Entity | 동일 | AI 생성 이력 |
| 12 | SignageAnalytics Entity | 동일 | 집계 데이터 |
| 13 | Base Repository 패턴 | `libs/cms-core/src/repositories/` | Generic CRUD |
| 14 | Playlist CRUD API | `services/api/src/modules/signage/` | 5 endpoints |
| 15 | Media CRUD API | 동일 | 5 endpoints |

#### 완료 기준
- [ ] 12개 Entity TypeORM 정의 완료
- [ ] ESM 순환 참조 규칙 준수 (string relation)
- [ ] Migration 스크립트 생성
- [ ] 기본 CRUD 테스트 통과

---

### Sprint 2-2: Schedule & Channel API (Week 3-4)

#### 목표
스케줄 엔진 및 채널 관리 API 완성

#### 작업 항목

| # | Task | 파일/위치 | DoD |
|---|------|----------|-----|
| 1 | Schedule CRUD API | `services/api/src/modules/signage/` | 우선순위 충돌 검사 포함 |
| 2 | Schedule Resolution Engine | 동일 | 현재 시간 기준 playlist 결정 |
| 3 | Channel-Playlist Binding | 동일 | slotKey 또는 직접 binding |
| 4 | Channel Status API | 동일 | online/offline 판정 |
| 5 | Heartbeat 수신 API | 동일 | fire-and-forget 패턴 |
| 6 | PlaybackLog 수신 API | 동일 | 비동기 저장 |
| 7 | Channel Statistics API | 동일 | 일/주/월 집계 |

#### 완료 기준
- [ ] Schedule 우선순위 로직 테스트 통과
- [ ] 채널 상태 실시간 조회 가능
- [ ] Heartbeat 1000 req/s 처리 가능

---

### Sprint 2-3: Player Core Upgrade (Week 5-6)

#### 목표
Signage Player 오프라인 지원 및 4가지 UI 모드 구현

#### 작업 항목

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

#### 완료 기준
- [ ] 오프라인 상태에서 24시간 연속 재생 가능
- [ ] 4가지 모드 전환 테스트 통과
- [ ] 네트워크 복구 시 자동 동기화

---

### Sprint 2-4: Admin Dashboard (Week 7-8)

#### 목표
플랫폼 관리자용 Digital Signage 관리 화면 구축

#### 작업 항목

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

#### 완료 기준
- [ ] 모든 CRUD 화면 완성
- [ ] 드래그앤드롭 정렬 동작
- [ ] 실시간 채널 상태 표시

---

### Sprint 2-5: Store Dashboard (Week 9-10)

#### 목표
매장 운영자용 Signage 관리 화면 (Glycopharm Extension)

#### 작업 항목

| # | Task | 파일/위치 | DoD |
|---|------|----------|-----|
| 1 | My Signage Overview | `services/web-glycopharm/src/pages/signage/` | 내 채널 현황 |
| 2 | My Playlists Page | 동일 | 플레이리스트 관리 |
| 3 | Content Library Page | 동일 | 본사 제공 + 내 콘텐츠 |
| 4 | Quick Schedule Page | 동일 | 간편 스케줄 설정 |
| 5 | Preview & Test Page | 동일 | 실시간 미리보기 |
| 6 | Playlist Sharing Hub | 동일 | 커뮤니티 공유 |
| 7 | HQ Content Section | 동일 | 본사 필수 콘텐츠 표시 |

#### 완료 기준
- [ ] 매장별 데이터 격리 확인
- [ ] HQ 콘텐츠 강제 표시 동작
- [ ] 플레이리스트 공유 기능 동작

---

### Sprint 2-6: AI Content Integration (Week 11-12)

#### 목표
AI 기반 콘텐츠 자동 생성 및 추천 시스템

#### 작업 항목

| # | Task | 파일/위치 | DoD |
|---|------|----------|-----|
| 1 | AI Content Generator API | `services/api/src/modules/signage/ai/` | 프롬프트 기반 생성 |
| 2 | Seasonal Recommendation | 동일 | 계절/시간대 추천 |
| 3 | Performance-based Suggestion | 동일 | 재생 데이터 기반 |
| 4 | Auto-thumbnail Generator | 동일 | 비디오 썸네일 추출 |
| 5 | Content Optimization Tips | 동일 | AI 개선 제안 |
| 6 | Batch Generation Job | 동일 | 스케줄 기반 자동 생성 |

#### 완료 기준
- [ ] AI 콘텐츠 생성 API 동작
- [ ] 추천 알고리즘 정확도 70% 이상
- [ ] 자동 생성 로그 기록

---

### Sprint 2-7: Production Deployment (Week 13-14)

#### 목표
운영 환경 배포 및 안정화

#### 작업 항목

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

#### 완료 기준
- [ ] Production 배포 완료
- [ ] 데이터 이관 검증 완료
- [ ] 부하 테스트 통과
- [ ] 운영 문서 완성

---

## 3. Definition of Done (전체)

### 3.1 코드 품질
- [ ] TypeScript strict mode 통과
- [ ] ESLint 에러 0개
- [ ] 테스트 커버리지 80% 이상
- [ ] ESM 순환 참조 규칙 준수

### 3.2 기능 완성도
- [ ] 모든 CRUD API 동작
- [ ] 오프라인 재생 24시간 테스트 통과
- [ ] 멀티테넌트 격리 검증 완료
- [ ] AI 기능 통합 완료

### 3.3 운영 준비
- [ ] Production 배포 완료
- [ ] 모니터링 알림 설정 완료
- [ ] 운영 가이드 문서 완성
- [ ] 롤백 절차 문서화

---

## 4. 리스크 및 대응

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|----------|
| TypeORM ESM 이슈 | 높음 | string relation 패턴 엄격 적용 |
| 오프라인 동기화 충돌 | 중간 | Last-Write-Wins + 충돌 로그 |
| AI API 비용 | 중간 | 일일 한도 설정, 캐싱 |
| 대용량 미디어 처리 | 중간 | CDN + 청크 업로드 |

---

## 5. 커뮤니케이션

### 5.1 진행 보고
- **일일**: Slack 채널에 완료 Task 공유
- **주간**: Sprint 진행률 리포트
- **Sprint 종료**: Demo + 회고

### 5.2 이슈 에스컬레이션
- **기술 이슈**: 즉시 Slack 공유
- **일정 지연**: 1일 이상 지연 시 즉시 보고
- **아키텍처 변경**: 승인 후 진행

---

## 6. 승인

| 역할 | 이름 | 승인일 |
|------|------|--------|
| Tech Lead | | |
| Product Owner | | |
| DevOps | | |

---

**Document Version**: 1.0
**Created**: 2026-01-17
**Status**: Ready for Execution
