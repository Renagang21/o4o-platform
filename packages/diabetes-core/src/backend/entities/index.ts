// CGM 관련 엔티티
export { CGMSession, type CGMDeviceType, type SessionStatus } from './CGMSession.entity.js';
export { CGMReading, type ReadingQuality } from './CGMReading.entity.js';
export { CGMEvent, type EventType, type EventSeverity } from './CGMEvent.entity.js';

// 사용자 기록
export {
  UserNote,
  type NoteType,
  type MealType,
  type ExerciseIntensity,
} from './UserNote.entity.js';

// 분석 결과
export { DailyMetrics } from './DailyMetrics.entity.js';
export { PatternAnalysis, type PatternType, type PatternConfidence } from './PatternAnalysis.entity.js';

// 코칭
export {
  CoachingSession,
  type SessionType as CoachingSessionType,
  type SessionStatus as CoachingSessionStatus,
  type SessionMode,
} from './CoachingSession.entity.js';
export { CoachingMessage, type MessageSender, type MessageType } from './CoachingMessage.entity.js';

// 리포트
export { DiabetesReport, type ReportType, type ReportStatus } from './DiabetesReport.entity.js';

// 엔티티 배열 (TypeORM 등록용)
import { CGMSession } from './CGMSession.entity.js';
import { CGMReading } from './CGMReading.entity.js';
import { CGMEvent } from './CGMEvent.entity.js';
import { UserNote } from './UserNote.entity.js';
import { DailyMetrics } from './DailyMetrics.entity.js';
import { PatternAnalysis } from './PatternAnalysis.entity.js';
import { CoachingSession } from './CoachingSession.entity.js';
import { CoachingMessage } from './CoachingMessage.entity.js';
import { DiabetesReport } from './DiabetesReport.entity.js';

export const DiabetesCoreEntities = [
  CGMSession,
  CGMReading,
  CGMEvent,
  UserNote,
  DailyMetrics,
  PatternAnalysis,
  CoachingSession,
  CoachingMessage,
  DiabetesReport,
];
