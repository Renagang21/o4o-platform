// Manifest
export { manifest } from './manifest.js';

// Lifecycle
export * from './lifecycle/index.js';

// Backend
export * from './backend/index.js';

// Re-export key types for convenience
export type {
  CGMDeviceType,
  SessionStatus,
  ReadingQuality,
  EventType,
  EventSeverity,
  NoteType,
  MealType,
  ExerciseIntensity,
  PatternType,
  PatternConfidence,
  CoachingSessionType,
  CoachingSessionStatus,
  SessionMode,
  MessageSender,
  MessageType,
  ReportType,
  ReportStatus,
} from './backend/entities/index.js';
