import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { BaseService } from '../../../common/base.service.js';
import { Certificate } from '@o4o/lms-core';
import { CourseService } from './CourseService.js';
import { EnrollmentService } from './EnrollmentService.js';
import logger from '../../../utils/logger.js';

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

export interface CertificateFilters {
  userId?: string;
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
    // Check if certificate already exists
    const existing = await this.certificateRepository.findOne({
      where: {
        userId: data.userId,
        courseId: data.courseId
      }
    });

    if (existing) {
      throw new Error('Certificate already issued for this user and course');
    }

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

    // Generate certificate number and verification code
    const certificateNumber = Certificate.generateCertificateNumber();
    const verificationCode = Certificate.generateVerificationCode();

    // Create certificate
    const certificate = this.certificateRepository.create({
      userId: data.userId,
      courseId: data.courseId,
      certificateNumber,
      verificationCode,
      finalScore: data.finalScore || enrollment.finalScore,
      credits: course.credits,
      completedAt: enrollment.completedAt || new Date(),
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

    const saved = await this.certificateRepository.save(certificate);

    // Update enrollment with certificate ID
    await this.enrollmentService.updateEnrollment(enrollment.id, {
      // @ts-ignore
      certificateId: saved.id
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
    return this.certificateRepository.findOne({
      where: { id },
      relations: ['user', 'course']
    });
  }

  async getCertificateByNumber(certificateNumber: string): Promise<Certificate | null> {
    return this.certificateRepository.findOne({
      where: { certificateNumber },
      relations: ['user', 'course']
    });
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

    return certificate;
  }

  async listCertificates(filters: CertificateFilters = {}): Promise<{ certificates: Certificate[]; total: number }> {
    const {
      userId,
      courseId,
      isValid,
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

    const [certificates, total] = await query.getManyAndCount();

    return { certificates, total };
  }

  async updateCertificate(id: string, data: UpdateCertificateRequest): Promise<Certificate> {
    const certificate = await this.getCertificate(id);
    if (!certificate) {
      throw new Error(`Certificate not found: ${id}`);
    }

    // Update fields
    Object.assign(certificate, data);

    const updated = await this.certificateRepository.save(certificate);

    logger.info(`[LMS] Certificate updated`, { id: updated.id });

    return updated;
  }

  async revokeCertificate(id: string): Promise<Certificate> {
    const certificate = await this.getCertificate(id);
    if (!certificate) {
      throw new Error(`Certificate not found: ${id}`);
    }

    certificate.revoke();
    const updated = await this.certificateRepository.save(certificate);

    logger.info(`[LMS] Certificate revoked`, { id: updated.id });

    return updated;
  }

  async renewCertificate(id: string, months: number = 12): Promise<Certificate> {
    const certificate = await this.getCertificate(id);
    if (!certificate) {
      throw new Error(`Certificate not found: ${id}`);
    }

    certificate.renew(months);
    const updated = await this.certificateRepository.save(certificate);

    logger.info(`[LMS] Certificate renewed`, { id: updated.id, months });

    return updated;
  }
}
