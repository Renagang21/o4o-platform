# P1 Phase B Work Order: Enrollment Notifications & UX Enhancement

**Project:** O4O Platform - User & Role System Enhancement (P1)
**Phase:** P1-B (Enrollment Notifications & UX Enhancement)
**Created:** 2025-11-09
**Status:** 📋 Ready for Implementation
**Estimated Duration:** 2-3 days
**Prerequisites:** P1-A (Permission-Based RBAC) Complete

---

## 🎯 Objective

Transform the enrollment workflow into a **notification-driven, user-friendly experience** by:
1. Implementing **email notifications** for all enrollment state transitions
2. Adding **status reason tracking** (hold/reject reasons, reapplication rules)
3. Enhancing **user status pages** with actionable guidance
4. Improving **admin review UX** with reason input modals
5. Ensuring **immediate session sync** after approval

---

## 🧱 Scope

### In Scope

| Component | Description |
|-----------|-------------|
| **Notification Channels** | Email (required), In-app notifications (schema prep only) |
| **Events** | Application created, held, approved, rejected (4 state transitions) |
| **User Experience** | Status page enhancements, reapplication workflow, approval confirmation |
| **Admin Experience** | Reason input modals, status transition confirmations, notification triggers |
| **Permission Integration** | Only users with `enrollment.approve/reject/hold` can trigger transitions |

### Out of Scope

- SMS/Push notifications (future)
- Real-time WebSocket updates (future)
- Bulk approval operations (Phase D)
- Advanced notification preferences (future)

---

## 📋 Policy & Rules

### Notification Rules

| Event | Trigger | Content | Recipient |
|-------|---------|---------|-----------|
| **Created** | User submits application | "Application received" + Expected processing time | Applicant |
| **On Hold** | Admin puts on hold | "Additional information required" + Specific requests | Applicant |
| **Approved** | Admin approves | "Application approved" + Dashboard access link | Applicant |
| **Rejected** | Admin rejects | "Application rejected" + Reason + Reapplication date | Applicant |

### Reapplication Rules (Cooldown)

- **Default cooldown:** 24 hours after rejection
- **Configurable:** Via admin settings (future enhancement)
- **Enforcement:** API returns 409 if attempting to reapply during cooldown
- **Display:** Countdown timer on status page

### Duplicate Prevention

- **Rule:** Cannot apply for the same role if `PENDING` or `APPROVED` enrollment exists
- **Response:** 409 error with link to existing application status page

---

## 🔑 Permissions

### Required Permissions

| Action | Permission | Description |
|--------|------------|-------------|
| View own enrollments | `enrollment.read` | User can view their own applications |
| List all enrollments | `enrollment.list` | Admin can view all applications |
| Approve enrollment | `enrollment.approve` | Admin can approve applications |
| Reject enrollment | `enrollment.reject` | Admin can reject applications |
| Hold enrollment | `enrollment.hold` | Admin can put applications on hold |

### Optional (Future)

- `notification.list` - View notification history
- `notification.read` - Read specific notification
- `notification.admin` - Manage notification settings

---

## 📊 Data Changes (Conceptual)

### Notification Storage (Optional)

**Entity:** `notifications` (for future in-app notification center)

```typescript
interface Notification {
  id: string;
  type: 'enrollment_created' | 'enrollment_held' | 'enrollment_approved' | 'enrollment_rejected';
  status: 'pending' | 'sent' | 'failed';
  recipient_id: string;
  actor_id?: string;  // Admin who triggered
  message: string;
  metadata: Record<string, any>;
  created_at: Date;
  sent_at?: Date;
}
```

### State Transition Metadata

**Enhanced `role_enrollments` table:**

```typescript
interface RoleEnrollment {
  // ... existing fields

  // Hold metadata
  hold_reason?: string;
  hold_requested_fields?: string[];  // e.g., ["business_license", "tax_id"]

  // Rejection metadata
  rejection_reason?: string;
  reapply_after_at?: Date;  // Cooldown enforcement

  // Approval metadata
  approval_notes?: string;
}
```

### /me Response Enhancement

**After approval, `/me` should immediately reflect new assignment:**

```typescript
GET /api/v1/auth/cookie/me

Response:
{
  "user": { ... },
  "assignments": [
    {
      "role": "supplier",
      "active": true,
      "activated_at": "2025-11-09T10:00:00Z",  // Just approved
      ...
    }
  ],
  "capabilities": ["product.create", "product.edit", ...]  // New permissions
}
```

---

## 🎨 UX Requirements

### User Experience

#### 1. Application Created

**Screen:** Status page (`/apply/status/:id`)

**Display:**
- ✅ "Application Received" badge
- 📧 "Confirmation email sent to {email}"
- ⏰ "Expected review time: 1-3 business days"
- 📞 "Questions? Contact support@neture.co.kr"

#### 2. Application On Hold

**Screen:** Status page with "Action Required" section

**Display:**
- ⚠️ "Additional Information Required" badge (yellow)
- 📋 **Requested Fields List:**
  - "Business Registration Certificate (사업자등록증)"
  - "Tax ID Verification"
  - Upload buttons / file input
- 💬 Hold reason from admin
- 📧 "Email notification sent"
- 🔄 "Resubmit" button after upload

#### 3. Application Approved

**Screen:** Status page + global UI update

**Display:**
- ✅ "Application Approved!" banner (green)
- 🎉 Celebration message
- 🚀 **Primary CTA:** "Go to Dashboard →"
- 📧 "Approval email sent with access instructions"
- ⚡ **Immediate updates:**
  - Global menu shows new role dashboard link
  - User avatar shows new role badge (if applicable)
  - `/me` returns new assignments + capabilities

#### 4. Application Rejected

**Screen:** Status page with reapplication guidance

**Display:**
- ❌ "Application Rejected" badge (red)
- 📄 **Rejection reason** (from admin)
- ⏰ **Reapplication countdown:**
  - "You can reapply in: 23 hours 15 minutes"
  - Disabled "Reapply" button until cooldown expires
- 💡 **Improvement tips:**
  - "Common reasons for rejection:"
  - Link to application guidelines
- 📧 "Rejection notice sent to your email"

### Admin Experience

#### 1. Review Screen Enhancements

**Screen:** Admin enrollment list (`/admin/enrollments`)

**Features:**
- **Status filters:** Pending / Approved / Rejected / On Hold (preset tabs)
- **Date range filter:** Last 7 days / 30 days / Custom
- **Role filter:** Supplier / Seller / Partner
- **Bulk actions (Phase D):** Select multiple → Approve/Reject

#### 2. Transition Action Modals

**When admin clicks "Approve" / "Hold" / "Reject":**

**Approve Modal:**
```
┌─────────────────────────────────────┐
│ Approve Application?                │
│                                     │
│ User: alice@example.com             │
│ Role: Supplier                      │
│                                     │
│ [Optional] Approval Notes:          │
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ✅ Send approval email              │
│ ✅ Grant supplier permissions       │
│ ✅ Create role assignment           │
│                                     │
│ [Cancel]  [Approve & Notify] ←─────│
└─────────────────────────────────────┘
```

**Hold Modal:**
```
┌─────────────────────────────────────┐
│ Put Application On Hold?            │
│                                     │
│ User: bob@example.com               │
│ Role: Seller                        │
│                                     │
│ ⚠️ Reason (required):               │
│ ┌─────────────────────────────────┐ │
│ │ Missing business license        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Requested fields (optional):        │
│ ☑ Business Registration Certificate│
│ ☐ Tax ID Document                  │
│ ☐ Bank Account Verification        │
│                                     │
│ ✅ Send hold notification email     │
│                                     │
│ [Cancel]  [Put On Hold] ←──────────│
└─────────────────────────────────────┘
```

**Reject Modal:**
```
┌─────────────────────────────────────┐
│ Reject Application?                 │
│                                     │
│ User: charlie@example.com           │
│ Role: Partner                       │
│                                     │
│ ⚠️ Reason (required):               │
│ ┌─────────────────────────────────┐ │
│ │ Insufficient follower count     │ │
│ │ (minimum 10,000 required)       │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Reapplication cooldown:             │
│ ○ 24 hours (default)                │
│ ○ 7 days                            │
│ ○ 30 days                           │
│ ○ Permanent (no reapplication)     │
│                                     │
│ ✅ Send rejection notification      │
│                                     │
│ [Cancel]  [Reject] ←───────────────│
└─────────────────────────────────────┘
```

#### 3. Post-Transition Feedback

**After successful transition:**

```
┌─────────────────────────────────────┐
│ ✅ Application approved!            │
│                                     │
│ • Email sent to alice@example.com  │
│ • Role assignment created          │
│ • Permissions granted              │
└─────────────────────────────────────┘
```

**If email fails:**

```
┌─────────────────────────────────────┐
│ ⚠️ Application approved (email      │
│    delivery pending)                │
│                                     │
│ • Role assignment created          │
│ • Email queued for retry           │
│ • User can still access dashboard  │
└─────────────────────────────────────┘
```

---

## ⚙️ Execution Steps

### B-1: Email Infrastructure Setup

**Goal:** Configure email service for notification delivery

**Tasks:**
1. Configure SMTP/SES connection
   - Environment variables: `EMAIL_SERVICE_ENABLED`, `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`
   - Test connection in staging
2. Create email templates
   - `templates/emails/enrollment-created.html`
   - `templates/emails/enrollment-held.html`
   - `templates/emails/enrollment-approved.html`
   - `templates/emails/enrollment-rejected.html`
3. Implement email service wrapper
   - `services/EmailService.ts` with retry logic
   - Template rendering with user data
4. Add email sending to enrollment transitions

**Deliverables:**
- Email service configured and tested
- 4 email templates created
- EmailService with retry logic

### B-2: State Transition Metadata

**Goal:** Add reason tracking to enrollment transitions

**Tasks:**
1. Add database columns (migration)
   - `hold_reason`, `hold_requested_fields`
   - `rejection_reason`, `reapply_after_at`
   - `approval_notes`
2. Update RoleEnrollment entity
   - Add new fields with nullable types
   - Update toJSON() for API response
3. Update admin API endpoints
   - `POST /api/admin/enrollments/:id/approve` - Add optional `notes`
   - `POST /api/admin/enrollments/:id/hold` - Require `reason`, optional `requested_fields`
   - `POST /api/admin/enrollments/:id/reject` - Require `reason`, `cooldown_hours`

**Deliverables:**
- Migration for new metadata fields
- Updated RoleEnrollment entity
- Enhanced admin APIs with reason inputs

### B-3: Notification Trigger Integration

**Goal:** Send emails when enrollment state changes

**Tasks:**
1. Create notification service
   - `services/NotificationService.ts`
   - Methods: `notifyEnrollmentCreated()`, `notifyEnrollmentHeld()`, etc.
2. Integrate with state transitions
   - After successful DB update, trigger notification
   - Handle email failures gracefully (log + queue retry)
3. Add notification logging (optional)
   - Create `notifications` table for delivery tracking
   - Log sent/failed status

**Deliverables:**
- NotificationService implementation
- Email triggers on all 4 transitions
- Error handling for email failures

### B-4: User Status Page Enhancements

**Goal:** Improve user-facing enrollment status page

**Tasks:**
1. Update `/apply/status/:id` page
   - Display status-specific messages
   - Show hold reason + requested fields
   - Show rejection reason + reapplication countdown
   - Add "Go to Dashboard" CTA after approval
2. Implement reapplication cooldown enforcement
   - Check `reapply_after_at` before allowing new application
   - Display countdown timer
   - Disable reapply button until cooldown expires
3. Add help resources
   - "Need help?" section with FAQ link
   - Contact support information

**Deliverables:**
- Enhanced status page UI
- Reapplication cooldown enforcement
- Help resources section

### B-5: Admin Review UX

**Goal:** Add reason input modals for admin transitions

**Tasks:**
1. Create transition modals
   - ApproveModal component
   - HoldModal component (with reason + requested fields)
   - RejectModal component (with reason + cooldown selector)
2. Update admin enrollment list
   - Add status filter tabs
   - Add date range filter
   - Add role filter
3. Implement post-transition feedback
   - Success toast with email delivery status
   - Error handling with retry option

**Deliverables:**
- 3 transition modal components
- Enhanced admin list filters
- Post-transition feedback UI

### B-6: Session Sync After Approval

**Goal:** Ensure user sees new role immediately after approval

**Tasks:**
1. Update `/me` endpoint trigger points
   - After login
   - On tab focus (if away for >5 minutes)
   - Manual refresh via "Sync" button
2. Update global menu rendering
   - Re-render menu after `/me` update
   - Show new role dashboard link immediately
3. Add session sync indicators
   - Loading spinner during `/me` fetch
   - "Synced" indicator in user menu

**Deliverables:**
- Automatic `/me` refresh on approval
- Global menu updates immediately
- Session sync indicators

### B-7: Testing & Documentation

**Goal:** Validate all workflows and document implementation

**Tasks:**
1. E2E test scenarios
   - User creates application → receives email
   - Admin puts on hold → user sees reason + requested fields
   - Admin approves → user sees dashboard link + menu updates
   - Admin rejects → user sees countdown + disabled reapply button
2. Email delivery testing
   - Staging environment email tests
   - Verify template rendering
   - Test retry logic on failure
3. Documentation
   - Operational guide for admins
   - Troubleshooting guide for email failures
   - Phase B implementation report

**Deliverables:**
- E2E test plan executed (all scenarios PASS)
- Email delivery verified
- Documentation complete

---

## 📋 Definition of Done

- [ ] Email notifications sent on all 4 state transitions (create, hold, approve, reject)
- [ ] Admin can input reasons for hold/reject transitions
- [ ] User status page shows reason, requested fields, or reapplication countdown
- [ ] Reapplication cooldown enforced (409 error + countdown display)
- [ ] Approved users see new role in menu immediately
- [ ] `/me` endpoint refreshes automatically after approval
- [ ] Permission checks prevent unauthorized transitions (403)
- [ ] Missing reason on hold/reject returns 422 error
- [ ] All E2E test scenarios pass
- [ ] Documentation complete:
  - [ ] `p1_enrollment_notifications.md` (design spec)
  - [ ] `p1_notifications_operational_guide.md` (runbook)
  - [ ] `p1_phase_b_report.md` (implementation report)

---

## 🕓 Timeline

| Task | Duration | Dependencies |
|------|----------|--------------|
| B-1: Email Infrastructure | 0.5 day | None |
| B-2: Metadata & Migration | 0.5 day | None |
| B-3: Notification Integration | 0.5 day | B-1, B-2 |
| B-4: User Status Page | 0.5 day | B-2 |
| B-5: Admin Review UX | 1 day | B-2 |
| B-6: Session Sync | 0.5 day | None (parallel) |
| B-7: Testing & Docs | 0.5 day | All above |

**Total:** ~2.5-3 days

---

## 📦 Git Workflow

**Branch:** `feat/user-refactor-p1-rbac/phase-b-notifications`

**Commit Message Template:**
```
feat(p1-rbac): phase-b - {component}

{Description of changes}

Implements:
- {Feature 1}
- {Feature 2}

See: docs/dev/tasks/p1_phase_b_work_order.md
```

**PR Title:** `feat(p1-rbac): Phase B - Enrollment Notifications & UX Enhancement`

---

## 🚦 Dependencies & Prerequisites

| Item | Status | Notes |
|------|--------|-------|
| P1-A Complete | ✅ Ready | Permission system in place |
| Email Service | ⏸️ Setup Required | SMTP/SES configuration |
| Email Templates | ⏸️ To Create | 4 templates needed |
| P0 Monitoring | ⏸️ In Progress | Must be stable before P1-B |

---

## ⚠️ Risks & Mitigation

### Email Infrastructure Errors

**Risk:** Email service down or misconfigured
**Impact:** Users don't receive notifications
**Mitigation:**
- Separate environment variables (staging/production)
- Retry logic with exponential backoff
- Queue failed emails for manual retry
- Log all email attempts

### Excessive Notifications / Spam

**Risk:** Users receive too many emails or emails are marked as spam
**Impact:** Poor user experience, email deliverability issues
**Mitigation:**
- One email per state transition only
- Clear unsubscribe option (future)
- Use reputable email service (SES, SendGrid)
- Follow email best practices (SPF, DKIM, DMARC)

### Session Sync Delays

**Risk:** User doesn't see new role immediately after approval
**Impact:** Confusion, support requests
**Mitigation:**
- Multiple `/me` refresh trigger points
- Manual "Sync" button in user menu
- Clear "Syncing..." indicator

### Admin Input Quality

**Risk:** Admins provide unclear or generic reasons
**Impact:** User confusion, poor experience
**Mitigation:**
- Reason templates/suggestions
- Minimum character count for reasons
- Admin training documentation

---

## 🔗 Related Documents

- [P1 Kickoff Plan](../planning/p1_kickoff_task_order.md)
- [P1 RBAC Enhancement Spec](../specs/p1_rbac_enhancement.md)
- [P1 Phase A Report](../investigations/user-refactor_2025-11/p1_phase_a_implementation_report.md)
- [P0 Implementation Report](../investigations/user-refactor_2025-11/zerodata/p0_phase_c_implementation_report.md)

---

## 📚 Future Enhancements (Out of Scope)

- **In-app notification center** (UI for notification history)
- **SMS/Push notifications** (mobile app integration)
- **Real-time updates** (WebSocket for live status changes)
- **Notification preferences** (user controls which emails to receive)
- **Bulk operations** (Phase D - bulk approve/reject)
- **Advanced analytics** (notification open rates, response times)

---

**Document Owner:** Platform Team
**Review Required:** Tech Lead approval before implementation
**Implementation Start:** After P1-A merge to main (2025-11-12+)

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
