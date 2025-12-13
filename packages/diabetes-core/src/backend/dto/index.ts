// CGM Ingest DTOs
export interface CGMIngestRequestDto {
  deviceType: 'freestyle_libre' | 'dexcom' | 'medtronic' | 'other';
  deviceSerial?: string;
  sensorId?: string;
  pharmacyId?: string;
  readings: Array<{
    timestamp: string;
    glucoseValue: number;
    trend?: number;
    quality?: 'good' | 'acceptable' | 'poor' | 'invalid';
    rawData?: Record<string, unknown>;
  }>;
}

export interface CGMIngestResponseDto {
  success: boolean;
  sessionId: string;
  readingsCreated: number;
  readingsSkipped: number;
  eventsDetected: number;
}

// Lifestyle DTOs
export interface LifestyleNoteRequestDto {
  noteType: 'meal' | 'exercise' | 'medication' | 'insulin' | 'stress' | 'sleep' | 'illness' | 'other';
  timestamp: string;
  content?: string;

  // 식사 관련
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  carbsGrams?: number;
  calories?: number;
  foodItems?: Array<{ name: string; amount?: string; carbs?: number }>;

  // 운동 관련
  exerciseDurationMinutes?: number;
  exerciseIntensity?: 'light' | 'moderate' | 'vigorous';
  exerciseType?: string;

  // 약물/인슐린 관련
  medicationName?: string;
  dosage?: number;
  dosageUnit?: string;
  insulinType?: 'rapid' | 'short' | 'intermediate' | 'long' | 'mixed';

  // 수면 관련
  sleepDurationMinutes?: number;
  sleepQuality?: 'poor' | 'fair' | 'good' | 'excellent';

  // 기타
  stressLevel?: number;
  mood?: 'very_bad' | 'bad' | 'neutral' | 'good' | 'very_good';
  glucoseAtTime?: number;
  tags?: string[];
}

// Metrics DTOs
export interface MetricsQueryDto {
  startDate: string;
  endDate: string;
}

export interface MetricsResponseDto {
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
  summary: {
    totalReadings: number;
    avgGlucose: number;
    medianGlucose: number;
    minGlucose: number;
    maxGlucose: number;
    stdDev: number;
    cv: number;
    gmi: number;
  };
  tir: {
    inRange: number;
    below: number;
    above: number;
    severeBelow: number;
    severeAbove: number;
  };
  events: {
    hypoCount: number;
    hyperCount: number;
    hypoMinutes: number;
    hyperMinutes: number;
  };
  dailyData?: Array<{
    date: string;
    avgGlucose: number;
    tir: number;
    hypoEvents: number;
    hyperEvents: number;
  }>;
  hourlyAverages?: Record<string, number>;
}

// Pattern DTOs
export interface PatternResponseDto {
  id: string;
  patternType: string;
  confidence: string;
  confidenceScore: number;
  occurrenceCount: number;
  description: string;
  timeOfDay?: {
    startHour: number;
    endHour: number;
    label?: string;
  };
  recommendations?: Array<{
    type: string;
    priority: string;
    text: string;
  }>;
  isActive: boolean;
  acknowledged: boolean;
  analyzedAt: string;
}

// Report DTOs
export interface ReportGenerateRequestDto {
  reportType: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'custom';
  startDate: string;
  endDate: string;
  pharmacyId?: string;
  includePatternAnalysis?: boolean;
  includeRecommendations?: boolean;
}

export interface ReportResponseDto {
  id: string;
  reportType: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  title?: string;
  summaryMetrics?: {
    totalReadings: number;
    avgGlucose: number;
    tir: number;
    hypoEvents: number;
    hyperEvents: number;
    gmi: number;
  };
  comparison?: {
    avgGlucoseChange: number;
    tirChange: number;
    trend: string;
  };
  recommendations?: Array<{
    category: string;
    priority: string;
    title: string;
    description: string;
  }>;
  pharmacistComment?: string;
  createdAt: string;
}

// Coaching DTOs
export interface CoachingSessionCreateDto {
  pharmacyId: string;
  pharmacistId?: string;
  pharmacistName?: string;
  sessionType: 'initial' | 'followup' | 'urgent' | 'routine' | 'report_review';
  mode: 'in_person' | 'phone' | 'video' | 'chat' | 'async';
  scheduledAt: string;
  agenda?: string;
  relatedReportId?: string;
}

export interface CoachingMessageCreateDto {
  sender: 'patient' | 'pharmacist';
  messageType: 'text' | 'image' | 'file' | 'glucose_data' | 'recommendation' | 'alert';
  content: string;
  attachments?: Array<{ type: 'image' | 'pdf' | 'data'; url: string; name?: string }>;
}

export interface CoachingSessionResponseDto {
  id: string;
  userId: string;
  pharmacyId: string;
  pharmacistName?: string;
  sessionType: string;
  status: string;
  mode: string;
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  durationMinutes?: number;
  summary?: string;
  patientDataSnapshot?: {
    avgGlucose7d?: number;
    tir7d?: number;
    hypoEvents7d?: number;
  };
  nextSessionScheduled?: string;
}
