import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import PlaceholderChart from '../components/PlaceholderChart';
import { useAuth } from '../contexts/AuthContext';
import { GlucoseTable } from '../components/common/GlucoseTable';
import { api } from '../services/api';
import type { Customer, CreateCustomerRequest, UpdateCustomerRequest } from '../services/api';

type SortType = 'recent' | 'frequent';

export default function PatientsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const [members, setMembers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // API에서 고객 목록 로드
  const loadCustomers = useCallback(async () => {
    try {
      setError(null);
      const result = await api.listCustomers({ limit: 200 });
      setMembers(result.data);
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.includes('Unauthorized')) {
        setError('로그인이 필요합니다.');
      } else {
        setError('고객 목록을 불러오는데 실패했습니다.');
      }
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 초기 로드
  useEffect(() => {
    if (user?.id) {
      loadCustomers();
    } else {
      setLoading(false);
    }
  }, [user?.id, loadCustomers]);

  // URL에서 선택된 고객 ID 읽기
  useEffect(() => {
    const selectedId = searchParams.get('selected');
    if (selectedId && members.some(m => m.id === selectedId)) {
      setSelectedPatient(selectedId);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, members]);

  const [aiQuestion, setAiQuestion] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortType, setSortType] = useState<SortType>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // 신규 고객 등록 폼 상태
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    age: '',
    gender: '' as '' | 'male' | 'female',
    kakao_id: '',
    phone: '',
    email: '',
  });

  // 고객 수정 폼 상태
  const [editCustomer, setEditCustomer] = useState({
    id: '',
    name: '',
    age: '',
    gender: '' as '' | 'male' | 'female',
    kakao_id: '',
    phone: '',
    email: '',
  });

  const handleRegisterCustomer = async () => {
    if (!newCustomer.name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const dto: CreateCustomerRequest = {
        name: newCustomer.name.trim(),
        age: newCustomer.age ? parseInt(newCustomer.age, 10) : undefined,
        gender: newCustomer.gender || undefined,
        kakao_id: newCustomer.kakao_id || undefined,
        phone: newCustomer.phone || undefined,
        email: newCustomer.email || undefined,
      };

      const result = await api.createCustomer(dto);
      setSelectedPatient(result.data.id);
      setNewCustomer({ name: '', age: '', gender: '', kakao_id: '', phone: '', email: '' });
      setShowRegisterModal(false);
      setCurrentPage(1);
      await loadCustomers();
    } catch (err: any) {
      alert(err.message || '고객 등록에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 고객 수정 모달 열기
  const handleOpenEditModal = (member: Customer) => {
    setEditCustomer({
      id: member.id,
      name: member.name,
      age: member.age?.toString() || '',
      gender: member.gender || '',
      kakao_id: member.kakao_id || '',
      phone: member.phone || '',
      email: member.email || '',
    });
    setShowEditModal(true);
  };

  // 고객 정보 수정 저장
  const handleSaveEditCustomer = async () => {
    if (!editCustomer.name.trim()) {
      alert('이름을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      const dto: UpdateCustomerRequest = {
        name: editCustomer.name.trim(),
        age: editCustomer.age ? parseInt(editCustomer.age, 10) : undefined,
        gender: editCustomer.gender || undefined,
        kakao_id: editCustomer.kakao_id || undefined,
        phone: editCustomer.phone || undefined,
        email: editCustomer.email || undefined,
      };

      await api.updateCustomer(editCustomer.id, dto);
      setShowEditModal(false);
      await loadCustomers();
    } catch (err: any) {
      alert(err.message || '고객 정보 수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 검색 및 정렬된 목록
  const filteredAndSortedMembers = useMemo(() => {
    let result = members.filter(member =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (sortType === 'recent') {
      result.sort((a, b) => {
        const dateA = a.last_visit ? new Date(a.last_visit).getTime() : 0;
        const dateB = b.last_visit ? new Date(b.last_visit).getTime() : 0;
        return dateB - dateA;
      });
    } else {
      result.sort((a, b) => b.visit_count - a.visit_count);
    }

    return result;
  }, [members, searchQuery, sortType]);

  // 페이지네이션
  const totalPages = Math.ceil(filteredAndSortedMembers.length / itemsPerPage);
  const paginatedMembers = filteredAndSortedMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 날짜 포맷
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '없음';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    if (days < 7) return `${days}일 전`;
    return `${Math.floor(days / 7)}주 전`;
  };

  const syncStatusLabel = (status: Customer['sync_status']) => {
    switch (status) {
      case 'synced': return '동기화됨';
      case 'pending': return '대기중';
      case 'error': return '오류';
      default: return '대기중';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareTitle = '혈당 관리 현황 리포트';
    const shareText = '약국에서 전달드리는 혈당 관리 현황 리포트입니다.';

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('공유 실패:', err);
        }
      }
    } else {
      const fullText = `${shareTitle}\n\n${shareText}\n\n${shareUrl}`;
      try {
        await navigator.clipboard.writeText(fullText);
        alert('링크가 클립보드에 복사되었습니다.\n카카오톡이나 메시지 앱에 붙여넣기 하세요.');
      } catch {
        prompt('아래 내용을 복사하세요:', fullText);
      }
    }
  };

  const handleEmail = () => {
    const subject = encodeURIComponent('혈당 관리 현황 리포트');
    const body = encodeURIComponent(
      '안녕하세요.\n\n' +
      '약국에서 전달드리는 혈당 관리 현황 리포트입니다.\n' +
      '아래 링크를 통해 확인하실 수 있습니다.\n\n' +
      `${window.location.href}\n\n` +
      '궁금하신 점이 있으시면 약국으로 문의해 주세요.\n\n' +
      '감사합니다.'
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleAskAI = () => {
    if (!aiQuestion.trim()) return;
    alert(`AI 질문: "${aiQuestion}"\n\n(실제 연동 시 AI 응답이 표시됩니다)`);
    setAiQuestion('');
  };

  if (loading) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">고객 목록을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-xl border border-red-200 p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-slate-700 mb-4">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); loadCustomers(); }}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">환자 관리</h1>
            </div>
            {/* Data Import Button */}
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              데이터 연동
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Member List */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-xl border border-slate-200">
              {/* New Customer Button */}
              <div className="p-3 border-b border-slate-100">
                <button
                  onClick={() => setShowRegisterModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  신규 고객 등록
                </button>
              </div>

              {/* Search */}
              <div className="p-3 border-b border-slate-100">
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
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Sort Tabs */}
              <div className="flex border-b border-slate-100">
                <button
                  onClick={() => { setSortType('recent'); setCurrentPage(1); }}
                  className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                    sortType === 'recent'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  최근 방문순
                </button>
                <button
                  onClick={() => { setSortType('frequent'); setCurrentPage(1); }}
                  className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                    sortType === 'frequent'
                      ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  방문 빈도순
                </button>
              </div>

              {/* Header */}
              <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {filteredAndSortedMembers.length > 0
                      ? `${filteredAndSortedMembers.length}명 중 ${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, filteredAndSortedMembers.length)}`
                      : '0명'}
                  </span>
                  {totalPages > 0 && (
                    <span className="text-xs text-slate-400">
                      {currentPage}/{totalPages} 페이지
                    </span>
                  )}
                </div>
              </div>

              {/* Table (Spike - Condensed) */}
              <div className="max-h-[400px] overflow-y-auto">
                <GlucoseTable
                  columns={[
                    { id: 'patient', label: '환자', width: '40%' },
                    { id: 'visit', label: '방문 정보', width: '35%' },
                    { id: 'status', label: '상태', width: '25%', align: 'center' },
                  ]}
                  rows={paginatedMembers.map((member) => ({
                    id: member.id,
                    data: {
                      patient: (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs text-slate-500 font-medium">
                              {member.name.slice(0, 2)}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-slate-900">{member.name}</span>
                        </div>
                      ),
                      visit: (
                        <div className="text-sm text-slate-600">
                          <p>{formatDate(member.last_visit)}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{member.visit_count}회 방문</p>
                        </div>
                      ),
                      status: (
                        <span className={`inline-block text-xs px-2 py-1 rounded ${
                          member.sync_status === 'synced'
                            ? 'bg-green-100 text-green-700'
                            : member.sync_status === 'error'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {syncStatusLabel(member.sync_status)}
                        </span>
                      ),
                    },
                    onClick: () => setSelectedPatient(member.id),
                    isSelected: selectedPatient === member.id,
                  }))}
                  emptyMessage="등록된 고객이 없습니다"
                />
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    이전
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-7 h-7 text-xs font-medium rounded ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    다음
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Patient Detail */}
          <div className="md:col-span-2">
            {selectedPatient ? (
              <div className="space-y-4">
                {/* Member Header */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  {(() => {
                    const member = members.find(m => m.id === selectedPatient);
                    return member ? (
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-lg text-blue-600 font-semibold">{member.name.slice(0, 2)}</span>
                        </div>
                        <div className="flex-1">
                          <h2 className="text-lg font-semibold text-slate-900">{member.name}</h2>
                          <div className="flex items-center gap-3 text-sm text-slate-500">
                            <span>마지막 방문: {formatDate(member.last_visit)}</span>
                            <span className="text-slate-300">•</span>
                            <span>총 {member.visit_count}회 방문</span>
                            {member.age && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span>{member.age}세 {member.gender === 'male' ? '남' : member.gender === 'female' ? '여' : ''}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleOpenEditModal(member)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                          수정
                        </button>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          member.sync_status === 'synced'
                            ? 'bg-green-100 text-green-700'
                            : member.sync_status === 'error'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {syncStatusLabel(member.sync_status)}
                        </span>
                      </div>
                    ) : null;
                  })()}
                </div>

                {/* Summary Stats */}
                <PlaceholderChart type="summary" />

                {/* Glucose Chart */}
                <PlaceholderChart type="glucose" />

                {/* Pharmacist Advice Section */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-medium text-slate-700">약사 상담 참고사항</h3>
                  </div>

                  {/* Basic Analysis Points */}
                  <div className="space-y-3 mb-6">
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">1</span>
                        <div>
                          <p className="text-sm font-medium text-slate-700">혈당 패턴 요약</p>
                          <p className="text-sm text-slate-600 mt-1 leading-relaxed">전반적으로 안정적인 패턴을 보이나, 식후 2시간 혈당 상승 경향이 관찰됩니다.</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">2</span>
                        <div>
                          <p className="text-sm font-medium text-slate-700">주의 관찰 포인트</p>
                          <p className="text-sm text-slate-600 mt-1 leading-relaxed">야간(02:00-04:00) 저혈당 가능성 - 취침 전 간식 섭취 여부 확인 권장</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">3</span>
                        <div>
                          <p className="text-sm font-medium text-slate-700">긍정적 변화</p>
                          <p className="text-sm text-slate-600 mt-1 leading-relaxed">지난 7일간 목표 범위(70-180) 내 시간 비율이 개선되었습니다.</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">4</span>
                        <div>
                          <p className="text-sm font-medium text-slate-700">상담 시 고려사항</p>
                          <p className="text-sm text-slate-600 mt-1 leading-relaxed">복용 중인 약물과 식사 시간의 연관성을 확인하고, 규칙적인 식사를 권장합니다.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Question Section */}
                  <div className="border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span className="text-sm font-medium text-slate-700">AI에게 추가 질문</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={aiQuestion}
                        onChange={(e) => setAiQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                        placeholder="질문 입력..."
                        className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        onClick={handleAskAI}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        질문
                      </button>
                    </div>
                    <p className="text-sm text-slate-500 mt-2">
                      AI가 환자 데이터를 기반으로 추가 인사이트를 제공합니다
                    </p>
                  </div>
                </div>

                {/* Trend Chart */}
                <PlaceholderChart type="trend" />

                {/* Patient Report Section - 환자 전달용 */}
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-medium text-slate-700">환자용 리포트</h3>
                    </div>
                    <span className="text-xs text-slate-400">환자에게 전달</span>
                  </div>

                  <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                    아래 버튼을 통해 환자에게 혈당 관리 현황을 전달할 수 있습니다.
                  </p>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={handleShare}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      공유
                    </button>
                    <button
                      onClick={handlePrint}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      인쇄
                    </button>
                    <button
                      onClick={handleEmail}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      메일
                    </button>
                  </div>
                </div>

                {/* Note */}
                <p className="text-xs text-slate-400 text-center">
                  * 위 내용은 샘플이며, 실제 CGM 연동 시 실시간 분석 결과가 표시됩니다
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <p className="text-base text-slate-600 mb-1">환자를 선택하세요</p>
                <p className="text-sm text-slate-500">왼쪽 목록에서 환자를 클릭하면 상세 정보가 표시됩니다</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">CGM 데이터 연동</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3">
              <button className="w-full p-4 border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <span className="text-slate-600 font-bold text-sm">LV</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">LibreView 연동</p>
                    <p className="text-xs text-slate-500">Abbott FreeStyle Libre</p>
                  </div>
                </div>
              </button>

              <button className="w-full p-4 border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <span className="text-slate-600 font-bold text-sm">DX</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Dexcom 연동</p>
                    <p className="text-xs text-slate-500">Dexcom G6/G7</p>
                  </div>
                </div>
              </button>

              <button className="w-full p-4 border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">파일 업로드</p>
                    <p className="text-xs text-slate-500">CSV, Excel 파일</p>
                  </div>
                </div>
              </button>

              <button className="w-full p-4 border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">고객 조제데이터 연동</p>
                    <p className="text-xs text-slate-500">고객 승인하에 조제 이력 연동</p>
                  </div>
                  <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 rounded">예정</span>
                </div>
              </button>
            </div>

            <p className="text-xs text-slate-400 text-center mt-6">
              연동된 데이터는 분석 후 자동으로 정리됩니다
            </p>
            <p className="text-xs text-slate-400 text-center mt-1">
              * 조제데이터 연동은 고객의 명시적 동의가 필요합니다
            </p>
          </div>
        </div>
      )}

      {/* Register Customer Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">신규 고객 등록</h3>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newCustomer.name}
                  onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                  placeholder="고객 이름"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">나이</label>
                  <input
                    type="number"
                    value={newCustomer.age}
                    onChange={(e) => setNewCustomer({ ...newCustomer, age: e.target.value })}
                    placeholder="예: 58"
                    min="1"
                    max="150"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">성별</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewCustomer({ ...newCustomer, gender: 'male' })}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        newCustomer.gender === 'male'
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      남
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewCustomer({ ...newCustomer, gender: 'female' })}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        newCustomer.gender === 'female'
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      여
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">카카오톡 ID</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FEE500]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.47 1.607 4.647 4.023 5.912-.125.455-.456 1.652-.522 1.91-.082.32.118.316.248.23.102-.068 1.629-1.073 2.29-1.51.635.097 1.29.148 1.961.148 5.523 0 10-3.477 10-7.5S17.523 3 12 3z"/>
                  </svg>
                  <input
                    type="text"
                    value={newCustomer.kakao_id}
                    onChange={(e) => setNewCustomer({ ...newCustomer, kakao_id: e.target.value })}
                    placeholder="카카오톡 ID"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">전화번호</label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                  placeholder="010-0000-0000"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">이메일</label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                  placeholder="example@email.com"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs text-slate-500">
                    조제 데이터 연동은 추후 지원 예정입니다. 등록된 고객의 조제 이력을 연결하여 더 정확한 혈당 분석을 제공할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRegisterModal(false)}
                disabled={saving}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleRegisterCustomer}
                disabled={saving}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? '등록 중...' : '등록하기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-900">고객 정보 수정</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editCustomer.name}
                  onChange={(e) => setEditCustomer({ ...editCustomer, name: e.target.value })}
                  placeholder="고객 이름"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">나이</label>
                  <input
                    type="number"
                    value={editCustomer.age}
                    onChange={(e) => setEditCustomer({ ...editCustomer, age: e.target.value })}
                    placeholder="예: 58"
                    min="1"
                    max="150"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">성별</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditCustomer({ ...editCustomer, gender: 'male' })}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        editCustomer.gender === 'male'
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      남
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditCustomer({ ...editCustomer, gender: 'female' })}
                      className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                        editCustomer.gender === 'female'
                          ? 'bg-blue-50 border-blue-300 text-blue-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      여
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">카카오톡 ID</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FEE500]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3C6.477 3 2 6.477 2 10.5c0 2.47 1.607 4.647 4.023 5.912-.125.455-.456 1.652-.522 1.91-.082.32.118.316.248.23.102-.068 1.629-1.073 2.29-1.51.635.097 1.29.148 1.961.148 5.523 0 10-3.477 10-7.5S17.523 3 12 3z"/>
                  </svg>
                  <input
                    type="text"
                    value={editCustomer.kakao_id}
                    onChange={(e) => setEditCustomer({ ...editCustomer, kakao_id: e.target.value })}
                    placeholder="카카오톡 ID"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">전화번호</label>
                <input
                  type="tel"
                  value={editCustomer.phone}
                  onChange={(e) => setEditCustomer({ ...editCustomer, phone: e.target.value })}
                  placeholder="010-0000-0000"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">이메일</label>
                <input
                  type="email"
                  value={editCustomer.email}
                  onChange={(e) => setEditCustomer({ ...editCustomer, email: e.target.value })}
                  placeholder="example@email.com"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowEditModal(false)}
                disabled={saving}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleSaveEditCustomer}
                disabled={saving}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
