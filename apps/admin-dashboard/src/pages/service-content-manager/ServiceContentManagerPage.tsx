/**
 * Service Content Manager Page
 * WO-ADMIN-CONTENT-SLOT-V1
 *
 * Admin 통합 관리 메뉴 - 서비스별 콘텐츠/슬롯 관리
 *
 * 구조:
 * - Service Selector (서비스 선택)
 * - 5개 탭: Overview, News, Promotion, Mid Content, System Notice
 */

import { useState } from 'react';
import { MANAGED_SERVICES, ManagedService, SLOT_TYPE_LABELS } from './types';

type TabType = 'overview' | 'news' | 'promotion' | 'mid_content' | 'system_notice';

const TABS: { id: TabType; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'news', label: 'News Slot' },
  { id: 'promotion', label: 'Promotion Slot' },
  { id: 'mid_content', label: 'Mid Content Slot' },
  { id: 'system_notice', label: 'System Notice' },
];

export default function ServiceContentManagerPage() {
  const [selectedService, setSelectedService] = useState<ManagedService>(MANAGED_SERVICES[0]);
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const handleServiceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const service = MANAGED_SERVICES.find((s) => s.id === e.target.value);
    if (service) {
      setSelectedService(service);
    }
  };

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Service Content Manager</h1>
          <p style={styles.subtitle}>서비스별 콘텐츠 슬롯을 관리합니다</p>
        </div>
      </div>

      {/* 서비스 선택 */}
      <div style={styles.serviceSelector}>
        <label style={styles.selectorLabel}>서비스 선택</label>
        <select
          value={selectedService.id}
          onChange={handleServiceChange}
          style={styles.select}
        >
          {MANAGED_SERVICES.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name} {service.status !== 'active' && `(${service.status})`}
            </option>
          ))}
        </select>
        <div style={styles.serviceInfo}>
          <span style={styles.serviceOwner}>소유: {selectedService.owner}</span>
          <span
            style={{
              ...styles.statusBadge,
              backgroundColor: selectedService.status === 'active' ? '#10b981' : '#6b7280',
            }}
          >
            {selectedService.status}
          </span>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div style={styles.tabNav}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            style={{
              ...styles.tabButton,
              ...(activeTab === tab.id ? styles.tabButtonActive : {}),
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <div style={styles.tabContent}>
        {activeTab === 'overview' && (
          <OverviewTab serviceId={selectedService.id} serviceName={selectedService.name} />
        )}
        {activeTab === 'news' && (
          <NewsSlotTab serviceId={selectedService.id} />
        )}
        {activeTab === 'promotion' && (
          <PromotionSlotTab serviceId={selectedService.id} />
        )}
        {activeTab === 'mid_content' && (
          <MidContentSlotTab serviceId={selectedService.id} />
        )}
        {activeTab === 'system_notice' && (
          <SystemNoticeTab serviceId={selectedService.id} />
        )}
      </div>
    </div>
  );
}

/**
 * Overview Tab - 서비스 요약 및 활성 슬롯 현황
 */
function OverviewTab({ serviceId, serviceName }: { serviceId: string; serviceName: string }) {
  // 샘플 데이터 - 실제로는 API에서 가져옴
  const slotStatus = {
    news: { enabled: true, itemCount: 4 },
    promotion: { enabled: true, activeCount: 2 },
    midContent: { enabled: false, activeCount: 0 },
    systemNotice: { enabled: true, activeCount: 1 },
  };

  return (
    <div>
      <h2 style={styles.sectionTitle}>📊 서비스 현황</h2>
      <div style={styles.infoCard}>
        <p><strong>서비스:</strong> {serviceName}</p>
        <p><strong>서비스 ID:</strong> {serviceId}</p>
        <p><strong>최종 업데이트:</strong> {new Date().toLocaleDateString('ko-KR')}</p>
      </div>

      <h2 style={styles.sectionTitle}>📦 슬롯 현황</h2>
      <div style={styles.slotGrid}>
        <div style={styles.slotCard}>
          <div style={styles.slotHeader}>
            <span style={styles.slotIcon}>📰</span>
            <span style={styles.slotName}>{SLOT_TYPE_LABELS.news}</span>
          </div>
          <div style={styles.slotBody}>
            <span style={{
              ...styles.statusDot,
              backgroundColor: slotStatus.news.enabled ? '#10b981' : '#ef4444',
            }} />
            <span>{slotStatus.news.enabled ? '활성' : '비활성'}</span>
            <span style={styles.slotCount}>{slotStatus.news.itemCount}개 노출</span>
          </div>
        </div>

        <div style={styles.slotCard}>
          <div style={styles.slotHeader}>
            <span style={styles.slotIcon}>📢</span>
            <span style={styles.slotName}>{SLOT_TYPE_LABELS.promotion}</span>
          </div>
          <div style={styles.slotBody}>
            <span style={{
              ...styles.statusDot,
              backgroundColor: slotStatus.promotion.enabled ? '#10b981' : '#ef4444',
            }} />
            <span>{slotStatus.promotion.enabled ? '활성' : '비활성'}</span>
            <span style={styles.slotCount}>{slotStatus.promotion.activeCount}개 콘텐츠</span>
          </div>
        </div>

        <div style={styles.slotCard}>
          <div style={styles.slotHeader}>
            <span style={styles.slotIcon}>📋</span>
            <span style={styles.slotName}>{SLOT_TYPE_LABELS.mid_content}</span>
          </div>
          <div style={styles.slotBody}>
            <span style={{
              ...styles.statusDot,
              backgroundColor: slotStatus.midContent.enabled ? '#10b981' : '#ef4444',
            }} />
            <span>{slotStatus.midContent.enabled ? '활성' : '비활성'}</span>
            <span style={styles.slotCount}>{slotStatus.midContent.activeCount}개 콘텐츠</span>
          </div>
        </div>

        <div style={styles.slotCard}>
          <div style={styles.slotHeader}>
            <span style={styles.slotIcon}>🔔</span>
            <span style={styles.slotName}>{SLOT_TYPE_LABELS.system_notice}</span>
          </div>
          <div style={styles.slotBody}>
            <span style={{
              ...styles.statusDot,
              backgroundColor: slotStatus.systemNotice.enabled ? '#10b981' : '#ef4444',
            }} />
            <span>{slotStatus.systemNotice.enabled ? '활성' : '비활성'}</span>
            <span style={styles.slotCount}>{slotStatus.systemNotice.activeCount}개 공지</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * News Slot Tab - 기사 영역 관리
 */
function NewsSlotTab({ serviceId }: { serviceId: string }) {
  const [settings, setSettings] = useState({
    enabled: true,
    maxItems: 4,
    sortBy: 'latest' as const,
    refreshInterval: 30,
  });

  const handleToggle = () => {
    setSettings((prev) => ({ ...prev, enabled: !prev.enabled }));
  };

  return (
    <div>
      <h2 style={styles.sectionTitle}>📰 기사 영역 설정</h2>
      <p style={styles.description}>
        약사공론 기사 API와 연동됩니다. 직접 콘텐츠를 작성할 수 없으며, 노출 정책만 관리합니다.
      </p>

      <div style={styles.settingsCard}>
        <div style={styles.settingRow}>
          <span style={styles.settingLabel}>노출 상태</span>
          <button
            style={{
              ...styles.toggleButton,
              backgroundColor: settings.enabled ? '#10b981' : '#6b7280',
            }}
            onClick={handleToggle}
          >
            {settings.enabled ? 'ON' : 'OFF'}
          </button>
        </div>

        <div style={styles.settingRow}>
          <span style={styles.settingLabel}>노출 개수</span>
          <select
            value={settings.maxItems}
            onChange={(e) => setSettings((prev) => ({ ...prev, maxItems: Number(e.target.value) }))}
            style={styles.settingSelect}
          >
            {[2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>{n}개</option>
            ))}
          </select>
        </div>

        <div style={styles.settingRow}>
          <span style={styles.settingLabel}>정렬 기준</span>
          <select
            value={settings.sortBy}
            onChange={(e) => setSettings((prev) => ({ ...prev, sortBy: e.target.value as 'latest' | 'popular' | 'recommended' }))}
            style={styles.settingSelect}
          >
            <option value="latest">최신순</option>
            <option value="popular">인기순</option>
            <option value="recommended">추천순</option>
          </select>
        </div>

        <div style={styles.settingRow}>
          <span style={styles.settingLabel}>새로고침 주기</span>
          <select
            value={settings.refreshInterval}
            onChange={(e) => setSettings((prev) => ({ ...prev, refreshInterval: Number(e.target.value) }))}
            style={styles.settingSelect}
          >
            <option value={15}>15분</option>
            <option value={30}>30분</option>
            <option value={60}>1시간</option>
          </select>
        </div>

        <button style={styles.saveButton}>설정 저장</button>
      </div>

      <div style={styles.infoBox}>
        <strong>참고:</strong> 기사 콘텐츠는 약사공론 API에서 자동으로 가져옵니다.
        콘텐츠 내용 수정이 필요한 경우 약사공론에 문의하세요.
      </div>
    </div>
  );
}

/**
 * Promotion Slot Tab - 광고/설문/강좌 관리
 */
function PromotionSlotTab({ serviceId }: { serviceId: string }) {
  const [contents, setContents] = useState([
    {
      id: '1',
      type: 'course' as const,
      title: '2025년 보수교육 안내',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      isActive: true,
    },
    {
      id: '2',
      type: 'survey' as const,
      title: '회원 만족도 조사',
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      isActive: true,
    },
  ]);

  return (
    <div>
      <h2 style={styles.sectionTitle}>📢 상단 프로모션 관리</h2>
      <p style={styles.description}>
        광고, 설문, 강좌 안내 등 상단 오른쪽 카드형 슬롯을 관리합니다.
      </p>

      <div style={styles.actionBar}>
        <button style={styles.addButton}>+ 콘텐츠 추가</button>
      </div>

      <div style={styles.contentList}>
        {contents.map((content) => (
          <div key={content.id} style={styles.contentItem}>
            <div style={styles.contentInfo}>
              <span style={styles.contentType}>{content.type}</span>
              <span style={styles.contentTitle}>{content.title}</span>
              <span style={styles.contentDate}>
                {content.startDate} ~ {content.endDate}
              </span>
            </div>
            <div style={styles.contentActions}>
              <span style={{
                ...styles.statusBadge,
                backgroundColor: content.isActive ? '#10b981' : '#6b7280',
              }}>
                {content.isActive ? '활성' : '비활성'}
              </span>
              <button style={styles.editButton}>편집</button>
              <button style={styles.deleteButton}>삭제</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Mid Content Slot Tab - 중간 콘텐츠 관리
 */
function MidContentSlotTab({ serviceId }: { serviceId: string }) {
  const [enabled, setEnabled] = useState(false);

  return (
    <div>
      <h2 style={styles.sectionTitle}>📋 중간 콘텐츠 슬롯 관리</h2>
      <p style={styles.description}>
        메인 콘텐츠 사이에 삽입되는 완충형 슬롯입니다.
      </p>

      <div style={styles.settingsCard}>
        <div style={styles.settingRow}>
          <span style={styles.settingLabel}>슬롯 활성화</span>
          <button
            style={{
              ...styles.toggleButton,
              backgroundColor: enabled ? '#10b981' : '#6b7280',
            }}
            onClick={() => setEnabled(!enabled)}
          >
            {enabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {enabled && (
        <>
          <div style={styles.actionBar}>
            <button style={styles.addButton}>+ 콘텐츠 추가</button>
          </div>

          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>📭</span>
            <p>등록된 콘텐츠가 없습니다.</p>
            <p style={styles.emptyHint}>상단의 "콘텐츠 추가" 버튼을 클릭하여 콘텐츠를 추가하세요.</p>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * System Notice Tab - 시스템 공지 관리
 */
function SystemNoticeTab({ serviceId }: { serviceId: string }) {
  const [notices, setNotices] = useState([
    {
      id: '1',
      title: '시스템 점검 안내',
      level: 'info' as const,
      startDate: '2025-01-05',
      endDate: '2025-01-05',
      forceTop: false,
      isActive: true,
    },
  ]);

  return (
    <div>
      <h2 style={styles.sectionTitle}>🔔 시스템 공지 관리</h2>
      <p style={styles.description}>
        전체 지부/분회에 공통으로 노출되는 시스템 공지를 관리합니다.
      </p>

      <div style={styles.actionBar}>
        <button style={styles.addButton}>+ 공지 추가</button>
      </div>

      <div style={styles.contentList}>
        {notices.map((notice) => (
          <div key={notice.id} style={styles.contentItem}>
            <div style={styles.contentInfo}>
              <span style={{
                ...styles.levelBadge,
                backgroundColor: notice.level === 'urgent' ? '#ef4444' : notice.level === 'warning' ? '#f59e0b' : '#3b82f6',
              }}>
                {notice.level === 'urgent' ? '긴급' : notice.level === 'warning' ? '주의' : '안내'}
              </span>
              <span style={styles.contentTitle}>{notice.title}</span>
              <span style={styles.contentDate}>
                {notice.startDate} ~ {notice.endDate}
              </span>
              {notice.forceTop && <span style={styles.forceTopBadge}>상단 고정</span>}
            </div>
            <div style={styles.contentActions}>
              <span style={{
                ...styles.statusBadge,
                backgroundColor: notice.isActive ? '#10b981' : '#6b7280',
              }}>
                {notice.isActive ? '활성' : '비활성'}
              </span>
              <button style={styles.editButton}>편집</button>
              <button style={styles.deleteButton}>삭제</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1f2937',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: '4px 0 0 0',
  },
  serviceSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  selectorLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  select: {
    padding: '8px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#fff',
    minWidth: '300px',
  },
  serviceInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginLeft: 'auto',
  },
  serviceOwner: {
    fontSize: '13px',
    color: '#6b7280',
  },
  statusBadge: {
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#fff',
  },
  tabNav: {
    display: 'flex',
    gap: '4px',
    borderBottom: '1px solid #e5e7eb',
    marginBottom: '24px',
  },
  tabButton: {
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabButtonActive: {
    color: '#2563eb',
    borderBottomColor: '#2563eb',
  },
  tabContent: {
    minHeight: '400px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1f2937',
    marginBottom: '16px',
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '20px',
  },
  infoCard: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  slotGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  },
  slotCard: {
    padding: '16px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  slotHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  slotIcon: {
    fontSize: '20px',
  },
  slotName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#1f2937',
  },
  slotBody: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#6b7280',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  slotCount: {
    marginLeft: 'auto',
  },
  settingsCard: {
    padding: '20px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '20px',
  },
  settingRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  settingLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  settingSelect: {
    padding: '6px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
  },
  toggleButton: {
    padding: '6px 16px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  saveButton: {
    marginTop: '16px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  infoBox: {
    padding: '12px 16px',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#1e40af',
  },
  actionBar: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '16px',
  },
  addButton: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  contentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  contentItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
  },
  contentInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  contentType: {
    padding: '4px 8px',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
    color: '#4b5563',
    textTransform: 'uppercase',
  },
  contentTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#1f2937',
  },
  contentDate: {
    fontSize: '13px',
    color: '#9ca3af',
  },
  contentActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  editButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '6px 12px',
    fontSize: '13px',
    color: '#ef4444',
    backgroundColor: '#fef2f2',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  levelBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#fff',
  },
  forceTopBadge: {
    padding: '2px 6px',
    backgroundColor: '#fef3c7',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
    color: '#92400e',
  },
  emptyState: {
    textAlign: 'center',
    padding: '48px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
  },
  emptyIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '16px',
  },
  emptyHint: {
    fontSize: '13px',
    color: '#9ca3af',
  },
};
