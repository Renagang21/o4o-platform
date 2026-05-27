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
// WO-O4O-IDENTITY-V2-PHASE1-REGISTER-LOGIN-V1: Identity V2 L2 Credential dual-write
import { ServiceCredential } from '../entities/ServiceCredential.js';
import type { RegisterRequestDto } from '../dto/index.js';
import logger from '../../../utils/logger.js';
import { getServiceName } from '../../../config/service-catalog.js';
import { PasswordResetService } from '../../../services/passwordResetService.js';
// WO-O4O-KPA-MEMBER-REGISTRATION-NOTIFICATION-PHASE1-V1:
//   KPA-Society 가입 신청 시 운영자에게 in-app 알림 발송.
//   contact-request.controller.ts 의 broadcast 패턴을 그대로 사용한다.
import { notificationService } from '../../../services/NotificationService.js';

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
      // WO-O4O-NETURE-SELLER-LEGACY-CLEANUP-TO-STORE-OWNER-PARTICIPANT-V1:
      // 'store_owner' = Neture 내부 participant type (권한 role 아님). 'seller' 는 legacy 호환 유지.
      // neture:store_owner role 은 생성하지 않으며 다른 서비스 store_owner 와 연결하지 않는다.
      const VALID_ROLES = ['super_admin', 'admin', 'vendor', 'seller', 'store_owner', 'user', 'business', 'partner', 'supplier', 'manager', 'customer', 'pharmacy'];

      const rawServiceKey = data.service || 'platform';
      // WO-O4O-KPA-MEMBERSHIP-SYNC-FIX-V1: canonical service_key — 'kpa' alias → 'kpa-society'
      const serviceKey = rawServiceKey === 'kpa' ? 'kpa-society' : rawServiceKey;

      // WO-O4O-NETURE-REGISTRATION-ROLE-SMOKING-GUN-FIX-V1:
      // Neture 가입 신청은 신청 역할이 명시되어야 한다 — role 누락 시 'customer' 로 폴백하지 않는다.
      // 허용 신청 role: supplier / partner / store_owner. (admin/operator 는 가입 신청 경로 미지원)
      // 다른 서비스(KPA / GlycoPharm / K-Cosmetics)의 가입 흐름은 영향 없음 — 기존 fallback 유지.
      const NETURE_ALLOWED_SIGNUP_ROLES = ['supplier', 'partner', 'store_owner'];
      if (serviceKey === 'neture') {
        if (!data.role || !NETURE_ALLOWED_SIGNUP_ROLES.includes(data.role)) {
          return BaseController.error(
            res,
            'Neture 가입 신청 역할이 필요합니다. (supplier / partner / store_owner)',
            400,
            'NETURE_SIGNUP_ROLE_REQUIRED',
          );
        }
      }

      const rawRole = data.membershipType === 'student'
        ? 'user'
        : (data.role || 'customer');
      const effectiveRole = VALID_ROLES.includes(rawRole) ? rawRole : 'user';

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
        // WO-O4O-EXISTING-ACCOUNT-SERVICE-PASSWORD-SEPARATION-V1:
        // currentPassword = 기존 계정 본인 확인용 (users.password 검증)
        // newServicePassword = 새 서비스 credential 저장용 (service_credentials[serviceKey])
        // 둘 다 없으면 password 단일 필드 fallback (legacy 호환)
        const identityPassword = data.currentPassword ?? data.password;
        const newServicePassword = data.servicePassword ?? data.password;
        if (!data.currentPassword || !data.servicePassword) {
          logger.warn('[AuthRegisterController.register] Existing account registration: missing currentPassword or servicePassword, falling back to legacy single-password flow', {
            userId: existingUser.id,
            serviceKey,
            hasCurrentPassword: !!data.currentPassword,
            hasServicePassword: !!data.servicePassword,
          });
        }
        const passwordMatch = await comparePassword(identityPassword, existingUser.password);
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

          // WO-O4O-EXISTING-ACCOUNT-SERVICE-PASSWORD-SEPARATION-V1: Identity V2 dual-write
          // newServicePassword = servicePassword (새 서비스 전용) 또는 password (legacy fallback).
          // 본인 확인은 위에서 identityPassword(=currentPassword ?? password)로 완료됨.
          const txCredRepo = manager.getRepository(ServiceCredential);
          await txCredRepo.upsert(
            {
              userId: existingUser.id,
              serviceKey,
              passwordHash: await hashPassword(newServicePassword),
            },
            ['userId', 'serviceKey'],
          );

          // WO-O4O-GLYCOPHARM-SIGNUP-REFORM-V1: businessInfo 머지 (기존 정보 보존 + 신규 추가)
          // WO-O4O-BUSINESS-REGISTRATION-FIELD-NAMING-STANDARD-V1: canonical fields
          const newBiz: Record<string, any> = {};
          const effectiveBusinessName = data.businessName || data.companyName;
          if (effectiveBusinessName) newBiz.businessName = effectiveBusinessName;
          if (data.businessNumber) newBiz.businessNumber = data.businessNumber;
          if (data.businessType) newBiz.businessType = data.businessType;
          // 종목 — businessItem canonical (businessCategory fallback)
          const effectiveBusinessItem = data.businessItem ?? data.businessCategory;
          if (effectiveBusinessItem) newBiz.businessItem = effectiveBusinessItem;
          // 대표자명 — representativeName canonical (ceoName fallback)
          const effectiveRepresentativeName = data.representativeName ?? data.ceoName;
          if (effectiveRepresentativeName) newBiz.representativeName = effectiveRepresentativeName;
          // 세금계산서 이메일 — taxInvoiceEmail canonical (taxEmail fallback)
          const effectiveTaxInvoiceEmail = data.taxInvoiceEmail ?? data.taxEmail;
          if (effectiveTaxInvoiceEmail) newBiz.taxInvoiceEmail = effectiveTaxInvoiceEmail;
          if (data.contactName) newBiz.contactName = data.contactName;
          if (data.managerPhone) newBiz.managerPhone = data.managerPhone;
          if (data.zipCode) newBiz.zipCode = data.zipCode;
          // 사업장 주소 — businessAddress canonical (address1 legacy fallback)
          const effectiveBusinessAddress = data.businessAddress || data.address1;
          if (effectiveBusinessAddress) newBiz.businessAddress = effectiveBusinessAddress;
          const effectiveBusinessAddressDetail = data.businessAddressDetail || data.address2;
          if (effectiveBusinessAddressDetail) newBiz.businessAddressDetail = effectiveBusinessAddressDetail;
          if (Object.keys(newBiz).length > 0) {
            const merged = { ...(existingUser.businessInfo || {}), ...newBiz };
            await manager.query(
              `UPDATE users SET "businessInfo" = $1 WHERE id = $2`,
              [JSON.stringify(merged), existingUser.id]
            );
          }

          // KPA Society: auto-create KPA member
          await AuthRegisterController.createKpaRecords(manager, existingUser.id, data);

          // WO-O4O-GLYCOPHARM-PHARMACY-OWNER-SIGNUP-AND-APPROVAL-FLOW-ALIGNMENT-V1:
          // GlycoPharm 약국 경영자 가입 시 glycopharm_applications 자동 생성
          await AuthRegisterController.createGlycopharmApplication(manager, existingUser.id, data, effectiveRole);
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
        // WO-O4O-BUSINESS-REGISTRATION-FIELD-NAMING-STANDARD-V1: canonical fields
        const effectiveBusinessName = data.businessName || data.companyName;
        const businessInfo: Record<string, any> = {};
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
        // 종목 — businessItem canonical (businessCategory fallback)
        const effectiveBusinessItem = data.businessItem ?? data.businessCategory;
        if (effectiveBusinessItem) {
          businessInfo.businessItem = effectiveBusinessItem;
        }
        // 대표자명 — representativeName canonical (ceoName fallback)
        const effectiveRepresentativeName = data.representativeName ?? data.ceoName;
        if (effectiveRepresentativeName) {
          businessInfo.representativeName = effectiveRepresentativeName;
        }
        // 세금계산서 이메일 — taxInvoiceEmail canonical (taxEmail fallback)
        const effectiveTaxInvoiceEmail = data.taxInvoiceEmail ?? data.taxEmail;
        if (effectiveTaxInvoiceEmail) {
          businessInfo.taxInvoiceEmail = effectiveTaxInvoiceEmail;
        }
        if (data.contactName) {
          businessInfo.contactName = data.contactName;
        }
        if (data.managerPhone) {
          businessInfo.managerPhone = data.managerPhone;
        }
        // WO-O4O-POSTAL-CODE-ADDRESS-V1: zipCode 저장
        if (data.zipCode) {
          businessInfo.zipCode = data.zipCode;
        }
        // 사업장 주소 — businessAddress canonical (address1 legacy fallback)
        const effectiveBusinessAddress = data.businessAddress || data.address1;
        if (effectiveBusinessAddress) {
          businessInfo.businessAddress = effectiveBusinessAddress;
        }
        const effectiveBusinessAddressDetail = data.businessAddressDetail || data.address2;
        if (effectiveBusinessAddressDetail) {
          businessInfo.businessAddressDetail = effectiveBusinessAddressDetail;
        }
        // WO-O4O-STORE-PROFILE-UNIFICATION-V1: 구조화된 주소 dual write
        if (data.address1) {
          (businessInfo as any).storeAddress = {
            ...(data.zipCode ? { zipCode: data.zipCode } : {}),
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

        // WO-O4O-IDENTITY-V2-PHASE1-REGISTER-LOGIN-V1: Identity V2 dual-write
        // 신규 사용자의 첫 service_credentials row. users.password 와 동일한 hash 재사용
        // (이미 위에서 한 번 해싱했으므로 비용 절감). 정의상 첫 row 이므로 upsert 의 update 경로는
        // 트리거되지 않으나 방어적으로 upsert 사용.
        const txCredRepo = manager.getRepository(ServiceCredential);
        await txCredRepo.upsert(
          {
            userId: newUser.id,
            serviceKey,
            passwordHash: hashedPassword,
          },
          ['userId', 'serviceKey'],
        );

        // KPA Society: auto-create KPA member
        await AuthRegisterController.createKpaRecords(manager, newUser.id, data);

        // WO-O4O-GLYCOPHARM-PHARMACY-OWNER-SIGNUP-AND-APPROVAL-FLOW-ALIGNMENT-V1:
        // GlycoPharm 약국 경영자 가입 시 glycopharm_applications 자동 생성
        await AuthRegisterController.createGlycopharmApplication(manager, newUser.id, data, effectiveRole);

        // WO-O4O-AUTH-REGISTER-UX-IMPROVEMENT-V1: RoleAssignment는 서비스 승인 시에만 생성

        return newUser;
      });

      // Send email verification (optional - don't fail if email fails)
      // WO-O4O-EMAIL-VERIFICATION-LINK-PRODUCTION-URL-FIX-V1: serviceKey 주입으로 production URL 보장
      try {
        await PasswordResetService.requestEmailVerification(user.id, serviceKey);
      } catch (emailError) {
        logger.warn('[AuthRegisterController.register] Email verification failed', {
          error: emailError,
          userId: user.id,
        });
      }

      // ─────────────────────────────────────────────────────────────────────
      // WO-O4O-KPA-MEMBER-REGISTRATION-NOTIFICATION-PHASE1-V1
      // KPA-society 가입 신청 시 운영자(kpa:operator / kpa:admin) in-app 알림 broadcast.
      // contact-request.controller.ts 의 검증된 패턴 재사용. best-effort — 실패해도 회원가입 성공.
      // ─────────────────────────────────────────────────────────────────────
      if (serviceKey === 'kpa-society') {
        try {
          const operators: { userId: string }[] = await AppDataSource.query(
            `SELECT DISTINCT user_id AS "userId"
               FROM role_assignments
              WHERE role IN ('kpa:operator','kpa:admin')
                AND is_active = true
              LIMIT 20`,
          );
          const membershipType = data.membershipType || 'pharmacist';
          const isStudent = membershipType === 'student' || membershipType === 'pharmacy_student_member';
          const memberTypeLabel = isStudent ? '약대생 준회원' : '약사 정회원';
          const activityType = data.activityType || null;
          const isPharmacyOwner = activityType === 'pharmacy_owner';
          const activityLabel = isPharmacyOwner ? ' (개설약사)' : '';

          await Promise.allSettled(
            operators.map((op) =>
              notificationService.createNotification({
                userId: op.userId,
                type: 'member.registration_pending',
                title: '신규 KPA 회원 가입 신청',
                message: `${resolvedName || data.email}님이 ${memberTypeLabel}${activityLabel} 가입을 신청했습니다.`,
                serviceKey: 'kpa-society',
                actorId: user.id,
                metadata: {
                  userId: user.id,
                  membershipType,
                  activityType,
                  pharmacyName: data.pharmacyName || null,
                  targetUrl: '/operator/members?tab=status-pending',
                },
              }),
            ),
          );
        } catch (notifyError) {
          logger.warn('[AuthRegisterController.register] Operator notification failed (best-effort)', {
            error: notifyError instanceof Error ? notifyError.message : String(notifyError),
            userId: user.id,
          });
        }
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
    // WO-O4O-KPA-MEMBERSHIP-SYNC-FIX-V1: accept canonical + legacy service_key
    const isKpaSociety = data.service === 'kpa-society' || data.service === 'kpa';
    if (!isKpaSociety) return;

    // WO-O4O-KPA-REGISTER-CANONICAL-CLEANUP-V1:
    //   canonical = pharmacist_member / pharmacy_student_member
    //   legacy 별칭 = pharmacist / student (정규화 후 동일 처리)
    const VALID_MEMBER_TYPES = [
      'pharmacist', 'pharmacist_member',
      'student', 'pharmacy_student_member',
    ] as const;
    const rawMemberType = data.membershipType || 'pharmacist';
    const memberType: string = (VALID_MEMBER_TYPES as readonly string[]).includes(rawMemberType)
      ? rawMemberType
      : 'pharmacist';

    const isPharmacist = memberType === 'pharmacist' || memberType === 'pharmacist_member';
    const isStudent = memberType === 'student' || memberType === 'pharmacy_student_member';

    // WO-O4O-KPA-REGISTER-MODAL-ACTIVITY-AND-PHARMACY-OWNER-INTEGRATION-V1:
    //   가입 단계에서 직역/근무처/사업자 정보 수용.
    //   activity_type 은 frontend 6종 canonical → backend 11종 enum 부분집합.
    //   pharmacistFunction(legacy) 은 매핑하여 fallback (deprecated 호환).
    const VALID_ACTIVITY_TYPES = new Set([
      'pharmacy_owner', 'pharmacy_employee', 'hospital', 'manufacturer',
      'importer', 'wholesaler', 'other_industry', 'government', 'school', 'other', 'inactive',
    ]);
    const legacyFunctionToActivity: Record<string, string> = {
      pharmacy: 'pharmacy_employee', hospital: 'hospital',
      industry: 'other_industry', other: 'other',
    };
    let resolvedActivityType: string | null = null;
    if (isPharmacist) {
      if (data.activityType && VALID_ACTIVITY_TYPES.has(data.activityType)) {
        resolvedActivityType = data.activityType;
      } else if (data.pharmacistFunction && legacyFunctionToActivity[data.pharmacistFunction]) {
        resolvedActivityType = legacyFunctionToActivity[data.pharmacistFunction];
      }
    }
    const isPharmacyOwner = isPharmacist && resolvedActivityType === 'pharmacy_owner';

    const licenseNum = isPharmacist ? (data.licenseNumber || null) : null;
    const pharmacyNameValue = isPharmacist ? (data.pharmacyName || null) : null;
    const pharmacyAddressValue = isPharmacist ? (data.pharmacyAddress || null) : null;

    // KPA Society: auto-create KPA member (pending)
    const memberResult = await manager.query(`
      INSERT INTO kpa_members (
        user_id, organization_id, membership_type,
        license_number, university_name,
        pharmacy_name, pharmacy_address, activity_type,
        role, status, identity_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'member', 'pending', 'active')
      ON CONFLICT (user_id) DO NOTHING
      RETURNING id
    `, [
      userId,
      data.organizationId || null,
      memberType,
      licenseNum,
      isStudent ? (data.universityName || null) : null,
      pharmacyNameValue,
      pharmacyAddressValue,
      resolvedActivityType,
    ]);

    // 서비스별 승인 레코드 생성 (kpa-a: 커뮤니티)
    if (memberResult[0]?.id) {
      await manager.query(`
        INSERT INTO kpa_member_services (member_id, service_key, status)
        VALUES ($1, 'kpa-a', 'pending')
        ON CONFLICT (member_id, service_key) DO NOTHING
      `, [memberResult[0].id]);
    }

    // WO-ROLE-NORMALIZATION-PHASE3-B-V1: kpa_pharmacist_profiles record (SSOT for activity_type)
    if (isPharmacist && (resolvedActivityType || data.licenseNumber)) {
      await manager.query(
        `INSERT INTO kpa_pharmacist_profiles (user_id, license_number, activity_type)
         VALUES ($1, $2, $3) ON CONFLICT (user_id) DO NOTHING`,
        [userId, data.licenseNumber || null, resolvedActivityType]
      );
    }

    // WO-O4O-KPA-REGISTER-MODAL-ACTIVITY-AND-PHARMACY-OWNER-INTEGRATION-V1:
    //   개설약사: 사업자 정보를 users.businessInfo JSONB 에 merge.
    //   (organization_stores 자동 생성·kpa:store_owner 자동 부여는 본 WO 범위 외 — pharmacy_request 흐름 유지)
    if (isPharmacyOwner) {
      // WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1: ceoName/taxInvoiceEmail canonical.
      const businessFields = {
        businessNumber: data.businessNumber || null,
        businessName: data.businessName || data.pharmacyName || null,
        ceoName: data.ceoName ?? data.representativeName ?? null,
        taxInvoiceEmail: data.taxInvoiceEmail ?? data.taxEmail ?? null,
        managerPhone: data.managerPhone || null,
        zipCode: data.zipCode || null,
        address: data.address1 || data.pharmacyAddress || null,
        address2: data.address2 || null,
      };
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(businessFields)) {
        if (value !== null && value !== undefined && value !== '') sanitized[key] = value;
      }
      if (Object.keys(sanitized).length > 0) {
        const [existingUser] = await manager.query(
          `SELECT "businessInfo" FROM users WHERE id = $1`,
          [userId]
        );
        const merged = { ...(existingUser?.businessInfo || {}), ...sanitized };
        await manager.query(
          `UPDATE users SET "businessInfo" = $1 WHERE id = $2`,
          [JSON.stringify(merged), userId]
        );
      }
    }
  }

  /**
   * WO-O4O-GLYCOPHARM-PHARMACY-OWNER-SIGNUP-AND-APPROVAL-FLOW-ALIGNMENT-V1
   *
   * GlycoPharm 약국 경영자 가입 시 glycopharm_applications 레코드 자동 생성.
   * 이를 통해 운영자가 GlycoPharm 신청 화면에서 검토/승인 가능.
   * 승인 시 organization_store + organization_service_enrollments + 환자 검색 노출까지 자동 연결됨.
   *
   * 조건:
   * - service === 'glycopharm'
   * - role === 'pharmacy' (약국 경영자)
   * - businessName 있음 (약국 신청 최소 정보)
   *
   * 멱등: ON CONFLICT DO NOTHING (user_id 기준 중복 방지)
   */
  private static async createGlycopharmApplication(
    manager: import('typeorm').EntityManager,
    userId: string,
    data: RegisterRequestDto,
    effectiveRole: string,
  ): Promise<void> {
    if (data.service !== 'glycopharm') return;

    // WO-O4O-GLYCOPHARM-REGISTRATION-ROLE-TYPE-ALIGNMENT-V1:
    // 약사/근무약사 신규 가입 시 glycopharm_members 레코드 생성 (pending)
    if (data.subRole === 'staff_pharmacist') {
      const existingMember = await manager.query(
        `SELECT id FROM glycopharm_members WHERE user_id = $1 LIMIT 1`,
        [userId],
      );
      if (existingMember.length > 0) return;

      await manager.query(
        `INSERT INTO glycopharm_members (id, user_id, membership_type, sub_role, status, metadata, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, 'pharmacist', 'staff_pharmacist', 'pending', $2::jsonb, NOW(), NOW())`,
        [userId, JSON.stringify({ licenseNumber: data.licenseNumber || null })],
      );
      return;
    }

    if (effectiveRole !== 'pharmacy') return;

    const businessName = data.businessName || data.companyName;
    if (!businessName) return;

    // 멱등 INSERT — 이미 application이 있으면 스킵
    const existing = await manager.query(
      `SELECT id FROM glycopharm_applications WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    if (existing.length > 0) return;

    // 약국 경영자 신청 metadata snapshot — WO-O4O-KPA-BUSINESSINFO-CANONICAL-FORM-ALIGNMENT-V1: ceoName/taxInvoiceEmail canonical.
    const metadata: Record<string, any> = {};
    const metaCeoName = data.ceoName ?? data.representativeName;
    if (metaCeoName) metadata.ceoName = metaCeoName;
    if (data.licenseNumber) metadata.licenseNumber = data.licenseNumber;
    const metaTaxInvoiceEmail = data.taxInvoiceEmail ?? data.taxEmail;
    if (metaTaxInvoiceEmail) metadata.taxInvoiceEmail = metaTaxInvoiceEmail;
    if (data.businessType) metadata.businessType = data.businessType;
    if (data.businessCategory) metadata.businessCategory = data.businessCategory;
    if (data.managerPhone) metadata.managerPhone = data.managerPhone;
    if (data.zipCode) metadata.zipCode = data.zipCode;
    if (data.address1) metadata.address = data.address1;
    if (data.address2) metadata.addressDetail = data.address2;
    if (data.phone) metadata.phone = data.phone;

    await manager.query(
      `INSERT INTO glycopharm_applications (
        id, user_id, organization_type, organization_name, business_number,
        service_types, status, submitted_at, metadata, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 'pharmacy', $2, $3,
        '["dropshipping"]'::jsonb, 'submitted', NOW(), $4::jsonb, NOW(), NOW()
      )`,
      [
        userId,
        businessName,
        data.businessNumber || null,
        JSON.stringify(metadata),
      ],
    );
  }
}
