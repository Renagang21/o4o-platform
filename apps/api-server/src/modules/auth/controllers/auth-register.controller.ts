/**
 * @core O4O_PLATFORM_CORE — Auth
 * Auth Register Controller: user registration + email check
 * Split from auth.controller.ts (WO-O4O-AUTH-CONTROLLER-SPLIT-V1)
 * Freeze: WO-O4O-CORE-FREEZE-V1 (2026-03-11)
 */
import { Request, Response } from 'express';
import { hashPassword, comparePassword } from '../../../utils/auth.utils.js';
import { BaseController } from '../../../common/base.controller.js';
import { AppDataSource } from '../../../database/connection.js';
import { User } from '../entities/User.js';
import { ServiceMembership } from '../entities/ServiceMembership.js';
import type { RegisterRequestDto } from '../dto/index.js';
import logger from '../../../utils/logger.js';
import { getServiceName } from '../../../config/service-catalog.js';
import { PasswordResetService } from '../../../services/passwordResetService.js';

export class AuthRegisterController extends BaseController {
  /**
   * POST /api/v1/auth/register
   * Register new user
   */
  static async register(req: Request, res: Response): Promise<any> {
    const data = req.body as RegisterRequestDto;

    try {
      // Check password confirmation (optional: some frontends validate client-side only)
      if (data.passwordConfirm && data.password !== data.passwordConfirm) {
        return BaseController.error(res, 'Passwords do not match', 400);
      }

      // WO-NETURE-REGISTER-IDENTITY-STABILIZATION-V1: Normalize consent fields
      // KPA/GlycoPharm use tos/privacyAccepted/marketingAccepted
      // Neture/K-Cosmetics use agreeTerms/agreePrivacy/agreeMarketing
      const tosAccepted = data.tos === true || data.agreeTerms === true;
      const privacyAccepted = data.privacyAccepted === true || data.agreePrivacy === true;
      const marketingAccepted = data.marketingAccepted === true || data.agreeMarketing === true;

      if (!tosAccepted) {
        return BaseController.error(res, 'Terms of service must be accepted', 400);
      }

      const userRepository = AppDataSource.getRepository(User);
      const smRepository = AppDataSource.getRepository(ServiceMembership);

      // Phase 3: membershipType에 따라 role 분기
      const VALID_ROLES = ['super_admin', 'admin', 'vendor', 'seller', 'user', 'business', 'partner', 'supplier', 'manager', 'customer'];
      const rawRole = data.membershipType === 'student'
        ? 'user'
        : (data.role || 'customer');
      const effectiveRole = VALID_ROLES.includes(rawRole) ? rawRole : 'user';
      const serviceKey = data.service || 'platform';

      // WO-NETURE-REGISTER-IDENTITY-STABILIZATION-V1: Name normalization
      let resolvedName: string;
      let resolvedLastName: string | undefined;
      let resolvedFirstName: string | undefined;
      if (data.lastName && data.firstName) {
        resolvedName = `${data.lastName}${data.firstName}`;
        resolvedLastName = data.lastName;
        resolvedFirstName = data.firstName;
      } else if (data.name) {
        resolvedName = data.name;
      } else {
        return BaseController.error(res, 'Name is required (provide name or lastName+firstName)', 400);
      }

      // WO-O4O-SERVICE-MEMBERSHIP-ARCHITECTURE-V1: Check existing user
      const existingUser = await userRepository.findOne({ where: { email: data.email } });

      if (existingUser) {
        // ── 기존 사용자: 서비스 멤버십 추가 플로우 ──

        // 1. 해당 서비스 멤버십 확인
        const existingMembership = await smRepository.findOne({
          where: { userId: existingUser.id, serviceKey },
        });
        if (existingMembership) {
          return BaseController.error(res, '이미 해당 서비스에 가입된 계정입니다. 로그인해 주세요.', 409,
            'SERVICE_ALREADY_JOINED');
        }

        // 2. 비밀번호 검증 (보안: 본인 확인)
        const passwordMatch = await comparePassword(data.password, existingUser.password);
        if (!passwordMatch) {
          // WO-O4O-AUTH-REGISTER-UX-IMPROVEMENT-V1: 기존 가입 서비스 목록 포함
          const existingMemberships = await smRepository.find({
            where: { userId: existingUser.id },
            select: ['serviceKey', 'status'],
          });
          return res.status(401).json({
            success: false,
            error: 'O4O 플랫폼에 이미 가입된 계정입니다. 기존 비밀번호를 입력해주세요.',
            code: 'PASSWORD_MISMATCH',
            existingAccount: true,
            services: existingMemberships.map(m => ({ key: m.serviceKey, name: getServiceName(m.serviceKey), status: m.status })),
          });
        }

        // 3. 새 서비스 멤버십 추가 (트랜잭션)
        // WO-O4O-AUTH-REGISTER-UX-IMPROVEMENT-V1: RoleAssignment는 서비스 승인 시에만 생성
        await AppDataSource.transaction(async (manager) => {
          // ServiceMembership 생성
          const txSmRepo = manager.getRepository(ServiceMembership);
          const membership = new ServiceMembership();
          membership.userId = existingUser.id;
          membership.serviceKey = serviceKey;
          membership.status = 'pending';
          membership.role = effectiveRole;
          await txSmRepo.save(membership);

          // WO-O4O-GLYCOPHARM-SIGNUP-REFORM-V1: businessInfo 머지 (기존 정보 보존 + 신규 추가)
          const newBiz: Record<string, string> = {};
          const effectiveBusinessName = data.businessName || data.companyName;
          if (effectiveBusinessName) newBiz.businessName = effectiveBusinessName;
          if (data.businessNumber) newBiz.businessNumber = data.businessNumber;
          if (data.businessType) newBiz.businessType = data.businessType;
          if (data.taxEmail) newBiz.email = data.taxEmail;
          if (data.businessCategory) newBiz.businessCategory = data.businessCategory;
          if (data.address1) newBiz.address = data.address1;
          if (data.address2) newBiz.address2 = data.address2;
          if (Object.keys(newBiz).length > 0) {
            const merged = { ...(existingUser.businessInfo || {}), ...newBiz };
            await manager.query(
              `UPDATE users SET "businessInfo" = $1 WHERE id = $2`,
              [JSON.stringify(merged), existingUser.id]
            );
          }

          // KPA Society: auto-create KPA member
          await AuthRegisterController.createKpaRecords(manager, existingUser.id, data);
        });

        logger.info('[AuthRegisterController.register] Service membership added to existing user', {
          userId: existingUser.id,
          serviceKey,
          role: effectiveRole,
        });

        return BaseController.created(res, {
          message: '서비스 가입 신청이 완료되었습니다. 승인을 기다려주세요.',
          user: {
            id: existingUser.id,
            email: existingUser.email,
            name: existingUser.name,
            status: 'pending',
          },
          existingAccount: true,
          pendingApproval: true,
        });
      }

      // ── 신규 사용자: 기존 로직 + ServiceMembership 추가 ──
      const hashedPassword = await hashPassword(data.password);

      const user = await AppDataSource.transaction(async (manager) => {
        const txUserRepo = manager.getRepository(User);

        // Create new user
        const newUser = new User();
        newUser.email = data.email;
        newUser.password = hashedPassword;
        newUser.name = resolvedName;
        newUser.lastName = resolvedLastName;
        newUser.firstName = resolvedFirstName;
        newUser.nickname = data.nickname || resolvedName;

        // role column removed - Phase3-E: roles is populated from role_assignments
        // WO-O4O-USER-DOMAIN-FINALIZATION-V1: users.service_key deprecated — SSOT is service_memberships
        // newUser.serviceKey = serviceKey; // REMOVED — written to service_memberships below
        if (data.phone) {
          newUser.phone = data.phone.replace(/\D/g, '');
        }

        // WO-NETURE-REGISTER-IDENTITY-STABILIZATION-V1: Consent timestamps
        newUser.tosAcceptedAt = tosAccepted ? new Date() : undefined;
        newUser.privacyAcceptedAt = privacyAccepted ? new Date() : undefined;
        newUser.marketingAccepted = marketingAccepted;

        // businessInfo: 사업자 정보 + 면허번호 저장
        const effectiveBusinessName = data.businessName || data.companyName;
        const businessInfo: Record<string, string> = {};
        if (data.licenseNumber) {
          businessInfo.licenseNumber = data.licenseNumber;
        }
        if (effectiveBusinessName) {
          businessInfo.businessName = effectiveBusinessName;
        }
        if (data.businessNumber) {
          businessInfo.businessNumber = data.businessNumber;
        }
        if (data.businessType) {
          businessInfo.businessType = data.businessType;
        }
        if (data.taxEmail) {
          businessInfo.email = data.taxEmail;
        }
        if (data.businessCategory) {
          businessInfo.businessCategory = data.businessCategory;
        }
        if (data.address1) {
          businessInfo.address = data.address1;
        }
        if (data.address2) {
          businessInfo.address2 = data.address2;
        }
        // WO-O4O-STORE-PROFILE-UNIFICATION-V1: 구조화된 주소 dual write
        if (data.address1) {
          (businessInfo as any).storeAddress = {
            baseAddress: data.address1,
            ...(data.address2 ? { detailAddress: data.address2 } : {}),
          };
        }
        if (Object.keys(businessInfo).length > 0) {
          newUser.businessInfo = businessInfo;
        }

        await txUserRepo.save(newUser);

        // WO-O4O-SERVICE-MEMBERSHIP-ARCHITECTURE-V1: ServiceMembership 생성
        const txSmRepo = manager.getRepository(ServiceMembership);
        const membership = new ServiceMembership();
        membership.userId = newUser.id;
        membership.serviceKey = serviceKey;
        membership.status = 'pending';
        membership.role = effectiveRole;
        await txSmRepo.save(membership);

        // KPA Society: auto-create KPA member
        await AuthRegisterController.createKpaRecords(manager, newUser.id, data);

        // WO-O4O-AUTH-REGISTER-UX-IMPROVEMENT-V1: RoleAssignment는 서비스 승인 시에만 생성

        return newUser;
      });

      // Send email verification (optional - don't fail if email fails)
      try {
        await PasswordResetService.requestEmailVerification(user.id);
      } catch (emailError) {
        logger.warn('[AuthRegisterController.register] Email verification failed', {
          error: emailError,
          userId: user.id,
        });
      }

      // P0-T1: No auto-login after registration (status = PENDING)
      return BaseController.created(res, {
        message: 'Registration submitted. Please wait for operator approval.',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          status: user.status,
        },
        pendingApproval: true,
      });
    } catch (error: any) {
      logger.error('[AuthRegisterController.register] Registration error', {
        error: error.message,
        code: error.code,
        email: data.email,
      });

      // UNIQUE violation → 409
      if (error.code === '23505' || error.driverError?.code === '23505') {
        const detail = error.detail || error.driverError?.detail || '';
        if (detail.includes('license_number')) {
          return BaseController.error(res, '이미 등록된 면허번호입니다. 기존 계정으로 로그인해 주세요.', 409);
        }
        if (detail.includes('user_id')) {
          return BaseController.error(res, '이미 가입된 회원입니다.', 409);
        }
        if (detail.includes('service_key')) {
          return BaseController.error(res, '이미 해당 서비스에 가입된 계정입니다.', 409,
            'SERVICE_ALREADY_JOINED');
        }
        return BaseController.error(res, 'Registration conflict', 409);
      }

      return BaseController.error(res, 'Registration failed');
    }
  }

  /**
   * POST /api/v1/auth/check-email
   * WO-O4O-AUTH-REGISTER-UX-IMPROVEMENT-V1: 이메일 사전 확인 (멀티 서비스 가입 UX)
   */
  static async checkEmail(req: Request, res: Response): Promise<any> {
    const { email, service } = req.body;
    if (!email) {
      return BaseController.error(res, 'Email is required', 400);
    }

    try {
      const userRepo = AppDataSource.getRepository(User);
      const smRepo = AppDataSource.getRepository(ServiceMembership);

      const existingUser = await userRepo.findOne({ where: { email } });
      if (!existingUser) {
        return BaseController.ok(res, { exists: false });
      }

      // 이미 해당 서비스에 가입되어 있는지 확인
      const currentMembership = service
        ? await smRepo.findOne({ where: { userId: existingUser.id, serviceKey: service } })
        : null;

      // 가입된 서비스 목록 조회
      const memberships = await smRepo.find({
        where: { userId: existingUser.id },
        select: ['serviceKey', 'status'],
      });

      return BaseController.ok(res, {
        exists: true,
        alreadyJoined: !!currentMembership,
        services: memberships.map(m => ({ key: m.serviceKey, name: getServiceName(m.serviceKey), status: m.status })),
      });
    } catch (error) {
      logger.error('[AuthRegisterController.checkEmail] Error', { error });
      return BaseController.error(res, 'Email check failed');
    }
  }

  /**
   * KPA-specific record creation (extracted for reuse in both new-user and existing-user flows)
   */
  private static async createKpaRecords(
    manager: import('typeorm').EntityManager,
    userId: string,
    data: RegisterRequestDto,
  ): Promise<void> {
    // KPA Society: auto-create KPA member (pharmacist with org, or student without org)
    if (data.service === 'kpa-society' && (data.organizationId || data.membershipType === 'student')) {
      const licenseNum = data.membershipType === 'pharmacist' ? (data.licenseNumber || null) : null;

      const memberResult = await manager.query(`
        INSERT INTO kpa_members (user_id, organization_id, membership_type, license_number, university_name, role, status, identity_status)
        VALUES ($1, $2, $3, $4, $5, 'member', 'pending', 'active')
        ON CONFLICT (user_id) DO NOTHING
        RETURNING id
      `, [
        userId,
        data.organizationId || null,
        data.membershipType || 'pharmacist',
        licenseNum,
        data.membershipType === 'student' ? (data.universityName || null) : null,
      ]);

      // 서비스별 승인 레코드 생성 (kpa-a: 커뮤니티)
      if (memberResult[0]?.id) {
        await manager.query(`
          INSERT INTO kpa_member_services (member_id, service_key, status)
          VALUES ($1, 'kpa-a', 'pending')
          ON CONFLICT (member_id, service_key) DO NOTHING
        `, [memberResult[0].id]);
      }
    }

    // WO-ROLE-NORMALIZATION-PHASE3-B-V1: create kpa_pharmacist_profiles record
    if (data.service === 'kpa-society' && (data.pharmacistFunction || data.licenseNumber)) {
      const functionToActivity: Record<string, string> = {
        pharmacy: 'pharmacy_employee', hospital: 'hospital',
        industry: 'other_industry', other: 'other',
      };
      await manager.query(
        `INSERT INTO kpa_pharmacist_profiles (user_id, license_number, activity_type)
         VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING`,
        [
          userId,
          data.licenseNumber || null,
          data.pharmacistFunction ? (functionToActivity[data.pharmacistFunction] || 'other') : null,
        ]
      );
    }
  }
}
