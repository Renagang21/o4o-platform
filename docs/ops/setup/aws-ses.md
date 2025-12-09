# AWS SES Setup Guide for Enrollment Notifications
**Phase B-1: Email Infrastructure Setup**

This guide helps you configure AWS SES (Simple Email Service) for enrollment notification emails in the O4O Platform.

---

## 📋 Table of Contents

1. [AWS SES Setup](#aws-ses-setup)
2. [Environment Configuration](#environment-configuration)
3. [Email Service Integration](#email-service-integration)
4. [Testing](#testing)
5. [Troubleshooting](#troubleshooting)

---

## 🚀 AWS SES Setup

### Step 1: Create AWS SES Account

1. **Sign in to AWS Console**
   - Navigate to https://console.aws.amazon.com/ses/
   - Select your preferred region (e.g., `ap-northeast-2` for Seoul)

2. **Verify Email Address or Domain**

   **Option A: Email Address Verification (Sandbox)**
   ```bash
   # For testing with specific email addresses
   # 1. Go to SES Console → Email Addresses
   # 2. Click "Verify a New Email Address"
   # 3. Enter: noreply@neture.co.kr
   # 4. Check email and click verification link
   ```

   **Option B: Domain Verification (Production)**
   ```bash
   # For production use with any @neture.co.kr email
   # 1. Go to SES Console → Domains
   # 2. Click "Verify a New Domain"
   # 3. Enter: neture.co.kr
   # 4. Add DNS records provided by AWS to your domain registrar
   ```

   **DNS Records Example:**
   ```
   Type: TXT
   Name: _amazonses.neture.co.kr
   Value: [AWS-provided verification code]

   Type: MX
   Name: neture.co.kr
   Value: 10 feedback-smtp.ap-northeast-2.amazonses.com

   Type: TXT
   Name: neture.co.kr
   Value: "v=spf1 include:amazonses.com ~all"

   Type: TXT
   Name: _dmarc.neture.co.kr
   Value: "v=DMARC1; p=none; rua=mailto:postmaster@neture.co.kr"
   ```

### Step 2: Request Production Access

AWS SES starts in **Sandbox Mode** with limitations:
- Can only send to verified email addresses
- Limited to 200 emails/day, 1 email/second

**To request production access:**

1. Go to **SES Console → Account Dashboard**
2. Click **"Request Production Access"**
3. Fill out the form:
   ```
   Mail Type: Transactional
   Website URL: https://neture.co.kr
   Use Case Description:
   "Send role enrollment notifications to users when they:
   - Submit enrollment applications
   - Get applications approved/rejected/held
   - Need to update enrollment information

   Expected volume: ~100 emails/day
   Compliance: All recipients opt-in through registration"

   Bounce/Complaint handling: We monitor bounce and complaint rates
   ```
4. Submit and wait for approval (usually 24-48 hours)

### Step 3: Create SMTP Credentials

1. **Navigate to SMTP Settings**
   - SES Console → Account Dashboard → SMTP Settings
   - Click **"Create My SMTP Credentials"**

2. **Create IAM User**
   ```
   IAM User Name: ses-smtp-user-o4o-platform
   ```
   - Click "Create"
   - **Download credentials CSV** (important!)

3. **SMTP Credentials Format**
   ```
   SMTP Server: email-smtp.ap-northeast-2.amazonaws.com
   Port: 587 (TLS) or 465 (SSL)
   Username: [20-character access key ID]
   Password: [44-character secret access key]
   ```

### Step 4: Configure IAM Permissions

Ensure the IAM user has the correct permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## ⚙️ Environment Configuration

### Production Server (.env)

Update `/home/ubuntu/o4o-platform/apps/api-server/.env`:

```bash
# === Email Service (AWS SES) ===
EMAIL_SERVICE_ENABLED=true

# SMTP Configuration (AWS SES)
SMTP_HOST=email-smtp.ap-northeast-2.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false  # Use STARTTLS
SMTP_USER=AKIAXXXXXXXXXXXXXXXXX  # Your SMTP username from Step 3
SMTP_PASS=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  # Your SMTP password

# Email Settings
EMAIL_FROM_NAME=Neture Platform
EMAIL_FROM_ADDRESS=noreply@neture.co.kr

# Frontend URLs (for email links)
FRONTEND_URL=https://neture.co.kr
ADMIN_URL=https://admin.neture.co.kr
```

### Development/Local (.env)

For local development:

```bash
# === Email Service (Development) ===
EMAIL_SERVICE_ENABLED=false  # Disable for local dev

# OR use AWS SES with sandbox mode
EMAIL_SERVICE_ENABLED=true
SMTP_HOST=email-smtp.ap-northeast-2.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=[your-test-credentials]
SMTP_PASS=[your-test-password]
EMAIL_FROM_ADDRESS=your-verified-email@example.com  # Must be verified in sandbox
```

### Alternative: Using Region-Specific Endpoints

If using a different AWS region:

```bash
# US East (N. Virginia)
SMTP_HOST=email-smtp.us-east-1.amazonaws.com

# US West (Oregon)
SMTP_HOST=email-smtp.us-west-2.amazonaws.com

# Europe (Ireland)
SMTP_HOST=email-smtp.eu-west-1.amazonaws.com

# Asia Pacific (Tokyo)
SMTP_HOST=email-smtp.ap-northeast-1.amazonaws.com

# Asia Pacific (Seoul)
SMTP_HOST=email-smtp.ap-northeast-2.amazonaws.com
```

---

## 🔌 Email Service Integration

### Using EnrollmentEmailService

The `EnrollmentEmailService` is already implemented. Here's how to use it:

```typescript
import { enrollmentEmailService } from '../services/EnrollmentEmailService.js';
import { RoleEnrollment } from '../entities/RoleEnrollment.js';
import { User } from '../entities/User.js';

// 1. Send enrollment created notification
const enrollment = await enrollmentRepository.save(newEnrollment);
await enrollmentEmailService.sendEnrollmentCreated(enrollment, user);

// 2. Send enrollment held notification
enrollment.hold(adminId, 'Additional documents required');
await enrollmentRepository.save(enrollment);
await enrollmentEmailService.sendEnrollmentHeld(
  enrollment,
  user,
  'Please provide updated business registration certificate',
  ['businessCertificate', 'taxId']  // Optional requested fields
);

// 3. Send enrollment approved notification
enrollment.approve(adminId, 'All documents verified');
await enrollmentRepository.save(enrollment);
await enrollmentEmailService.sendEnrollmentApproved(
  enrollment,
  user,
  'Welcome to Neture Platform!'  // Optional approval note
);

// 4. Send enrollment rejected notification
const reapplyAfter = new Date();
reapplyAfter.setHours(reapplyAfter.getHours() + 24);  // 24-hour cooldown

enrollment.reject(adminId, 'Business registration certificate is invalid');
await enrollmentRepository.save(enrollment);
await enrollmentEmailService.sendEnrollmentRejected(
  enrollment,
  user,
  'Your business registration certificate could not be verified. Please ensure all documents are valid and up-to-date.',
  reapplyAfter  // Optional cooldown period
);
```

### Email Service Status Check

```typescript
import { emailService } from '../services/email.service.js';

// Check if email service is available
const status = emailService.getServiceStatus();
console.log(status);
// Output: { enabled: true, configured: true, connected: true }

// Test connection
const isConnected = await emailService.testConnection();
if (!isConnected) {
  console.error('Email service is not available');
}
```

---

## 🧪 Testing

### 1. Test Email Service Connection

```bash
# SSH into API server
ssh o4o-api

# Navigate to project directory
cd /home/ubuntu/o4o-platform/apps/api-server

# Run Node.js REPL
node --experimental-modules

# Test connection
import { emailService } from './dist/services/email.service.js';
const status = await emailService.testConnection();
console.log('Email service connected:', status);
```

### 2. Send Test Email

Create a test script: `test-enrollment-email.ts`

```typescript
import { AppDataSource } from './src/config/database.js';
import { enrollmentEmailService } from './src/services/EnrollmentEmailService.js';
import { User } from './src/entities/User.js';
import { RoleEnrollment } from './src/entities/RoleEnrollment.js';

async function testEnrollmentEmail() {
  await AppDataSource.initialize();

  // Get test user (replace with actual user ID)
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { email: 'test@example.com' } });

  if (!user) {
    console.error('Test user not found');
    return;
  }

  // Create test enrollment
  const enrollment = new RoleEnrollment();
  enrollment.id = 'test-enrollment-001';
  enrollment.userId = user.id;
  enrollment.role = 'supplier';
  enrollment.status = 'PENDING';
  enrollment.createdAt = new Date();

  // Test 1: Enrollment Created
  console.log('Sending enrollment created email...');
  const result1 = await enrollmentEmailService.sendEnrollmentCreated(enrollment, user);
  console.log('Result:', result1);

  // Test 2: Enrollment Held
  console.log('Sending enrollment held email...');
  const result2 = await enrollmentEmailService.sendEnrollmentHeld(
    enrollment,
    user,
    'Please provide additional documentation',
    ['businessCertificate']
  );
  console.log('Result:', result2);

  await AppDataSource.destroy();
}

testEnrollmentEmail().catch(console.error);
```

Run the test:

```bash
npx tsx test-enrollment-email.ts
```

### 3. Monitor SES Metrics

Check AWS SES Console for:
- **Sending Statistics**: Delivery rate, bounce rate, complaint rate
- **Reputation Dashboard**: Keep bounce < 5%, complaints < 0.1%
- **Sending Quota**: Current usage vs. limits

---

## 🔧 Troubleshooting

### Issue 1: "Email service disabled" in logs

**Symptom:**
```
Email service is disabled via EMAIL_SERVICE_ENABLED=false
```

**Solution:**
```bash
# Check .env file
cat /home/ubuntu/o4o-platform/apps/api-server/.env | grep EMAIL_SERVICE_ENABLED

# Should be:
EMAIL_SERVICE_ENABLED=true

# If set to false, update it and restart
vim .env
npx pm2 restart o4o-api-server
```

### Issue 2: "SMTP configuration incomplete"

**Symptom:**
```
SMTP configuration incomplete. Email service will be disabled.
Required: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
```

**Solution:**
```bash
# Verify all SMTP variables are set
env | grep SMTP

# Should show:
SMTP_HOST=email-smtp.ap-northeast-2.amazonaws.com
SMTP_PORT=587
SMTP_USER=AKIAXXXXXXXXX
SMTP_PASS=xxxxxxxxxxxxxxx
```

### Issue 3: "Email send timeout"

**Symptom:**
```
Failed to send email: Email send timeout
```

**Possible Causes:**
1. **Firewall blocking port 587**
   ```bash
   # Test SMTP connection
   telnet email-smtp.ap-northeast-2.amazonaws.com 587
   ```

2. **Security group rules**
   - Ensure EC2 security group allows outbound traffic on port 587

3. **Network issues**
   ```bash
   # Check DNS resolution
   nslookup email-smtp.ap-northeast-2.amazonaws.com
   ```

### Issue 4: "MessageRejected: Email address is not verified"

**Symptom:**
```
MessageRejected: Email address is not verified. The following identities failed the check
```

**Solution:**
- You're in **SES Sandbox Mode**
- Either verify the recipient email address, or request production access (see Step 2)

### Issue 5: Emails going to spam

**Solution:**
1. **Set up SPF record**:
   ```
   Type: TXT
   Name: neture.co.kr
   Value: "v=spf1 include:amazonses.com ~all"
   ```

2. **Set up DKIM** (in SES Console → Domains → DKIM Settings)

3. **Set up DMARC**:
   ```
   Type: TXT
   Name: _dmarc.neture.co.kr
   Value: "v=DMARC1; p=quarantine; rua=mailto:postmaster@neture.co.kr"
   ```

4. **Use meaningful From addresses**:
   ```bash
   EMAIL_FROM_NAME=Neture Platform
   EMAIL_FROM_ADDRESS=noreply@neture.co.kr  # Not "test@" or "admin@"
   ```

### Issue 6: High bounce/complaint rates

**AWS SES automatically suspends accounts with:**
- Bounce rate > 5%
- Complaint rate > 0.1%

**Prevention:**
1. **Validate email addresses** before sending
2. **Monitor SES metrics** regularly
3. **Implement bounce handling**:
   ```typescript
   // Add SNS topic for bounces/complaints
   // Update email service to mark bounced emails
   ```

---

## 📊 Monitoring and Alerts

### CloudWatch Metrics

Key metrics to monitor:

```bash
# Delivery Rate
aws cloudwatch get-metric-statistics \
  --namespace AWS/SES \
  --metric-name Delivery \
  --statistics Sum \
  --start-time 2025-01-01T00:00:00Z \
  --end-time 2025-01-02T00:00:00Z \
  --period 3600
```

### Set up SNS Alerts

```bash
# Create SNS topic for bounce notifications
aws sns create-topic --name ses-bounce-notifications

# Configure SES to publish to SNS
aws ses set-identity-notification-topic \
  --identity neture.co.kr \
  --notification-type Bounce \
  --sns-topic arn:aws:sns:ap-northeast-2:ACCOUNT_ID:ses-bounce-notifications
```

---

## 📚 Additional Resources

- [AWS SES Developer Guide](https://docs.aws.amazon.com/ses/latest/dg/)
- [AWS SES SMTP Endpoints](https://docs.aws.amazon.com/ses/latest/dg/smtp-connect.html)
- [Email Best Practices](https://docs.aws.amazon.com/ses/latest/dg/best-practices.html)
- [Nodemailer Documentation](https://nodemailer.com/about/)

---

## ✅ Checklist

Use this checklist for Phase B-1 completion:

- [ ] AWS SES domain verified
- [ ] Production access requested and approved
- [ ] SMTP credentials created and saved securely
- [ ] Environment variables configured in `.env`
- [ ] SPF/DKIM/DMARC records added to DNS
- [ ] Test emails sent successfully
- [ ] Monitoring dashboard set up
- [ ] Bounce/complaint handling configured
- [ ] Email service integrated with enrollment workflow

---

*Last updated: 2025-11-09*
*Part of P1 Phase B: Enrollment Notifications & UX Enhancement*
