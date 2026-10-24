import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import { Certificate } from '@o4o/lms-core';
import { CourseService } from './CourseService.js';
import { EnrollmentService } from './EnrollmentService.js';
import { sanitizeUserFields } from '../utils/sanitize-user.js';
import { changeLectureCertificate, recordCertificateIssue, revokeLectureCertificate } from './certificate-operation.service.js';
import logger from '../../../utils/logger.js';
// WO-O4O-LMS-CROSSSERVICE-READ-WRITE-BOUNDARY-COMPLETION-V1
import { applyCourseScopeToQuery } from '../utils/lms-scope-guard.js';

export interface IssueCertificateRequest {
  userId: string;
  courseId: string;
  finalScore?: number;
  issuerName?: string;
  issuerTitle?: string;
  metadata?: Record<string, any>;
}

export interface UpdateCertificateRequest {
  certificateUrl?: string;
  badgeUrl?: string;
  isValid?: boolean;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * PR #225 merge-gate 11차 P1: certificate 수정 가능 필드 allowlist.
 *
 * `updateCertificate` 는 `Object.assign(certificate, data)` 로 임의 키를 반영했기 때문에
 * `courseId` · `userId` · `id` 를 실어 보내면 scope 검사(lecture 인지)를 통과한 뒤
 * 인증서를 다른 강의 · 다른 사용자 소유로 옮길 수 있었다.
 * 계약: 지원하는 5개 필드 밖의 키는 조용히 버린다.
 */
const UPDATABLE_CERTIFICATE_FIELDS = [
  'certificateUrl',
  'badgeUrl',
  'isValid',
  'expiresAt',
  'metadata',
] as const satisfies ReadonlyArray<keyof UpdateCertificateRequest>;

export function pickUpdatableCertificateFields(input: unknown): UpdateCertificateRequest {
  const source = (input ?? {}) as Record<string, unknown>;
  const picked: Record<string, unknown> = {};
  for (const key of UPDATABLE_CERTIFICATE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      picked[key] = source[key];
    }
  }
  return picked as UpdateCertificateRequest;
}

export interface CertificateFilters {
  userId?: string;
  /**
   * WO-O4O-LMS-CROSSSERVICE-READ-WRITE-BOUNDARY-COMPLETION-V1
   * canonical service key (controller 해석값). undefined = 무경계.
   */
  serviceKey?: string;
  courseId?: string;
  isValid?: boolean;
  page?: number;
  limit?: number;
}

export class CertificateService extends BaseService<Certificate> {
  private static instance: CertificateService;
  private certificateRepository: Repository<Certificate>;
  private courseService: CourseService;
  private enrollmentService: EnrollmentService;

  constructor() {
    const certificateRepository = AppDataSource.getRepository(Certificate);
    super(certificateRepository);
    this.certificateRepository = certificateRepository;
    this.courseService = CourseService.getInstance();
    this.enrollmentService = EnrollmentService.getInstance();
  }

  static getInstance(): CertificateService {
    if (!CertificateService.instance) {
      CertificateService.instance = new CertificateService();
    }
    return CertificateService.instance;
  }

  // CRUD Operations
  async issueCertificate(data: IssueCertificateRequest, issuedBy?: string): Promise<Certificate> {
    // ── POLICY: IR-O4O-MARKETING-CONTENT-REWARD-POLICY-V1 ─────────────────────────
    // 수료증 발급 정책:
    //   Certificate는 동일 userId + courseId 기준 1회만 발급한다.
    //   재참여 후 재완료가 발생하더라도 수료증을 재발급하지 않는다.
    //   (아래 dedup 체크에서 throw — CompletionService에서 catch 처리)
    // ────────────────────────────────────────────────────────────────────────────────
    // Get course and enrollment info
    const course = await this.courseService.getCourse(data.courseId);
    if (!course) {
      throw new Error(`Course not found: ${data.courseId}`);
    }

    const enrollment = await this.enrollmentService.getEnrollmentByUserAndCourse(
      data.userId,
      data.courseId
    );

    if (!enrollment) {
      throw new Error('User must be enrolled in the course to receive a certificate');
    }

    if (!enrollment.isCompleted()) {
      throw new Error('Course must be completed before issuing certificate');
    }

    // WO-O4O-LECTURE-CERTIFICATE-OPERATION-HISTORY-UNIFICATION-V1: completion re-check, duplicate check,
    // certificate row, enrollment link and issue history commit together under the enrollment row lock.
    const saved = await AppDataSource.transaction(async manager => {
      const [locked] = await manager.query(
        'SELECT status, "completedAt" FROM lms_enrollments WHERE id=$1 FOR UPDATE',
        [enrollment.id]
      );
      if (!locked || locked.status !== 'completed') {
        throw new Error('Course must be completed before issuing certificate');
      }

      const existing = await manager.query(
        'SELECT 1 FROM lms_certificates WHERE "userId"=$1 AND "courseId"=$2 LIMIT 1',
        [data.userId, data.courseId]
      );
      if (existing.length) {
        throw new Error('Certificate already issued for this user and course');
      }

      const repository = manager.getRepository(Certificate);
      const certificate = repository.create({
        userId: data.userId,
        courseId: data.courseId,
        certificateNumber: Certificate.generateCertificateNumber(),
        verificationCode: Certificate.generateVerificationCode(),
        finalScore: data.finalScore || enrollment.finalScore,
        credits: course.credits,
        completedAt: locked.completedAt || enrollment.completedAt || new Date(),
        issuedBy,
        issuerName: data.issuerName,
        issuerTitle: data.issuerTitle,
        isValid: true,
        metadata: {
          ...data.metadata,
          courseDuration: course.duration,
          enrollmentDate: enrollment.enrolledAt,
          completionDate: enrollment.completedAt,
          instructor: course.instructorId,
          organization: course.organizationId
        }
      });

      let row: Certificate;
      try {
        row = await repository.save(certificate);
      } catch (error: any) {
        // lms_certificates_userId_courseId_key: a concurrent issue for the same pair won.
        if (error?.code === '23505' || error?.driverError?.code === '23505') {
          throw new Error('Certificate already issued for this user and course');
        }
        throw error;
      }
      await manager.query('UPDATE lms_enrollments SET "certificateId"=$1 WHERE id=$2', [row.id, enrollment.id]);
      await recordCertificateIssue(manager, row, issuedBy);
      return row;
    });

    logger.info(`[LMS] Certificate issued`, {
      certificateId: saved.id,
      certificateNumber: saved.certificateNumber,
      userId: data.userId,
      courseId: data.courseId
    });

    return saved;
  }

  async getCertificate(id: string): Promise<Certificate | null> {
    const cert = await this.certificateRepository.findOne({
      where: { id },
      relations: ['user', 'course']
    });
    if (cert) {
      (cert as any).user = sanitizeUserFields((cert as any).user);
    }
    return cert;
  }

  async getCertificateByNumber(certificateNumber: string): Promise<Certificate | null> {
    const cert = await this.certificateRepository.findOne({
      where: { certificateNumber },
      relations: ['user', 'course']
    });
    if (cert) {
      (cert as any).user = sanitizeUserFields((cert as any).user);
    }
    return cert;
  }

  async verifyCertificate(verificationCode: string): Promise<Certificate | null> {
    const certificate = await this.certificateRepository.findOne({
      where: { verificationCode },
      relations: ['user', 'course']
    });

    if (!certificate) {
      return null;
    }

    // Check if expired
    if (certificate.isExpired()) {
      return null;
    }

    // Check if valid
    if (!certificate.isValid) {
      return null;
    }

    (certificate as any).user = sanitizeUserFields((certificate as any).user);
    return certificate;
  }

  async listCertificates(filters: CertificateFilters = {}): Promise<{ certificates: Certificate[]; total: number }> {
    const {
      userId,
      courseId,
      isValid,
      serviceKey,
      page = 1,
      limit = 20
    } = filters;

    const query = this.certificateRepository.createQueryBuilder('certificate');

    // Filters
    if (userId) {
      query.andWhere('certificate.userId = :userId', { userId });
    }

    if (courseId) {
      query.andWhere('certificate.courseId = :courseId', { courseId });
    }

    if (isValid !== undefined) {
      query.andWhere('certificate.isValid = :isValid', { isValid });
    }

    // Pagination
    query
      .orderBy('certificate.issuedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    // Include relations
    query.leftJoinAndSelect('certificate.user', 'user');
    query.leftJoinAndSelect('certificate.course', 'course');

    // WO-O4O-LMS-CROSSSERVICE-READ-WRITE-BOUNDARY-COMPLETION-V1: SQL 단계 service scope.
    applyCourseScopeToQuery(query, 'course', serviceKey);

    const [certificates, total] = await query.getManyAndCount();

    // WO-KPA-LMS-INSTRUCTOR-RESPONSE-SANITIZATION-V1
    for (const cert of certificates) {
      (cert as any).user = sanitizeUserFields((cert as any).user);
    }

    return { certificates, total };
  }

  async updateCertificate(id: string, input: UpdateCertificateRequest, actorId?: string, operationId?: unknown): Promise<Certificate> {
    // PR #225 merge-gate 11차 P1: allowlist 밖 키(courseId · userId · id)는 여기서 제거한다.
    const data = pickUpdatableCertificateFields(input);
    const updated = await changeLectureCertificate(AppDataSource, id, actorId, 'update', { patch: data, operationId });

    logger.info(`[LMS] Certificate updated`, { id });

    return Object.assign(new Certificate(), updated);
  }

  async revokeCertificate(id: string, actorId?: string, reason: unknown = '', operationId?: unknown): Promise<Certificate> {
    return Object.assign(new Certificate(), await revokeLectureCertificate(AppDataSource, id, actorId, reason, operationId));
  }

  async renewCertificate(id: string, months: unknown = 12, actorId?: string, operationId?: unknown): Promise<Certificate> {
    const updated = await changeLectureCertificate(AppDataSource, id, actorId, 'renew', { months, operationId });

    logger.info(`[LMS] Certificate renewed`, { id, months });

    return Object.assign(new Certificate(), updated);
  }
}
