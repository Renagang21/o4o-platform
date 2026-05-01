/**
 * SurveyResponseService — 응답 제출/조회
 * WO-O4O-SURVEY-CORE-PHASE1-V1
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import {
  Survey,
  SurveyResponse,
  ResponseStatus,
  type QuestionAnswer,
} from '@o4o/lms-core';
import type { SubmitResponseDto } from '../dto/survey.dto.js';
import logger from '../../../utils/logger.js';

export class SurveyResponseService {
  private static instance: SurveyResponseService;
  private responseRepo: Repository<SurveyResponse>;
  private surveyRepo: Repository<Survey>;

  private constructor() {
    this.responseRepo = AppDataSource.getRepository(SurveyResponse);
    this.surveyRepo = AppDataSource.getRepository(Survey);
  }

  static getInstance(): SurveyResponseService {
    if (!SurveyResponseService.instance) SurveyResponseService.instance = new SurveyResponseService();
    return SurveyResponseService.instance;
  }

  /**
   * 응답 제출. 중복 방지:
   *   - 기명: (surveyId, userId) UNIQUE
   *   - 익명: (surveyId, anonymous_token) UNIQUE (DB-level partial index)
   */
  async submitResponse(
    surveyId: string,
    userId: string | undefined,
    organizationId: string | undefined,
    serviceKey: string,
    data: SubmitResponseDto,
    isAnonymous: boolean,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SurveyResponse> {
    if (!Array.isArray(data.answers)) throw new Error('answers는 배열이어야 합니다');

    // 중복 방지 체크 (DB index도 있지만 명확한 에러 메시지 제공)
    if (!isAnonymous && userId) {
      const existing = await this.responseRepo.findOne({ where: { surveyId, userId } });
      if (existing) throw new Error('이미 응답한 설문입니다');
    } else if (isAnonymous && data.anonymousToken) {
      // anonymous_token은 lower-level column. raw query로 확인
      const existing = await AppDataSource.query(
        `SELECT id FROM lms_survey_responses WHERE "surveyId" = $1 AND anonymous_token = $2 LIMIT 1`,
        [surveyId, data.anonymousToken]
      );
      if (existing.length > 0) throw new Error('이미 응답한 설문입니다');
    }

    const answers: QuestionAnswer[] = (data.answers ?? []).map((a) => ({
      questionId: a.questionId,
      value: a.value,
      answeredAt: new Date(),
    }));

    const response = this.responseRepo.create({
      surveyId,
      userId: isAnonymous ? undefined : userId,
      answers,
      status: ResponseStatus.COMPLETED,
      completedAt: new Date(),
      isAnonymous,
      ipAddress,
      userAgent,
      metadata: {},
      serviceKey,
      organizationId,
      anonymousToken: isAnonymous ? data.anonymousToken : undefined,
    });

    const saved = await this.responseRepo.save(response);

    // responseCount++
    await this.surveyRepo.increment({ id: surveyId }, 'responseCount', 1);

    logger.info(`[Survey] Response submitted`, { surveyId, anonymous: isAnonymous });
    return saved;
  }

  async getMyResponse(surveyId: string, userId: string | undefined, anonymousToken?: string): Promise<SurveyResponse | null> {
    if (userId) {
      return this.responseRepo.findOne({ where: { surveyId, userId } });
    }
    if (anonymousToken) {
      const rows = await AppDataSource.query(
        `SELECT * FROM lms_survey_responses WHERE "surveyId" = $1 AND anonymous_token = $2 LIMIT 1`,
        [surveyId, anonymousToken]
      );
      return rows.length > 0 ? rows[0] : null;
    }
    return null;
  }

  async listResponses(surveyId: string, page = 1, limit = 50): Promise<{ items: SurveyResponse[]; total: number }> {
    const [items, total] = await this.responseRepo.findAndCount({
      where: { surveyId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total };
  }
}
