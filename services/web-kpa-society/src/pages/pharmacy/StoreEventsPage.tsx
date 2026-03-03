/**
 * StoreEventsPage
 *
 * WO-O4O-STORE-EVENT-MINIMAL-V1
 *
 * 매장 이벤트 관리 페이지 (CRUD + QR 인쇄).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Printer, Plus, Edit2, Trash2, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { colors, shadows, borderRadius } from '../../styles/theme';
import {
  getStoreEvents,
  createStoreEvent,
  updateStoreEvent,
  deleteStoreEvent,
} from '../../api/storeEvents';
import type { StoreEvent, CreateEventParams, UpdateEventParams } from '../../api/storeEvents';

export function StoreEventsPage() {
  const [events, setEvents] = useState<StoreEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<StoreEvent | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [saving, setSaving] = useState(false);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getStoreEvents();
      setEvents(result.data || []);
    } catch (err: any) {
      setError(err.message || '이벤트를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormImageUrl('');
    setFormStartDate('');
    setFormEndDate('');
    setFormSortOrder(0);
    setEditingEvent(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (event: StoreEvent) => {
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormDescription(event.description || '');
    setFormImageUrl(event.imageUrl || '');
    setFormStartDate(event.startDate ? event.startDate.slice(0, 10) : '');
    setFormEndDate(event.endDate ? event.endDate.slice(0, 10) : '');
    setFormSortOrder(event.sortOrder);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return;

    try {
      setSaving(true);

      if (editingEvent) {
        const params: UpdateEventParams = {
          title: formTitle.trim(),
          description: formDescription || null,
          imageUrl: formImageUrl || null,
          startDate: formStartDate || null,
          endDate: formEndDate || null,
          sortOrder: formSortOrder,
        };
        await updateStoreEvent(editingEvent.id, params);
      } else {
        const params: CreateEventParams = {
          title: formTitle.trim(),
          description: formDescription || undefined,
          imageUrl: formImageUrl || undefined,
          startDate: formStartDate || undefined,
          endDate: formEndDate || undefined,
          sortOrder: formSortOrder,
        };
        await createStoreEvent(params);
      }

      resetForm();
      await loadEvents();
    } catch (err: any) {
      setError(err.message || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 이벤트를 비활성화하시겠습니까?')) return;

    try {
      await deleteStoreEvent(id);
      await loadEvents();
    } catch (err: any) {
      setError(err.message || '삭제에 실패했습니다.');
    }
  };

  const handleQrPrint = (eventId: string) => {
    window.open(`/api/v1/kpa/store/qr/event/${eventId}/print`, '_blank');
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ko-KR');
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <Link to="/store" style={styles.backLink}>
            <ChevronLeft size={18} />
          </Link>
          <h1 style={styles.title}>이벤트 관리</h1>
          <span style={styles.count}>{events.length}개</span>
        </div>
        <button style={styles.addButton} onClick={openCreateForm}>
          <Plus size={16} />
          이벤트 등록
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={styles.errorBanner}>
          {error}
          <button style={styles.retryButton} onClick={loadEvents}>
            다시 시도
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div style={styles.formOverlay}>
          <div style={styles.formCard}>
            <h2 style={styles.formTitle}>
              {editingEvent ? '이벤트 수정' : '이벤트 등록'}
            </h2>

            <label style={styles.label}>제목 *</label>
            <input
              style={styles.input}
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="이벤트 제목"
              maxLength={300}
            />

            <label style={styles.label}>설명</label>
            <textarea
              style={styles.textarea}
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="이벤트 설명"
              rows={3}
            />

            <label style={styles.label}>이미지 URL</label>
            <input
              style={styles.input}
              value={formImageUrl}
              onChange={(e) => setFormImageUrl(e.target.value)}
              placeholder="https://..."
            />

            <div style={styles.dateRow}>
              <div style={styles.dateField}>
                <label style={styles.label}>시작일</label>
                <input
                  type="date"
                  style={styles.input}
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                />
              </div>
              <div style={styles.dateField}>
                <label style={styles.label}>종료일</label>
                <input
                  type="date"
                  style={styles.input}
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                />
              </div>
            </div>

            <label style={styles.label}>정렬 순서</label>
            <input
              type="number"
              style={styles.input}
              value={formSortOrder}
              onChange={(e) => setFormSortOrder(Number(e.target.value))}
            />

            <div style={styles.formActions}>
              <button style={styles.cancelButton} onClick={resetForm}>
                취소
              </button>
              <button
                style={styles.saveButton}
                onClick={handleSave}
                disabled={saving || !formTitle.trim()}
              >
                {saving ? '저장 중...' : editingEvent ? '수정' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <p style={styles.loadingText}>이벤트를 불러오는 중...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && events.length === 0 && (
        <div style={styles.emptyState}>
          <p style={styles.emptyTitle}>등록된 이벤트가 없습니다</p>
          <p style={styles.emptyDescription}>
            매장 이벤트를 등록하고 QR 코드를 인쇄하여 고객에게 안내하세요.
          </p>
          <button style={styles.addButton} onClick={openCreateForm}>
            <Plus size={16} />
            첫 이벤트 등록하기
          </button>
        </div>
      )}

      {/* Event List */}
      {!loading && events.length > 0 && (
        <div style={styles.list}>
          {events.map((event) => (
            <div key={event.id} style={styles.card}>
              <div style={styles.cardContent}>
                {event.imageUrl && (
                  <img
                    src={event.imageUrl}
                    alt={event.title}
                    style={styles.thumbnail}
                  />
                )}
                <div style={styles.cardInfo}>
                  <div style={styles.cardTitleRow}>
                    <h3 style={styles.cardTitle}>{event.title}</h3>
                    {!event.isActive && (
                      <span style={styles.inactiveBadge}>비활성</span>
                    )}
                  </div>
                  {event.description && (
                    <p style={styles.cardDescription}>{event.description}</p>
                  )}
                  <div style={styles.cardMeta}>
                    <span>
                      기간: {formatDate(event.startDate)} ~ {formatDate(event.endDate)}
                    </span>
                    <span>정렬: {event.sortOrder}</span>
                  </div>
                </div>
              </div>
              <div style={styles.cardActions}>
                <button
                  style={styles.iconButton}
                  onClick={() => handleQrPrint(event.id)}
                  title="QR 인쇄"
                >
                  <Printer size={18} />
                </button>
                <button
                  style={styles.iconButton}
                  onClick={() => openEditForm(event)}
                  title="수정"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  style={{ ...styles.iconButton, color: '#ef4444' }}
                  onClick={() => handleDelete(event.id)}
                  title="비활성화"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  backLink: {
    display: 'flex',
    alignItems: 'center',
    color: colors.neutral500,
    textDecoration: 'none',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: colors.neutral900,
    margin: 0,
  },
  count: {
    fontSize: '13px',
    color: colors.neutral500,
    background: '#f1f5f9',
    padding: '2px 8px',
    borderRadius: '12px',
  },
  addButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    background: colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: borderRadius.md,
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  errorBanner: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: borderRadius.md,
    color: '#dc2626',
    fontSize: '14px',
    marginBottom: '16px',
  },
  retryButton: {
    padding: '4px 12px',
    background: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  loadingContainer: {
    textAlign: 'center' as const,
    padding: '60px 0',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e2e8f0',
    borderTopColor: colors.primary,
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
    margin: '0 auto 12px',
  },
  loadingText: {
    color: colors.neutral500,
    fontSize: '14px',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '60px 0',
  },
  emptyTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: '0 0 8px',
  },
  emptyDescription: {
    fontSize: '14px',
    color: colors.neutral500,
    margin: '0 0 20px',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  card: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: borderRadius.md,
    boxShadow: shadows.sm,
  },
  cardContent: {
    display: 'flex',
    gap: '12px',
    flex: 1,
    minWidth: 0,
  },
  thumbnail: {
    width: '80px',
    height: '60px',
    objectFit: 'cover' as const,
    borderRadius: '6px',
    flexShrink: 0,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '4px',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  inactiveBadge: {
    fontSize: '11px',
    padding: '2px 6px',
    background: '#f1f5f9',
    color: '#64748b',
    borderRadius: '4px',
    flexShrink: 0,
  },
  cardDescription: {
    fontSize: '13px',
    color: colors.neutral500,
    margin: '0 0 4px',
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  cardMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '12px',
    color: '#94a3b8',
  },
  cardActions: {
    display: 'flex',
    gap: '4px',
    flexShrink: 0,
    marginLeft: '12px',
  },
  iconButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '36px',
    height: '36px',
    background: 'transparent',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    color: '#64748b',
    cursor: 'pointer',
  },
  // Form styles
  formOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  formCard: {
    background: '#fff',
    borderRadius: '12px',
    padding: '24px',
    width: '480px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflow: 'auto' as const,
    boxShadow: shadows.lg,
  },
  formTitle: {
    fontSize: '18px',
    fontWeight: 700,
    color: colors.neutral900,
    margin: '0 0 20px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral500,
    marginBottom: '4px',
    marginTop: '12px',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
  },
  dateRow: {
    display: 'flex',
    gap: '12px',
  },
  dateField: {
    flex: 1,
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '20px',
  },
  cancelButton: {
    padding: '8px 16px',
    background: '#f1f5f9',
    color: colors.neutral500,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  saveButton: {
    padding: '8px 20px',
    background: colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
};
