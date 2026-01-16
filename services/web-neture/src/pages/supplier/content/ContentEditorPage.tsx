/**
 * ContentEditorPage - 콘텐츠 편집 전용 페이지
 *
 * Work Order: WO-CONTENT-EDITOR-V1
 *
 * 기능:
 * - 리치 텍스트 편집 (TipTap 기반)
 * - 이미지 URL 삽입
 * - YouTube/Vimeo 동영상 임베드
 * - 실시간 미리보기
 * - 자동 저장
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Eye,
  EyeOff,
  FileText,
  Image,
  Flag,
  BookOpen,
  Monitor,
  Smartphone,
} from 'lucide-react';
import { RichTextEditor, ContentPreview } from '@o4o/content-editor';
import {
  supplierApi,
  type ContentType,
} from '../../../lib/api';

const CONTENT_TYPE_CONFIG: Record<ContentType, { label: string; icon: typeof FileText; color: string }> = {
  description: { label: '제품 설명', icon: FileText, color: '#3b82f6' },
  image: { label: '이미지', icon: Image, color: '#8b5cf6' },
  banner: { label: '배너', icon: Flag, color: '#f59e0b' },
  guide: { label: '가이드', icon: BookOpen, color: '#10b981' },
};

const AVAILABLE_SERVICES = [
  { id: 'glycopharm', name: 'GlycoPharm' },
  { id: 'k-cosmetics', name: 'K-Cosmetics' },
  { id: 'glucoseview', name: 'GlucoseView' },
];

const AVAILABLE_AREAS = [
  { id: 'product', name: '상품 상세' },
  { id: 'banner', name: '배너' },
  { id: 'description', name: '설명' },
  { id: 'guide', name: '가이드' },
];

interface FormData {
  type: ContentType;
  title: string;
  description: string;
  body: string;
  availableServices: string[];
  availableAreas: string[];
}

export default function ContentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState<FormData>({
    type: 'description',
    title: '',
    description: '',
    body: '',
    availableServices: [],
    availableAreas: [],
  });

  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // 기존 콘텐츠 로드 (수정 모드)
  useEffect(() => {
    if (isEditMode && id) {
      (async () => {
        const content = await supplierApi.getContentById(id);
        if (content) {
          setFormData({
            type: content.type,
            title: content.title,
            description: content.description,
            body: content.body,
            availableServices: content.availableServices,
            availableAreas: content.availableAreas,
          });
        }
        setLoading(false);
      })();
    }
  }, [id, isEditMode]);

  // 저장 핸들러
  const handleSave = useCallback(async (publish = false) => {
    if (!formData.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    setSaving(true);

    try {
      if (isEditMode && id) {
        // 수정
        const result = await supplierApi.updateContent(id, {
          title: formData.title,
          description: formData.description,
          body: formData.body,
          availableServices: formData.availableServices,
          availableAreas: formData.availableAreas,
          ...(publish && { status: 'published' as const }),
        });

        if (result.success) {
          setLastSaved(new Date());
          if (publish) {
            navigate('/supplier/contents');
          }
        }
      } else {
        // 새로 생성
        const result = await supplierApi.createContent({
          type: formData.type,
          title: formData.title,
          description: formData.description,
          body: formData.body,
          availableServices: formData.availableServices,
          availableAreas: formData.availableAreas,
        });

        if (result.success && result.data?.id) {
          setLastSaved(new Date());
          // 생성 후 수정 모드로 전환
          navigate(`/supplier/contents/${result.data.id}/edit`, { replace: true });
        }
      }
    } catch (error) {
      console.error('Save failed:', error);
      alert('저장에 실패했습니다.');
    }

    setSaving(false);
  }, [formData, id, isEditMode, navigate]);

  // 에디터 콘텐츠 변경 핸들러
  const handleEditorChange = useCallback((content: { html: string }) => {
    setFormData((prev) => ({ ...prev, body: content.html }));
  }, []);

  // 자동 저장 (30초마다)
  useEffect(() => {
    if (!isEditMode || !id) return;

    const interval = setInterval(() => {
      if (formData.title.trim()) {
        handleSave(false);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isEditMode, id, formData, handleSave]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loading}>로딩 중...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => navigate('/supplier/contents')} style={styles.backButton}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={styles.headerTitle}>
              {isEditMode ? '콘텐츠 수정' : '새 콘텐츠 작성'}
            </h1>
            {lastSaved && (
              <p style={styles.lastSaved}>
                마지막 저장: {lastSaved.toLocaleTimeString('ko-KR')}
              </p>
            )}
          </div>
        </div>

        <div style={styles.headerRight}>
          <button
            onClick={() => setShowPreview(!showPreview)}
            style={{
              ...styles.headerButton,
              backgroundColor: showPreview ? '#eff6ff' : '#f8fafc',
              color: showPreview ? '#2563eb' : '#64748b',
            }}
          >
            {showPreview ? <EyeOff size={16} /> : <Eye size={16} />}
            {showPreview ? '미리보기 숨기기' : '미리보기'}
          </button>

          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            style={styles.saveButton}
          >
            <Save size={16} />
            {saving ? '저장 중...' : '임시저장'}
          </button>

          <button
            onClick={() => handleSave(true)}
            disabled={saving || !formData.title.trim()}
            style={styles.publishButton}
          >
            공개하기
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={styles.main}>
        {/* Editor Section */}
        <div style={{ ...styles.editorSection, flex: showPreview ? '1 1 50%' : '1 1 100%' }}>
          {/* Meta Fields */}
          <div style={styles.metaSection}>
            {/* Type */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>콘텐츠 유형</label>
              <div style={styles.typeGrid}>
                {(Object.entries(CONTENT_TYPE_CONFIG) as [ContentType, typeof CONTENT_TYPE_CONFIG[ContentType]][]).map(
                  ([type, config]) => {
                    const Icon = config.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => setFormData({ ...formData, type })}
                        disabled={isEditMode}
                        style={{
                          ...styles.typeOption,
                          borderColor: formData.type === type ? config.color : '#e2e8f0',
                          backgroundColor: formData.type === type ? `${config.color}10` : '#fff',
                          opacity: isEditMode && formData.type !== type ? 0.5 : 1,
                        }}
                      >
                        <Icon size={16} style={{ color: config.color }} />
                        <span style={{ fontSize: '12px' }}>{config.label}</span>
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            {/* Title */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>제목 *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="콘텐츠 제목을 입력하세요"
                style={styles.input}
              />
            </div>

            {/* Description */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>간단 설명</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="콘텐츠에 대한 간단한 설명"
                style={styles.input}
              />
            </div>

            {/* Services & Areas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>사용 가능 서비스</label>
                <div style={styles.checkboxGroup}>
                  {AVAILABLE_SERVICES.map((svc) => (
                    <label key={svc.id} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.availableServices.includes(svc.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              availableServices: [...formData.availableServices, svc.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              availableServices: formData.availableServices.filter((s) => s !== svc.id),
                            });
                          }
                        }}
                      />
                      {svc.name}
                    </label>
                  ))}
                </div>
              </div>

              <div style={styles.fieldGroup}>
                <label style={styles.label}>사용 가능 영역</label>
                <div style={styles.checkboxGroup}>
                  {AVAILABLE_AREAS.map((area) => (
                    <label key={area.id} style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.availableAreas.includes(area.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({
                              ...formData,
                              availableAreas: [...formData.availableAreas, area.id],
                            });
                          } else {
                            setFormData({
                              ...formData,
                              availableAreas: formData.availableAreas.filter((a) => a !== area.id),
                            });
                          }
                        }}
                      />
                      {area.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Rich Text Editor */}
          <div style={styles.editorContainer}>
            <label style={styles.label}>본문</label>
            <RichTextEditor
              value={formData.body}
              onChange={handleEditorChange}
              placeholder="콘텐츠 본문을 작성하세요. 이미지 URL이나 YouTube/Vimeo 동영상을 삽입할 수 있습니다."
              minHeight="500px"
            />
          </div>
        </div>

        {/* Preview Section */}
        {showPreview && (
          <div style={styles.previewSection}>
            <div style={styles.previewHeader}>
              <span style={styles.previewTitle}>미리보기</span>
              <div style={styles.deviceToggle}>
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  style={{
                    ...styles.deviceButton,
                    backgroundColor: previewDevice === 'desktop' ? '#e0e7ff' : 'transparent',
                    color: previewDevice === 'desktop' ? '#4f46e5' : '#64748b',
                  }}
                >
                  <Monitor size={14} />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  style={{
                    ...styles.deviceButton,
                    backgroundColor: previewDevice === 'mobile' ? '#e0e7ff' : 'transparent',
                    color: previewDevice === 'mobile' ? '#4f46e5' : '#64748b',
                  }}
                >
                  <Smartphone size={14} />
                </button>
              </div>
            </div>

            <div
              style={{
                ...styles.previewContent,
                maxWidth: previewDevice === 'mobile' ? '375px' : '100%',
                margin: previewDevice === 'mobile' ? '0 auto' : '0',
              }}
            >
              {formData.title && (
                <h1 style={styles.previewContentTitle}>{formData.title}</h1>
              )}
              {formData.description && (
                <p style={styles.previewContentDesc}>{formData.description}</p>
              )}
              <ContentPreview html={formData.body} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
  },
  loading: {
    color: '#64748b',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e2e8f0',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    color: '#64748b',
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    margin: 0,
  },
  lastSaved: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: '2px 0 0 0',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  headerButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  saveButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#475569',
    cursor: 'pointer',
  },
  publishButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#fff',
    cursor: 'pointer',
  },
  main: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  editorSection: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'auto',
    padding: '24px',
    gap: '20px',
  },
  metaSection: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
  },
  fieldGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#475569',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  typeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
  },
  typeOption: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '10px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  checkboxGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: '#475569',
    cursor: 'pointer',
  },
  editorContainer: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
    flex: 1,
  },
  previewSection: {
    flex: '1 1 50%',
    display: 'flex',
    flexDirection: 'column',
    borderLeft: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  previewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#f9fafb',
  },
  previewTitle: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#64748b',
  },
  deviceToggle: {
    display: 'flex',
    gap: '4px',
  },
  deviceButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  previewContent: {
    flex: 1,
    overflow: 'auto',
    padding: '24px',
  },
  previewContentTitle: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  previewContentDesc: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 20px 0',
  },
};
