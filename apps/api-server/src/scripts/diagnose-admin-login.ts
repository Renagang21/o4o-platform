/**
 * Admin Login Diagnosis Script
 * WO-AUTH-DEV-CORRECTION-ADMIN-LOGIN
 *
 * 401 로그인 실패 원인 진단 및 복구
 *
 * Usage:
 *   npx tsx src/scripts/diagnose-admin-login.ts [--fix]
 *   npx tsx src/scripts/diagnose-admin-login.ts --email=admin@neture.co.kr [--fix]
 */

import { AppDataSource } from '../database/connection.js';
import { User, UserStatus } from '../entities/User.js';
import { UserRole } from '../types/auth.js';
import bcrypt from 'bcrypt';
import logger from '../utils/logger.js';

interface DiagnosisResult {
  step: string;
  status: 'OK' | 'FAIL' | 'WARN';
  message: string;
  fix?: () => Promise<void>;
}

async function diagnoseAdminLogin(targetEmail: string, shouldFix: boolean = false) {
  const results: DiagnosisResult[] = [];

  try {
    // Initialize database connection
    if (!AppDataSource.isInitialized) {
      logger.info('📡 Initializing database connection...');
      await AppDataSource.initialize();
    }

    const userRepo = AppDataSource.getRepository(User);

    logger.info('\n╔═══════════════════════════════════════════════════════════╗');
    logger.info('║         Admin Login Diagnosis                             ║');
    logger.info('╚═══════════════════════════════════════════════════════════╝\n');
    logger.info(`Target email: ${targetEmail}`);
    logger.info(`Fix mode: ${shouldFix ? 'ENABLED' : 'disabled'}\n`);

    // =====================================================
    // STEP 1: Check if user exists
    // =====================================================
    logger.info('─── STEP 1: User Existence Check ───');

    // Phase3-E: dbRoles ManyToMany dropped — load without relations
    const user = await userRepo.findOne({
      where: { email: targetEmail },
    });

    if (!user) {
      results.push({
        step: '1. User Existence',
        status: 'FAIL',
        message: `User not found: ${targetEmail}`,
        fix: async () => {
          logger.info('Creating admin user...');
          const hashedPassword = await bcrypt.hash('Admin123!', 10);
          const newUser = userRepo.create({
            email: targetEmail,
            password: hashedPassword,
            name: 'System Administrator',
            roles: [UserRole.SUPER_ADMIN],
            status: UserStatus.ACTIVE,
            isEmailVerified: true,
            isActive: true,
            permissions: []
          });
          await userRepo.save(newUser);
          logger.info('✅ Admin user created with password: Admin123!');
        }
      });

      if (shouldFix) {
        await results[results.length - 1].fix!();
        return diagnoseAdminLogin(targetEmail, false); // Re-run after fix
      } else {
        printResults(results);
        return;
      }
    }

    results.push({
      step: '1. User Existence',
      status: 'OK',
      message: `User found: ${user.id}`
    });

    // =====================================================
    // STEP 2: Check status field
    // =====================================================
    logger.info('─── STEP 2: Account Status Check ───');
    logger.info(`   status: ${user.status}`);
    logger.info(`   isActive: ${user.isActive}`);

    if (user.status !== UserStatus.ACTIVE && user.status !== UserStatus.APPROVED) {
      results.push({
        step: '2. Account Status',
        status: 'FAIL',
        message: `Status is '${user.status}', must be 'active' or 'approved'`,
        fix: async () => {
          user.status = UserStatus.ACTIVE;
          user.isActive = true;
          await userRepo.save(user);
          logger.info('✅ Status updated to ACTIVE');
        }
      });
    } else {
      results.push({
        step: '2. Account Status',
        status: 'OK',
        message: `Status is '${user.status}'`
      });
    }

    // =====================================================
    // STEP 3: Check password exists
    // =====================================================
    logger.info('─── STEP 3: Password Check ───');
    logger.info(`   password hash exists: ${!!user.password}`);
    logger.info(`   hash prefix: ${user.password?.substring(0, 7) || 'N/A'}`);

    if (!user.password) {
      results.push({
        step: '3. Password Hash',
        status: 'FAIL',
        message: 'No password hash found (social-only account?)',
        fix: async () => {
          const hashedPassword = await bcrypt.hash('Admin123!', 10);
          user.password = hashedPassword;
          await userRepo.save(user);
          logger.info('✅ Password set to: Admin123!');
        }
      });
    } else {
      results.push({
        step: '3. Password Hash',
        status: 'OK',
        message: `Hash found (${user.password.substring(0, 7)}...)`
      });
    }

    // =====================================================
    // STEP 4: Verify password comparison
    // =====================================================
    logger.info('─── STEP 4: Password Verification Test ───');
    const testPassword = 'Admin123!';

    if (user.password) {
      const isValid = await bcrypt.compare(testPassword, user.password);
      logger.info(`   Testing password 'Admin123!': ${isValid ? 'MATCH' : 'NO MATCH'}`);

      if (!isValid) {
        results.push({
          step: '4. Password Verification',
          status: 'FAIL',
          message: `Password 'Admin123!' does not match stored hash`,
          fix: async () => {
            const hashedPassword = await bcrypt.hash('Admin123!', 10);
            user.password = hashedPassword;
            await userRepo.save(user);
            logger.info('✅ Password reset to: Admin123!');
          }
        });
      } else {
        results.push({
          step: '4. Password Verification',
          status: 'OK',
          message: `Password 'Admin123!' matches`
        });
      }
    }

    // =====================================================
    // STEP 5: Check account lock
    // =====================================================
    logger.info('─── STEP 5: Account Lock Check ───');
    logger.info(`   lockedUntil: ${user.lockedUntil || 'null'}`);
    logger.info(`   loginAttempts: ${user.loginAttempts || 0}`);

    const isLocked = user.lockedUntil && user.lockedUntil > new Date();
    if (isLocked) {
      results.push({
        step: '5. Account Lock',
        status: 'FAIL',
        message: `Account locked until ${user.lockedUntil}`,
        fix: async () => {
          user.lockedUntil = null;
          user.loginAttempts = 0;
          await userRepo.save(user);
          logger.info('✅ Account unlocked');
        }
      });
    } else {
      results.push({
        step: '5. Account Lock',
        status: 'OK',
        message: 'Account not locked'
      });
    }

    // =====================================================
    // STEP 6: Check email verification
    // =====================================================
    logger.info('─── STEP 6: Email Verification Check ───');
    logger.info(`   isEmailVerified: ${user.isEmailVerified}`);

    if (!user.isEmailVerified) {
      results.push({
        step: '6. Email Verification',
        status: 'WARN',
        message: 'Email not verified (may block login if REQUIRE_EMAIL_VERIFICATION=true)',
        fix: async () => {
          user.isEmailVerified = true;
          await userRepo.save(user);
          logger.info('✅ Email marked as verified');
        }
      });
    } else {
      results.push({
        step: '6. Email Verification',
        status: 'OK',
        message: 'Email verified'
      });
    }

    // =====================================================
    // STEP 7: Check role assignment
    // =====================================================
    logger.info('─── STEP 7: Role Assignment Check ───');
    // Phase3-E: roles from role_assignments (users.roles column + dbRoles ManyToMany dropped)
    const raCheck: { role: string }[] = await AppDataSource.query(
      `SELECT role FROM role_assignments WHERE user_id = $1 AND is_active = true`,
      [user.id]
    );
    logger.info(`   role_assignments: ${raCheck.map(r => r.role).join(', ') || 'none'}`);

    const hasAdminRole = raCheck.some(r =>
      r.role === 'admin' || r.role === 'super_admin' || r.role === UserRole.ADMIN || r.role === UserRole.SUPER_ADMIN
    );

    if (!hasAdminRole) {
      results.push({
        step: '7. Role Assignment',
        status: 'WARN',
        message: 'User does not have admin role (may limit access after login)',
        fix: async () => {
          user.roles = [UserRole.SUPER_ADMIN];
          await userRepo.save(user);
          logger.info('✅ Role set to SUPER_ADMIN');
        }
      });
    } else {
      results.push({
        step: '7. Role Assignment',
        status: 'OK',
        message: `Has admin role: ${user.roles?.join(', ')}`
      });
    }

    // =====================================================
    // Apply fixes if requested
    // =====================================================
    if (shouldFix) {
      logger.info('\n─── Applying Fixes ───');
      for (const result of results) {
        if (result.status !== 'OK' && result.fix) {
          logger.info(`Fixing: ${result.step}...`);
          await result.fix();
        }
      }
      logger.info('\n✅ All fixes applied. Re-running diagnosis...\n');
      return diagnoseAdminLogin(targetEmail, false);
    }

    // Print results
    printResults(results);

    // Final summary
    const failures = results.filter(r => r.status === 'FAIL');
    const warnings = results.filter(r => r.status === 'WARN');

    if (failures.length > 0) {
      logger.info('\n⚠️  LOGIN WILL FAIL');
      logger.info('Run with --fix to auto-repair:\n');
      logger.info(`   npx tsx src/scripts/diagnose-admin-login.ts --email=${targetEmail} --fix\n`);
    } else if (warnings.length > 0) {
      logger.info('\n⚠️  LOGIN SHOULD WORK (with warnings)');
    } else {
      logger.info('\n✅ ALL CHECKS PASSED - LOGIN SHOULD WORK');
    }

  } catch (error: any) {
    logger.error('\n❌ Diagnosis failed:', error.message);
    logger.error(error.stack);
    throw error;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

function printResults(results: DiagnosisResult[]) {
  logger.info('\n╔═══════════════════════════════════════════════════════════╗');
  logger.info('║         Diagnosis Results                                 ║');
  logger.info('╚═══════════════════════════════════════════════════════════╝\n');

  for (const result of results) {
    const icon = result.status === 'OK' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    logger.info(`${icon} ${result.step}: ${result.message}`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
let targetEmail = 'admin@neture.co.kr';
let shouldFix = false;

for (const arg of args) {
  if (arg.startsWith('--email=')) {
    targetEmail = arg.split('=')[1];
  } else if (arg === '--fix') {
    shouldFix = true;
  } else if (arg === '--help') {
    console.log(`
Admin Login Diagnosis Script
=============================

Usage:
  npx tsx src/scripts/diagnose-admin-login.ts [options]

Options:
  --email=<email>  Target email (default: admin@neture.co.kr)
  --fix            Auto-fix any issues found
  --help           Show this help message

Examples:
  npx tsx src/scripts/diagnose-admin-login.ts
  npx tsx src/scripts/diagnose-admin-login.ts --fix
  npx tsx src/scripts/diagnose-admin-login.ts --email=test@test.com --fix
    `);
    process.exit(0);
  }
}

// Run diagnosis
diagnoseAdminLogin(targetEmail, shouldFix)
  .then(() => {
    logger.info('\n✅ Diagnosis completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('❌ Diagnosis failed:', error);
    process.exit(1);
  });
