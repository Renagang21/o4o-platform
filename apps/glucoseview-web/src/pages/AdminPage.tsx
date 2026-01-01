import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// 슬라이드 배너 타입
interface SlideBanner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  linkUrl?: string;
  bgColor: string;
  textColor: string;
  isActive: boolean;
  order: number;
}

// 파트너 업체 타입
interface Partner {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  websiteUrl: string;
  isActive: boolean;
  order: number;
}

// localStorage 키
const BANNERS_KEY = 'glucoseview_banners';
const PARTNERS_KEY = 'glucoseview_partners';

// 샘플 슬라이드 배너 데이터
const sampleBanners: SlideBanner[] = [
  {
    id: '1',
    title: 'GlucoseView',
    subtitle: '약국을 위한 CGM 데이터 정리 도구',
    bgColor: 'bg-gradient-to-r from-blue-600 to-blue-400',
    textColor: 'text-white',
    isActive: true,
    order: 1,
  },
  {
    id: '2',
    title: '혈당 관리의 새로운 패러다임',
    subtitle: '환자별 CGM 데이터를 한눈에 파악하세요',
    bgColor: 'bg-gradient-to-r from-purple-600 to-pink-500',
    textColor: 'text-white',
    isActive: true,
    order: 2,
  },
  {
    id: '3',
    title: '약사님의 상담을 도와드립니다',
    subtitle: '데이터 기반의 전문 상담 지원',
    bgColor: 'bg-gradient-to-r from-emerald-600 to-teal-500',
    textColor: 'text-white',
    isActive: true,
    order: 3,
  },
];

// 샘플 파트너 데이터
const samplePartners: Partner[] = [
  {
    id: '1',
    name: 'LibreView',
    description: 'Abbott의 CGM 데이터 플랫폼',
    websiteUrl: 'https://www.libreview.com',
    isActive: true,
    order: 1,
  },
  {
    id: '2',
    name: 'Dexcom',
    description: '연속혈당측정 전문 기업',
    websiteUrl: 'https://www.dexcom.com',
    isActive: true,
    order: 2,
  },
  {
    id: '3',
    name: '대한약사회',
    description: '약사 직능단체',
    websiteUrl: 'https://www.kpanet.or.kr',
    isActive: true,
    order: 3,
  },
  {
    id: '4',
    name: '건강보험심사평가원',
    description: '의료 심사 및 평가 기관',
    websiteUrl: 'https://www.hira.or.kr',
    isActive: true,
    order: 4,
  },
  {
    id: '5',
    name: '국민건강보험공단',
    description: '건강보험 운영 기관',
    websiteUrl: 'https://www.nhis.or.kr',
    isActive: true,
    order: 5,
  },
];

// 샘플 대기 중인 회원 데이터
const samplePendingMembers = [
  {
    id: '1',
    realName: '김약사',
    displayName: '김약사',
    email: 'kim@example.com',
    phone: '010-1111-1111',
    licenseNumber: 'PH-11111',
    pharmacyName: '해피약국',
    branchName: '서울지부',
    chapterName: '강남분회',
    createdAt: '2025-12-28',
  },
  {
    id: '2',
    realName: '이약사',
    displayName: '이약사',
    email: 'lee@example.com',
    phone: '010-2222-2222',
    licenseNumber: 'PH-22222',
    pharmacyName: '건강약국',
    branchName: '경기지부',
    chapterName: '수원분회',
    createdAt: '2025-12-29',
  },
];

// 배경색 옵션
const bgColorOptions = [
  { value: 'bg-gradient-to-r from-blue-600 to-blue-400', label: '파랑' },
  { value: 'bg-gradient-to-r from-purple-600 to-pink-500', label: '보라' },
  { value: 'bg-gradient-to-r from-emerald-600 to-teal-500', label: '초록' },
  { value: 'bg-gradient-to-r from-orange-500 to-amber-400', label: '주황' },
  { value: 'bg-gradient-to-r from-rose-500 to-pink-400', label: '분홍' },
  { value: 'bg-gradient-to-r from-slate-700 to-slate-500', label: '회색' },
];

export default function AdminPage() {
  const { isAdmin, user, logout } = useAuth();
  const [pendingMembers] = useState(samplePendingMembers);
  const [selectedMember, setSelectedMember] = useState<typeof samplePendingMembers[0] | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  // 탭 상태
  const [activeTab, setActiveTab] = useState<'members' | 'banners' | 'partners' | 'settings'>('members');

  // 배너 상태
  const [banners, setBanners] = useState<SlideBanner[]>([]);
  const [editingBanner, setEditingBanner] = useState<SlideBanner | null>(null);
  const [showBannerModal, setShowBannerModal] = useState(false);

  // 파트너 상태
  const [partners, setPartners] = useState<Partner[]>([]);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [showPartnerModal, setShowPartnerModal] = useState(false);

  // 초기 데이터 로드
  useEffect(() => {
    // 배너 로드
    try {
      const savedBanners = localStorage.getItem(BANNERS_KEY);
      if (savedBanners) {
        setBanners(JSON.parse(savedBanners));
      } else {
        setBanners(sampleBanners);
        localStorage.setItem(BANNERS_KEY, JSON.stringify(sampleBanners));
      }
    } catch {
      setBanners(sampleBanners);
    }

    // 파트너 로드
    try {
      const savedPartners = localStorage.getItem(PARTNERS_KEY);
      if (savedPartners) {
        setPartners(JSON.parse(savedPartners));
      } else {
        setPartners(samplePartners);
        localStorage.setItem(PARTNERS_KEY, JSON.stringify(samplePartners));
      }
    } catch {
      setPartners(samplePartners);
    }
  }, []);

  // 배너 저장
  const saveBanners = (newBanners: SlideBanner[]) => {
    setBanners(newBanners);
    localStorage.setItem(BANNERS_KEY, JSON.stringify(newBanners));
  };

  // 파트너 저장
  const savePartners = (newPartners: Partner[]) => {
    setPartners(newPartners);
    localStorage.setItem(PARTNERS_KEY, JSON.stringify(newPartners));
  };

  // 관리자가 아니면 홈으로 리다이렉트
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleApprove = (member: typeof samplePendingMembers[0]) => {
    alert(`${member.realName}님의 가입을 승인했습니다.`);
  };

  const handleRejectClick = (member: typeof samplePendingMembers[0]) => {
    setSelectedMember(member);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = () => {
    if (!rejectReason.trim()) {
      alert('거절 사유를 입력해주세요.');
      return;
    }
    alert(`${selectedMember?.realName}님의 가입을 거절했습니다.\n사유: ${rejectReason}`);
    setShowRejectModal(false);
  };

  // 배너 관련 핸들러
  const handleAddBanner = () => {
    setEditingBanner({
      id: Date.now().toString(),
      title: '',
      subtitle: '',
      bgColor: bgColorOptions[0].value,
      textColor: 'text-white',
      isActive: true,
      order: banners.length + 1,
    });
    setShowBannerModal(true);
  };

  const handleEditBanner = (banner: SlideBanner) => {
    setEditingBanner({ ...banner });
    setShowBannerModal(true);
  };

  const handleSaveBanner = () => {
    if (!editingBanner) return;
    if (!editingBanner.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    const exists = banners.find(b => b.id === editingBanner.id);
    if (exists) {
      saveBanners(banners.map(b => b.id === editingBanner.id ? editingBanner : b));
    } else {
      saveBanners([...banners, editingBanner]);
    }
    setShowBannerModal(false);
    setEditingBanner(null);
  };

  const handleDeleteBanner = (id: string) => {
    if (confirm('이 배너를 삭제하시겠습니까?')) {
      saveBanners(banners.filter(b => b.id !== id));
    }
  };

  const handleToggleBanner = (id: string) => {
    saveBanners(banners.map(b => b.id === id ? { ...b, isActive: !b.isActive } : b));
  };

  // 파트너 관련 핸들러
  const handleAddPartner = () => {
    setEditingPartner({
      id: Date.now().toString(),
      name: '',
      description: '',
      websiteUrl: '',
      isActive: true,
      order: partners.length + 1,
    });
    setShowPartnerModal(true);
  };

  const handleEditPartner = (partner: Partner) => {
    setEditingPartner({ ...partner });
    setShowPartnerModal(true);
  };

  const handleSavePartner = () => {
    if (!editingPartner) return;
    if (!editingPartner.name.trim()) {
      alert('업체명을 입력해주세요.');
      return;
    }
    if (!editingPartner.websiteUrl.trim()) {
      alert('웹사이트 URL을 입력해주세요.');
      return;
    }

    const exists = partners.find(p => p.id === editingPartner.id);
    if (exists) {
      savePartners(partners.map(p => p.id === editingPartner.id ? editingPartner : p));
    } else {
      savePartners([...partners, editingPartner]);
    }
    setShowPartnerModal(false);
    setEditingPartner(null);
  };

  const handleDeletePartner = (id: string) => {
    if (confirm('이 파트너를 삭제하시겠습니까?')) {
      savePartners(partners.filter(p => p.id !== id));
    }
  };

  const handleTogglePartner = (id: string) => {
    savePartners(partners.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-xl font-bold text-slate-900">
                GlucoseView
              </Link>
              <span className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded">Admin</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-500">{user?.displayName || user?.name}</span>
              <button
                onClick={logout}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">관리자 페이지</h1>
          <p className="text-slate-500">회원 승인 및 시스템 관리</p>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex gap-1 mb-6 p-1 bg-slate-100 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'members'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            회원 관리
          </button>
          <button
            onClick={() => setActiveTab('banners')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'banners'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            배너 관리
          </button>
          <button
            onClick={() => setActiveTab('partners')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'partners'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            파트너 관리
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'settings'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            설정
          </button>
        </div>

        {/* 회원 관리 탭 */}
        {activeTab === 'members' && (
          <>
            {/* Admin Statistics Dashboard */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">서비스 이용 현황</h2>
                  <p className="text-sm text-slate-500">전체 시스템 통계</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-xs text-blue-600 font-medium mb-1">등록 약사</p>
                  <p className="text-2xl font-bold text-blue-700">12</p>
                  <p className="text-xs text-blue-500 mt-1">명</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-4">
                  <p className="text-xs text-amber-600 font-medium mb-1">승인 대기</p>
                  <p className="text-2xl font-bold text-amber-700">{pendingMembers.length}</p>
                  <p className="text-xs text-amber-500 mt-1">명</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-xs text-green-600 font-medium mb-1">등록 고객</p>
                  <p className="text-2xl font-bold text-green-700">156</p>
                  <p className="text-xs text-green-500 mt-1">명 (전체)</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-xs text-purple-600 font-medium mb-1">이번 달 방문</p>
                  <p className="text-2xl font-bold text-purple-700">42</p>
                  <p className="text-xs text-purple-500 mt-1">회</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-sm font-medium text-slate-700 mb-3">지부별 약사 현황</h3>
                <div className="space-y-3">
                  {[
                    { name: '서울지부', count: 6, color: 'blue', width: '50%' },
                    { name: '경기지부', count: 4, color: 'green', width: '33%' },
                    { name: '부산지부', count: 2, color: 'amber', width: '17%' },
                  ].map((branch) => (
                    <div key={branch.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full bg-${branch.color}-500`}></span>
                        <span className="text-sm text-slate-600">{branch.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full bg-${branch.color}-500`} style={{ width: branch.width }}></div>
                        </div>
                        <span className="text-sm text-slate-500 w-16 text-right">{branch.count}명</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pending Members */}
            <div className="bg-white rounded-xl border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-slate-900">승인 대기 회원</h2>
                  <span className="px-2 py-1 text-xs font-medium text-amber-600 bg-amber-50 rounded-full">
                    {pendingMembers.length}명
                  </span>
                </div>
              </div>

              {pendingMembers.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {pendingMembers.map((member) => (
                    <div key={member.id} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-base font-medium text-slate-900">{member.realName}</h3>
                            <span className="text-sm text-slate-400">({member.displayName})</span>
                          </div>
                          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                            <div><span className="text-slate-400">이메일:</span> <span className="text-slate-600">{member.email}</span></div>
                            <div><span className="text-slate-400">전화번호:</span> <span className="text-slate-600">{member.phone}</span></div>
                            <div><span className="text-slate-400">면허번호:</span> <span className="text-slate-600">{member.licenseNumber}</span></div>
                            <div><span className="text-slate-400">약국명:</span> <span className="text-slate-600">{member.pharmacyName}</span></div>
                            <div><span className="text-slate-400">소속:</span> <span className="text-slate-600">{member.branchName} {member.chapterName}</span></div>
                            <div><span className="text-slate-400">신청일:</span> <span className="text-slate-600">{member.createdAt}</span></div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button onClick={() => handleRejectClick(member)} className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">거절</button>
                          <button onClick={() => handleApprove(member)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">승인</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-slate-500">대기 중인 회원이 없습니다.</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* 배너 관리 탭 */}
        {activeTab === 'banners' && (
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-slate-900">슬라이드 배너 관리</h2>
                  <p className="text-sm text-slate-500 mt-1">홈 화면 상단에 표시되는 슬라이드 배너를 관리합니다</p>
                </div>
                <button
                  onClick={handleAddBanner}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + 배너 추가
                </button>
              </div>
            </div>

            {banners.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {banners.sort((a, b) => a.order - b.order).map((banner) => (
                  <div key={banner.id} className="p-4 flex items-center gap-4">
                    {/* 미리보기 */}
                    <div className={`w-32 h-20 rounded-lg ${banner.bgColor} flex items-center justify-center flex-shrink-0`}>
                      <span className={`text-xs font-medium ${banner.textColor} opacity-80`}>미리보기</span>
                    </div>

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-slate-900 truncate">{banner.title}</h3>
                        {!banner.isActive && (
                          <span className="px-1.5 py-0.5 text-xs font-medium text-slate-500 bg-slate-100 rounded">비활성</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{banner.subtitle}</p>
                      {banner.linkUrl && (
                        <p className="text-xs text-blue-500 truncate mt-1">{banner.linkUrl}</p>
                      )}
                    </div>

                    {/* 액션 */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleBanner(banner.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          banner.isActive
                            ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                            : 'text-green-600 bg-green-50 hover:bg-green-100'
                        }`}
                      >
                        {banner.isActive ? '비활성화' : '활성화'}
                      </button>
                      <button
                        onClick={() => handleEditBanner(banner)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeleteBanner(banner.id)}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <p className="text-slate-500">등록된 배너가 없습니다.</p>
              </div>
            )}
          </div>
        )}

        {/* 파트너 관리 탭 */}
        {activeTab === 'partners' && (
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-medium text-slate-900">파트너 업체 관리</h2>
                  <p className="text-sm text-slate-500 mt-1">홈 화면 하단에 표시되는 파트너 업체를 관리합니다</p>
                </div>
                <button
                  onClick={handleAddPartner}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  + 파트너 추가
                </button>
              </div>
            </div>

            {partners.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {partners.sort((a, b) => a.order - b.order).map((partner) => (
                  <div key={partner.id} className="p-4 flex items-center gap-4">
                    {/* 로고 */}
                    <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                      {partner.logoUrl ? (
                        <img src={partner.logoUrl} alt={partner.name} className="w-8 h-8 object-contain" />
                      ) : (
                        <span className="text-lg font-bold text-slate-400">{partner.name.charAt(0)}</span>
                      )}
                    </div>

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-slate-900">{partner.name}</h3>
                        {!partner.isActive && (
                          <span className="px-1.5 py-0.5 text-xs font-medium text-slate-500 bg-slate-100 rounded">비활성</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{partner.description}</p>
                      <a href={partner.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                        {partner.websiteUrl}
                      </a>
                    </div>

                    {/* 액션 */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTogglePartner(partner.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          partner.isActive
                            ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                            : 'text-green-600 bg-green-50 hover:bg-green-100'
                        }`}
                      >
                        {partner.isActive ? '비활성화' : '활성화'}
                      </button>
                      <button
                        onClick={() => handleEditPartner(partner)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => handleDeletePartner(partner.id)}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <p className="text-slate-500">등록된 파트너가 없습니다.</p>
              </div>
            )}
          </div>
        )}

        {/* 설정 탭 */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* 사이트 정보 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-medium text-slate-900 mb-4">사이트 정보</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">사이트명</label>
                  <input
                    type="text"
                    value="GlucoseView"
                    disabled
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">사이트 URL</label>
                  <input
                    type="text"
                    value="https://glucoseview.co.kr"
                    disabled
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {/* 개발자 정보 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-medium text-slate-900 mb-4">개발자 정보</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">개발자명</label>
                  <input
                    type="text"
                    value="서철환"
                    disabled
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">이메일</label>
                  <input
                    type="email"
                    value="sohae21@naver.com"
                    disabled
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {/* 서비스 정보 */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-medium text-slate-900 mb-4">서비스 정보 (준비중)</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">이용약관</label>
                  <textarea
                    rows={3}
                    placeholder="이용약관 내용을 입력하세요"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">개인정보처리방침</label>
                  <textarea
                    rows={3}
                    placeholder="개인정보처리방침 내용을 입력하세요"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-4">* 설정 저장 기능은 추후 업데이트 예정입니다.</p>
            </div>
          </div>
        )}
      </main>

      {/* Reject Modal */}
      {showRejectModal && selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">가입 거절</h3>
              <button onClick={() => setShowRejectModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              <span className="font-medium text-slate-700">{selectedMember.realName}</span>님의 가입을 거절합니다.
            </p>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">거절 사유 <span className="text-red-500">*</span></label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="거절 사유를 입력해주세요"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">취소</button>
              <button onClick={handleRejectConfirm} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">거절하기</button>
            </div>
          </div>
        </div>
      )}

      {/* Banner Modal */}
      {showBannerModal && editingBanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">
                {banners.find(b => b.id === editingBanner.id) ? '배너 수정' : '배너 추가'}
              </h3>
              <button onClick={() => setShowBannerModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">제목 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editingBanner.title}
                  onChange={(e) => setEditingBanner({ ...editingBanner, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">부제목</label>
                <input
                  type="text"
                  value={editingBanner.subtitle}
                  onChange={(e) => setEditingBanner({ ...editingBanner, subtitle: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">링크 URL (선택)</label>
                <input
                  type="url"
                  value={editingBanner.linkUrl || ''}
                  onChange={(e) => setEditingBanner({ ...editingBanner, linkUrl: e.target.value })}
                  placeholder="https://"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">배경색</label>
                <div className="grid grid-cols-3 gap-2">
                  {bgColorOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setEditingBanner({ ...editingBanner, bgColor: option.value })}
                      className={`p-2 rounded-lg border-2 transition-colors ${
                        editingBanner.bgColor === option.value ? 'border-blue-500' : 'border-transparent'
                      }`}
                    >
                      <div className={`h-8 rounded ${option.value}`}></div>
                      <span className="text-xs text-slate-500 mt-1">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">순서</label>
                <input
                  type="number"
                  value={editingBanner.order}
                  onChange={(e) => setEditingBanner({ ...editingBanner, order: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 미리보기 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">미리보기</label>
                <div className={`h-24 rounded-lg ${editingBanner.bgColor} flex items-center justify-center`}>
                  <div className="text-center">
                    <p className={`text-lg font-bold ${editingBanner.textColor}`}>{editingBanner.title || '제목'}</p>
                    <p className={`text-sm opacity-80 ${editingBanner.textColor}`}>{editingBanner.subtitle || '부제목'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowBannerModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">취소</button>
              <button onClick={handleSaveBanner} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">저장</button>
            </div>
          </div>
        </div>
      )}

      {/* Partner Modal */}
      {showPartnerModal && editingPartner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">
                {partners.find(p => p.id === editingPartner.id) ? '파트너 수정' : '파트너 추가'}
              </h3>
              <button onClick={() => setShowPartnerModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">업체명 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={editingPartner.name}
                  onChange={(e) => setEditingPartner({ ...editingPartner, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">설명</label>
                <input
                  type="text"
                  value={editingPartner.description}
                  onChange={(e) => setEditingPartner({ ...editingPartner, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">웹사이트 URL <span className="text-red-500">*</span></label>
                <input
                  type="url"
                  value={editingPartner.websiteUrl}
                  onChange={(e) => setEditingPartner({ ...editingPartner, websiteUrl: e.target.value })}
                  placeholder="https://"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">로고 URL (선택)</label>
                <input
                  type="url"
                  value={editingPartner.logoUrl || ''}
                  onChange={(e) => setEditingPartner({ ...editingPartner, logoUrl: e.target.value })}
                  placeholder="https://"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">순서</label>
                <input
                  type="number"
                  value={editingPartner.order}
                  onChange={(e) => setEditingPartner({ ...editingPartner, order: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowPartnerModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">취소</button>
              <button onClick={handleSavePartner} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
