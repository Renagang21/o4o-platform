/**
 * SellerRequestDetailPage - 판매자 신청 상세 + 승인/거절
 *
 * Work Order: WO-NETURE-SUPPLIER-DASHBOARD-P0
 * API: WO-NETURE-SUPPLIER-REQUEST-API-V1
 *
 * 핵심 기능:
 * - 신청 상세 정보 조회
 * - 승인/거절/중단/재활성화/종료 실행 (공급자 주체)
 * - P5 사용 맥락 요약 재사용
 * - WO-NETURE-SUPPLIER-RELATION-STATE-EXTENSION-V1: 상태별 버튼 분기
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Store,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  PauseCircle,
  PlayCircle,
  Ban,
} from 'lucide-react';
import { supplierApi, type SupplierRequestDetail } from '../../lib/api';

// 서비스 아이콘 맵핑
const SERVICE_ICONS: Record<string, string> = {
  glycopharm: '🏥',
  'k-cosmetics': '💄',
  glucoseview: '📊',
};

// 사용 맥락 정보 (P5 재사용)
const USAGE_CONTEXTS: Record<string, { description: string; audience: string; purpose: string }> = {
  glycopharm: {
    description: '약국 고객 대상 건강기능식품 판매',
    audience: '약국 방문 고객',
    purpose: '전문 상담과 함께 제품 판매',
  },
  'k-cosmetics': {
    description: '뷰티 전문점 대상 화장품 유통',
    audience: '뷰티샵 및 화장품 전문점',
    purpose: '브랜드 입점 및 소매 판매',
  },
  glucoseview: {
    description: '혈당 관리 사용자 대상 건강식품',
    audience: '당뇨 관리 앱 사용자',
    purpose: '혈당 관리에 도움되는 제품 추천',
  },
};

const PURPOSE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  CATALOG: { label: '정보 제공용', color: '#475569', bgColor: '#f1f5f9' },
  APPLICATION: { label: '신청 가능', color: '#1d4ed8', bgColor: '#eff6ff' },
  ACTIVE_SALES: { label: '판매 중', color: '#15803d', bgColor: '#f0fdf4' },
};

export default function SellerRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<SupplierRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionNote, setActionNote] = useState('');
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  useEffect(() => {
    const fetchRequest = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await supplierApi.getRequestById(id);
        if (data) {
          setRequest(data);
        } else {
          setError('신청을 찾을 수 없습니다.');
        }
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchRequest();
  }, [id]);

  const handleApprove = async () => {
    if (!request || !id) return;
    setProcessing(true);
    try {
      const result = await supplierApi.approveRequest(id);
      if (result.success) {
        setRequest({
          ...request,
          status: 'approved',
          decidedAt: new Date().toISOString(),
        });
        toast.success('신청이 승인되었습니다.');
      } else {
        toast.error(result.error || '승인 처리 중 오류가 발생했습니다.');
      }
    } catch (err) {
      toast.error('승인 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!request || !id || !rejectReason.trim()) return;
    setProcessing(true);
    try {
      const result = await supplierApi.rejectRequest(id, rejectReason);
      if (result.success) {
        setRequest({
          ...request,
          status: 'rejected',
          decidedAt: new Date().toISOString(),
          rejectReason: rejectReason,
        });
        setShowRejectModal(false);
        toast.success('신청이 거절되었습니다.');
      } else {
        toast.error(result.error || '거절 처리 중 오류가 발생했습니다.');
      }
    } catch (err) {
      toast.error('거절 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  // WO-NETURE-SUPPLIER-RELATION-STATE-EXTENSION-V1: 관계 통제 핸들러

  const handleSuspend = async () => {
    if (!request || !id) return;
    setProcessing(true);
    try {
      const result = await supplierApi.suspendRequest(id, actionNote || undefined);
      if (result.success) {
        setRequest({ ...request, status: 'suspended', suspendedAt: new Date().toISOString() });
        toast.success('공급이 일시 중단되었습니다.');
      } else {
        toast.error(result.error || '처리 중 오류가 발생했습니다.');
      }
    } catch {
      toast.error('처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const handleReactivate = async () => {
    if (!request || !id) return;
    setProcessing(true);
    try {
      const result = await supplierApi.reactivateRequest(id, actionNote || undefined);
      if (result.success) {
        setRequest({ ...request, status: 'approved', suspendedAt: null });
        toast.success('공급이 재활성화되었습니다.');
      } else {
        toast.error(result.error || '처리 중 오류가 발생했습니다.');
      }
    } catch {
      toast.error('처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRevoke = async () => {
    if (!request || !id) return;
    setProcessing(true);
    try {
      const result = await supplierApi.revokeRequest(id, actionNote || undefined);
      if (result.success) {
        setRequest({ ...request, status: 'revoked', revokedAt: new Date().toISOString() });
        setShowRevokeModal(false);
        toast.success('공급이 종료되었습니다.');
      } else {
        toast.error(result.error || '처리 중 오류가 발생했습니다.');
      }
    } catch {
      toast.error('처리 중 오류가 발생했습니다.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return <div style={styles.loading}>로딩 중...</div>;
  }

  if (error || !request) {
    return (
      <div style={styles.error}>
        <p>{error || '신청을 찾을 수 없습니다.'}</p>
        <Link to="/supplier/requests" style={styles.backLink}>목록으로 돌아가기</Link>
      </div>
    );
  }

  const purposeConfig = PURPOSE_CONFIG[request.product.purpose] || PURPOSE_CONFIG.CATALOG;
  const usageContext = USAGE_CONTEXTS[request.service.id];
  const serviceIcon = SERVICE_ICONS[request.service.id] || '📦';
  const isPending = request.status === 'pending';
  const isApproved = request.status === 'approved';
  const isSuspended = request.status === 'suspended';

  // 상태 뱃지 설정 (WO-NETURE-SUPPLIER-RELATION-STATE-EXTENSION-V1)
  const STATUS_BADGE: Record<string, { bg: string; color: string; icon: React.ReactNode; label: string }> = {
    pending: { bg: '#fef3c7', color: '#b45309', icon: <Clock size={14} />, label: '승인 대기' },
    approved: { bg: '#dcfce7', color: '#15803d', icon: <CheckCircle size={14} />, label: '승인됨' },
    rejected: { bg: '#fee2e2', color: '#dc2626', icon: <XCircle size={14} />, label: '거절됨' },
    suspended: { bg: '#fff7ed', color: '#c2410c', icon: <PauseCircle size={14} />, label: '일시 중단' },
    revoked: { bg: '#fee2e2', color: '#dc2626', icon: <Ban size={14} />, label: '공급 종료' },
    expired: { bg: '#f1f5f9', color: '#64748b', icon: <Clock size={14} />, label: '계약 만료' },
  };

  const badge = STATUS_BADGE[request.status] || STATUS_BADGE.pending;

  return (
    <div>
      {/* Header */}
      <Link to="/supplier/requests" style={styles.backButton}>
        <ArrowLeft size={18} />
        신청 목록으로
      </Link>

      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.headerServiceIcon}>{serviceIcon}</span>
          <div>
            <h1 style={styles.title}>판매자 신청 상세</h1>
            <p style={styles.subtitle}>
              {request.service.name} · {request.seller.name}
            </p>
          </div>
        </div>
        <div
          style={{
            ...styles.statusBadge,
            backgroundColor: badge.bg,
            color: badge.color,
          }}
        >
          {badge.icon}
          {badge.label}
        </div>
      </div>

      {/* Content Grid */}
      <div style={styles.grid}>
        {/* Left Column */}
        <div style={styles.leftColumn}>
          {/* Seller Info */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>
              <User size={18} />
              판매자 정보
            </h2>
            <div style={styles.infoGrid}>
              <div style={styles.infoItem}>
                <Store size={16} style={styles.infoIcon} />
                <div>
                  <p style={styles.infoLabel}>매장명</p>
                  <p style={styles.infoValue}>{request.seller.name}</p>
                </div>
              </div>
              <div style={styles.infoItem}>
                <Mail size={16} style={styles.infoIcon} />
                <div>
                  <p style={styles.infoLabel}>이메일</p>
                  <p style={styles.infoValue}>{request.seller.email}</p>
                </div>
              </div>
              <div style={styles.infoItem}>
                <Phone size={16} style={styles.infoIcon} />
                <div>
                  <p style={styles.infoLabel}>연락처</p>
                  <p style={styles.infoValue}>{request.seller.phone || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Product Info */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>
              <Package size={18} />
              신청 제품
            </h2>
            <div style={styles.productHeader}>
              <span style={styles.productName}>{request.product.name}</span>
              <span
                style={{
                  ...styles.purposeBadge,
                  backgroundColor: purposeConfig.bgColor,
                  color: purposeConfig.color,
                }}
              >
                {purposeConfig.label}
              </span>
            </div>
            <p style={styles.productCategory}>{request.product.category}</p>
          </div>
        </div>

        {/* Right Column */}
        <div style={styles.rightColumn}>
          {/* Usage Context (P5 재사용) */}
          {usageContext && (
            <div style={styles.contextCard}>
              <h2 style={styles.contextTitle}>
                <Sparkles size={18} />
                서비스 사용 맥락
              </h2>
              <p style={styles.contextDescription}>{usageContext.description}</p>
              <div style={styles.contextRow}>
                <span style={styles.contextLabel}>대상</span>
                <span style={styles.contextValue}>{usageContext.audience}</span>
              </div>
              <div style={styles.contextRow}>
                <span style={styles.contextLabel}>활용</span>
                <span style={styles.contextValue}>{usageContext.purpose}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {isPending && (
            <div style={styles.actionCard}>
              <h2 style={styles.actionTitle}>신청 처리</h2>
              <p style={styles.actionDescription}>
                이 신청을 승인하면 판매자가 해당 서비스에서 제품 판매를 시작할 수 있습니다.
              </p>
              <div style={styles.actionButtons}>
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  style={styles.approveButton}
                >
                  <CheckCircle size={18} />
                  {processing ? '처리 중...' : '승인'}
                </button>
                <button
                  onClick={() => setShowRejectModal(true)}
                  disabled={processing}
                  style={styles.rejectButton}
                >
                  <XCircle size={18} />
                  거절
                </button>
              </div>
            </div>
          )}

          {/* WO-NETURE-SUPPLIER-RELATION-STATE-EXTENSION-V1: Approved Actions */}
          {isApproved && (
            <div style={styles.actionCard}>
              <h2 style={styles.actionTitle}>관계 관리</h2>
              <p style={styles.actionDescription}>
                승인된 공급 관계를 관리합니다. 일시 중단 시 판매자의 판매가 중지되며, 재활성화가 가능합니다.
              </p>
              <div style={styles.actionButtons}>
                <button
                  onClick={handleSuspend}
                  disabled={processing}
                  style={styles.suspendButton}
                >
                  <PauseCircle size={18} />
                  {processing ? '처리 중...' : '일시 중단'}
                </button>
                <button
                  onClick={() => setShowRevokeModal(true)}
                  disabled={processing}
                  style={styles.revokeButton}
                >
                  <Ban size={18} />
                  공급 종료
                </button>
              </div>
            </div>
          )}

          {/* WO-NETURE-SUPPLIER-RELATION-STATE-EXTENSION-V1: Suspended Actions */}
          {isSuspended && (
            <div style={styles.actionCard}>
              <h2 style={styles.actionTitle}>중단된 공급</h2>
              <p style={styles.actionDescription}>
                공급이 일시 중단되었습니다. 재활성화하거나 완전히 종료할 수 있습니다.
              </p>
              <div style={styles.actionButtons}>
                <button
                  onClick={handleReactivate}
                  disabled={processing}
                  style={styles.approveButton}
                >
                  <PlayCircle size={18} />
                  {processing ? '처리 중...' : '재활성화'}
                </button>
                <button
                  onClick={() => setShowRevokeModal(true)}
                  disabled={processing}
                  style={styles.revokeButton}
                >
                  <Ban size={18} />
                  공급 종료
                </button>
              </div>
            </div>
          )}

          {/* Processed Info */}
          {!isPending && !isApproved && !isSuspended && (
            <div style={styles.processedCard}>
              <h2 style={styles.processedTitle}>처리 정보</h2>
              {request.decidedAt && (
                <p>
                  처리 일시: {new Date(request.decidedAt).toLocaleString('ko-KR')}
                </p>
              )}
              {request.revokedAt && (
                <p>
                  종료 일시: {new Date(request.revokedAt).toLocaleString('ko-KR')}
                </p>
              )}
              {request.expiredAt && (
                <p>
                  만료 일시: {new Date(request.expiredAt).toLocaleString('ko-KR')}
                </p>
              )}
              {request.rejectReason && (
                <div style={styles.rejectReasonBox}>
                  <p style={styles.rejectReasonLabel}>거절 사유</p>
                  <p style={styles.rejectReasonText}>{request.rejectReason}</p>
                </div>
              )}
              {request.relationNote && (
                <div style={{ ...styles.rejectReasonBox, backgroundColor: '#f1f5f9' }}>
                  <p style={{ ...styles.rejectReasonLabel, color: '#475569' }}>사유</p>
                  <p style={{ ...styles.rejectReasonText, color: '#334155' }}>{request.relationNote}</p>
                </div>
              )}
            </div>
          )}

          {/* Request Info */}
          <div style={styles.metaCard}>
            <p style={styles.metaItem}>
              <span>신청 ID</span>
              <span>{request.id}</span>
            </p>
            <p style={styles.metaItem}>
              <span>신청 일시</span>
              <span>{new Date(request.createdAt).toLocaleString('ko-KR')}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>신청 거절</h2>
            <p style={styles.modalDescription}>
              거절 사유를 입력해주세요. 판매자에게 전달됩니다.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="거절 사유를 입력하세요..."
              style={styles.textarea}
              rows={4}
            />
            <div style={styles.modalButtons}>
              <button
                onClick={() => setShowRejectModal(false)}
                style={styles.cancelButton}
              >
                취소
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || processing}
                style={styles.confirmRejectButton}
              >
                {processing ? '처리 중...' : '거절 확인'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Modal (WO-NETURE-SUPPLIER-RELATION-STATE-EXTENSION-V1) */}
      {showRevokeModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>공급 종료</h2>
            <p style={styles.modalDescription}>
              공급 관계를 완전히 종료합니다. 이 작업은 되돌릴 수 없습니다.
              사유를 입력해주세요 (선택).
            </p>
            <textarea
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              placeholder="종료 사유를 입력하세요 (선택)..."
              style={styles.textarea}
              rows={4}
            />
            <div style={styles.modalButtons}>
              <button
                onClick={() => { setShowRevokeModal(false); setActionNote(''); }}
                style={styles.cancelButton}
              >
                취소
              </button>
              <button
                onClick={handleRevoke}
                disabled={processing}
                style={styles.confirmRejectButton}
              >
                {processing ? '처리 중...' : '공급 종료 확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    textAlign: 'center',
    padding: '60px',
    color: '#64748b',
  },
  error: {
    textAlign: 'center',
    padding: '60px',
    color: '#ef4444',
  },
  backLink: {
    color: '#3b82f6',
    textDecoration: 'none',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    color: '#64748b',
    textDecoration: 'none',
    fontSize: '14px',
    marginBottom: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  headerServiceIcon: {
    fontSize: '40px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 380px',
    gap: '24px',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '24px',
  },
  cardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 20px 0',
  },
  infoGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  infoItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  infoIcon: {
    color: '#64748b',
    marginTop: '2px',
  },
  infoLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    margin: 0,
  },
  infoValue: {
    fontSize: '14px',
    color: '#1e293b',
    margin: '2px 0 0 0',
    fontWeight: 500,
  },
  productHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  productName: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1e293b',
  },
  purposeBadge: {
    fontSize: '12px',
    fontWeight: 500,
    padding: '4px 10px',
    borderRadius: '6px',
  },
  productCategory: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
  },
  contextCard: {
    backgroundColor: '#faf5ff',
    borderRadius: '12px',
    border: '1px solid #e9d5ff',
    padding: '20px',
  },
  contextTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#581c87',
    margin: '0 0 12px 0',
  },
  contextDescription: {
    fontSize: '14px',
    color: '#6b21a8',
    margin: '0 0 16px 0',
    lineHeight: 1.5,
  },
  contextRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '8px',
  },
  contextLabel: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#7c3aed',
    backgroundColor: '#f3e8ff',
    padding: '2px 8px',
    borderRadius: '4px',
    minWidth: '40px',
    textAlign: 'center',
  },
  contextValue: {
    fontSize: '13px',
    color: '#581c87',
  },
  actionCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '2px solid #3b82f6',
    padding: '24px',
  },
  actionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  actionDescription: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 20px 0',
    lineHeight: 1.5,
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
  },
  approveButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px',
    backgroundColor: '#22c55e',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  rejectButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px',
    backgroundColor: '#fff',
    color: '#dc2626',
    border: '2px solid #fecaca',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  suspendButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px',
    backgroundColor: '#f59e0b',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  revokeButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  processedCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '20px',
  },
  processedTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 12px 0',
  },
  rejectReasonBox: {
    backgroundColor: '#fee2e2',
    borderRadius: '8px',
    padding: '12px',
    marginTop: '12px',
  },
  rejectReasonLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#dc2626',
    margin: '0 0 4px 0',
  },
  rejectReasonText: {
    fontSize: '13px',
    color: '#991b1b',
    margin: 0,
  },
  metaCard: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '16px',
  },
  metaItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 8px 0',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '32px',
    width: '100%',
    maxWidth: '480px',
    margin: '20px',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 8px 0',
  },
  modalDescription: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 20px 0',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical',
    marginBottom: '20px',
    outline: 'none',
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  confirmRejectButton: {
    padding: '10px 20px',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
