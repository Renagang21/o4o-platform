/**
 * 테스트 피드백 게시판 - 작성 페이지
 * WO-KPA-TEST-FEEDBACK-BOARD-V1
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { useAuth } from '../../contexts';
import { colors } from '../../styles/theme';
import { ROLES } from '../../lib/role-constants';
import {
  FeedbackType,
  FEEDBACK_TYPE_LABELS,
  FEEDBACK_TYPE_COLORS,
  canWriteFeedback,
} from '../../types/feedback';

export function FeedbackNewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<FeedbackType>('improvement');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canWrite = canWriteFeedback(user?.roles);

  if (!canWrite) {
    return (
      <div style={styles.container}>
        <div style={styles.accessDenied}>
          <span style={styles.accessIcon}>🔒</span>
          <h2>접근 권한 없음</h2>
          <p>지부/분회 운영자만 피드백을 작성할 수 있습니다.</p>
          <button style={styles.backButton} onClick={() => navigate(-1)}>
            뒤로 가기
          </button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast.error('제목과 내용을 모두 입력해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 실제로는 API 호출
      // await api.post('/feedback', { title, content, type });

      // 임시: 로컬 저장 시뮬레이션
      await new Promise((resolve) => setTimeout(resolve, 500));

      toast.success('피드백이 등록되었습니다.');
      navigate('/intranet/feedback');
    } catch {
      toast.error('등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (title || content) {
      if (!confirm('작성 중인 내용이 있습니다. 취소하시겠습니까?')) {
        return;
      }
    }
    navigate('/intranet/feedback');
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>피드백 작성</h1>
        <p style={styles.subtitle}>
          테스트 중 발견한 개선점, 오류, 의견을 작성해주세요.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* 요청 유형 */}
        <div style={styles.formGroup}>
          <label style={styles.label}>요청 유형 *</label>
          <div style={styles.typeSelector}>
            {(Object.keys(FEEDBACK_TYPE_LABELS) as FeedbackType[]).map((t) => (
              <button
                key={t}
                type="button"
                style={{
                  ...styles.typeButton,
                  ...(type === t ? {
                    backgroundColor: FEEDBACK_TYPE_COLORS[t],
                    color: colors.white,
                    borderColor: FEEDBACK_TYPE_COLORS[t],
                  } : {}),
                }}
                onClick={() => setType(t)}
              >
                {FEEDBACK_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* 제목 */}
        <div style={styles.formGroup}>
          <label style={styles.label}>제목 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="피드백 제목을 입력하세요"
            style={styles.input}
            maxLength={100}
          />
          <span style={styles.charCount}>{title.length}/100</span>
        </div>

        {/* 내용 */}
        <div style={styles.formGroup}>
          <label style={styles.label}>내용 *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="피드백 내용을 자세히 작성해주세요.&#10;&#10;- 어떤 상황에서 발생했는지&#10;- 기대했던 동작은 무엇인지&#10;- 실제로 어떻게 동작했는지"
            style={styles.textarea}
            rows={10}
          />
        </div>

        {/* 작성자 정보 */}
        <div style={styles.authorInfo}>
          <span style={styles.authorLabel}>작성자:</span>
          <span style={styles.authorName}>{user?.name || '알 수 없음'}</span>
          <span style={styles.authorRole}>
            ({user?.roles.includes(ROLES.KPA_DISTRICT_ADMIN) ? '지부 운영자' : '분회 운영자'})
          </span>
        </div>

        {/* 버튼 */}
        <div style={styles.actions}>
          <button
            type="button"
            style={styles.cancelButton}
            onClick={handleCancel}
          >
            취소
          </button>
          <button
            type="submit"
            style={{
              ...styles.submitButton,
              ...(isSubmitting ? styles.submitButtonDisabled : {}),
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? '등록 중...' : '피드백 등록'}
          </button>
        </div>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px 32px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: colors.neutral900,
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: colors.neutral500,
    margin: '8px 0 0 0',
  },
  form: {
    backgroundColor: colors.white,
    padding: '32px',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  formGroup: {
    marginBottom: '24px',
    position: 'relative',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral700,
    marginBottom: '8px',
  },
  typeSelector: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  typeButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral600,
    backgroundColor: colors.white,
    border: `2px solid ${colors.neutral300}`,
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  charCount: {
    position: 'absolute',
    right: '0',
    top: '0',
    fontSize: '12px',
    color: colors.neutral400,
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '15px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    outline: 'none',
    resize: 'vertical',
    minHeight: '200px',
    lineHeight: 1.6,
    boxSizing: 'border-box',
  },
  authorInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    marginBottom: '24px',
    fontSize: '14px',
  },
  authorLabel: {
    color: colors.neutral500,
  },
  authorName: {
    fontWeight: 600,
    color: colors.neutral800,
  },
  authorRole: {
    color: colors.neutral500,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  cancelButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral600,
    backgroundColor: colors.neutral100,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '12px 32px',
    fontSize: '14px',
    fontWeight: 600,
    color: colors.white,
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  submitButtonDisabled: {
    backgroundColor: colors.neutral400,
    cursor: 'not-allowed',
  },
  accessDenied: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: colors.neutral50,
    borderRadius: '12px',
  },
  accessIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px',
  },
  backButton: {
    marginTop: '16px',
    padding: '10px 20px',
    backgroundColor: colors.neutral200,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};

export default FeedbackNewPage;
