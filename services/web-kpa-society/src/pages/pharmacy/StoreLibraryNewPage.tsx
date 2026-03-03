/**
 * StoreLibraryNewPage — 매장 자료실 등록 (Neture 프리필 지원)
 *
 * WO-O4O-NETURE-TO-STORE-MANUAL-FLOW-V1
 *
 * 동작:
 * - ?fromNeture=<id> 존재 시 Neture 공개 API에서 메타데이터 조회 → 폼 프리필
 * - file_url은 비워둠 (사용자 직접 업로드 필수)
 * - 자동 DB 복사 금지, FK 연결 금지
 */

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Upload } from 'lucide-react';
import { colors } from '../../styles/theme';
import { getNetureLibraryItem } from '../../api/storeLibrary';

export function StoreLibraryNewPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fromNeture = searchParams.get('fromNeture');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [prefillDone, setPrefillDone] = useState(false);
  const [prefillError, setPrefillError] = useState<string | null>(null);

  // Neture 프리필
  useEffect(() => {
    if (!fromNeture) return;

    let cancelled = false;
    setLoading(true);

    getNetureLibraryItem(fromNeture)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setTitle(res.data.title || '');
          setDescription(res.data.description || '');
          setSourceType(res.data.type || '');
          setImageUrl(res.data.imageUrl || '');
          setPrefillDone(true);
        } else {
          setPrefillError('자료를 불러올 수 없습니다.');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPrefillError('자료를 불러오는 중 오류가 발생했습니다.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [fromNeture]);

  const handleSave = () => {
    // TODO: Store 자료실 저장 API 연동 (WO-O4O-STORE-LIBRARY-FOUNDATION-V1)
    // 현재는 폼 프리필 + UX 흐름만 구현
    alert('저장 기능은 Store Library API 연동 후 활성화됩니다.');
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingBox}>
          <p style={{ color: colors.neutral500 }}>공급자 자료를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={styles.backButton}
      >
        <ArrowLeft size={16} />
        돌아가기
      </button>

      {/* Page header */}
      <h1 style={styles.pageTitle}>매장 자료 등록</h1>

      {/* Neture prefill banner */}
      {fromNeture && prefillDone && (
        <div style={styles.prefillBanner}>
          <Info size={16} style={{ color: '#2563eb', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={styles.bannerTitle}>공급자 자료에서 가져온 정보입니다</p>
            <p style={styles.bannerText}>
              제목과 설명이 자동으로 채워졌습니다. 매장에서 사용하려면 파일을 직접 업로드해주세요.
            </p>
          </div>
        </div>
      )}

      {/* Neture prefill error */}
      {fromNeture && prefillError && (
        <div style={styles.errorBanner}>
          <Info size={16} style={{ color: colors.error, flexShrink: 0, marginTop: '2px' }} />
          <p style={{ margin: 0, fontSize: '13px', color: colors.error }}>{prefillError}</p>
        </div>
      )}

      {/* Form */}
      <div style={styles.formCard}>
        {/* Title */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>제목 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="자료 제목을 입력하세요"
            style={styles.input}
            maxLength={200}
          />
        </div>

        {/* Description */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="자료에 대한 설명을 입력하세요"
            style={styles.textarea}
            rows={4}
          />
        </div>

        {/* Source type (read-only when prefilled) */}
        {sourceType && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>자료 유형</label>
            <input
              type="text"
              value={sourceType}
              readOnly
              style={{ ...styles.input, backgroundColor: colors.neutral100, color: colors.neutral500 }}
            />
          </div>
        )}

        {/* File upload area */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>파일 업로드 *</label>
          <div style={styles.uploadArea}>
            <Upload size={32} style={{ color: colors.neutral400 }} />
            <p style={styles.uploadText}>파일을 드래그하거나 클릭하여 업로드하세요</p>
            <p style={styles.uploadHint}>
              {fromNeture
                ? '공급자 자료의 파일은 자동으로 복사되지 않습니다. 다운로드한 파일을 여기에 업로드해주세요.'
                : '이미지, PDF 등 매장에서 사용할 파일을 업로드하세요.'}
            </p>
          </div>
        </div>

        {/* Image preview (if prefilled) */}
        {imageUrl && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>참고 이미지 (공급자 원본)</label>
            <div style={styles.previewBox}>
              <img
                src={imageUrl}
                alt="공급자 원본 이미지"
                style={styles.previewImage}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <p style={styles.previewHint}>이 이미지는 참고용입니다. 매장 사용을 위해 직접 업로드해주세요.</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          <button onClick={() => navigate(-1)} style={styles.cancelBtn}>취소</button>
          <button
            onClick={handleSave}
            disabled={!title.trim()}
            style={{
              ...styles.saveBtn,
              opacity: title.trim() ? 1 : 0.5,
              cursor: title.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '720px',
    margin: '0 auto',
    padding: '24px 0',
  },
  loadingBox: {
    textAlign: 'center',
    padding: '60px',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    color: colors.neutral500,
    fontSize: '13px',
    cursor: 'pointer',
    marginBottom: '16px',
  },
  pageTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: colors.neutral800,
    margin: '0 0 20px 0',
  },
  prefillBanner: {
    display: 'flex',
    gap: '12px',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    padding: '14px 16px',
    marginBottom: '20px',
  },
  bannerTitle: {
    margin: '0 0 4px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e40af',
  },
  bannerText: {
    margin: 0,
    fontSize: '13px',
    color: '#1e40af',
    lineHeight: 1.5,
  },
  errorBanner: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    border: `1px solid #fecaca`,
    borderRadius: '8px',
    padding: '14px 16px',
    marginBottom: '20px',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: `1px solid ${colors.neutral200}`,
    padding: '24px',
  },
  fieldGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral700,
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.neutral800,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.neutral800,
    outline: 'none',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  uploadArea: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
    border: `2px dashed ${colors.neutral300}`,
    borderRadius: '10px',
    backgroundColor: colors.neutral50,
    cursor: 'pointer',
  },
  uploadText: {
    margin: '12px 0 4px',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral600,
  },
  uploadHint: {
    margin: 0,
    fontSize: '12px',
    color: colors.neutral400,
    textAlign: 'center' as const,
    lineHeight: 1.5,
  },
  previewBox: {
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    padding: '12px',
    backgroundColor: colors.neutral50,
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '200px',
    borderRadius: '6px',
    objectFit: 'contain' as const,
  },
  previewHint: {
    margin: '8px 0 0',
    fontSize: '12px',
    color: colors.neutral400,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  cancelBtn: {
    padding: '10px 20px',
    backgroundColor: '#fff',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.neutral600,
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '10px 20px',
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    cursor: 'pointer',
  },
};
