import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// 샘플 고객 데이터 - 실제로는 API에서 가져옴
const sampleClients = Array.from({ length: 42 }, (_, i) => ({
  id: i + 1,
  name: `고객 ${i + 1}`,
  lastVisit: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
  visitCount: Math.floor(Math.random() * 20) + 1,
  tir: Math.floor(Math.random() * 40) + 50, // 50-90%
  avgGlucose: Math.floor(Math.random() * 80) + 100, // 100-180
  cv: Math.floor(Math.random() * 20) + 25, // 25-45%
  status: ['normal', 'caution', 'urgent'][Math.floor(Math.random() * 3)] as 'normal' | 'caution' | 'urgent',
}));

// 상태별 고객 필터링
const getClientsByStatus = (status: string) => {
  switch (status) {
    case 'all':
      return sampleClients;
    case 'normal':
      return sampleClients.filter(c => c.tir >= 70);
    case 'caution':
      return sampleClients.filter(c => c.tir >= 50 && c.tir < 70);
    case 'urgent':
      return sampleClients.filter(c => c.tir < 50);
    case 'cv-stable':
      return sampleClients.filter(c => c.cv < 33);
    case 'cv-unstable':
      return sampleClients.filter(c => c.cv >= 33 && c.cv < 36);
    case 'cv-very-unstable':
      return sampleClients.filter(c => c.cv >= 36);
    case 'tir-good':
      return sampleClients.filter(c => c.tir >= 70);
    case 'tir-need':
      return sampleClients.filter(c => c.tir < 70);
    case 'post-meal-high':
      return sampleClients.slice(0, 12); // 샘플
    case 'night-low':
      return sampleClients.slice(0, 4); // 샘플
    case 'dawn-phenomenon':
      return sampleClients.slice(0, 8); // 샘플
    case 'improved':
      return sampleClients.slice(0, 15); // 샘플
    default:
      return sampleClients;
  }
};

// 모달 제목 매핑
const getModalTitle = (filter: string) => {
  const titles: Record<string, string> = {
    all: '전체 고객',
    normal: '정상 범위 고객',
    caution: '주의 필요 고객',
    urgent: '긴급 확인 고객',
    'cv-stable': '안정 (CV < 33%)',
    'cv-unstable': '불안정 (33-36%)',
    'cv-very-unstable': '매우 불안정 (> 36%)',
    'tir-good': '양호 (TIR 70% 이상)',
    'tir-need': '관리 필요 (TIR 70% 미만)',
    'post-meal-high': '식후 고혈당 경향',
    'night-low': '야간 저혈당 위험',
    'dawn-phenomenon': '새벽 현상 패턴',
    'improved': '개선 추세',
  };
  return titles[filter] || '고객 목록';
};

// 클릭 가능한 숫자 버튼 컴포넌트
interface ClickableStatProps {
  value: number | string;
  label: string;
  color: 'green' | 'red' | 'amber' | 'blue' | 'slate';
  filter: string;
  onClick: (filter: string) => void;
  subLabel?: string;
}

function ClickableStat({ value, label, color, filter, onClick, subLabel }: ClickableStatProps) {
  const colorClasses = {
    green: 'text-green-600 hover:bg-green-50',
    red: 'text-red-600 hover:bg-red-50',
    amber: 'text-amber-600 hover:bg-amber-50',
    blue: 'text-blue-600 hover:bg-blue-50',
    slate: 'text-slate-700 hover:bg-slate-100',
  };

  return (
    <button
      onClick={() => onClick(filter)}
      className={`rounded-lg p-3 text-center transition-colors cursor-pointer ${colorClasses[color]}`}
    >
      <div className={`text-2xl font-bold`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
      {subLabel && <div className="text-xs text-slate-400">{subLabel}</div>}
    </button>
  );
}

// 고객 목록 모달 컴포넌트
interface ClientListModalProps {
  isOpen: boolean;
  onClose: () => void;
  filter: string;
  onSelectClient: (clientId: number) => void;
}

function ClientListModal({ isOpen, onClose, filter, onSelectClient }: ClientListModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState<'recent' | 'frequent'>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const clients = getClientsByStatus(filter);

  const filteredAndSortedClients = useMemo(() => {
    let result = clients.filter(client =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortType === 'recent') {
      result.sort((a, b) => b.lastVisit.getTime() - a.lastVisit.getTime());
    } else {
      result.sort((a, b) => b.visitCount - a.visitCount);
    }

    return result;
  }, [clients, searchQuery, sortType]);

  const totalPages = Math.ceil(filteredAndSortedClients.length / itemsPerPage);
  const paginatedClients = filteredAndSortedClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    if (days < 7) return `${days}일 전`;
    return `${Math.floor(days / 7)}주 전`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">{getModalTitle(filter)}</h3>
              <p className="text-sm text-slate-500">{filteredAndSortedClients.length}명</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search & Sort */}
        <div className="px-6 py-3 border-b border-slate-100 space-y-3">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="이름으로 검색..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sort Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => { setSortType('recent'); setCurrentPage(1); }}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                sortType === 'recent'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              최근 방문순
            </button>
            <button
              onClick={() => { setSortType('frequent'); setCurrentPage(1); }}
              className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                sortType === 'frequent'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              방문 빈도순
            </button>
          </div>
        </div>

        {/* Client List */}
        <div className="flex-1 overflow-y-auto">
          {paginatedClients.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {paginatedClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => onSelectClient(client.id)}
                  className="w-full px-6 py-3 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm text-blue-600 font-medium">
                        {client.name.slice(0, 2)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-slate-900">{client.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          client.tir >= 70
                            ? 'bg-green-100 text-green-700'
                            : client.tir >= 50
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          TIR {client.tir}%
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400">{formatDate(client.lastVisit)}</span>
                        <span className="text-xs text-slate-300">•</span>
                        <span className="text-xs text-slate-400">평균 {client.avgGlucose} mg/dL</span>
                        <span className="text-xs text-slate-300">•</span>
                        <span className="text-xs text-slate-400">CV {client.cv}%</span>
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-slate-400">검색 결과가 없습니다</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              이전
            </button>
            <span className="text-xs text-slate-500">
              {currentPage} / {totalPages} 페이지
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 확장 가능한 카드 컴포넌트
interface InsightCardProps {
  id: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle?: string;
  badge?: { text: string; color: string };
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function InsightCard({ icon, iconBg, title, subtitle, badge, expanded, onToggle, children }: InsightCardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}>
            {icon}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">{title}</span>
              {badge && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${badge.color}`}>
                  {badge.text}
                </span>
              )}
            </div>
            {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && <div className="px-6 pb-6">{children}</div>}
    </div>
  );
}

// 통계 카드 컴포넌트
interface StatItemProps {
  value: string;
  label: string;
  subValue?: string;
  color?: 'green' | 'red' | 'amber' | 'blue' | 'slate';
}

function StatItem({ value, label, subValue, color = 'slate' }: StatItemProps) {
  const colorClasses = {
    green: 'text-green-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
    blue: 'text-blue-600',
    slate: 'text-slate-700',
  };

  return (
    <div className="bg-slate-50 rounded-lg p-3 text-center">
      <div className={`text-xl font-semibold ${colorClasses[color]}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
      {subValue && <div className="text-sm text-slate-500 mt-0.5">{subValue}</div>}
    </div>
  );
}

export default function InsightsPage() {
  const navigate = useNavigate();
  const [expandedSection, setExpandedSection] = useState<string | null>('summary');
  const [modalFilter, setModalFilter] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const openClientList = (filter: string) => {
    setModalFilter(filter);
  };

  const closeModal = () => {
    setModalFilter(null);
  };

  const handleSelectClient = (clientId: number) => {
    closeModal();
    navigate(`/patients?selected=${clientId}`);
  };

  // 상태별 고객 수 계산
  const normalCount = sampleClients.filter(c => c.tir >= 70).length;
  const cautionCount = sampleClients.filter(c => c.tir >= 50 && c.tir < 70).length;
  const urgentCount = sampleClients.filter(c => c.tir < 50).length;
  const cvStableCount = sampleClients.filter(c => c.cv < 33).length;
  const cvUnstableCount = sampleClients.filter(c => c.cv >= 33 && c.cv < 36).length;
  const cvVeryUnstableCount = sampleClients.filter(c => c.cv >= 36).length;

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">분석 현황</h1>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>최근 7일 기준</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar - 클릭 가능 */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="grid grid-cols-4 gap-4">
            <ClickableStat value={sampleClients.length} label="전체 고객" color="slate" filter="all" onClick={openClientList} />
            <ClickableStat value={normalCount} label="정상 범위" color="green" filter="normal" onClick={openClientList} />
            <ClickableStat value={cautionCount} label="주의 필요" color="amber" filter="caution" onClick={openClientList} />
            <ClickableStat value={urgentCount} label="긴급 확인" color="red" filter="urgent" onClick={openClientList} />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid gap-4">

          {/* 1. 전체 요약 */}
          <InsightCard
            id="summary"
            icon={<svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            iconBg="bg-slate-100"
            title="전체 요약"
            subtitle="고객 전체의 혈당 관리 현황"
            expanded={expandedSection === 'summary'}
            onToggle={() => toggleSection('summary')}
          >
            <div className="space-y-4">
              {/* 주요 지표 */}
              <div className="grid grid-cols-3 gap-3">
                <StatItem value="127" label="평균 혈당" subValue="mg/dL" color="blue" />
                <StatItem value="68%" label="목표 범위 내" subValue="TIR (70-180)" color="green" />
                <StatItem value="32%" label="CV 변동계수" subValue="변동성" color="amber" />
              </div>

              {/* 분포 차트 */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-xs font-medium text-slate-500 mb-3">혈당 분포</div>
                <div className="flex h-8 rounded-lg overflow-hidden">
                  <div className="bg-red-400 w-[8%]" title="저혈당 (<70)" />
                  <div className="bg-green-400 w-[68%]" title="정상 (70-180)" />
                  <div className="bg-amber-400 w-[18%]" title="고혈당 (180-250)" />
                  <div className="bg-red-500 w-[6%]" title="매우 높음 (>250)" />
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>저혈당 8%</span>
                  <span>정상 68%</span>
                  <span>고혈당 18%</span>
                  <span>매우 높음 6%</span>
                </div>
              </div>

              {/* 고객 분류 - 클릭 가능 */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => openClientList('tir-good')}
                  className="bg-green-50 border border-green-100 rounded-lg p-3 text-left hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm font-medium text-green-700">양호</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">{normalCount}명</div>
                  <div className="text-xs text-green-600 mt-1">TIR 70% 이상</div>
                </button>
                <button
                  onClick={() => openClientList('tir-need')}
                  className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-left hover:bg-amber-100 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-sm font-medium text-amber-700">관리 필요</span>
                  </div>
                  <div className="text-2xl font-bold text-amber-600">{sampleClients.length - normalCount}명</div>
                  <div className="text-xs text-amber-600 mt-1">TIR 70% 미만</div>
                </button>
              </div>
            </div>
          </InsightCard>

          {/* 2. TIR 분석 (Time in Range) */}
          <InsightCard
            id="tir"
            icon={<svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            iconBg="bg-slate-100"
            title="목표 범위 분석 (TIR)"
            subtitle="70-180 mg/dL 범위 내 시간 비율"
            badge={{ text: '핵심 지표', color: 'bg-green-100 text-green-700' }}
            expanded={expandedSection === 'tir'}
            onToggle={() => toggleSection('tir')}
          >
            <div className="space-y-4">
              {/* TIR 분포 */}
              <div className="grid grid-cols-5 gap-2">
                <div className="text-center p-2 bg-red-50 rounded-lg">
                  <div className="text-lg font-bold text-red-600">8%</div>
                  <div className="text-xs text-red-600">매우 낮음</div>
                  <div className="text-xs text-slate-400">&lt;54</div>
                </div>
                <div className="text-center p-2 bg-amber-50 rounded-lg">
                  <div className="text-lg font-bold text-amber-600">4%</div>
                  <div className="text-xs text-amber-600">낮음</div>
                  <div className="text-xs text-slate-400">54-70</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded-lg border-2 border-green-200">
                  <div className="text-lg font-bold text-green-600">68%</div>
                  <div className="text-xs text-green-600">목표 범위</div>
                  <div className="text-xs text-slate-400">70-180</div>
                </div>
                <div className="text-center p-2 bg-amber-50 rounded-lg">
                  <div className="text-lg font-bold text-amber-600">14%</div>
                  <div className="text-xs text-amber-600">높음</div>
                  <div className="text-xs text-slate-400">180-250</div>
                </div>
                <div className="text-center p-2 bg-red-50 rounded-lg">
                  <div className="text-lg font-bold text-red-600">6%</div>
                  <div className="text-xs text-red-600">매우 높음</div>
                  <div className="text-xs text-slate-400">&gt;250</div>
                </div>
              </div>

              {/* 권장 목표 */}
              <div className="text-sm text-slate-600 text-center">
                권장: TIR 70% 이상 / 저혈당 4% 미만 / 고혈당 25% 미만
              </div>
            </div>
          </InsightCard>

          {/* 3. 주간 경향 */}
          <InsightCard
            id="trend"
            icon={<svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
            iconBg="bg-slate-100"
            title="주간 경향"
            subtitle="최근 7일간 평균 혈당 추이"
            expanded={expandedSection === 'trend'}
            onToggle={() => toggleSection('trend')}
          >
            <div className="space-y-4">
              {/* 주간 바 차트 */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-end gap-2 h-32">
                  {[
                    { day: '월', value: 125, color: 'bg-green-400' },
                    { day: '화', value: 142, color: 'bg-amber-400' },
                    { day: '수', value: 118, color: 'bg-green-400' },
                    { day: '목', value: 135, color: 'bg-green-400' },
                    { day: '금', value: 158, color: 'bg-amber-400' },
                    { day: '토', value: 145, color: 'bg-amber-400' },
                    { day: '일', value: 128, color: 'bg-green-400' },
                  ].map((item, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-slate-500">{item.value}</span>
                      <div
                        className={`w-full ${item.color} rounded-t-sm transition-all`}
                        style={{ height: `${(item.value / 180) * 100}%` }}
                      />
                      <span className="text-xs text-slate-500">{item.day}</span>
                    </div>
                  ))}
                </div>
                {/* 기준선 */}
                <div className="relative mt-2 pt-2 border-t border-dashed border-slate-300">
                  <span className="absolute -top-2 right-0 text-xs text-slate-400 bg-slate-50 px-1">목표: 180 mg/dL</span>
                </div>
              </div>

              {/* 주간 변화 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-500 mb-1">평균</div>
                  <div className="text-lg font-semibold text-slate-700">136 mg/dL</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-500 mb-1">최저</div>
                  <div className="text-lg font-semibold text-blue-600">118 mg/dL</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-500 mb-1">최고</div>
                  <div className="text-lg font-semibold text-amber-600">158 mg/dL</div>
                </div>
              </div>
            </div>
          </InsightCard>

          {/* 4. 시간대별 패턴 */}
          <InsightCard
            id="timePattern"
            icon={<svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            iconBg="bg-slate-100"
            title="시간대별 패턴"
            subtitle="하루 중 혈당 변화 경향"
            expanded={expandedSection === 'timePattern'}
            onToggle={() => toggleSection('timePattern')}
          >
            <div className="space-y-4">
              {/* 시간대 카드 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z"/>
                    </svg>
                    <span className="text-sm font-medium text-slate-700">아침 (06-09시)</span>
                  </div>
                  <div className="text-xl font-bold text-slate-900">142 mg/dL</div>
                  <div className="text-xs text-amber-600 mt-1">공복 혈당 다소 높음</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="5"/>
                      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                    </svg>
                    <span className="text-sm font-medium text-slate-700">점심 (12-14시)</span>
                  </div>
                  <div className="text-xl font-bold text-slate-900">165 mg/dL</div>
                  <div className="text-xs text-amber-600 mt-1">식후 상승 경향</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                    </svg>
                    <span className="text-sm font-medium text-slate-700">저녁 (18-21시)</span>
                  </div>
                  <div className="text-xl font-bold text-slate-900">152 mg/dL</div>
                  <div className="text-xs text-green-600 mt-1">양호한 수준</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-indigo-500" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
                    </svg>
                    <span className="text-sm font-medium text-slate-700">야간 (00-06시)</span>
                  </div>
                  <div className="text-xl font-bold text-slate-900">98 mg/dL</div>
                  <div className="text-xs text-blue-600 mt-1">안정적 유지</div>
                </div>
              </div>

              {/* 시간대별 라인 */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="text-xs font-medium text-slate-500 mb-3">24시간 평균 추이</div>
                <svg viewBox="0 0 300 80" className="w-full h-20">
                  {/* 목표 범위 */}
                  <rect x="0" y="20" width="300" height="30" fill="#22c55e" opacity="0.1" />
                  <line x1="0" y1="20" x2="300" y2="20" stroke="#22c55e" strokeWidth="1" strokeDasharray="4" opacity="0.5" />
                  <line x1="0" y1="50" x2="300" y2="50" stroke="#22c55e" strokeWidth="1" strokeDasharray="4" opacity="0.5" />

                  {/* 혈당 라인 */}
                  <path
                    d="M0,35 Q25,25 50,30 T100,45 T150,50 T200,40 T250,35 T300,30"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2"
                  />
                </svg>
                <div className="flex justify-between text-xs text-slate-400 mt-1">
                  <span>00시</span>
                  <span>06시</span>
                  <span>12시</span>
                  <span>18시</span>
                  <span>24시</span>
                </div>
              </div>
            </div>
          </InsightCard>

          {/* 5. GMI (혈당 관리 지표) */}
          <InsightCard
            id="gmi"
            icon={<svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>}
            iconBg="bg-slate-100"
            title="GMI (혈당 관리 지표)"
            subtitle="CGM 데이터 기반 추정 HbA1c"
            expanded={expandedSection === 'gmi'}
            onToggle={() => toggleSection('gmi')}
          >
            <div className="space-y-4">
              {/* GMI 게이지 */}
              <div className="flex items-center justify-center py-4">
                <div className="relative w-48 h-24">
                  {/* 반원 게이지 배경 */}
                  <svg viewBox="0 0 100 50" className="w-full h-full">
                    <path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="#e2e8f0" strokeWidth="8" strokeLinecap="round" />
                    <path d="M10,50 A40,40 0 0,1 90,50" fill="none" stroke="url(#gmiGradient)" strokeWidth="8" strokeLinecap="round" strokeDasharray="125.6" strokeDashoffset="40" />
                    <defs>
                      <linearGradient id="gmiGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="50%" stopColor="#eab308" />
                        <stop offset="100%" stopColor="#ef4444" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                    <div className="text-3xl font-bold text-slate-900">6.8%</div>
                    <div className="text-xs text-slate-500">GMI</div>
                  </div>
                </div>
              </div>

              {/* 해석 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500">평균 혈당 기반</div>
                  <div className="text-lg font-semibold text-slate-700 mt-1">127 mg/dL</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-xs text-green-600">관리 상태</div>
                  <div className="text-lg font-semibold text-green-700 mt-1">양호</div>
                </div>
              </div>

              {/* GMI 범위 설명 */}
              <div className="text-xs text-slate-500 space-y-1">
                <div className="flex justify-between"><span>정상</span><span>&lt; 5.7%</span></div>
                <div className="flex justify-between"><span>당뇨 전단계</span><span>5.7% - 6.4%</span></div>
                <div className="flex justify-between"><span>당뇨</span><span>≥ 6.5%</span></div>
              </div>
            </div>
          </InsightCard>

          {/* 6. 관찰 포인트 (알림) - 클릭 가능 */}
          <InsightCard
            id="alerts"
            icon={<svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
            iconBg="bg-slate-100"
            title="관찰 포인트"
            subtitle="상담 시 참고할 주요 패턴"
            badge={{ text: '4건', color: 'bg-amber-100 text-amber-700' }}
            expanded={expandedSection === 'alerts'}
            onToggle={() => toggleSection('alerts')}
          >
            <div className="space-y-3">
              <button
                onClick={() => openClientList('post-meal-high')}
                className="w-full flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg hover:bg-amber-100 transition-colors text-left"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-amber-800">식후 고혈당 경향</div>
                  <div className="text-xs text-amber-600 mt-0.5">12명의 고객이 점심 식후 180mg/dL 초과</div>
                </div>
                <svg className="w-4 h-4 text-amber-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={() => openClientList('night-low')}
                className="w-full flex items-start gap-3 p-3 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors text-left"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-red-800">야간 저혈당 위험</div>
                  <div className="text-xs text-red-600 mt-0.5">4명의 고객이 02-04시 70mg/dL 미만 기록</div>
                </div>
                <svg className="w-4 h-4 text-red-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={() => openClientList('dawn-phenomenon')}
                className="w-full flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg hover:bg-blue-100 transition-colors text-left"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-blue-800">아침 공복 혈당 상승</div>
                  <div className="text-xs text-blue-600 mt-0.5">8명의 고객이 새벽 현상(Dawn phenomenon) 패턴</div>
                </div>
                <svg className="w-4 h-4 text-blue-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={() => openClientList('improved')}
                className="w-full flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded-lg hover:bg-green-100 transition-colors text-left"
              >
                <span className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-green-800">개선 추세</div>
                  <div className="text-xs text-green-600 mt-0.5">15명의 고객이 지난 주 대비 TIR 5% 이상 개선</div>
                </div>
                <svg className="w-4 h-4 text-green-400 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </InsightCard>

          {/* 7. 혈당 변동성 (CV) - 클릭 가능 */}
          <InsightCard
            id="variability"
            icon={<svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>}
            iconBg="bg-slate-100"
            title="혈당 변동성 (CV)"
            subtitle="혈당 안정성 지표"
            expanded={expandedSection === 'variability'}
            onToggle={() => toggleSection('variability')}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => openClientList('cv-stable')}
                  className="bg-green-50 rounded-lg p-3 text-center hover:bg-green-100 transition-colors"
                >
                  <div className="text-2xl font-bold text-green-600">{cvStableCount}명</div>
                  <div className="text-xs text-green-600 mt-1">안정 (CV &lt; 33%)</div>
                </button>
                <button
                  onClick={() => openClientList('cv-unstable')}
                  className="bg-amber-50 rounded-lg p-3 text-center hover:bg-amber-100 transition-colors"
                >
                  <div className="text-2xl font-bold text-amber-600">{cvUnstableCount}명</div>
                  <div className="text-xs text-amber-600 mt-1">불안정 (33-36%)</div>
                </button>
                <button
                  onClick={() => openClientList('cv-very-unstable')}
                  className="bg-red-50 rounded-lg p-3 text-center hover:bg-red-100 transition-colors"
                >
                  <div className="text-2xl font-bold text-red-600">{cvVeryUnstableCount}명</div>
                  <div className="text-xs text-red-600 mt-1">매우 불안정 (&gt; 36%)</div>
                </button>
              </div>

              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-slate-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-slate-600 leading-relaxed">
                    <strong>CV (Coefficient of Variation)</strong>는 혈당 변동의 정도를 나타냅니다.
                    CV 33% 미만을 목표로 하며, 낮을수록 혈당이 안정적임을 의미합니다.
                  </div>
                </div>
              </div>
            </div>
          </InsightCard>

        </div>

        {/* Note */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-500">
            숫자를 클릭하면 해당 고객 목록을 확인할 수 있습니다 • 데이터는 샘플입니다
          </p>
        </div>
      </div>

      {/* Client List Modal */}
      <ClientListModal
        isOpen={modalFilter !== null}
        onClose={closeModal}
        filter={modalFilter || ''}
        onSelectClient={handleSelectClient}
      />
    </div>
  );
}
