/**
 * Coaching Service
 *
 * 상담/코칭 관리 서비스 (Mock 데이터 기반)
 */

import type {
  CoachingSession,
  CreateCoachingSessionRequest,
} from '../dto/index.js';
import { getMockCoachingSessions } from '../mock/mockPatients.js';

export class CoachingService {
  private sessionsCache: Map<string, CoachingSession[]> = new Map();

  /**
   * 환자의 코칭 세션 목록 조회
   */
  async getCoachingSessions(patientId: string): Promise<CoachingSession[]> {
    // 캐시 확인
    if (this.sessionsCache.has(patientId)) {
      return this.sessionsCache.get(patientId)!;
    }

    const sessions = getMockCoachingSessions(patientId);
    this.sessionsCache.set(patientId, sessions);
    return sessions;
  }

  /**
   * 코칭 세션 상세 조회
   */
  async getCoachingSession(
    patientId: string,
    sessionId: string
  ): Promise<CoachingSession | null> {
    const sessions = await this.getCoachingSessions(patientId);
    return sessions.find((s) => s.id === sessionId) || null;
  }

  /**
   * 코칭 세션 생성
   */
  async createCoachingSession(
    request: CreateCoachingSessionRequest
  ): Promise<CoachingSession> {
    const sessionId = `session-${request.patientId}-${Date.now()}`;
    const now = new Date().toISOString();

    const newSession: CoachingSession = {
      id: sessionId,
      patientId: request.patientId,
      pharmacistId: 'pharmacist-001', // TODO: 실제 로그인 약사 ID
      pharmacistName: '홍약사', // TODO: 실제 로그인 약사 이름
      sessionDate: request.sessionDate,
      type: request.type,
      status: 'scheduled',
      notes:
        request.notes?.map((n, i) => ({
          id: `note-${sessionId}-${i}`,
          sessionId,
          content: n.content,
          category: n.category,
          isPrivate: n.isPrivate,
          createdAt: now,
          updatedAt: now,
        })) || [],
      patientMessage: request.patientMessage
        ? {
            id: `msg-${sessionId}`,
            sessionId,
            content: request.patientMessage.content,
            deliveryMethod: request.patientMessage.deliveryMethod,
            isDelivered: false,
          }
        : undefined,
      lifestyleSuggestions:
        request.lifestyleSuggestions?.map((s, i) => ({
          id: `suggestion-${sessionId}-${i}`,
          ...s,
        })) || [],
      nextSessionDate: request.nextSessionDate,
      createdAt: now,
      updatedAt: now,
    };

    // 캐시 업데이트
    const existingSessions = this.sessionsCache.get(request.patientId) || [];
    this.sessionsCache.set(request.patientId, [newSession, ...existingSessions]);

    return newSession;
  }

  /**
   * 코칭 세션 완료 처리
   */
  async completeCoachingSession(
    patientId: string,
    sessionId: string,
    duration?: number
  ): Promise<CoachingSession | null> {
    const sessions = await this.getCoachingSessions(patientId);
    const sessionIndex = sessions.findIndex((s) => s.id === sessionId);

    if (sessionIndex === -1) return null;

    const updatedSession: CoachingSession = {
      ...sessions[sessionIndex],
      status: 'completed',
      duration,
      updatedAt: new Date().toISOString(),
    };

    sessions[sessionIndex] = updatedSession;
    this.sessionsCache.set(patientId, sessions);

    return updatedSession;
  }

  /**
   * 코칭 메모 추가
   */
  async addCoachingNote(
    patientId: string,
    sessionId: string,
    content: string,
    category: 'observation' | 'concern' | 'progress' | 'action_taken' | 'follow_up',
    isPrivate: boolean
  ): Promise<CoachingSession | null> {
    const sessions = await this.getCoachingSessions(patientId);
    const sessionIndex = sessions.findIndex((s) => s.id === sessionId);

    if (sessionIndex === -1) return null;

    const now = new Date().toISOString();
    const newNote = {
      id: `note-${sessionId}-${sessions[sessionIndex].notes.length}`,
      sessionId,
      content,
      category,
      isPrivate,
      createdAt: now,
      updatedAt: now,
    };

    sessions[sessionIndex].notes.push(newNote);
    sessions[sessionIndex].updatedAt = now;
    this.sessionsCache.set(patientId, sessions);

    return sessions[sessionIndex];
  }

  /**
   * 다음 상담 일정 설정
   */
  async setNextCoachingDate(
    patientId: string,
    sessionId: string,
    nextDate: string
  ): Promise<CoachingSession | null> {
    const sessions = await this.getCoachingSessions(patientId);
    const sessionIndex = sessions.findIndex((s) => s.id === sessionId);

    if (sessionIndex === -1) return null;

    sessions[sessionIndex].nextSessionDate = nextDate;
    sessions[sessionIndex].updatedAt = new Date().toISOString();
    this.sessionsCache.set(patientId, sessions);

    return sessions[sessionIndex];
  }
}

export const coachingService = new CoachingService();
