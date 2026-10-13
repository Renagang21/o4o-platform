import type { AiBusinessExtension } from '@o4o/ai-core';
import type { QuizAnalysisPayload, AssignmentFeedbackPayload, AIAnalyzeResult, LmsAiKind } from './LmsAIService.js';

function clip(s: string, max: number): string {
  return s.length <= max ? s : s.slice(0, max - 1) + '…';
}

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

function normalize(raw: any): AIAnalyzeResult {
    const summary = typeof raw?.summary === 'string' ? raw.summary : '';
    const insights = Array.isArray(raw?.insights)
      ? raw.insights.filter((s: any) => typeof s === 'string').slice(0, 5)
      : [];
    const recommendations = Array.isArray(raw?.recommendations)
      ? raw.recommendations.filter((s: any) => typeof s === 'string').slice(0, 5)
      : [];
    return { summary, insights, recommendations };
  }

function buildQuizPrompt(p: QuizAnalysisPayload): string {
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

function buildAssignmentPrompt(p: AssignmentFeedbackPayload): string {
    const lines = ['# Assignment submission', ''];
    if (p.instructions) lines.push(`Instructions: ${clip(p.instructions, 2000)}`);
    lines.push('');
    lines.push(`Submission:\n${clip(p.submissionContent, 6000)}`);
    return lines.join('\n');
  }


export interface LmsAssistanceInput { kind: LmsAiKind; payload: QuizAnalysisPayload | AssignmentFeedbackPayload }
export const lmsAssistanceExtension: AiBusinessExtension<LmsAssistanceInput, AIAnalyzeResult> = {
  id: 'lms.assistance',
  operation: 'read',
  prepare(input) {
    if (input.kind === 'quiz') {
      const payload = input.payload as QuizAnalysisPayload;
      if (!Array.isArray(payload.questions) || !Array.isArray(payload.userAnswers)) throw new Error('Invalid quiz');
      return { systemPrompt: QUIZ_PROMPT, userPrompt: buildQuizPrompt(payload) };
    }
    if (input.kind !== 'assignment' || typeof (input.payload as AssignmentFeedbackPayload).submissionContent !== 'string') throw new Error('Invalid assignment');
    return { systemPrompt: ASSIGNMENT_PROMPT, userPrompt: buildAssignmentPrompt(input.payload as AssignmentFeedbackPayload) };
  },
  parse(content) { return normalize(JSON.parse(content)); },
};
