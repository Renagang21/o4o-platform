/**
 * SupplierContentDetailPage - 공급자 콘텐츠 상세
 *
 * 교육/퀴즈/설문/MIXED 콘텐츠의 상세 정보 + AI 인사이트
 *
 * 규칙:
 * - 참여율 퍼센트 금지
 * - 점수/통과 여부 금지
 * - 정답률 표시 금지
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AIInsightCard, AIInsightDetailPanel, AIInsightBadge } from '../../../components/ai-insight';
import type { AIAnalysisResult, ParticipationContentType } from '../../../types';

// Mock 콘텐츠 데이터
interface SupplierContent {
  id: string;
  title: string;
  type: ParticipationContentType;
  description: string;
  questionCount: number;
  createdAt: string;
  status: 'draft' | 'published' | 'closed';
}

const mockContent: SupplierContent = {
  id: 'content-1',
  title: '기초 보습 크림 제품 교육',
  type: 'MIXED',
  description: '기초 보습 크림의 성분, 효능, 사용법에 대한 교육 콘텐츠입니다. 교육 후 간단한 이해도 확인 퀴즈와 사용 경험 설문이 포함되어 있습니다.',
  questionCount: 8,
  createdAt: '2025-12-15',
  status: 'published',
};

// Mock AI 결과 (있을 수도 없을 수도 있음)
const mockAIResult: AIAnalysisResult | null = {
  id: 'ai-content-1',
  type: 'INSIGHT',
  title: '이 콘텐츠에 대한 사업자 반응',
  scope: {
    serviceId: 'neture',
    productId: 'prod-1',
    participantRoles: ['pharmacy', 'general'],
    dateRange: { from: '2025-12-15', to: '2025-12-31' },
  },
  keyFindings: [
    '참여한 약국의 대부분이 "교육 내용이 실무에 도움이 된다"고 응답했습니다.',
    '제품 사용법 섹션에서 가장 많은 시간을 소요하는 경향이 있습니다.',
    '추가 교육 희망 항목으로 "피부 타입별 추천"이 자주 언급되었습니다.',
  ],
  evidence: [
    { type: 'pattern', description: '사용법 섹션 집중 경향' },
    { type: 'trend', description: '추가 교육 수요 발견' },
  ],
  suggestion: '피부 타입별 제품 추천 가이드 콘텐츠를 추가로 제작해 보시는 것을 권장합니다.',
  generatedAt: new Date().toISOString(),
};

const CONTENT_TYPE_LABELS: Record<ParticipationContentType, string> = {
  COURSE: '교육',
  QUIZ: '퀴즈',
  SURVEY: '설문',
  MIXED: '교육 + 참여',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: '초안', color: '#94a3b8' },
  published: { label: '게시 중', color: '#059669' },
  closed: { label: '종료', color: '#64748b' },
};

export function SupplierContentDetailPage() {
  const { contentId } = useParams<{ contentId: string }>();
  const [showDetail, setShowDetail] = useState(false);

  // TODO: contentId로 실제 콘텐츠 조회
  const content = contentId ? mockContent : mockContent;
  const aiResult = mockAIResult; // null일 수 있음
  const hasInsight = aiResult !== null;

  const statusInfo = STATUS_LABELS[content.status];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <Link to="/supplier/content" style={styles.backLink}>
          ← 콘텐츠 목록
        </Link>
      </div>

      <div style={styles.titleRow}>
        <div style={styles.titleInfo}>
          <div style={styles.badges}>
            <span style={styles.typeBadge}>{CONTENT_TYPE_LABELS[content.type]}</span>
            <span style={{ ...styles.statusBadge, color: statusInfo.color }}>
              {statusInfo.label}
            </span>
          </div>
          <h1 style={styles.title}>{content.title}</h1>
        </div>
        {hasInsight && (
          <AIInsightBadge
            hasInsight={true}
            label="인사이트 있음"
            onClick={() => setShowDetail(true)}
          />
        )}
      </div>

      <p style={styles.description}>{content.description}</p>

      <div style={styles.metaGrid}>
        <div style={styles.metaItem}>
          <span style={styles.metaLabel}>질문 수</span>
          <span style={styles.metaValue}>{content.questionCount}개</span>
        </div>
        <div style={styles.metaItem}>
          <span style={styles.metaLabel}>생성일</span>
          <span style={styles.metaValue}>{content.createdAt}</span>
        </div>
      </div>

      {/* AI 인사이트 섹션 */}
      <div style={styles.insightSection}>
        <h2 style={styles.sectionTitle}>참여 반응</h2>
        {aiResult ? (
          <AIInsightCard
            result={aiResult}
            onOpenDetail={() => setShowDetail(true)}
          />
        ) : (
          <div style={styles.emptyInsight}>
            <p style={styles.emptyText}>
              분석 가능한 데이터가 충분하지 않습니다.
            </p>
            <p style={styles.emptySubText}>
              응답이 수집되면 인사이트가 생성됩니다.
            </p>
          </div>
        )}
      </div>

      {/* AI 상세 패널 */}
      {showDetail && aiResult && (
        <AIInsightDetailPanel
          result={aiResult}
          onClose={() => setShowDetail(false)}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    marginBottom: '20px',
  },
  backLink: {
    fontSize: '14px',
    color: '#64748b',
    textDecoration: 'none',
  },
  titleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  titleInfo: {
    flex: 1,
  },
  badges: {
    display: 'flex',
    gap: '8px',
    marginBottom: '8px',
  },
  typeBadge: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#6366f1',
    backgroundColor: '#eef2ff',
    padding: '4px 10px',
    borderRadius: '4px',
  },
  statusBadge: {
    fontSize: '12px',
    fontWeight: 500,
    padding: '4px 10px',
    backgroundColor: '#f1f5f9',
    borderRadius: '4px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
    lineHeight: 1.3,
  },
  description: {
    fontSize: '15px',
    color: '#475569',
    lineHeight: 1.7,
    margin: '0 0 24px 0',
  },
  metaGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    padding: '20px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '32px',
  },
  metaItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  metaLabel: {
    fontSize: '12px',
    color: '#64748b',
  },
  metaValue: {
    fontSize: '14px',
    color: '#0f172a',
    fontWeight: 500,
  },
  insightSection: {
    marginTop: '32px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#0f172a',
    margin: '0 0 16px 0',
  },
  emptyInsight: {
    padding: '32px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    border: '1px dashed #e2e8f0',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: '14px',
    color: '#64748b',
    margin: '0 0 8px 0',
  },
  emptySubText: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: 0,
  },
};
