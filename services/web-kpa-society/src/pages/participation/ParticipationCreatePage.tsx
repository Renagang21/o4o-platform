/**
 * ParticipationCreatePage - 참여 생성 페이지 (Question Builder)
 *
 * 핵심 원칙:
 * - 사람을 평가하지 않는다
 * - 단지 묻고, 모으고, 보여줄 뿐이다
 * - 점수/등급/랭킹 개념 없음
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Card } from '../../components/common';
import { participationApi } from '../../api/participation';
import { colors, typography, borderRadius } from '../../styles/theme';
import type {
  ParticipationQuestion,
  QuestionOption,
  ParticipationScope,
} from './types';
import {
  QUESTION_TYPE_LABELS,
  SCOPE_TYPE_LABELS,
  QuestionType,
  ParticipationScopeType,
  AnonymityType,
  ParticipationStatus,
} from './types';

interface QuestionDraft extends Omit<ParticipationQuestion, 'id'> {
  tempId: string;
}

export function ParticipationCreatePage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [scope, setScope] = useState<ParticipationScope>({
    scopeType: ParticipationScopeType.PUBLIC,
    anonymity: AnonymityType.ANONYMOUS,
    allowModification: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addQuestion = (type: QuestionType) => {
    const newQuestion: QuestionDraft = {
      tempId: generateId(),
      title: '',
      type,
      isRequired: true,
      order: questions.length,
      options:
        type === QuestionType.SINGLE_CHOICE ||
        type === QuestionType.MULTIPLE_CHOICE ||
        type === QuestionType.QUIZ
          ? [
              { id: generateId(), text: '', order: 0 },
              { id: generateId(), text: '', order: 1 },
            ]
          : undefined,
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (tempId: string, updates: Partial<QuestionDraft>) => {
    setQuestions(
      questions.map(q => (q.tempId === tempId ? { ...q, ...updates } : q))
    );
  };

  const removeQuestion = (tempId: string) => {
    setQuestions(questions.filter(q => q.tempId !== tempId));
  };

  const addOption = (questionTempId: string) => {
    setQuestions(
      questions.map(q => {
        if (q.tempId === questionTempId && q.options) {
          return {
            ...q,
            options: [
              ...q.options,
              { id: generateId(), text: '', order: q.options.length },
            ],
          };
        }
        return q;
      })
    );
  };

  const updateOption = (
    questionTempId: string,
    optionId: string,
    updates: Partial<QuestionOption>
  ) => {
    setQuestions(
      questions.map(q => {
        if (q.tempId === questionTempId && q.options) {
          return {
            ...q,
            options: q.options.map(opt =>
              opt.id === optionId ? { ...opt, ...updates } : opt
            ),
          };
        }
        return q;
      })
    );
  };

  const removeOption = (questionTempId: string, optionId: string) => {
    setQuestions(
      questions.map(q => {
        if (q.tempId === questionTempId && q.options && q.options.length > 2) {
          return {
            ...q,
            options: q.options.filter(opt => opt.id !== optionId),
          };
        }
        return q;
      })
    );
  };

  const handleSubmit = async (asDraft: boolean) => {
    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }

    if (questions.length === 0) {
      setError('최소 1개 이상의 질문을 추가해주세요.');
      return;
    }

    for (const q of questions) {
      if (!q.title.trim()) {
        setError('모든 질문에 제목을 입력해주세요.');
        return;
      }
      if (q.options) {
        for (const opt of q.options) {
          if (!opt.text.trim()) {
            setError('모든 선택지에 내용을 입력해주세요.');
            return;
          }
        }
      }
    }

    setError(null);
    setSaving(true);

    try {
      const formattedQuestions = questions.map((q, index) => ({
        id: generateId(),
        title: q.title,
        description: q.description,
        type: q.type,
        isRequired: q.isRequired,
        order: index,
        options: q.options?.map((opt, optIndex) => ({
          id: opt.id,
          text: opt.text,
          isCorrect: opt.isCorrect,
          order: optIndex,
        })),
      }));

      await participationApi.createParticipationSet({
        title,
        description: description || undefined,
        questions: formattedQuestions,
        scope,
        status: asDraft ? ParticipationStatus.DRAFT : ParticipationStatus.ACTIVE,
      });

      navigate('/participation');
    } catch (err) {
      console.error('Failed to create participation set:', err);
      setError('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      <PageHeader
        title="새 참여 만들기"
        description="설문이나 퀴즈를 만들어보세요"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '참여', href: '/participation' },
          { label: '새로 만들기' },
        ]}
      />

      {error && <div style={styles.error}>{error}</div>}

      {/* 기본 정보 */}
      <Card padding="large" style={{ marginBottom: '24px' }}>
        <h3 style={styles.sectionTitle}>기본 정보</h3>
        <div style={styles.field}>
          <label style={styles.label}>제목 *</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="참여 제목을 입력하세요"
            style={styles.input}
          />
        </div>
        <div style={styles.field}>
          <label style={styles.label}>설명</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="참여에 대한 설명을 입력하세요 (선택)"
            style={styles.textarea}
            rows={3}
          />
        </div>
      </Card>

      {/* 질문 목록 */}
      <div style={styles.questionsSection}>
        <h3 style={styles.sectionTitle}>질문 목록</h3>

        {questions.map((question, index) => (
          <Card key={question.tempId} padding="medium" style={styles.questionCard}>
            <div style={styles.questionHeader}>
              <span style={styles.questionNumber}>Q{index + 1}</span>
              <span style={styles.questionTypeBadge}>
                {QUESTION_TYPE_LABELS[question.type]}
              </span>
              <button
                onClick={() => removeQuestion(question.tempId)}
                style={styles.removeButton}
              >
                삭제
              </button>
            </div>

            <div style={styles.field}>
              <input
                type="text"
                value={question.title}
                onChange={e =>
                  updateQuestion(question.tempId, { title: e.target.value })
                }
                placeholder="질문을 입력하세요"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <input
                type="text"
                value={question.description || ''}
                onChange={e =>
                  updateQuestion(question.tempId, { description: e.target.value })
                }
                placeholder="질문 설명 (선택)"
                style={{ ...styles.input, fontSize: '14px' }}
              />
            </div>

            {/* 선택지 (선택형/퀴즈형) */}
            {question.options && (
              <div style={styles.optionsContainer}>
                {question.options.map((option, optIndex) => (
                  <div key={option.id} style={styles.optionRow}>
                    <span style={styles.optionNumber}>{optIndex + 1}</span>
                    <input
                      type="text"
                      value={option.text}
                      onChange={e =>
                        updateOption(question.tempId, option.id, {
                          text: e.target.value,
                        })
                      }
                      placeholder={`선택지 ${optIndex + 1}`}
                      style={styles.optionInput}
                    />
                    {question.type === QuestionType.QUIZ && (
                      <label style={styles.correctLabel}>
                        <input
                          type="checkbox"
                          checked={option.isCorrect || false}
                          onChange={e =>
                            updateOption(question.tempId, option.id, {
                              isCorrect: e.target.checked,
                            })
                          }
                        />
                        정답
                      </label>
                    )}
                    {question.options && question.options.length > 2 && (
                      <button
                        onClick={() => removeOption(question.tempId, option.id)}
                        style={styles.removeOptionButton}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => addOption(question.tempId)}
                  style={styles.addOptionButton}
                >
                  + 선택지 추가
                </button>
              </div>
            )}

            <div style={styles.questionOptions}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={question.isRequired}
                  onChange={e =>
                    updateQuestion(question.tempId, { isRequired: e.target.checked })
                  }
                />
                필수 응답
              </label>
            </div>
          </Card>
        ))}

        {/* 질문 추가 버튼들 */}
        <div style={styles.addQuestionButtons}>
          <button
            onClick={() => addQuestion(QuestionType.SINGLE_CHOICE)}
            style={styles.addQuestionButton}
          >
            + 단일 선택
          </button>
          <button
            onClick={() => addQuestion(QuestionType.MULTIPLE_CHOICE)}
            style={styles.addQuestionButton}
          >
            + 복수 선택
          </button>
          <button
            onClick={() => addQuestion(QuestionType.FREE_TEXT)}
            style={styles.addQuestionButton}
          >
            + 자유 응답
          </button>
          <button
            onClick={() => addQuestion(QuestionType.QUIZ)}
            style={styles.addQuestionButton}
          >
            + 퀴즈
          </button>
        </div>
      </div>

      {/* 참여 설정 */}
      <Card padding="large" style={{ marginTop: '24px' }}>
        <h3 style={styles.sectionTitle}>참여 설정</h3>

        <div style={styles.fieldRow}>
          <div style={styles.fieldHalf}>
            <label style={styles.label}>참여 범위</label>
            <select
              value={scope.scopeType}
              onChange={e =>
                setScope({
                  ...scope,
                  scopeType: e.target.value as ParticipationScopeType,
                })
              }
              style={styles.select}
            >
              {Object.entries(SCOPE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.fieldHalf}>
            <label style={styles.label}>응답 방식</label>
            <select
              value={scope.anonymity}
              onChange={e =>
                setScope({
                  ...scope,
                  anonymity: e.target.value as AnonymityType,
                })
              }
              style={styles.select}
            >
              <option value="anonymous">익명</option>
              <option value="identified">기명</option>
            </select>
          </div>
        </div>

        <div style={styles.fieldRow}>
          <div style={styles.fieldHalf}>
            <label style={styles.label}>시작일 (선택)</label>
            <input
              type="datetime-local"
              value={
                scope.startAt
                  ? new Date(scope.startAt).toISOString().slice(0, 16)
                  : ''
              }
              onChange={e =>
                setScope({
                  ...scope,
                  startAt: e.target.value ? new Date(e.target.value) : undefined,
                })
              }
              style={styles.input}
            />
          </div>

          <div style={styles.fieldHalf}>
            <label style={styles.label}>종료일 (선택)</label>
            <input
              type="datetime-local"
              value={
                scope.endAt
                  ? new Date(scope.endAt).toISOString().slice(0, 16)
                  : ''
              }
              onChange={e =>
                setScope({
                  ...scope,
                  endAt: e.target.value ? new Date(e.target.value) : undefined,
                })
              }
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={scope.allowModification}
              onChange={e =>
                setScope({ ...scope, allowModification: e.target.checked })
              }
            />
            응답 수정 허용
          </label>
        </div>
      </Card>

      {/* 저장 버튼 */}
      <div style={styles.actions}>
        <button
          onClick={() => navigate('/participation')}
          style={styles.cancelButton}
          disabled={saving}
        >
          취소
        </button>
        <button
          onClick={() => handleSubmit(true)}
          style={styles.draftButton}
          disabled={saving}
        >
          {saving ? '저장 중...' : '초안으로 저장'}
        </button>
        <button
          onClick={() => handleSubmit(false)}
          style={styles.publishButton}
          disabled={saving}
        >
          {saving ? '저장 중...' : '바로 시작하기'}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  error: {
    padding: '12px 16px',
    backgroundColor: '#FEE2E2',
    color: colors.accentRed,
    borderRadius: borderRadius.md,
    marginBottom: '24px',
  },
  sectionTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    marginTop: 0,
    marginBottom: '16px',
  },
  field: {
    marginBottom: '16px',
  },
  fieldRow: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
  },
  fieldHalf: {
    flex: 1,
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    ...typography.bodyM,
    color: colors.neutral700,
    fontWeight: 500,
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: borderRadius.md,
    fontSize: '16px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: borderRadius.md,
    fontSize: '16px',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: borderRadius.md,
    fontSize: '16px',
    boxSizing: 'border-box',
    backgroundColor: colors.white,
  },
  questionsSection: {
    marginTop: '24px',
  },
  questionCard: {
    marginBottom: '16px',
  },
  questionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  questionNumber: {
    ...typography.bodyM,
    color: colors.primary,
    fontWeight: 600,
  },
  questionTypeBadge: {
    padding: '2px 8px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    borderRadius: '4px',
    fontSize: '12px',
  },
  removeButton: {
    marginLeft: 'auto',
    padding: '4px 12px',
    backgroundColor: 'transparent',
    border: `1px solid ${colors.accentRed}`,
    color: colors.accentRed,
    borderRadius: borderRadius.sm,
    fontSize: '12px',
    cursor: 'pointer',
  },
  optionsContainer: {
    marginTop: '12px',
    paddingLeft: '16px',
  },
  optionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  optionNumber: {
    ...typography.bodyS,
    color: colors.neutral500,
    minWidth: '20px',
  },
  optionInput: {
    flex: 1,
    padding: '8px 12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: borderRadius.sm,
    fontSize: '14px',
  },
  correctLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    ...typography.bodyS,
    color: colors.neutral600,
  },
  removeOptionButton: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    border: 'none',
    color: colors.neutral400,
    fontSize: '16px',
    cursor: 'pointer',
  },
  addOptionButton: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    border: `1px dashed ${colors.neutral300}`,
    borderRadius: borderRadius.sm,
    color: colors.neutral500,
    fontSize: '13px',
    cursor: 'pointer',
    marginTop: '4px',
  },
  questionOptions: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    ...typography.bodyM,
    color: colors.neutral700,
    cursor: 'pointer',
  },
  addQuestionButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginTop: '16px',
  },
  addQuestionButton: {
    padding: '10px 16px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: borderRadius.md,
    color: colors.neutral700,
    fontSize: '14px',
    cursor: 'pointer',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: borderRadius.md,
    color: colors.neutral700,
    fontSize: '14px',
    cursor: 'pointer',
  },
  draftButton: {
    padding: '12px 24px',
    backgroundColor: colors.neutral100,
    border: 'none',
    borderRadius: borderRadius.md,
    color: colors.neutral700,
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  publishButton: {
    padding: '12px 24px',
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: borderRadius.md,
    color: colors.white,
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
