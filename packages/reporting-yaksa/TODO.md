# Reporting-Yaksa – Development TODO

> 최종 업데이트: 2025-12-10
> 담당: Claude Code Agent

---

## Current Phase: Backend Completion

### Pending

- [ ] Add createRoutes function (standard backend export)
- [ ] Add migration files for entities
- [ ] Add unit tests for services
- [ ] Implement notification hooks (onReportSubmitted, onReportApproved)

### In Progress

- [ ] Manifest standardization (CLAUDE.md compliance)

### Completed (이번 Phase)

- [x] Entity 설계 및 구현 (AnnualReport, ReportFieldTemplate, ReportLog, ReportAssignment)
- [x] AnnualReportService 구현 (CRUD, workflow, logging)
- [x] ReportTemplateService 구현
- [x] MembershipSyncService 구현 (preview, sync)
- [x] Controller 구현 (AnnualReportController, ReportTemplateController)
- [x] Route 정의 (memberReportRoutes, adminReportRoutes)
- [x] Lifecycle hooks 기본 구현 (install, activate, deactivate, uninstall)

---

## Future Phases

### Phase 2: Admin UI

- [ ] ReportingDashboard 컴포넌트
- [ ] ReportList 컴포넌트 (필터, 검색, 페이지네이션)
- [ ] ReportDetail 컴포넌트 (승인/반려/수정요청 액션)
- [ ] TemplateList 컴포넌트
- [ ] TemplateEditor 컴포넌트 (동적 필드 설정)

### Phase 3: Member UI

- [ ] 회원용 신고서 작성 폼
- [ ] 회원용 신고서 목록/상세
- [ ] 신고서 제출 확인 다이얼로그

### Phase 4: Integration & Notifications

- [ ] Membership-Yaksa 자동 동기화 완전 구현
- [ ] 이메일/SMS 알림 연동
- [ ] 마감일 리마인더 스케줄러

---

## Reference Documents

| Document | Path |
|----------|------|
| App Spec | `docs/specs/reporting-yaksa/` |
| Manifest Guide | `docs/app-guidelines/manifest-specification.md` |
| Backend Guide | `docs/app-guidelines/backend-structure.md` |
| Extension Guide | `docs/app-guidelines/extension-app-guideline.md` |

---

## Notes

- 완료된 항목은 문서(specs/design/guidelines)에 반영 후 TODO에서 제거
- 복잡한 설명은 TODO에 넣지 않음 (항상 단문 유지)
- 이 TODO는 항상 "현재 다음 단계"만 유지

---

*이 파일은 `docs/templates/APP_TODO_TEMPLATE.md`에서 복사하여 사용*
