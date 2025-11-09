# P1 Phase B - Email Service Quick Reference
**Enrollment Notification System**

Quick reference for implementing and using the enrollment email notification service.

---

## 📦 What's Been Created

### 1. EnrollmentEmailService
**Location:** `apps/api-server/src/services/EnrollmentEmailService.ts`

Service that handles all enrollment notification emails with built-in HTML templates.

**Key Methods:**
```typescript
enrollmentEmailService.sendEnrollmentCreated(enrollment, user)
enrollmentEmailService.sendEnrollmentHeld(enrollment, user, reason, requestedFields?)
enrollmentEmailService.sendEnrollmentApproved(enrollment, user, approvalNote?)
enrollmentEmailService.sendEnrollmentRejected(enrollment, user, reason, reapplyAfter?)
```

### 2. Email Templates
All templates are **built-in** to the service (no separate template files needed):
- ✉️ **enrollment-created**: Sent when user submits enrollment
- ⏸️ **enrollment-held**: Sent when admin requires more info
- ✅ **enrollment-approved**: Sent when enrollment is approved
- ❌ **enrollment-rejected**: Sent when enrollment is rejected

### 3. Configuration Files
- `apps/api-server/.env.example` - Updated with AWS SES config
- `docs/dev/setup/aws-ses-setup-guide.md` - Complete setup guide

---

## 🚀 Quick Start

### Step 1: Configure Environment Variables

```bash
# Edit production .env
ssh o4o-api
vim /home/ubuntu/o4o-platform/apps/api-server/.env

# Add these variables:
EMAIL_SERVICE_ENABLED=true
SMTP_HOST=email-smtp.ap-northeast-2.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=AKIAXXXXXXXXXXXXXXXXX
SMTP_PASS=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM_NAME=Neture Platform
EMAIL_FROM_ADDRESS=noreply@neture.co.kr
FRONTEND_URL=https://neture.co.kr
ADMIN_URL=https://admin.neture.co.kr
```

### Step 2: Restart API Server

```bash
npx pm2 restart o4o-api-server
npx pm2 logs o4o-api-server --lines 50  # Check for email service initialization
```

### Step 3: Use in Code

```typescript
import { enrollmentEmailService } from '../services/EnrollmentEmailService.js';

// After creating enrollment
await enrollmentEmailService.sendEnrollmentCreated(enrollment, user);

// After admin action
await enrollmentEmailService.sendEnrollmentApproved(enrollment, user);
```

---

## 📋 Integration Checklist

Use this for Task B-3 (Notification trigger integration):

### Backend Integration Points

**File:** `apps/api-server/src/routes/enrollment.routes.ts`

```typescript
// ✅ POST /api/enrollments - Create new enrollment
router.post('/', async (req, res) => {
  const enrollment = await enrollmentRepo.save(newEnrollment);

  // Send email notification
  await enrollmentEmailService.sendEnrollmentCreated(enrollment, req.user);

  res.status(201).json(enrollment);
});
```

**File:** `apps/api-server/src/routes/admin/enrollments.routes.ts`

```typescript
// ✅ POST /api/admin/enrollments/:id/approve
router.post('/:id/approve', requirePermission('enrollment.approve'), async (req, res) => {
  const { note } = req.body;

  enrollment.approve(req.user.id, note);
  await enrollmentRepo.save(enrollment);

  // Send email notification
  const user = await enrollment.user;
  await enrollmentEmailService.sendEnrollmentApproved(enrollment, user, note);

  res.json(enrollment);
});

// ✅ POST /api/admin/enrollments/:id/hold
router.post('/:id/hold', requirePermission('enrollment.review'), async (req, res) => {
  const { reason, requestedFields } = req.body;

  enrollment.hold(req.user.id, reason);
  await enrollmentRepo.save(enrollment);

  // Send email notification
  const user = await enrollment.user;
  await enrollmentEmailService.sendEnrollmentHeld(enrollment, user, reason, requestedFields);

  res.json(enrollment);
});

// ✅ POST /api/admin/enrollments/:id/reject
router.post('/:id/reject', requirePermission('enrollment.review'), async (req, res) => {
  const { reason, cooldownHours = 24 } = req.body;

  enrollment.reject(req.user.id, reason);
  await enrollmentRepo.save(enrollment);

  // Calculate reapply date
  const reapplyAfter = new Date();
  reapplyAfter.setHours(reapplyAfter.getHours() + cooldownHours);

  // Send email notification
  const user = await enrollment.user;
  await enrollmentEmailService.sendEnrollmentRejected(enrollment, user, reason, reapplyAfter);

  res.json(enrollment);
});
```

### Error Handling

```typescript
// All email methods return { success: boolean; error?: string }
const result = await enrollmentEmailService.sendEnrollmentCreated(enrollment, user);

if (!result.success) {
  logger.warn('Failed to send enrollment email', {
    enrollmentId: enrollment.id,
    error: result.error
  });
  // Continue processing - don't fail the request if email fails
}
```

---

## 🧪 Testing

### Manual Test via REPL

```bash
ssh o4o-api
cd /home/ubuntu/o4o-platform/apps/api-server
node --experimental-modules

# In Node REPL:
const { AppDataSource } = await import('./dist/config/database.js');
const { enrollmentEmailService } = await import('./dist/services/EnrollmentEmailService.js');
const { User } = await import('./dist/entities/User.js');
const { RoleEnrollment } = await import('./dist/entities/RoleEnrollment.js');

await AppDataSource.initialize();

// Get a test user
const userRepo = AppDataSource.getRepository(User);
const user = await userRepo.findOne({ where: { email: 'test@example.com' } });

// Create test enrollment
const enrollment = new RoleEnrollment();
enrollment.id = 'test-001';
enrollment.userId = user.id;
enrollment.role = 'supplier';
enrollment.status = 'PENDING';
enrollment.createdAt = new Date();

// Send test email
const result = await enrollmentEmailService.sendEnrollmentCreated(enrollment, user);
console.log('Email sent:', result);
```

### Check Email Logs

```bash
# Check PM2 logs for email sending
ssh o4o-api
npx pm2 logs o4o-api-server | grep -i "email"

# Expected output:
# Email service initialized and verified successfully
# Email sent successfully: <message-id>
```

### Verify in AWS SES Console

1. Go to AWS SES Console → Sending Statistics
2. Check for recent sends
3. Verify delivery/bounce/complaint rates

---

## 📊 Email Templates Preview

### 1. Enrollment Created
**Subject:** `[Neture] 공급자 역할 신청이 접수되었습니다`

**Content:**
- ✅ Confirmation message
- 📋 Enrollment ID and details
- 🔢 Next steps (3-step process)
- 🔗 Link to check status

### 2. Enrollment Held
**Subject:** `[Neture] 공급자 역할 신청이 보류되었습니다`

**Content:**
- ⏸️ Hold notification
- 📄 Reason for hold
- 📝 List of requested fields (if provided)
- 🔗 Link to update application

### 3. Enrollment Approved
**Subject:** `[Neture] 🎉 공급자 역할 신청이 승인되었습니다!`

**Content:**
- 🎉 Congratulations message
- ✓ Approval confirmation
- 📦 List of available features
- 🔗 Link to dashboard

### 4. Enrollment Rejected
**Subject:** `[Neture] 공급자 역할 신청이 거부되었습니다`

**Content:**
- ❌ Rejection notification
- 📋 Reason for rejection
- ⏰ Reapplication cooldown (if applicable)
- 💡 Next steps and support link

---

## 🔑 Environment Variables Reference

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `EMAIL_SERVICE_ENABLED` | Yes | `true` | Enable/disable email service |
| `SMTP_HOST` | Yes | `email-smtp.ap-northeast-2.amazonaws.com` | AWS SES SMTP endpoint |
| `SMTP_PORT` | Yes | `587` | SMTP port (587 for TLS) |
| `SMTP_SECURE` | Yes | `false` | Use SSL (false for STARTTLS) |
| `SMTP_USER` | Yes | `AKIAXXXXXXXXX` | AWS SES SMTP username |
| `SMTP_PASS` | Yes | `xxxxxxxxxx` | AWS SES SMTP password |
| `EMAIL_FROM_NAME` | Yes | `Neture Platform` | Sender name |
| `EMAIL_FROM_ADDRESS` | Yes | `noreply@neture.co.kr` | Sender email (must be verified) |
| `FRONTEND_URL` | Yes | `https://neture.co.kr` | Main site URL (for email links) |
| `ADMIN_URL` | Yes | `https://admin.neture.co.kr` | Admin site URL (for email links) |

---

## 🐛 Common Issues

### Issue: Emails not sending

**Check:**
1. `EMAIL_SERVICE_ENABLED=true` in `.env`
2. All SMTP variables are set
3. PM2 logs show "Email service initialized"

```bash
# Check status
ssh o4o-api
cat /home/ubuntu/o4o-platform/apps/api-server/.env | grep EMAIL
npx pm2 logs o4o-api-server --lines 100 | grep -i email
```

### Issue: "Email address not verified"

**Reason:** AWS SES is in sandbox mode

**Solution:**
- Request production access (see `aws-ses-setup-guide.md`)
- OR verify recipient email addresses in SES Console

### Issue: Emails go to spam

**Solution:**
- Add SPF, DKIM, DMARC records (see setup guide)
- Use `noreply@neture.co.kr` (not `test@` or generic addresses)
- Ensure AWS SES domain is verified

---

## 📚 Related Documentation

- **Full Setup Guide:** `docs/dev/setup/aws-ses-setup-guide.md`
- **Phase B Work Order:** `docs/dev/tasks/p1_phase_b_work_order.md`
- **AWS SES Docs:** https://docs.aws.amazon.com/ses/

---

## ✅ Task Completion Criteria (Phase B-1)

- [x] EnrollmentEmailService created with 4 templates
- [x] AWS SES configuration guide written
- [x] Environment variables documented in `.env.example`
- [ ] SMTP credentials obtained from AWS SES
- [ ] Environment variables configured on production server
- [ ] Email service tested with real enrollment
- [ ] Integration points added to enrollment routes
- [ ] Email delivery confirmed via AWS SES console

---

*Created: 2025-11-09*
*Part of P1 Phase B: Enrollment Notifications & UX Enhancement*
