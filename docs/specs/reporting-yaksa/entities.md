# Reporting-Yaksa Entities

> 신상신고 시스템 데이터 모델

---

## AnnualReport

연간 신상신고서 엔티티

```typescript
interface AnnualReport {
  id: string;                    // UUID
  memberId: string;              // 회원 ID (yaksa_members FK)
  organizationId: string;        // 조직 ID
  templateId: string;            // 템플릿 ID
  year: number;                  // 신고 연도
  status: ReportStatus;          // draft | submitted | approved | rejected | revision_requested
  fields: Record<string, any>;   // 동적 필드 데이터 (JSON)
  submittedAt?: Date;            // 제출 일시
  approvedAt?: Date;             // 승인 일시
  rejectedAt?: Date;             // 반려 일시
  rejectionReason?: string;      // 반려 사유
  revisionReason?: string;       // 수정 요청 사유
  approvedBy?: string;           // 승인자 ID
  syncedAt?: Date;               // 동기화 일시
  syncStatus: SyncStatus;        // pending | synced | skipped | failed
  createdAt: Date;
  updatedAt: Date;
}

type ReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'revision_requested';
type SyncStatus = 'pending' | 'synced' | 'skipped' | 'failed';
```

### Indexes

- `memberId, year` (UNIQUE) - 회원당 연도별 1개 신고서
- `organizationId, year, status` - 관리자 조회용
- `status, syncStatus` - 동기화 대상 조회용

---

## ReportFieldTemplate

연도별 신고서 필드 템플릿

```typescript
interface ReportFieldTemplate {
  id: string;                       // UUID
  organizationId: string;           // 조직 ID
  year: number;                     // 적용 연도
  name: string;                     // 템플릿 이름
  description?: string;             // 설명
  fields: ReportFieldDefinition[];  // 필드 정의 (JSON)
  isActive: boolean;                // 활성 여부
  createdAt: Date;
  updatedAt: Date;
}

interface ReportFieldDefinition {
  key: string;                      // 필드 키
  label: string;                    // 표시 이름
  type: FieldType;                  // text | number | date | select | checkbox | file
  required: boolean;                // 필수 여부
  defaultValue?: any;               // 기본값
  options?: string[];               // select용 옵션
  validation?: {                    // 검증 규칙
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  syncToMembership: boolean;        // membership-yaksa 동기화 대상
  membershipField?: string;         // 대응 membership 필드명
  order: number;                    // 표시 순서
  section?: string;                 // 섹션 그룹
}

type FieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea' | 'file';
```

### Indexes

- `organizationId, year` (UNIQUE per active) - 연도별 활성 템플릿
- `isActive` - 활성 템플릿 조회

---

## ReportLog

신고서 활동 로그 (감사)

```typescript
interface ReportLog {
  id: string;                 // UUID
  reportId: string;           // 신고서 ID
  action: ReportLogAction;    // 액션 유형
  actorId: string;            // 수행자 ID
  actorName: string;          // 수행자 이름
  actorRole?: string;         // 수행자 역할
  details?: Record<string, any>; // 상세 정보 (JSON)
  previousStatus?: string;    // 이전 상태
  newStatus?: string;         // 새 상태
  ipAddress?: string;         // IP 주소
  createdAt: Date;
}

type ReportLogAction =
  | 'created'
  | 'updated'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'revision_requested'
  | 'synced'
  | 'sync_failed';
```

### Indexes

- `reportId, createdAt` - 신고서별 로그 조회

---

## ReportAssignment

승인 담당자 지정 (다단계 승인용)

```typescript
interface ReportAssignment {
  id: string;                 // UUID
  reportId: string;           // 신고서 ID
  assigneeId: string;         // 담당자 ID
  role: AssignmentRole;       // 역할
  status: AssignmentStatus;   // 상태
  assignedAt: Date;           // 지정 일시
  completedAt?: Date;         // 처리 일시
  comment?: string;           // 코멘트
}

type AssignmentRole = 'branch_admin' | 'district_admin' | 'national_admin';
type AssignmentStatus = 'pending' | 'approved' | 'rejected';
```

### Indexes

- `reportId, role` - 신고서별 역할 조회
- `assigneeId, status` - 담당자 대기 목록

---

## ER Diagram

```
┌─────────────────────┐     ┌──────────────────────┐
│   AnnualReport      │     │  ReportFieldTemplate │
├─────────────────────┤     ├──────────────────────┤
│ id                  │────▶│ id                   │
│ memberId            │     │ organizationId       │
│ organizationId      │     │ year                 │
│ templateId ─────────│     │ fields (JSON)        │
│ year                │     │ isActive             │
│ status              │     └──────────────────────┘
│ fields (JSON)       │
│ syncStatus          │
└─────────────────────┘
         │
         │ 1:N
         ▼
┌─────────────────────┐     ┌──────────────────────┐
│    ReportLog        │     │  ReportAssignment    │
├─────────────────────┤     ├──────────────────────┤
│ id                  │     │ id                   │
│ reportId ◀──────────│     │ reportId ◀───────────│
│ action              │     │ assigneeId           │
│ actorId             │     │ role                 │
│ details (JSON)      │     │ status               │
└─────────────────────┘     └──────────────────────┘
```

---

*최종 업데이트: 2025-12-10*
