/**
 * Coaching Page
 *
 * 상담·코칭 화면
 * - 약사 메모
 * - 환자 전달 메시지
 * - 생활 루틴 제안
 * - 다음 상담 일정 관리
 */

import React, { useState } from 'react';
import { usePatientDetail, useCoachingSessions } from '../hooks/useCGMData.js';
import { coachingService } from '../../backend/services/CoachingService.js';
import { CGMSummaryCard } from '../components/CGMSummaryCard.js';
import { InsightCard } from '../components/InsightCard.js';
import type { CoachingNote, LifestyleSuggestion, CreateCoachingSessionRequest } from '../../backend/dto/index.js';

interface CoachingPageProps {
  patientId: string;
  onBack?: () => void;
  onComplete?: () => void;
}

const noteCategories = [
  { value: 'observation', label: '관찰 사항' },
  { value: 'concern', label: '우려 사항' },
  { value: 'progress', label: '진행 상황' },
  { value: 'action_taken', label: '조치 내용' },
  { value: 'follow_up', label: '후속 조치' },
] as const;

const lifestyleCategories = [
  { value: 'diet', label: '식이', icon: '🍽️' },
  { value: 'exercise', label: '운동', icon: '🏃' },
  { value: 'medication', label: '복약', icon: '💊' },
  { value: 'monitoring', label: '모니터링', icon: '📊' },
  { value: 'sleep', label: '수면', icon: '😴' },
  { value: 'stress', label: '스트레스', icon: '🧘' },
] as const;

export const CoachingPage: React.FC<CoachingPageProps> = ({
  patientId,
  onBack,
  onComplete,
}) => {
  const { data: patientData, isLoading } = usePatientDetail(patientId);
  const { sessions, refetch: refetchSessions } = useCoachingSessions(patientId);

  // 폼 상태
  const [notes, setNotes] = useState<Array<{
    content: string;
    category: CoachingNote['category'];
    isPrivate: boolean;
  }>>([]);
  const [currentNote, setCurrentNote] = useState('');
  const [currentNoteCategory, setCurrentNoteCategory] = useState<CoachingNote['category']>('observation');
  const [currentNotePrivate, setCurrentNotePrivate] = useState(false);

  const [patientMessage, setPatientMessage] = useState('');
  const [messageDelivery, setMessageDelivery] = useState<'app_notification' | 'sms' | 'in_person'>('app_notification');

  const [suggestions, setSuggestions] = useState<Array<{
    category: LifestyleSuggestion['category'];
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
  }>>([]);
  const [currentSuggestionCategory, setCurrentSuggestionCategory] = useState<LifestyleSuggestion['category']>('diet');
  const [currentSuggestionTitle, setCurrentSuggestionTitle] = useState('');
  const [currentSuggestionDesc, setCurrentSuggestionDesc] = useState('');
  const [currentSuggestionPriority, setCurrentSuggestionPriority] = useState<'high' | 'medium' | 'low'>('medium');

  const [nextSessionDate, setNextSessionDate] = useState('');
  const [sessionType, setSessionType] = useState<CreateCoachingSessionRequest['type']>('routine');
  const [isSaving, setIsSaving] = useState(false);

  if (isLoading || !patientData) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { patient, cgmSummary, insights } = patientData;

  const addNote = () => {
    if (!currentNote.trim()) return;
    setNotes([...notes, {
      content: currentNote.trim(),
      category: currentNoteCategory,
      isPrivate: currentNotePrivate,
    }]);
    setCurrentNote('');
    setCurrentNotePrivate(false);
  };

  const removeNote = (index: number) => {
    setNotes(notes.filter((_, i) => i !== index));
  };

  const addSuggestion = () => {
    if (!currentSuggestionTitle.trim()) return;
    setSuggestions([...suggestions, {
      category: currentSuggestionCategory,
      title: currentSuggestionTitle.trim(),
      description: currentSuggestionDesc.trim(),
      priority: currentSuggestionPriority,
    }]);
    setCurrentSuggestionTitle('');
    setCurrentSuggestionDesc('');
  };

  const removeSuggestion = (index: number) => {
    setSuggestions(suggestions.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const request: CreateCoachingSessionRequest = {
        patientId,
        sessionDate: new Date().toISOString(),
        type: sessionType,
        notes,
        patientMessage: patientMessage.trim() ? {
          content: patientMessage.trim(),
          deliveryMethod: messageDelivery,
        } : undefined,
        lifestyleSuggestions: suggestions,
        nextSessionDate: nextSessionDate || undefined,
      };

      await coachingService.createCoachingSession(request);
      refetchSessions();
      onComplete?.();
    } catch (error) {
      console.error('Failed to save coaching session:', error);
      alert('저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4"
        >
          ← 환자 상세로
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">상담 기록</h1>
            <p className="text-gray-500 mt-1">{patient.displayName} 환자 상담</p>
          </div>
          <select
            value={sessionType}
            onChange={(e) => setSessionType(e.target.value as CreateCoachingSessionRequest['type'])}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="initial">초기 상담</option>
            <option value="routine">정기 상담</option>
            <option value="followup">추적 상담</option>
            <option value="urgent">긴급 상담</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 왼쪽: CGM 요약 & 인사이트 */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-3">CGM 요약</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">평균 혈당</span>
                <span className="font-medium">{cgmSummary.metrics.averageGlucose} mg/dL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">목표 범위 내</span>
                <span className="font-medium">{cgmSummary.timeInRange.inRange}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">추정 A1C</span>
                <span className="font-medium">{cgmSummary.metrics.estimatedA1C.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">변동계수</span>
                <span className="font-medium">{cgmSummary.metrics.coefficientOfVariation}%</span>
              </div>
            </div>
          </div>

          {insights.filter((i) => i.priority === 'high').length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">주요 인사이트</h3>
              <div className="space-y-2">
                {insights.filter((i) => i.priority === 'high').map((insight) => (
                  <div key={insight.id} className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                    <div className="font-medium text-red-800">{insight.title}</div>
                    <div className="text-red-600 mt-1">{insight.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 오른쪽: 상담 입력 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 메모 입력 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">상담 메모</h3>

            <div className="space-y-3 mb-4">
              {notes.map((note, index) => (
                <div key={index} className="flex items-start gap-2 bg-gray-50 rounded p-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                        {noteCategories.find((c) => c.value === note.category)?.label}
                      </span>
                      {note.isPrivate && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                          비공개
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{note.content}</p>
                  </div>
                  <button
                    onClick={() => removeNote(index)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <select
                  value={currentNoteCategory}
                  onChange={(e) => setCurrentNoteCategory(e.target.value as CoachingNote['category'])}
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  {noteCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={currentNotePrivate}
                    onChange={(e) => setCurrentNotePrivate(e.target.checked)}
                  />
                  비공개
                </label>
              </div>
              <div className="flex gap-2">
                <textarea
                  value={currentNote}
                  onChange={(e) => setCurrentNote(e.target.value)}
                  placeholder="메모 내용..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded resize-none"
                  rows={2}
                />
                <button
                  onClick={addNote}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                >
                  추가
                </button>
              </div>
            </div>
          </div>

          {/* 환자 메시지 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">환자 전달 메시지</h3>
            <textarea
              value={patientMessage}
              onChange={(e) => setPatientMessage(e.target.value)}
              placeholder="환자에게 전달할 메시지를 입력하세요..."
              className="w-full px-3 py-2 border border-gray-300 rounded resize-none mb-3"
              rows={3}
            />
            <div className="flex gap-2">
              <select
                value={messageDelivery}
                onChange={(e) => setMessageDelivery(e.target.value as typeof messageDelivery)}
                className="px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option value="app_notification">앱 알림</option>
                <option value="sms">SMS</option>
                <option value="in_person">직접 전달</option>
              </select>
            </div>
          </div>

          {/* 생활 제안 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">생활 루틴 제안</h3>

            <div className="flex flex-wrap gap-2 mb-4">
              {suggestions.map((s, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                    s.priority === 'high' ? 'bg-red-100 text-red-700' :
                    s.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}
                >
                  {lifestyleCategories.find((c) => c.value === s.category)?.icon}
                  {s.title}
                  <button
                    onClick={() => removeSuggestion(index)}
                    className="hover:text-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <select
                value={currentSuggestionCategory}
                onChange={(e) => setCurrentSuggestionCategory(e.target.value as LifestyleSuggestion['category'])}
                className="px-3 py-2 border border-gray-300 rounded text-sm"
              >
                {lifestyleCategories.map((cat) => (
                  <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                ))}
              </select>
              <select
                value={currentSuggestionPriority}
                onChange={(e) => setCurrentSuggestionPriority(e.target.value as 'high' | 'medium' | 'low')}
                className="px-3 py-2 border border-gray-300 rounded text-sm"
              >
                <option value="high">높음</option>
                <option value="medium">보통</option>
                <option value="low">낮음</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input
                value={currentSuggestionTitle}
                onChange={(e) => setCurrentSuggestionTitle(e.target.value)}
                placeholder="제안 제목"
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
              />
              <button
                onClick={addSuggestion}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm"
              >
                추가
              </button>
            </div>
            <input
              value={currentSuggestionDesc}
              onChange={(e) => setCurrentSuggestionDesc(e.target.value)}
              placeholder="상세 설명 (선택사항)"
              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>

          {/* 다음 상담 일정 */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">다음 상담 일정</h3>
            <input
              type="date"
              value={nextSessionDate}
              onChange={(e) => setNextSessionDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded"
            />
          </div>

          {/* 저장 버튼 */}
          <div className="flex justify-end gap-3">
            <button
              onClick={onBack}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? '저장 중...' : '상담 저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoachingPage;
