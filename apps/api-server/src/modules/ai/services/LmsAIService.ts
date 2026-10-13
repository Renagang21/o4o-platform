import { randomUUID } from 'node:crypto';
import { lmsAssistanceExtension } from './lms-assistance.extension.js';
import type { LmsAssistanceInput } from './lms-assistance.extension.js';
import logger from '../../../utils/logger.js';
import { GEMINI_CANONICAL_MODEL } from '../../../types/ai-proxy.types.js';

/**
 * LmsAIService
 *
 * WO-O4O-LMS-AI-MINIMAL-V1
 *
 * On-demand AI assistance for 2 LMS lesson types:
 *   - quiz analysis (wrong-answer explanation)
 *   - assignment feedback (improvement points)
 *
 * Phase 1 constraints:
 *   - No persistence
 *   - No history / personalization
 *   - Single shape returned: { summary, insights[], recommendations[] }
 *   - 3s timeout, single retry
 *   - If no LLM API key configured → returns a benign rule-based fallback
 *     so the UI works in dev / non-AI environments without errors.
 *
 * Mirrors the dynamic-import + provider selection pattern of
 * OperatorAiLlmService.
 */

export type LmsAiKind = 'quiz' | 'assignment';

export interface QuizAnalysisPayload {
  lessonId?: string;
  questions: Array<{
    id: string;
    question: string;
    type?: 'single' | 'multi' | 'text';
    options?: string[];
    correctAnswer?: string | string[];
  }>;
  userAnswers: Array<{
    questionId: string;
    answer: string | string[];
    isCorrect?: boolean;
  }>;
  score?: number;
  passingScore?: number;
}

export interface AssignmentFeedbackPayload {
  lessonId?: string;
  instructions?: string;
  submissionContent: string;
}

export interface AIAnalyzeResult {
  summary: string;
  insights: string[];
  recommendations: string[];
}

const TIMEOUT_MS = 8000; // assignment/quiz analysis can be slower than 3s dashboard insights

function hasApiKey(): boolean {
  return !!(process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY);
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class LmsAIService {
  private static instance: LmsAIService;

  static getInstance(): LmsAIService {
    if (!LmsAIService.instance) LmsAIService.instance = new LmsAIService();
    return LmsAIService.instance;
  }

  async analyzeQuiz(payload: QuizAnalysisPayload, actorId: string): Promise<AIAnalyzeResult> {
    return this.run({ kind: 'quiz', payload }, actorId, () => this.quizFallback(payload));
  }

  async feedbackAssignment(payload: AssignmentFeedbackPayload, actorId: string): Promise<AIAnalyzeResult> {
    return this.run({ kind: 'assignment', payload }, actorId, () =>
      this.assignmentFallback(payload),
    );
  }

  // ─── Provider call ─────────────────────────────────────────────────────────

  private async run(
    input: LmsAssistanceInput,
    actorId: string,
    fallback: () => AIAnalyzeResult,
  ): Promise<AIAnalyzeResult> {
    const { kind } = input;
    if (!actorId) throw new Error('AUTH_REQUIRED');
    if (!hasApiKey()) {
      logger.info(`[LmsAI] No API key configured — returning rule-based fallback for ${kind}`);
      return fallback();
    }

    try {
      const { execute, runAiExtension } = await import('@o4o/ai-core');
      const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY!;
      const provider = process.env.GEMINI_API_KEY ? 'gemini' : 'openai';
      const model = provider === 'gemini' ? GEMINI_CANONICAL_MODEL : 'gpt-4o-mini';

      const run = await runAiExtension({
        extension: lmsAssistanceExtension, input,
        context: { requestId: randomUUID(), serviceId: 'lecture', featureId: `lms.${kind}`, actorId, audience: 'staff' },
        materials: [], funding: { payer: 'platform' },
      }, {
        invoke: async prompt => {
          const result = await execute({ ...prompt, provider, responseMode: 'json',
            config: { apiKey, model, maxTokens: 700, temperature: 0.4 },
            timeoutMs: TIMEOUT_MS, retry: { maxAttempts: 1, delayMs: 0 },
            meta: { service: 'lms', callerName: `LmsAI.${kind}` },
          });
          return { ...result, provider: result.provider ?? provider };
        },
      }, {
        // Authenticated request's own submitted text only; no course/learner DB lookup or grade mutation.
        authorize: async context => !!actorId && context.actorId === actorId,
        record: async event => { logger.info('[AI_EXTENSION]', event); },
      });
      const result = run.invocation;
      const normalized = run.output;
      logger.info(
        `[LmsAI] ${kind} via ${provider}/${model} (${
          (result.promptTokens || 0) + (result.completionTokens || 0)
        } tokens)`,
      );
      return normalized;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`[LmsAI] ${kind} LLM call failed (${msg}) — using fallback`);
      return fallback();
    }
  }

  // ─── Rule-based fallbacks (when no API key or call fails) ──────────────────

  private quizFallback(p: QuizAnalysisPayload): AIAnalyzeResult {
    const total = p.questions.length;
    const wrong = p.userAnswers.filter((a) => a.isCorrect === false).length;
    const score = typeof p.score === 'number' ? Math.round(p.score) : null;
    const passing = typeof p.passingScore === 'number' ? p.passingScore : null;
    const passed = score !== null && passing !== null ? score >= passing : null;

    const summary =
      passed === true
        ? `${total}문항 중 ${total - wrong}문항을 맞히고 통과했습니다.`
        : passed === false
        ? `${total}문항 중 ${wrong}문항을 틀렸습니다. 다시 시도해 보세요.`
        : `${total}문항 응시를 마쳤습니다.`;

    const insights: string[] =
      wrong === 0
        ? ['모든 문항에 정확하게 답했습니다.']
        : [`총 ${wrong}문항을 틀렸습니다. 오답 문항의 핵심 개념을 다시 확인해 보세요.`];

    const recommendations: string[] = [
      'AI 키 설정 후 다시 시도하면 문항별 상세 분석을 받을 수 있습니다.',
    ];

    return { summary, insights, recommendations };
  }

  private assignmentFallback(p: AssignmentFeedbackPayload): AIAnalyzeResult {
    const len = p.submissionContent.length;
    return {
      summary: `과제를 제출했습니다 (${len}자).`,
      insights: ['제출이 정상적으로 기록되었습니다.'],
      recommendations: ['AI 키 설정 후 다시 시도하면 상세 피드백을 받을 수 있습니다.'],
    };
  }
}
