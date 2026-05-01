/**
 * SurveyAggregationService — 응답 집계
 * WO-O4O-SURVEY-CORE-PHASE1-V1
 *
 * Phase 1: on-demand 집계 (responses 테이블 GroupBy).
 * 1만건 이상 응답 시 별도 aggregation 테이블 또는 materialized view 도입 검토.
 */

import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import {
  Survey,
  SurveyQuestion,
  SurveyResponse,
  QuestionType,
  type QuestionAnswer,
} from '@o4o/lms-core';

export interface QuestionAggregation {
  questionId: string;
  questionTitle: string;
  questionType: QuestionType;
  totalAnswers: number;
  /** 선택형: 옵션별 카운트 */
  optionCounts?: Record<string, number>;
  /** 자유응답: 텍스트 목록 (max N) */
  textAnswers?: string[];
  /** 척도형: 평균/최소/최대 */
  scaleStats?: { average: number; min: number; max: number };
}

export interface SurveyAggregationResult {
  surveyId: string;
  responseCount: number;
  questions: QuestionAggregation[];
}

const TEXT_ANSWERS_LIMIT = 500;

export class SurveyAggregationService {
  private static instance: SurveyAggregationService;
  private surveyRepo: Repository<Survey>;
  private questionRepo: Repository<SurveyQuestion>;
  private responseRepo: Repository<SurveyResponse>;

  private constructor() {
    this.surveyRepo = AppDataSource.getRepository(Survey);
    this.questionRepo = AppDataSource.getRepository(SurveyQuestion);
    this.responseRepo = AppDataSource.getRepository(SurveyResponse);
  }

  static getInstance(): SurveyAggregationService {
    if (!SurveyAggregationService.instance) SurveyAggregationService.instance = new SurveyAggregationService();
    return SurveyAggregationService.instance;
  }

  async aggregate(surveyId: string): Promise<SurveyAggregationResult> {
    const survey = await this.surveyRepo.findOne({ where: { id: surveyId } });
    if (!survey) throw new Error('Survey not found');

    const questions = await this.questionRepo.find({
      where: { surveyId },
      order: { order: 'ASC' },
    });

    const responses = await this.responseRepo.find({ where: { surveyId } });

    const questionAggregations: QuestionAggregation[] = questions.map((q) => {
      const agg: QuestionAggregation = {
        questionId: q.id,
        questionTitle: q.question,
        questionType: q.type,
        totalAnswers: 0,
      };

      // 질문별로 응답 수집
      const answerValues: any[] = [];
      for (const r of responses) {
        const a = (r.answers as QuestionAnswer[] | undefined)?.find((x) => x.questionId === q.id);
        if (a !== undefined && a.value !== undefined && a.value !== null && a.value !== '') {
          answerValues.push(a.value);
        }
      }
      agg.totalAnswers = answerValues.length;

      switch (q.type) {
        case QuestionType.SINGLE: {
          const counts: Record<string, number> = {};
          for (const v of answerValues) counts[String(v)] = (counts[String(v)] ?? 0) + 1;
          agg.optionCounts = counts;
          break;
        }
        case QuestionType.MULTI: {
          const counts: Record<string, number> = {};
          for (const v of answerValues) {
            const arr = Array.isArray(v) ? v : [v];
            for (const item of arr) counts[String(item)] = (counts[String(item)] ?? 0) + 1;
          }
          agg.optionCounts = counts;
          break;
        }
        case QuestionType.TEXT: {
          agg.textAnswers = answerValues.slice(0, TEXT_ANSWERS_LIMIT).map(String);
          break;
        }
        case QuestionType.RATING:
        case QuestionType.SCALE:
        case QuestionType.NUMBER: {
          const nums = answerValues.map(Number).filter((x) => !Number.isNaN(x));
          if (nums.length > 0) {
            const sum = nums.reduce((a, b) => a + b, 0);
            agg.scaleStats = {
              average: sum / nums.length,
              min: Math.min(...nums),
              max: Math.max(...nums),
            };
          }
          break;
        }
        case QuestionType.DATE: {
          // Phase 1: 단순 카운트만
          const counts: Record<string, number> = {};
          for (const v of answerValues) counts[String(v)] = (counts[String(v)] ?? 0) + 1;
          agg.optionCounts = counts;
          break;
        }
      }

      return agg;
    });

    return {
      surveyId,
      responseCount: survey.responseCount ?? responses.length,
      questions: questionAggregations,
    };
  }
}
