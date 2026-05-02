import logger from '../../../utils/logger.js';

/**
 * LmsAIService
 *
 * WO-O4O-LMS-AI-MINIMAL-V1
 *
 * On-demand AI assistance for 3 LMS lesson types:
 *   - quiz analysis (wrong-answer explanation)
 *   - live summary (key takeaways)
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

export type LmsAiKind = 'quiz' | 'live' | 'assignment';

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

export interface LiveSummaryPayload {
  lessonId?: string;
  title: string;
  description?: string;
  notes?: string;
  transcript?: string;
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

function clip(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

// ─── System prompts ──────────────────────────────────────────────────────────

const QUIZ_PROMPT = `You are an LMS tutor. Analyze a learner's quiz attempt.

Return a single JSON object with this exact shape (no prose around it):
{
  "summary": "1-2 sentences in Korean summarizing performance.",
  "insights": ["Korean string", ...],         // 2-4 items: what was missed, common pattern of errors
  "recommendations": ["Korean string", ...]   // 2-4 items: concrete next-step study suggestions
}

Constraints:
- Korean only.
- Be encouraging but specific. Reference question topics, not question IDs.
- If everything was correct, focus recommendations on next steps / extending mastery.
- Do not invent facts that aren't in the input.`;

const LIVE_PROMPT = `You are an LMS assistant. Summarize a live lesson.

Return a single JSON object:
{
  "summary": "Korean 2-3 sentence overview.",
  "insights": ["Korean", ...],            // 3-5 key points / takeaways
  "recommendations": ["Korean", ...]      // 2-4 follow-up actions for the learner
}

Constraints:
- Korean only.
- If transcript or notes are provided, ground the summary in them.
- If only title/description are available, produce best-effort orientation
  (preview style) and clearly avoid inventing specifics.`;

const ASSIGNMENT_PROMPT = `You are an LMS instructor giving formative feedback.

Return a single JSON object:
{
  "summary": "Korean 1-2 sentence high-level take on the submission.",
  "insights": ["Korean", ...],            // 2-4 strengths / accurate parts
  "recommendations": ["Korean", ...]      // 2-4 specific improvement points
}

Constraints:
- Korean only.
- Be honest but constructive. Match feedback to the instructions if provided.
- Do not grade with a number/score. Do not invent missing context.`;

// ─── Service ─────────────────────────────────────────────────────────────────

export class LmsAIService {
  private static instance: LmsAIService;

  static getInstance(): LmsAIService {
    if (!LmsAIService.instance) LmsAIService.instance = new LmsAIService();
    return LmsAIService.instance;
  }

  async analyzeQuiz(payload: QuizAnalysisPayload): Promise<AIAnalyzeResult> {
    const userPrompt = this.buildQuizPrompt(payload);
    return this.run('quiz', QUIZ_PROMPT, userPrompt, () => this.quizFallback(payload));
  }

  async summarizeLive(payload: LiveSummaryPayload): Promise<AIAnalyzeResult> {
    const userPrompt = this.buildLivePrompt(payload);
    return this.run('live', LIVE_PROMPT, userPrompt, () => this.liveFallback(payload));
  }

  async feedbackAssignment(payload: AssignmentFeedbackPayload): Promise<AIAnalyzeResult> {
    const userPrompt = this.buildAssignmentPrompt(payload);
    return this.run('assignment', ASSIGNMENT_PROMPT, userPrompt, () =>
      this.assignmentFallback(payload),
    );
  }

  // ─── Provider call ─────────────────────────────────────────────────────────

  private async run(
    kind: LmsAiKind,
    systemPrompt: string,
    userPrompt: string,
    fallback: () => AIAnalyzeResult,
  ): Promise<AIAnalyzeResult> {
    if (!hasApiKey()) {
      logger.info(`[LmsAI] No API key configured — returning rule-based fallback for ${kind}`);
      return fallback();
    }

    try {
      const { execute } = await import('@o4o/ai-core');
      const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY!;
      const provider = process.env.GEMINI_API_KEY ? 'gemini' : 'openai';
      const model = provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini';

      const result = await execute({
        systemPrompt,
        userPrompt,
        provider,
        responseMode: 'json',
        config: {
          apiKey,
          model,
          maxTokens: 700,
          temperature: 0.4,
        },
        timeoutMs: TIMEOUT_MS,
        retry: { maxAttempts: 1, delayMs: 0 },
        meta: { service: 'lms', callerName: `LmsAI.${kind}` },
      });

      const parsed = JSON.parse(result.content);
      const normalized = this.normalize(parsed);
      logger.info(
        `[LmsAI] ${kind} via ${provider}/${model} (${result.durationMs}ms, ${
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

  private normalize(raw: any): AIAnalyzeResult {
    const summary = typeof raw?.summary === 'string' ? raw.summary : '';
    const insights = Array.isArray(raw?.insights)
      ? raw.insights.filter((s: any) => typeof s === 'string').slice(0, 5)
      : [];
    const recommendations = Array.isArray(raw?.recommendations)
      ? raw.recommendations.filter((s: any) => typeof s === 'string').slice(0, 5)
      : [];
    return { summary, insights, recommendations };
  }

  // ─── User prompt builders ──────────────────────────────────────────────────

  private buildQuizPrompt(p: QuizAnalysisPayload): string {
    const lines = ['# Quiz attempt', ''];
    if (typeof p.score === 'number') lines.push(`Score: ${Math.round(p.score)}`);
    if (typeof p.passingScore === 'number') lines.push(`Passing: ${p.passingScore}`);
    lines.push('');
    lines.push('## Questions and answers');
    p.questions.forEach((q, i) => {
      const ua = p.userAnswers.find((a) => a.questionId === q.id);
      const userAns = ua ? JSON.stringify(ua.answer) : '(unanswered)';
      const correctAns = q.correctAnswer !== undefined ? JSON.stringify(q.correctAnswer) : '(hidden)';
      const correct = ua?.isCorrect === true ? 'O' : ua?.isCorrect === false ? 'X' : '?';
      lines.push(
        `Q${i + 1} [${correct}] ${clip(q.question, 200)}\n  user: ${userAns}\n  correct: ${correctAns}`,
      );
    });
    return lines.join('\n');
  }

  private buildLivePrompt(p: LiveSummaryPayload): string {
    const lines = ['# Live lesson', ''];
    lines.push(`Title: ${p.title}`);
    if (p.description) lines.push(`Description: ${clip(p.description, 1500)}`);
    if (p.notes) lines.push(`Notes: ${clip(p.notes, 4000)}`);
    if (p.transcript) lines.push(`Transcript:\n${clip(p.transcript, 6000)}`);
    return lines.join('\n');
  }

  private buildAssignmentPrompt(p: AssignmentFeedbackPayload): string {
    const lines = ['# Assignment submission', ''];
    if (p.instructions) lines.push(`Instructions: ${clip(p.instructions, 2000)}`);
    lines.push('');
    lines.push(`Submission:\n${clip(p.submissionContent, 6000)}`);
    return lines.join('\n');
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

  private liveFallback(p: LiveSummaryPayload): AIAnalyzeResult {
    return {
      summary: `${p.title} 라이브 세션 정보입니다.`,
      insights: p.description ? [clip(p.description, 200)] : ['상세 설명이 등록되지 않았습니다.'],
      recommendations: ['AI 키 설정 후 다시 시도하면 라이브 요약을 받을 수 있습니다.'],
    };
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
