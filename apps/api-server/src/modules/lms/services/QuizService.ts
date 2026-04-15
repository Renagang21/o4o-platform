import { Repository } from 'typeorm';
import { AppDataSource } from '../../../database/connection.js';
import { Quiz, QuizAttempt, AttemptStatus, Lesson, LessonType } from '@o4o/lms-core';
import { Progress, ProgressStatus, Enrollment, EnrollmentStatus } from '@o4o/lms-core';
import type { QuizQuestion, QuizAnswer } from '@o4o/lms-core';
import logger from '../../../utils/logger.js';
// WO-O4O-CREDIT-SYSTEM-V1
import { CreditService } from '../../credit/services/CreditService.js';
import { CreditSourceType } from '../../credit/entities/CreditTransaction.js';
import { CREDIT_REWARDS, CREDIT_DESCRIPTIONS } from '../../credit/credit-constants.js';
// WO-O4O-COMPLETION-V1
import { CompletionService } from './CompletionService.js';

export interface SubmitQuizRequest {
  answers: Array<{ questionId: string; answer: string | string[] }>;
}

export interface QuizResult {
  attemptId: string;
  score: number;
  passed: boolean;
  correctCount: number;
  total: number;
  earnedPoints: number;
  totalPoints: number;
  answers: QuizAnswer[];
  lessonCompleted: boolean;
  creditsEarned: number;
}

export class QuizService {
  private static instance: QuizService;
  private quizRepository: Repository<Quiz>;
  private attemptRepository: Repository<QuizAttempt>;
  private progressRepository: Repository<Progress>;
  private enrollmentRepository: Repository<Enrollment>;
  private lessonRepository: Repository<Lesson>;

  constructor() {
    this.quizRepository = AppDataSource.getRepository(Quiz);
    this.attemptRepository = AppDataSource.getRepository(QuizAttempt);
    this.progressRepository = AppDataSource.getRepository(Progress);
    this.enrollmentRepository = AppDataSource.getRepository(Enrollment);
    this.lessonRepository = AppDataSource.getRepository(Lesson);
  }

  static getInstance(): QuizService {
    if (!QuizService.instance) {
      QuizService.instance = new QuizService();
    }
    return QuizService.instance;
  }

  /**
   * Get quiz for a lesson (without correct answers)
   */
  async getQuizForLesson(lessonId: string): Promise<Quiz | null> {
    const quiz = await this.quizRepository.findOne({
      where: { lessonId, isPublished: true },
    });

    if (!quiz) return null;

    // Strip correct answers before sending to client
    quiz.questions = quiz.questions.map((q) => ({
      ...q,
      answer: undefined,
    }));

    return quiz;
  }

  /**
   * Get quiz by ID (without correct answers)
   */
  async getQuiz(quizId: string): Promise<Quiz | null> {
    return this.quizRepository.findOne({ where: { id: quizId } });
  }

  /**
   * Submit quiz answers, grade, and update progress
   */
  async submitQuiz(
    quizId: string,
    userId: string,
    data: SubmitQuizRequest,
  ): Promise<QuizResult> {
    const quiz = await this.quizRepository.findOne({ where: { id: quizId } });
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    if (!quiz.isPublished) {
      throw new Error('Quiz is not available');
    }

    // Check max attempts
    if (quiz.maxAttempts) {
      const attemptCount = await this.attemptRepository.count({
        where: { quizId, userId, status: AttemptStatus.COMPLETED },
      });
      if (attemptCount >= quiz.maxAttempts) {
        throw new Error('Maximum attempts reached');
      }
    }

    // Get attempt number
    const prevAttempts = await this.attemptRepository.count({
      where: { quizId, userId },
    });

    // Grade answers
    const totalPoints = quiz.getTotalPoints();
    const gradedAnswers: QuizAnswer[] = data.answers.map((submitted) => {
      const question = quiz.questions.find((q) => q.id === submitted.questionId);
      if (!question) {
        return {
          questionId: submitted.questionId,
          answer: submitted.answer,
          isCorrect: false,
          points: 0,
        };
      }

      const isCorrect = this.checkAnswer(question, submitted.answer);
      return {
        questionId: submitted.questionId,
        answer: submitted.answer,
        isCorrect,
        points: isCorrect ? (question.points || 1) : 0,
      };
    });

    const earnedPoints = gradedAnswers.reduce((sum, a) => sum + (a.points || 0), 0);
    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= quiz.passingScore;
    const correctCount = gradedAnswers.filter((a) => a.isCorrect).length;

    // Create attempt record
    const attempt = this.attemptRepository.create({
      quizId,
      userId,
      answers: gradedAnswers,
      status: AttemptStatus.COMPLETED,
      score,
      earnedPoints,
      totalPoints,
      passed,
      completedAt: new Date(),
      timeSpent: 0,
      attemptNumber: prevAttempts + 1,
    });

    await this.attemptRepository.save(attempt);

    // Update lesson progress if quiz is linked to a lesson
    let lessonCompleted = false;
    if (quiz.lessonId && passed) {
      lessonCompleted = await this.completeLessonProgress(quiz.lessonId, quiz.courseId, userId, score);
    }

    // WO-O4O-CREDIT-SYSTEM-V1: Award credits for quiz pass
    let creditsEarned = 0;
    if (passed) {
      try {
        const creditService = CreditService.getInstance();
        const quizCredit = await creditService.earnCredit(
          userId,
          CREDIT_REWARDS.QUIZ_PASS,
          CreditSourceType.QUIZ_PASS,
          quizId,
          `quiz_pass:${userId}:${quizId}`,
          CREDIT_DESCRIPTIONS.QUIZ_PASS,
        );
        if (quizCredit) creditsEarned += CREDIT_REWARDS.QUIZ_PASS;
      } catch (creditError) {
        logger.warn('[Quiz] Credit award failed (quiz_pass)', { quizId, userId, error: (creditError as Error).message });
      }
    }

    logger.info(`[Quiz] Submitted`, {
      quizId,
      userId,
      score,
      passed,
      correctCount,
      total: quiz.questions.length,
      lessonCompleted,
      creditsEarned,
    });

    // Strip correct answers from result if quiz doesn't show them
    const resultAnswers = quiz.showCorrectAnswers
      ? gradedAnswers
      : gradedAnswers.map((a) => ({ ...a, answer: undefined }));

    return {
      attemptId: attempt.id,
      score: Math.round(score * 100) / 100,
      passed,
      correctCount,
      total: quiz.questions.length,
      earnedPoints,
      totalPoints,
      answers: resultAnswers,
      lessonCompleted,
      creditsEarned,
    };
  }

  /**
   * Check if an answer is correct
   */
  private checkAnswer(
    question: QuizQuestion,
    submitted: string | string[],
  ): boolean {
    if (!question.answer) return false;

    if (question.type === 'multi') {
      // Multi-select: compare sorted arrays
      const correct = Array.isArray(question.answer)
        ? [...question.answer].sort()
        : [question.answer].sort();
      const given = Array.isArray(submitted)
        ? [...submitted].sort()
        : [submitted].sort();
      return JSON.stringify(correct) === JSON.stringify(given);
    }

    // Single-select: direct comparison
    const correctAnswer = Array.isArray(question.answer)
      ? question.answer[0]
      : question.answer;
    const givenAnswer = Array.isArray(submitted) ? submitted[0] : submitted;
    return correctAnswer === givenAnswer;
  }

  /**
   * Complete lesson progress and update enrollment
   */
  private async completeLessonProgress(
    lessonId: string,
    courseId: string | undefined,
    userId: string,
    score: number,
  ): Promise<boolean> {
    if (!courseId) {
      // Try to get courseId from lesson
      const lesson = await this.lessonRepository.findOne({
        where: { id: lessonId },
        select: ['id', 'courseId'],
      });
      if (!lesson) return false;
      courseId = lesson.courseId;
    }

    // Find enrollment
    const enrollment = await this.enrollmentRepository.findOne({
      where: { userId, courseId },
    });
    if (!enrollment) return false;

    // Find or create progress
    let progress = await this.progressRepository.findOne({
      where: { enrollmentId: enrollment.id, lessonId },
    });

    if (!progress) {
      progress = this.progressRepository.create({
        enrollmentId: enrollment.id,
        lessonId,
        status: ProgressStatus.IN_PROGRESS,
        startedAt: new Date(),
      });
    }

    // Complete progress
    progress.complete(score);
    progress.quizAnswers = { score, completedAt: new Date().toISOString() };
    progress.attempts = (progress.attempts || 0) + 1;
    await this.progressRepository.save(progress);

    // WO-O4O-CREDIT-SYSTEM-V1: Award credits for lesson complete
    try {
      const creditService = CreditService.getInstance();
      await creditService.earnCredit(
        userId,
        CREDIT_REWARDS.LESSON_COMPLETE,
        CreditSourceType.LESSON_COMPLETE,
        lessonId,
        `lesson_complete:${userId}:${lessonId}`,
        CREDIT_DESCRIPTIONS.LESSON_COMPLETE,
      );
    } catch (creditError) {
      logger.warn('[Quiz] Credit award failed (lesson_complete)', { lessonId, userId, error: (creditError as Error).message });
    }

    // Update enrollment progress
    const completedCount = await this.progressRepository.count({
      where: { enrollmentId: enrollment.id, status: ProgressStatus.COMPLETED },
    });

    // Get total published lessons count
    const totalLessons = await this.lessonRepository.count({
      where: { courseId, isPublished: true },
    });

    enrollment.updateProgress(completedCount, totalLessons);

    // Update average quiz score
    const quizProgresses = await this.progressRepository
      .createQueryBuilder('p')
      .where('p.enrollmentId = :enrollmentId', { enrollmentId: enrollment.id })
      .andWhere('p.score IS NOT NULL')
      .getMany();

    if (quizProgresses.length > 0) {
      const avgScore =
        quizProgresses.reduce((sum, p) => sum + Number(p.score || 0), 0) /
        quizProgresses.length;
      enrollment.averageQuizScore = Math.round(avgScore * 100) / 100;
    }

    // Auto-complete enrollment if all lessons done
    if (completedCount >= totalLessons && totalLessons > 0) {
      enrollment.complete(enrollment.averageQuizScore ?? undefined);

      // WO-O4O-CREDIT-SYSTEM-V1: Award credits for course complete
      try {
        const creditService = CreditService.getInstance();
        await creditService.earnCredit(
          userId,
          CREDIT_REWARDS.COURSE_COMPLETE,
          CreditSourceType.COURSE_COMPLETE,
          courseId,
          `course_complete:${userId}:${courseId}`,
          CREDIT_DESCRIPTIONS.COURSE_COMPLETE,
        );
      } catch (creditError) {
        logger.warn('[Quiz] Credit award failed (course_complete)', { courseId, userId, error: (creditError as Error).message });
      }

      // WO-O4O-COMPLETION-V1: Auto-create completion record + certificate
      try {
        const completionService = CompletionService.getInstance();
        await completionService.createCompletion(userId, courseId, enrollment.id);
      } catch (completionError) {
        logger.warn('[Quiz] Completion creation failed', { courseId, userId, error: (completionError as Error).message });
      }
    }

    await this.enrollmentRepository.save(enrollment);

    logger.info(`[Quiz] Lesson progress updated`, {
      lessonId,
      enrollmentId: enrollment.id,
      completedCount,
      totalLessons,
      progressPercentage: enrollment.progressPercentage,
    });

    return true;
  }

  /**
   * Get user's attempts for a quiz
   */
  async getUserAttempts(quizId: string, userId: string): Promise<QuizAttempt[]> {
    return this.attemptRepository.find({
      where: { quizId, userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Create a quiz (instructor)
   */
  async createQuiz(data: {
    title: string;
    description?: string;
    questions: QuizQuestion[];
    lessonId?: string;
    courseId?: string;
    passingScore?: number;
    createdBy: string;
  }): Promise<Quiz> {
    // If lessonId provided, auto-resolve courseId
    if (data.lessonId && !data.courseId) {
      const lesson = await this.lessonRepository.findOne({
        where: { id: data.lessonId },
        select: ['id', 'courseId'],
      });
      if (lesson) {
        data.courseId = lesson.courseId;
      }
    }

    const quiz = this.quizRepository.create({
      ...data,
      passingScore: data.passingScore ?? 60,
      isPublished: true,
      publishedAt: new Date(),
    });

    const saved = await this.quizRepository.save(quiz);

    logger.info(`[Quiz] Created`, {
      quizId: saved.id,
      lessonId: data.lessonId,
      questionCount: data.questions.length,
    });

    return saved;
  }

  /**
   * Update a quiz
   */
  async updateQuiz(
    quizId: string,
    data: Partial<{
      title: string;
      description: string;
      questions: QuizQuestion[];
      passingScore: number;
      isPublished: boolean;
    }>,
  ): Promise<Quiz> {
    const quiz = await this.quizRepository.findOne({ where: { id: quizId } });
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    Object.assign(quiz, data);
    if (data.isPublished && !quiz.publishedAt) {
      quiz.publishedAt = new Date();
    }

    return this.quizRepository.save(quiz);
  }
}
