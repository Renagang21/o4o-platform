/**
 * ProductDetailPage - 상품 상세
 * 상태별 CTA + 정보 공개 제어 + 연결 콘텐츠 + AI 인사이트
 *
 * 금지 규칙:
 * - 구매 추천 금지
 * - 인기 상품 표현 금지
 * - 비교 문구 금지
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AIInsightCard, AIInsightDetailPanel, AIInsightBadge } from '../../components/ai-insight';
import type {
  Product,
  BuyerStatus,
  BuyerType,
  SupplyRequestStatus,
  AIAnalysisResult,
  ParticipationContentType,
} from '../../types';

// Mock 데이터
const mockProduct: Product = {
  id: 'prod-1',
  name: '기초 보습 크림 (업소용)',
  description: '대용량 보습 크림 500ml. 피부 보습에 탁월한 효과가 있으며, 사업장에서 대량 사용에 적합합니다.',
  categoryId: 'cosmetics',
  supplierId: 'sup-1',
  supplierName: '코스메틱팜',
  requiredBuyerTypes: ['general', 'pharmacy', 'medical'],
  taxType: 'taxable',
  minOrderQty: 10,
  unit: '개',
  contentIds: ['content-1', 'content-2'],
  serviceDistribution: true,
  hasActiveContentEvent: true,
};

// Mock 상태
const mockBuyerStatus: BuyerStatus = 'verified';
// mockBuyerType은 향후 자격 검증 로직에서 사용 예정: 'general' | 'pharmacy' | 'medical'
const mockSupplyRequestStatus: SupplyRequestStatus = 'none';

// Mock 연결 콘텐츠
interface LinkedContent {
  id: string;
  title: string;
  type: ParticipationContentType;
  hasInsight: boolean;
}

const mockLinkedContents: LinkedContent[] = [
  { id: 'content-1', title: '기초 보습 크림 제품 교육', type: 'MIXED', hasInsight: true },
  { id: 'content-2', title: '사용법 가이드', type: 'COURSE', hasInsight: false },
];

// Mock 상품 관련 AI 인사이트
const mockProductAIResult: AIAnalysisResult | null = {
  id: 'ai-prod-1',
  type: 'SUMMARY',
  title: '이 상품과 연관된 사업자 반응 요약',
  scope: {
    serviceId: 'neture',
    productId: 'prod-1',
    participantRoles: ['pharmacy', 'general'],
    dateRange: { from: '2025-12-01', to: '2025-12-31' },
  },
  keyFindings: [
    '연결된 교육 콘텐츠를 완료한 사업자들이 제품에 대해 긍정적인 반응을 보이는 경향이 있습니다.',
    '약국에서 "성분 정보"에 대한 추가 설명 요청이 있었습니다.',
  ],
  evidence: [
    { type: 'pattern', description: '교육 완료 후 긍정 반응 경향' },
  ],
  suggestion: '성분 관련 추가 교육 콘텐츠를 제공하면 사업자 이해도가 높아질 수 있습니다.',
  generatedAt: new Date().toISOString(),
};

const BUYER_TYPE_LABELS_MAP: Record<BuyerType, string> = {
  general: '일반 사업자',
  pharmacy: '약국',
  medical: '의료기관',
};

const CONTENT_TYPE_LABELS: Record<ParticipationContentType, string> = {
  COURSE: '교육',
  QUIZ: '퀴즈',
  SURVEY: '설문',
  MIXED: '교육+참여',
};

interface StatusCTAProps {
  buyerStatus: BuyerStatus;
  supplyStatus: SupplyRequestStatus;
  onRequestSupply: () => void;
  onOrder: () => void;
}

function StatusCTA({ buyerStatus, supplyStatus, onRequestSupply, onOrder }: StatusCTAProps) {
  // 미인증
  if (buyerStatus === 'unverified') {
    return (
      <div style={styles.ctaBox}>
        <p style={styles.ctaMessage}>첫 주문 시 사업자 인증이 필요합니다</p>
        <Link to="/procurement/verify" style={styles.ctaButton}>
          사업자 인증하기
        </Link>
      </div>
    );
  }

  // 인증 심사 중
  if (buyerStatus === 'pending') {
    return (
      <div style={styles.ctaBox}>
        <p style={styles.ctaMessage}>사업자 인증 심사 중입니다</p>
        <button style={styles.ctaButtonDisabled} disabled>
          심사 완료 후 이용 가능
        </button>
      </div>
    );
  }

  // 정지됨
  if (buyerStatus === 'suspended') {
    return (
      <div style={styles.ctaBox}>
        <p style={styles.ctaMessageError}>계정이 정지되었습니다</p>
      </div>
    );
  }

  // 인증 완료 상태에서 공급 신청 상태별 분기
  switch (supplyStatus) {
    case 'none':
      return (
        <div style={styles.ctaBox}>
          <p style={styles.ctaMessage}>이 상품의 공급을 신청하세요</p>
          <button style={styles.ctaButton} onClick={onRequestSupply}>
            공급 신청
          </button>
        </div>
      );
    case 'pending':
      return (
        <div style={styles.ctaBox}>
          <p style={styles.ctaMessagePending}>공급자 검토 중</p>
          <button style={styles.ctaButtonDisabled} disabled>
            승인 대기 중
          </button>
        </div>
      );
    case 'approved':
      return (
        <div style={styles.ctaBox}>
          <p style={styles.ctaMessageSuccess}>공급 승인됨</p>
          <button style={styles.ctaButton} onClick={onOrder}>
            주문 요청
          </button>
        </div>
      );
    case 'rejected':
      return (
        <div style={styles.ctaBox}>
          <p style={styles.ctaMessageError}>공급이 거부되었습니다</p>
          <p style={styles.ctaSubMessage}>다른 상품을 검토해 주세요</p>
        </div>
      );
    default:
      return null;
  }
}

export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showAIDetail, setShowAIDetail] = useState(false);

  // TODO: productId로 실제 상품 조회 API 연동
  const product = productId ? mockProduct : mockProduct;
  const buyerStatus = mockBuyerStatus;
  const supplyStatus = mockSupplyRequestStatus;
  const linkedContents = mockLinkedContents;
  const productAIResult = mockProductAIResult;

  const handleRequestSupply = () => {
    setShowRequestModal(true);
  };

  const handleOrder = () => {
    alert('준비 중입니다.');
  };

  return (
    <div style={styles.container}>
      {/* B2B 인지 라벨 */}
      <div style={styles.b2bBanner}>
        <span style={styles.b2bLabel}>B2B 조달 상품</span>
        <span style={styles.b2bNote}>서비스 주문과는 별도로 처리됩니다.</span>
      </div>

      <div style={styles.header}>
        <Link to={`/procurement/category/${product.categoryId}`} style={styles.backLink}>
          ← 목록으로
        </Link>
      </div>

      <div style={styles.content}>
        {/* 상품 정보 */}
        <div style={styles.mainSection}>
          <div style={styles.productNameRow}>
            <h1 style={styles.productName}>{product.name}</h1>
            {product.hasActiveContentEvent && (
              <span style={styles.contentEventIcon} title="현재 해당 상품과 연관된 콘텐츠 이벤트가 진행 중입니다.">
                📘
              </span>
            )}
          </div>
          <p style={styles.productDesc}>{product.description}</p>

          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>공급자</span>
              <span style={styles.infoValue}>{product.supplierName}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>최소 주문</span>
              <span style={styles.infoValue}>{product.minOrderQty}{product.unit}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>세금 유형</span>
              <span style={styles.infoValue}>
                {product.taxType === 'taxable' ? '과세' : product.taxType === 'exempt' ? '면세' : '영세'}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>구매 자격</span>
              <span style={styles.infoValue}>
                {product.requiredBuyerTypes.map(t => BUYER_TYPE_LABELS_MAP[t]).join(', ')}
              </span>
            </div>
          </div>

          {/* 연결된 콘텐츠 */}
          {linkedContents.length > 0 && (
            <div style={styles.contentSection}>
              <h3 style={styles.sectionTitle}>연결된 콘텐츠</h3>
              <div style={styles.contentList}>
                {linkedContents.map((content) => (
                  <div key={content.id} style={styles.contentItem}>
                    <span style={styles.contentIcon}>
                      {content.type === 'COURSE' ? '📚' : content.type === 'QUIZ' ? '✏️' : content.type === 'SURVEY' ? '📋' : '🎓'}
                    </span>
                    <div style={styles.contentInfo}>
                      <span style={styles.contentTitle}>{content.title}</span>
                      <span style={styles.contentType}>{CONTENT_TYPE_LABELS[content.type]}</span>
                    </div>
                    {content.hasInsight && (
                      <AIInsightBadge hasInsight={true} label="인사이트 있음" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 상품 관련 인사이트 */}
          {productAIResult && (
            <div style={styles.insightSection}>
              <h3 style={styles.sectionTitle}>사업자 반응 요약</h3>
              <p style={styles.insightNote}>구매 판단을 돕기 위한 참고 정보입니다</p>
              <AIInsightCard
                result={productAIResult}
                onOpenDetail={() => setShowAIDetail(true)}
              />
            </div>
          )}
        </div>

        {/* CTA 영역 */}
        <div style={styles.ctaSection}>
          <StatusCTA
            buyerStatus={buyerStatus}
            supplyStatus={supplyStatus}
            onRequestSupply={handleRequestSupply}
            onOrder={handleOrder}
          />
        </div>
      </div>

      {/* 공급 신청 모달 (간단 버전) */}
      {showRequestModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2 style={styles.modalTitle}>공급 신청</h2>
            <p style={styles.modalDesc}>
              이 상품의 공급을 신청합니다.<br />
              공급자가 검토 후 승인/거부합니다.
            </p>
            <div style={styles.modalInfo}>
              <p><strong>상품:</strong> {product.name}</p>
              <p><strong>공급자:</strong> {product.supplierName}</p>
            </div>
            <div style={styles.modalActions}>
              <button
                style={styles.modalCancelButton}
                onClick={() => setShowRequestModal(false)}
              >
                취소
              </button>
              <button
                style={styles.modalSubmitButton}
                onClick={() => {
                  alert('공급 신청이 접수되었습니다.');
                  setShowRequestModal(false);
                }}
              >
                신청하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 상세 패널 */}
      {showAIDetail && productAIResult && (
        <AIInsightDetailPanel
          result={productAIResult}
          onClose={() => setShowAIDetail(false)}
        />
      )}
    </div>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  b2bBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#eef2ff',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  b2bLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#4f46e5',
    padding: '4px 10px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    border: '1px solid #c7d2fe',
  },
  b2bNote: {
    fontSize: '13px',
    color: '#6366f1',
  },
  header: {
    marginBottom: '24px',
  },
  backLink: {
    fontSize: '14px',
    color: '#64748b',
    textDecoration: 'none',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr 280px',
    gap: '32px',
  },
  mainSection: {},
  productNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  productName: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  contentEventIcon: {
    fontSize: '20px',
    cursor: 'help',
  },
  productDesc: {
    fontSize: '15px',
    color: '#475569',
    lineHeight: 1.7,
    margin: '0 0 24px 0',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    fontSize: '12px',
    color: '#64748b',
  },
  infoValue: {
    fontSize: '14px',
    color: '#0f172a',
    fontWeight: 500,
  },
  contentSection: {
    marginTop: '24px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 12px 0',
  },
  contentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  contentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 16px',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
  },
  contentIcon: {
    fontSize: '20px',
  },
  contentInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  contentTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#0f172a',
  },
  contentType: {
    fontSize: '12px',
    color: '#64748b',
  },
  insightSection: {
    marginTop: '32px',
  },
  insightNote: {
    fontSize: '13px',
    color: '#64748b',
    margin: '0 0 12px 0',
  },
  ctaSection: {
    position: 'sticky',
    top: '20px',
  },
  ctaBox: {
    padding: '24px',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
  },
  ctaMessage: {
    fontSize: '14px',
    color: '#475569',
    margin: '0 0 16px 0',
    textAlign: 'center',
  },
  ctaMessagePending: {
    fontSize: '14px',
    color: '#D97706',
    margin: '0 0 16px 0',
    textAlign: 'center',
    fontWeight: 500,
  },
  ctaMessageSuccess: {
    fontSize: '14px',
    color: '#059669',
    margin: '0 0 16px 0',
    textAlign: 'center',
    fontWeight: 500,
  },
  ctaMessageError: {
    fontSize: '14px',
    color: '#DC2626',
    margin: '0 0 8px 0',
    textAlign: 'center',
    fontWeight: 500,
  },
  ctaSubMessage: {
    fontSize: '13px',
    color: '#64748b',
    margin: 0,
    textAlign: 'center',
  },
  ctaButton: {
    display: 'block',
    width: '100%',
    padding: '14px',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    fontSize: '15px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    textAlign: 'center',
    textDecoration: 'none',
  },
  ctaButtonDisabled: {
    display: 'block',
    width: '100%',
    padding: '14px',
    backgroundColor: '#e2e8f0',
    color: '#94a3b8',
    fontSize: '15px',
    fontWeight: 600,
    border: 'none',
    borderRadius: '8px',
    cursor: 'not-allowed',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '32px',
    width: '400px',
    maxWidth: '90%',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 12px 0',
  },
  modalDesc: {
    fontSize: '14px',
    color: '#64748b',
    lineHeight: 1.6,
    margin: '0 0 20px 0',
  },
  modalInfo: {
    padding: '16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '24px',
    fontSize: '14px',
    color: '#475569',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
  },
  modalCancelButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  modalSubmitButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
};
