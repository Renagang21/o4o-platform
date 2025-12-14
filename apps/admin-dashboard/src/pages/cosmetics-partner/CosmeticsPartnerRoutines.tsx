/**
 * Cosmetics Partner Routines Page
 *
 * 파트너 루틴 관리 페이지
 * - 루틴 목록
 * - 신규 루틴 생성 폼
 * - Routine Steps Builder (Phase 6-E: Drag & Drop, Delete Confirm)
 * - Routine Preview Section
 * - Improved Tag Selection UX
 *
 * Phase 7-H: AG Design System Integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  AGPageHeader,
  AGSection,
  AGCard,
  AGButton,
  AGInput,
  AGTag,
  AGModal,
  AGConfirmModal,
  AGKPIGrid,
  AGKPIBlock,
} from '@o4o/ui';
import {
  Plus,
  Eye,
  Trash2,
  Search,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Sun,
  Moon,
  Calendar,
  Sparkles,
  Check,
  ArrowUp,
  ArrowDown,
  Copy,
  ExternalLink,
  Heart,
  Filter,
} from 'lucide-react';

interface RoutineStep {
  order: number;
  productId?: string;
  productName: string;
  description: string;
}

interface PartnerRoutine {
  id: string;
  title: string;
  description: string;
  routineType: 'morning' | 'evening' | 'weekly' | 'special';
  steps: RoutineStep[];
  skinTypes: string[];
  skinConcerns: string[];
  isPublished: boolean;
  viewCount: number;
  createdAt: string;
}

interface CreateRoutineForm {
  title: string;
  description: string;
  routineType: 'morning' | 'evening' | 'weekly' | 'special';
  skinTypes: string[];
  skinConcerns: string[];
  steps: RoutineStep[];
}

// Skin type options with colors
const skinTypeOptions = [
  { value: '건성', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: '지성', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: '복합성', color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { value: '민감성', color: 'bg-red-100 text-red-700 border-red-300' },
  { value: '중성', color: 'bg-gray-100 text-gray-700 border-gray-300' },
];

// Skin concern options with colors
const skinConcernOptions = [
  { value: '주름', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: '색소침착', color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: '모공', color: 'bg-teal-100 text-teal-700 border-teal-300' },
  { value: '여드름', color: 'bg-pink-100 text-pink-700 border-pink-300' },
  { value: '건조', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { value: '유수분불균형', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
];

// Routine type icons
const routineTypeIcons: Record<string, React.ReactNode> = {
  morning: <Sun className="w-4 h-4" />,
  evening: <Moon className="w-4 h-4" />,
  weekly: <Calendar className="w-4 h-4" />,
  special: <Sparkles className="w-4 h-4" />,
};

const routineTypeColors: Record<string, string> = {
  morning: 'bg-amber-100 text-amber-700',
  evening: 'bg-indigo-100 text-indigo-700',
  weekly: 'bg-emerald-100 text-emerald-700',
  special: 'bg-rose-100 text-rose-700',
};

const routineTypeLabels: Record<string, string> = {
  morning: '모닝',
  evening: '이브닝',
  weekly: '주간',
  special: '스페셜',
};

const CosmeticsPartnerRoutines: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [routines, setRoutines] = useState<PartnerRoutine[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('action') === 'new');
  const [expandedRoutine, setExpandedRoutine] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateRoutineForm>({
    title: '',
    description: '',
    routineType: 'morning',
    skinTypes: [],
    skinConcerns: [],
    steps: [{ order: 1, productName: '', description: '' }],
  });

  // Phase 6-E: New state for enhanced UX
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{
    type: 'step' | 'routine';
    index?: number;
    routineId?: string;
    routineTitle?: string;
  } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [draggedStep, setDraggedStep] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [routineFilter, setRoutineFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchRoutines = useCallback(async () => {
    setLoading(true);
    try {
      const response = await authClient.api.get('/api/v1/partner/routines');
      if (response.data?.data) {
        setRoutines(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch routines:', err);
      // Demo data
      setRoutines([
        {
          id: '1',
          title: '피부 보습 집중 루틴',
          description: '건조한 피부를 위한 집중 보습 케어 루틴입니다.',
          routineType: 'evening',
          steps: [
            { order: 1, productId: 'prod-1', productName: '클렌징 오일', description: '메이크업 제거' },
            { order: 2, productId: 'prod-2', productName: '폼 클렌저', description: '2차 세안' },
            { order: 3, productId: 'prod-3', productName: '토너', description: '피부결 정돈' },
            { order: 4, productId: 'prod-4', productName: '세럼', description: '영양 공급' },
            { order: 5, productId: 'prod-5', productName: '크림', description: '보습 마무리' },
          ],
          skinTypes: ['건성', '민감성'],
          skinConcerns: ['건조', '주름'],
          isPublished: true,
          viewCount: 1245,
          createdAt: '2024-11-15T10:00:00Z',
        },
        {
          id: '2',
          title: '여름철 산뜻 모닝 루틴',
          description: '지성 피부를 위한 가벼운 아침 케어',
          routineType: 'morning',
          steps: [
            { order: 1, productName: '젤 클렌저', description: '가볍게 세안' },
            { order: 2, productName: '토너', description: '수분 공급' },
            { order: 3, productName: '수분 세럼', description: '가벼운 보습' },
            { order: 4, productName: '선크림', description: '자외선 차단' },
          ],
          skinTypes: ['지성', '복합성'],
          skinConcerns: ['모공', '유수분불균형'],
          isPublished: true,
          viewCount: 892,
          createdAt: '2024-11-20T14:30:00Z',
        },
        {
          id: '3',
          title: '안티에이징 스페셜 케어',
          description: '주 1-2회 집중 안티에이징 루틴',
          routineType: 'weekly',
          steps: [
            { order: 1, productName: '각질 제거제', description: '부드러운 각질 케어' },
            { order: 2, productName: '앰플', description: '집중 영양 공급' },
            { order: 3, productName: '시트 마스크', description: '20분 진정' },
            { order: 4, productName: '아이크림', description: '눈가 케어' },
            { order: 5, productName: '나이트 크림', description: '밤새 영양 공급' },
          ],
          skinTypes: ['건성', '중성'],
          skinConcerns: ['주름', '색소침착'],
          isPublished: false,
          viewCount: 0,
          createdAt: '2024-12-01T09:15:00Z',
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutines();
  }, [fetchRoutines]);

  const handleAddStep = () => {
    setCreateForm({
      ...createForm,
      steps: [
        ...createForm.steps,
        { order: createForm.steps.length + 1, productName: '', description: '' },
      ],
    });
  };

  const handleRemoveStep = (index: number) => {
    setShowDeleteConfirm({ type: 'step', index });
  };

  const confirmRemoveStep = () => {
    if (showDeleteConfirm?.type === 'step' && showDeleteConfirm.index !== undefined) {
      const newSteps = createForm.steps.filter((_, i) => i !== showDeleteConfirm.index);
      setCreateForm({
        ...createForm,
        steps: newSteps.map((step, i) => ({ ...step, order: i + 1 })),
      });
      setShowDeleteConfirm(null);
    }
  };

  // Phase 6-E: Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedStep(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedStep === null || draggedStep === index) return;

    const newSteps = [...createForm.steps];
    const draggedItem = newSteps[draggedStep];
    newSteps.splice(draggedStep, 1);
    newSteps.splice(index, 0, draggedItem);

    const reorderedSteps = newSteps.map((step, i) => ({ ...step, order: i + 1 }));
    setCreateForm({ ...createForm, steps: reorderedSteps });
    setDraggedStep(index);
  };

  const handleDragEnd = () => {
    setDraggedStep(null);
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= createForm.steps.length) return;

    const newSteps = [...createForm.steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];

    const reorderedSteps = newSteps.map((step, i) => ({ ...step, order: i + 1 }));
    setCreateForm({ ...createForm, steps: reorderedSteps });
  };

  const handleStepChange = (index: number, field: keyof RoutineStep, value: string | number) => {
    const newSteps = [...createForm.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setCreateForm({ ...createForm, steps: newSteps });
  };

  const toggleSkinType = (type: string) => {
    const newTypes = createForm.skinTypes.includes(type)
      ? createForm.skinTypes.filter((t) => t !== type)
      : [...createForm.skinTypes, type];
    setCreateForm({ ...createForm, skinTypes: newTypes });
  };

  const toggleSkinConcern = (concern: string) => {
    const newConcerns = createForm.skinConcerns.includes(concern)
      ? createForm.skinConcerns.filter((c) => c !== concern)
      : [...createForm.skinConcerns, concern];
    setCreateForm({ ...createForm, skinConcerns: newConcerns });
  };

  const getSkinTypeColor = (type: string) => {
    const option = skinTypeOptions.find((opt) => opt.value === type);
    return option?.color || 'bg-gray-100 text-gray-700';
  };

  const getSkinConcernColor = (concern: string) => {
    const option = skinConcernOptions.find((opt) => opt.value === concern);
    return option?.color || 'bg-gray-100 text-gray-700';
  };

  const handleDeleteRoutine = async (routineId: string, routineTitle: string) => {
    setShowDeleteConfirm({ type: 'routine', routineId, routineTitle });
  };

  const confirmDeleteRoutine = async () => {
    if (showDeleteConfirm?.type === 'routine' && showDeleteConfirm.routineId) {
      try {
        await authClient.api.delete(`/api/v1/partner/routines/${showDeleteConfirm.routineId}`);
        setToast({ message: '루틴이 삭제되었습니다.', type: 'success' });
        fetchRoutines();
      } catch (err) {
        console.error('Failed to delete routine:', err);
        setRoutines(routines.filter((r) => r.id !== showDeleteConfirm.routineId));
        setToast({ message: '루틴이 삭제되었습니다.', type: 'success' });
      }
      setShowDeleteConfirm(null);
    }
  };

  const handleDuplicateRoutine = async (routine: PartnerRoutine) => {
    const newRoutine: PartnerRoutine = {
      ...routine,
      id: String(Date.now()),
      title: `${routine.title} (복사본)`,
      isPublished: false,
      viewCount: 0,
      createdAt: new Date().toISOString(),
    };
    setRoutines([newRoutine, ...routines]);
    setToast({ message: '루틴이 복사되었습니다.', type: 'success' });
  };

  const handleCreateRoutine = async () => {
    try {
      await authClient.api.post('/api/v1/partner/routines', createForm);
      setShowCreateModal(false);
      setShowPreview(false);
      setCreateForm({
        title: '',
        description: '',
        routineType: 'morning',
        skinTypes: [],
        skinConcerns: [],
        steps: [{ order: 1, productName: '', description: '' }],
      });
      setSearchParams({});
      setToast({ message: '새 루틴이 생성되었습니다!', type: 'success' });
      fetchRoutines();
    } catch (err) {
      console.error('Failed to create routine:', err);
      const newRoutine: PartnerRoutine = {
        id: String(Date.now()),
        ...createForm,
        isPublished: false,
        viewCount: 0,
        createdAt: new Date().toISOString(),
      };
      setRoutines([newRoutine, ...routines]);
      setShowCreateModal(false);
      setShowPreview(false);
      setCreateForm({
        title: '',
        description: '',
        routineType: 'morning',
        skinTypes: [],
        skinConcerns: [],
        steps: [{ order: 1, productName: '', description: '' }],
      });
      setSearchParams({});
      setToast({ message: '새 루틴이 생성되었습니다!', type: 'success' });
    }
  };

  const handlePublishToggle = async (routine: PartnerRoutine) => {
    try {
      await authClient.api.patch(`/api/v1/partner/routines/${routine.id}/publish`, {
        isPublished: !routine.isPublished,
      });
      setToast({
        message: routine.isPublished ? '루틴이 비공개로 변경되었습니다.' : '루틴이 공개되었습니다!',
        type: 'success',
      });
      fetchRoutines();
    } catch (err) {
      console.error('Failed to toggle publish:', err);
      setRoutines(
        routines.map((r) => (r.id === routine.id ? { ...r, isPublished: !r.isPublished } : r))
      );
      setToast({
        message: routine.isPublished ? '루틴이 비공개로 변경되었습니다.' : '루틴이 공개되었습니다!',
        type: 'success',
      });
    }
  };

  // Filtering
  const filteredRoutines = routines.filter((routine) => {
    const matchesSearch =
      routine.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      routine.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter =
      routineFilter === 'all' ||
      (routineFilter === 'published' && routine.isPublished) ||
      (routineFilter === 'draft' && !routine.isPublished);

    return matchesSearch && matchesFilter;
  });

  // Stats for summary
  const stats = {
    total: routines.length,
    published: routines.filter((r) => r.isPublished).length,
    draft: routines.filter((r) => !r.isPublished).length,
    totalViews: routines.reduce((sum, r) => sum + r.viewCount, 0),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="h-16 bg-gray-200 rounded-lg"></div>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-40 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
            toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}
        >
          <Check className="w-5 h-5" />
          {toast.message}
        </div>
      )}

      {/* Page Header */}
      <AGPageHeader
        title="Routines"
        description="스킨케어 루틴 관리"
        icon={<Sparkles className="w-5 h-5" />}
        actions={
          <div className="flex items-center gap-2">
            <AGButton
              variant="ghost"
              size="sm"
              onClick={fetchRoutines}
              iconLeft={<RefreshCw className="w-4 h-4" />}
            >
              새로고침
            </AGButton>
            <AGButton
              variant="primary"
              size="sm"
              onClick={() => setShowCreateModal(true)}
              iconLeft={<Plus className="w-4 h-4" />}
            >
              새 루틴 생성
            </AGButton>
          </div>
        }
      />

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* KPI Stats */}
        <AGKPIGrid columns={4}>
          <AGKPIBlock title="전체 루틴" value={stats.total} icon={<Sparkles className="w-5 h-5 text-blue-500" />} colorMode="info" />
          <AGKPIBlock title="공개 루틴" value={stats.published} icon={<Eye className="w-5 h-5 text-green-500" />} colorMode="positive" />
          <AGKPIBlock title="비공개 루틴" value={stats.draft} icon={<X className="w-5 h-5 text-gray-500" />} colorMode="neutral" />
          <AGKPIBlock
            title="총 조회수"
            value={stats.totalViews.toLocaleString()}
            icon={<Heart className="w-5 h-5 text-pink-500" />}
            colorMode="positive"
          />
        </AGKPIGrid>

        {/* Search and Filter */}
        <AGSection>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <AGInput
                type="text"
                placeholder="루틴 이름 또는 설명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 rounded-lg p-1">
                {(['all', 'published', 'draft'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setRoutineFilter(filter)}
                    className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                      routineFilter === filter
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {filter === 'all' ? '전체' : filter === 'published' ? '공개' : '비공개'}
                  </button>
                ))}
              </div>
              {(searchTerm || routineFilter !== 'all') && (
                <AGButton
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setRoutineFilter('all');
                  }}
                  iconLeft={<Filter className="w-4 h-4" />}
                >
                  초기화
                </AGButton>
              )}
            </div>
          </div>
        </AGSection>

        {/* Results Summary */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            총 <span className="font-medium">{filteredRoutines.length}</span>개 루틴
          </p>
        </div>

        {/* Routines List */}
        <div className="space-y-4">
          {filteredRoutines.map((routine) => (
            <AGCard key={routine.id} padding="none" className="overflow-hidden">
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() =>
                  setExpandedRoutine(expandedRoutine === routine.id ? null : routine.id)
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{routine.title}</h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full flex items-center gap-1 ${routineTypeColors[routine.routineType]}`}
                      >
                        {routineTypeIcons[routine.routineType]}
                        {routineTypeLabels[routine.routineType]}
                      </span>
                      <AGTag color={routine.isPublished ? 'green' : 'gray'} size="sm">
                        {routine.isPublished ? '공개' : '비공개'}
                      </AGTag>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{routine.description}</p>

                    {/* Tags with colors */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {routine.skinTypes.map((type) => (
                        <span
                          key={type}
                          className={`px-2 py-0.5 text-xs rounded-full border ${getSkinTypeColor(type)}`}
                        >
                          {type}
                        </span>
                      ))}
                      {routine.skinConcerns.map((concern) => (
                        <span
                          key={concern}
                          className={`px-2 py-0.5 text-xs rounded-full border ${getSkinConcernColor(concern)}`}
                        >
                          {concern}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        {routine.steps.length}단계
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" />
                        {routine.viewCount.toLocaleString()}회 조회
                      </span>
                      <span className="text-gray-400">
                        {new Date(routine.createdAt).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-4">
                    <AGButton
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateRoutine(routine);
                      }}
                      iconLeft={<Copy className="w-4 h-4" />}
                    />
                    <AGButton
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRoutine(routine.id, routine.title);
                      }}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      iconLeft={<Trash2 className="w-4 h-4" />}
                    />
                    <AGButton
                      variant={routine.isPublished ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePublishToggle(routine);
                      }}
                    >
                      {routine.isPublished ? '비공개로' : '공개하기'}
                    </AGButton>
                    <div className="ml-2">
                      {expandedRoutine === routine.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Routine Steps */}
              {expandedRoutine === routine.id && (
                <div className="border-t bg-gradient-to-b from-gray-50 to-white p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">루틴 단계</h4>
                    <span className="text-xs text-gray-500">총 {routine.steps.length}단계</span>
                  </div>
                  <div className="relative">
                    {/* Connection line */}
                    <div className="absolute left-[15px] top-6 bottom-6 w-0.5 bg-pink-200"></div>

                    <div className="space-y-3">
                      {routine.steps.map((step) => (
                        <div
                          key={step.order}
                          className="flex items-start gap-4 p-3 bg-white rounded-lg border shadow-sm relative"
                        >
                          <span className="w-8 h-8 flex items-center justify-center bg-pink-500 text-white rounded-full text-sm font-medium flex-shrink-0 z-10">
                            {step.order}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">{step.productName}</p>
                            <p className="text-sm text-gray-500 mt-0.5">{step.description}</p>
                          </div>
                          {step.productId && (
                            <button className="text-pink-500 hover:text-pink-600 p-1">
                              <ExternalLink className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </AGCard>
          ))}

          {/* Empty State */}
          {filteredRoutines.length === 0 && (
            <AGCard padding="lg" className="text-center">
              <div className="py-8">
                <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-pink-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || routineFilter !== 'all'
                    ? '검색 결과가 없습니다'
                    : '아직 루틴이 없습니다'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || routineFilter !== 'all'
                    ? '다른 검색어나 필터를 시도해보세요.'
                    : '나만의 스킨케어 루틴을 만들어 팔로워들과 공유하세요.'}
                </p>
                {!searchTerm && routineFilter === 'all' && (
                  <AGButton
                    variant="primary"
                    size="sm"
                    onClick={() => setShowCreateModal(true)}
                    iconLeft={<Plus className="w-4 h-4" />}
                  >
                    첫 루틴 만들기
                  </AGButton>
                )}
              </div>
            </AGCard>
          )}
        </div>
      </div>

      {/* Create Routine Modal */}
      <AGModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowPreview(false);
          setSearchParams({});
        }}
        title="새 루틴 생성"
        size="lg"
      >
        <div className="flex gap-6">
          {/* Form Section */}
          <div
            className={`space-y-5 overflow-y-auto max-h-[60vh] ${showPreview ? 'flex-1' : 'w-full'}`}
          >
            {/* Preview Toggle */}
            <div className="flex justify-end">
              <AGButton
                variant={showPreview ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                iconLeft={<Eye className="w-4 h-4" />}
              >
                미리보기
              </AGButton>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  루틴 이름 <span className="text-red-500">*</span>
                </label>
                <AGInput
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="예: 피부 보습 집중 루틴"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="루틴에 대한 간단한 설명"
                  rows={2}
                  className="w-full px-3 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">루틴 유형</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['morning', 'evening', 'weekly', 'special'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setCreateForm({ ...createForm, routineType: type })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        createForm.routineType === type
                          ? 'border-pink-500 bg-pink-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center ${routineTypeColors[type]}`}
                      >
                        {routineTypeIcons[type]}
                      </div>
                      <div className="text-xs font-medium text-center">
                        {routineTypeLabels[type]}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Skin Types with Colors */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                피부 타입 <span className="text-gray-400 font-normal">(다중 선택)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {skinTypeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleSkinType(opt.value)}
                    className={`px-3 py-1.5 text-sm rounded-full border-2 transition-all flex items-center gap-1 ${
                      createForm.skinTypes.includes(opt.value)
                        ? `${opt.color} border-current`
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {createForm.skinTypes.includes(opt.value) && <Check className="w-3.5 h-3.5" />}
                    {opt.value}
                  </button>
                ))}
              </div>
            </div>

            {/* Skin Concerns with Colors */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                피부 고민 <span className="text-gray-400 font-normal">(다중 선택)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {skinConcernOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleSkinConcern(opt.value)}
                    className={`px-3 py-1.5 text-sm rounded-full border-2 transition-all flex items-center gap-1 ${
                      createForm.skinConcerns.includes(opt.value)
                        ? `${opt.color} border-current`
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {createForm.skinConcerns.includes(opt.value) && (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    {opt.value}
                  </button>
                ))}
              </div>
            </div>

            {/* Enhanced Steps Builder with Drag & Drop */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  루틴 단계 <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-gray-500">드래그로 순서 변경</span>
              </div>
              <div className="space-y-2">
                {createForm.steps.map((step, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-2 p-3 bg-gray-50 rounded-lg border-2 transition-all ${
                      draggedStep === index
                        ? 'border-pink-400 bg-pink-50 opacity-75'
                        : 'border-transparent hover:border-gray-200'
                    }`}
                  >
                    <div className="cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="w-7 h-7 flex items-center justify-center bg-pink-500 text-white rounded-full text-sm font-medium flex-shrink-0">
                      {step.order}
                    </span>
                    <AGInput
                      type="text"
                      value={step.productName}
                      onChange={(e) => handleStepChange(index, 'productName', e.target.value)}
                      placeholder="제품명"
                      className="flex-1"
                    />
                    <AGInput
                      type="text"
                      value={step.description}
                      onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                      placeholder="사용 방법"
                      className="flex-1"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveStep(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveStep(index, 'down')}
                        disabled={index === createForm.steps.length - 1}
                        className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      {createForm.steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(index)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <AGButton
                variant="secondary"
                size="sm"
                onClick={handleAddStep}
                iconLeft={<Plus className="w-4 h-4" />}
                className="mt-3 w-full border-2 border-dashed"
              >
                단계 추가
              </AGButton>
            </div>
          </div>

          {/* Preview Section */}
          {showPreview && (
            <div className="w-80 border-l pl-6 flex-shrink-0">
              <h3 className="text-sm font-medium text-gray-700 mb-3">미리보기</h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                {/* Preview Header */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${routineTypeColors[createForm.routineType]}`}
                    >
                      {routineTypeIcons[createForm.routineType]}
                      {routineTypeLabels[createForm.routineType]}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900">
                    {createForm.title || '루틴 이름'}
                  </h4>
                  <p className="text-sm text-gray-500 mt-1">
                    {createForm.description || '설명이 여기에 표시됩니다'}
                  </p>
                </div>

                {/* Preview Tags */}
                {(createForm.skinTypes.length > 0 || createForm.skinConcerns.length > 0) && (
                  <div className="flex flex-wrap gap-1">
                    {createForm.skinTypes.map((type) => (
                      <span
                        key={type}
                        className={`px-2 py-0.5 text-xs rounded-full ${getSkinTypeColor(type)}`}
                      >
                        {type}
                      </span>
                    ))}
                    {createForm.skinConcerns.map((concern) => (
                      <span
                        key={concern}
                        className={`px-2 py-0.5 text-xs rounded-full ${getSkinConcernColor(concern)}`}
                      >
                        {concern}
                      </span>
                    ))}
                  </div>
                )}

                {/* Preview Steps */}
                <div className="space-y-2">
                  {createForm.steps
                    .filter((s) => s.productName)
                    .map((step) => (
                      <div key={step.order} className="flex items-center gap-2 p-2 bg-white rounded-lg">
                        <span className="w-5 h-5 flex items-center justify-center bg-pink-500 text-white rounded-full text-xs font-medium">
                          {step.order}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {step.productName}
                          </p>
                          {step.description && (
                            <p className="text-xs text-gray-500 truncate">{step.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  {createForm.steps.every((s) => !s.productName) && (
                    <p className="text-sm text-gray-400 text-center py-4">단계를 추가하세요</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <AGButton
            variant="secondary"
            onClick={() => {
              setShowCreateModal(false);
              setShowPreview(false);
              setSearchParams({});
            }}
          >
            취소
          </AGButton>
          <AGButton
            variant="primary"
            onClick={handleCreateRoutine}
            disabled={!createForm.title || createForm.steps.every((s) => !s.productName)}
            iconLeft={<Plus className="w-4 h-4" />}
          >
            루틴 생성
          </AGButton>
        </div>
      </AGModal>

      {/* Delete Confirmation Modal */}
      <AGConfirmModal
        isOpen={!!showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={showDeleteConfirm?.type === 'step' ? confirmRemoveStep : confirmDeleteRoutine}
        title={showDeleteConfirm?.type === 'step' ? '단계 삭제' : '루틴 삭제'}
        message={
          showDeleteConfirm?.type === 'step'
            ? '이 단계를 삭제하시겠습니까? 삭제된 단계는 복구할 수 없으며, 나머지 단계의 순서가 자동으로 조정됩니다.'
            : `"${showDeleteConfirm?.routineTitle}" 루틴을 삭제하시겠습니까? 삭제된 루틴은 복구할 수 없으며, 관련된 모든 데이터가 영구적으로 삭제됩니다.`
        }
        confirmText="삭제"
        cancelText="취소"
        variant="danger"
      />
    </div>
  );
};

export default CosmeticsPartnerRoutines;
