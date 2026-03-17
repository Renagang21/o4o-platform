/**
 * NoticeWritePage - 공지 작성/수정
 * Work Order 3-2: 작성 권한 - officer, chair
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { IntranetHeader } from '../../components/intranet';
import { colors } from '../../styles/theme';

export function NoticeWritePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [title, setTitle] = useState(isEdit ? '기존 공지 제목' : '');
  const [content, setContent] = useState(isEdit ? '기존 공지 내용...' : '');
  const [isPinned, setIsPinned] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast.error('제목과 내용을 입력해주세요.');
      return;
    }

    toast.info(`공지 ${isEdit ? '수정' : '등록'} 완료 (UI 데모)`);
    navigate('/intranet/notice');
  };

  const handleCancel = () => {
    if (confirm('작성을 취소하시겠습니까? 입력한 내용은 저장되지 않습니다.')) {
      navigate('/intranet/notice');
    }
  };

  return (
    <div>
      <IntranetHeader
        title={isEdit ? '공지 수정' : '공지 작성'}
        subtitle="조직 구성원에게 공지사항을 전달합니다"
      />

      <div style={styles.content}>
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* 제목 */}
          <div style={styles.formGroup}>
            <label style={styles.label}>제목 *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="공지 제목을 입력하세요"
              style={styles.input}
            />
          </div>

          {/* 내용 */}
          <div style={styles.formGroup}>
            <label style={styles.label}>내용 *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="공지 내용을 입력하세요"
              style={styles.textarea}
              rows={15}
            />
          </div>

          {/* 옵션 */}
          <div style={styles.optionsRow}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                style={styles.checkbox}
              />
              <span>📌 상단 고정</span>
            </label>
          </div>

          {/* 첨부파일 */}
          <div style={styles.formGroup}>
            <label style={styles.label}>첨부파일</label>
            <div style={styles.fileUpload}>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                style={styles.fileInput}
                id="file-upload"
              />
              <label htmlFor="file-upload" style={styles.fileLabel}>
                📎 파일 선택
              </label>
              {files.length > 0 && (
                <span style={styles.fileCount}>{files.length}개 파일 선택됨</span>
              )}
            </div>
            {files.length > 0 && (
              <div style={styles.fileList}>
                {files.map((file, index) => (
                  <div key={index} style={styles.fileItem}>
                    {file.name} ({(file.size / 1024).toFixed(1)}KB)
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div style={styles.actions}>
            <button type="button" style={styles.cancelButton} onClick={handleCancel}>
              취소
            </button>
            <button type="submit" style={styles.submitButton}>
              {isEdit ? '수정 완료' : '공지 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
    maxWidth: '800px',
  },
  form: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  formGroup: {
    marginBottom: '24px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral700,
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: `1px solid ${colors.neutral300}`,
    fontSize: '15px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: `1px solid ${colors.neutral300}`,
    fontSize: '15px',
    lineHeight: 1.6,
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  optionsRow: {
    display: 'flex',
    gap: '24px',
    marginBottom: '24px',
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
  },
  fileUpload: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  fileInput: {
    display: 'none',
  },
  fileLabel: {
    padding: '10px 20px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    border: `1px solid ${colors.neutral300}`,
  },
  fileCount: {
    fontSize: '13px',
    color: colors.neutral500,
  },
  fileList: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  fileItem: {
    fontSize: '13px',
    color: colors.neutral600,
    padding: '4px 0',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    paddingTop: '24px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: colors.neutral200,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  submitButton: {
    padding: '12px 32px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
