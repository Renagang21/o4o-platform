/**
 * SurveyService — Survey CRUD
 * WO-O4O-SURVEY-CORE-PHASE1-V1
 */

import { Repository, In } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import {
  Survey,
  SurveyQuestion,
  SurveyStatus,
  SurveyOwnerType,
  SurveyVisibility,
} from '@o4o/lms-core';
import type {
  CreateSurveyDto,
  UpdateSurveyDto,
  SurveyListQuery,
  CreateSurveyQuestionInput,
} from '../dto/survey.dto.js';
import logger from '../../../utils/logger.js';

export class SurveyService {
  private static instance: SurveyService;
  private surveyRepo: Repository<Survey>;
  private questionRepo: Repository<SurveyQuestion>;

  private constructor() {
    this.surveyRepo = AppDataSource.getRepository(Survey);
    this.questionRepo = AppDataSource.getRepository(SurveyQuestion);
  }

  static getInstance(): SurveyService {
    if (!SurveyService.instance) SurveyService.instance = new SurveyService();
    return SurveyService.instance;
  }

  async createSurvey(userId: string, data: CreateSurveyDto): Promise<Survey> {
    if (!data.title?.trim()) throw new Error('제목을 입력하세요');
    if (!Array.isArray(data.questions) || data.questions.length === 0) {
      throw new Error('질문을 1개 이상 추가하세요');
    }

    const survey = this.surveyRepo.create({
      title: data.title.trim(),
      description: data.description ?? undefined,
      status: SurveyStatus.DRAFT,
      isPublished: false,
      bundleId: undefined,
      startAt: data.startAt ? new Date(data.startAt as any) : undefined,
      endAt: data.endAt ? new Date(data.endAt as any) : undefined,
      allowAnonymous: data.allowAnonymous ?? false,
      allowMultipleResponses: data.allowMultipleResponses ?? false,
      maxResponses: data.maxResponses ?? undefined,
      responseCount: 0,
      metadata: {},
      serviceKey: data.serviceKey ?? 'global',
      ownerType: data.ownerType ?? SurveyOwnerType.COMMUNITY_MEMBER,
      ownerId: data.ownerId ?? userId,
      organizationId: data.organizationId,
      visibility: data.visibility ?? SurveyVisibility.MEMBERS_ONLY,
      targetFilter: data.targetFilter ?? {},
      createdBy: userId,
    });

    const saved = await this.surveyRepo.save(survey);

    // 질문 저장
    const questions = (data.questions ?? []).map((q, idx) => this.questionRepo.create({
      surveyId: saved.id,
      type: q.type,
      question: q.question?.trim() ?? '',
      description: q.description ?? undefined,
      options: q.options ?? [],
      order: q.order ?? idx,
      isRequired: q.isRequired ?? false,
      scaleMin: q.scaleMin,
      scaleMax: q.scaleMax,
      scaleMinLabel: q.scaleMinLabel,
      scaleMaxLabel: q.scaleMaxLabel,
      maxLength: q.maxLength,
      metadata: {},
    }));
    if (questions.length > 0) await this.questionRepo.save(questions);

    logger.info(`[Survey] Created: ${saved.title}`, { id: saved.id, owner: saved.ownerType });
    return saved;
  }

  async getSurveyWithQuestions(id: string): Promise<{ survey: Survey; questions: SurveyQuestion[] } | null> {
    const survey = await this.surveyRepo.findOne({ where: { id } });
    if (!survey) return null;
    const questions = await this.questionRepo.find({
      where: { surveyId: id },
      order: { order: 'ASC' },
    });
    return { survey, questions };
  }

  async listSurveys(query: SurveyListQuery, requesterUserId?: string, requesterRoles?: string[]): Promise<{ items: Survey[]; total: number }> {
    const qb = this.surveyRepo.createQueryBuilder('s');

    if (query.serviceKey) qb.andWhere('s.serviceKey = :serviceKey', { serviceKey: query.serviceKey });
    if (query.ownerType) qb.andWhere('s.ownerType = :ownerType', { ownerType: query.ownerType });
    if (query.ownerId) qb.andWhere('s.ownerId = :ownerId', { ownerId: query.ownerId });
    if (query.status) qb.andWhere('s.status = :status', { status: query.status });
    if (query.visibility) qb.andWhere('s.visibility = :visibility', { visibility: query.visibility });

    if (query.audience === 'mine' && requesterUserId) {
      qb.andWhere('(s.createdBy = :uid OR s.ownerId = :uid)', { uid: requesterUserId });
    } else if (query.audience === 'for-me') {
      // Phase 1 visibility 처리: public + members_only(로그인 시) + organization(추후)
      const conds: string[] = [`s.visibility = :public`];
      const params: Record<string, any> = { public: SurveyVisibility.PUBLIC };
      if (requesterUserId) {
        conds.push(`s.visibility = :membersOnly`);
        params.membersOnly = SurveyVisibility.MEMBERS_ONLY;
      }
      qb.andWhere(`(${conds.join(' OR ')})`, params);
      // 응답 가능 상태만
      qb.andWhere('s.status = :active', { active: SurveyStatus.ACTIVE });
    }

    qb.orderBy('s.createdAt', 'DESC');
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    // suppress unused param
    void requesterRoles;
    return { items, total };
  }

  async updateSurvey(id: string, data: UpdateSurveyDto): Promise<Survey> {
    const survey = await this.surveyRepo.findOne({ where: { id } });
    if (!survey) throw new Error('Survey not found');

    if (data.title !== undefined) survey.title = data.title.trim();
    if (data.description !== undefined) survey.description = data.description ?? undefined;
    if (data.status !== undefined) survey.status = data.status;
    if (data.startAt !== undefined) survey.startAt = data.startAt ? new Date(data.startAt as any) : undefined;
    if (data.endAt !== undefined) survey.endAt = data.endAt ? new Date(data.endAt as any) : undefined;
    if (data.allowAnonymous !== undefined) survey.allowAnonymous = data.allowAnonymous;
    if (data.allowMultipleResponses !== undefined) survey.allowMultipleResponses = data.allowMultipleResponses;
    if (data.maxResponses !== undefined) survey.maxResponses = data.maxResponses;
    if (data.visibility !== undefined) survey.visibility = data.visibility;
    if (data.targetFilter !== undefined) survey.targetFilter = data.targetFilter ?? {};

    const saved = await this.surveyRepo.save(survey);

    // 질문 교체 (DRAFT일 때만 — ACTIVE/CLOSED는 응답 무결성 보호)
    if (data.questions !== undefined && saved.status === SurveyStatus.DRAFT) {
      await this.questionRepo.delete({ surveyId: id });
      const newQuestions = data.questions.map((q: CreateSurveyQuestionInput, idx) => this.questionRepo.create({
        surveyId: id,
        type: q.type,
        question: q.question?.trim() ?? '',
        description: q.description ?? undefined,
        options: q.options ?? [],
        order: q.order ?? idx,
        isRequired: q.isRequired ?? false,
        scaleMin: q.scaleMin,
        scaleMax: q.scaleMax,
        scaleMinLabel: q.scaleMinLabel,
        scaleMaxLabel: q.scaleMaxLabel,
        maxLength: q.maxLength,
        metadata: {},
      }));
      if (newQuestions.length > 0) await this.questionRepo.save(newQuestions);
    }

    return saved;
  }

  async deleteSurvey(id: string): Promise<void> {
    // 질문/응답 cascade는 마이그레이션이 외래키를 명시하지 않았으므로 수동 정리
    await this.questionRepo.delete({ surveyId: id });
    await AppDataSource.query(`DELETE FROM lms_survey_responses WHERE "surveyId" = $1`, [id]);
    await this.surveyRepo.delete({ id });
  }

  /**
   * 응답자 자격(visibility) 검증 — Phase 1 단순 정책.
   * - public: 누구나
   * - members_only: 로그인 사용자
   * - organization: 같은 organization_id
   */
  async checkAccess(survey: Survey, userId: string | undefined, organizationId: string | undefined): Promise<{ allowed: boolean; reason?: string }> {
    if (survey.status !== SurveyStatus.ACTIVE) {
      return { allowed: false, reason: 'survey is not active' };
    }
    switch (survey.visibility) {
      case SurveyVisibility.PUBLIC:
        return { allowed: true };
      case SurveyVisibility.MEMBERS_ONLY:
        return userId ? { allowed: true } : { allowed: false, reason: 'login required' };
      case SurveyVisibility.ORGANIZATION:
        if (!survey.organizationId) return { allowed: false, reason: 'organization not specified' };
        if (organizationId !== survey.organizationId) return { allowed: false, reason: 'organization mismatch' };
        return { allowed: true };
      default:
        // Phase 1 미지원 visibility는 일단 차단
        return { allowed: false, reason: 'visibility not supported in Phase 1' };
    }
  }

  // 사용 안 함이지만 In/import 제거 회피용
  static _typesUsed = In;
}
