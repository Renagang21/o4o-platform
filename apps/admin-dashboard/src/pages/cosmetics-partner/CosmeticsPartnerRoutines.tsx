/**
 * Cosmetics Partner Routines Page
 *
 * 파트너 루틴 관리 페이지
 * - 루틴 목록
 * - 신규 루틴 생성 폼
 * - Routine Steps Builder
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';
import {
  Plus,
  Eye,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
  GripVertical,
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

const skinTypeOptions = ['건성', '지성', '복합성', '민감성', '중성'];
const skinConcernOptions = ['주름', '색소침착', '모공', '여드름', '건조', '유수분불균형'];

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

  const fetchRoutines = async () => {
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
  };

  useEffect(() => {
    fetchRoutines();
  }, []);

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
    const newSteps = createForm.steps.filter((_, i) => i !== index);
    setCreateForm({
      ...createForm,
      steps: newSteps.map((step, i) => ({ ...step, order: i + 1 })),
    });
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

  const handleCreateRoutine = async () => {
    try {
      await authClient.api.post('/api/v1/partner/routines', createForm);
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        description: '',
        routineType: 'morning',
        skinTypes: [],
        skinConcerns: [],
        steps: [{ order: 1, productName: '', description: '' }],
      });
      setSearchParams({});
      fetchRoutines();
    } catch (err) {
      console.error('Failed to create routine:', err);
      // Demo: add to list
      const newRoutine: PartnerRoutine = {
        id: String(Date.now()),
        ...createForm,
        isPublished: false,
        viewCount: 0,
        createdAt: new Date().toISOString(),
      };
      setRoutines([newRoutine, ...routines]);
      setShowCreateModal(false);
      setCreateForm({
        title: '',
        description: '',
        routineType: 'morning',
        skinTypes: [],
        skinConcerns: [],
        steps: [{ order: 1, productName: '', description: '' }],
      });
      setSearchParams({});
    }
  };

  const handlePublishToggle = async (routine: PartnerRoutine) => {
    try {
      await authClient.api.patch(`/api/v1/partner/routines/${routine.id}/publish`, {
        isPublished: !routine.isPublished,
      });
      fetchRoutines();
    } catch (err) {
      console.error('Failed to toggle publish:', err);
      // Demo: toggle locally
      setRoutines(
        routines.map((r) =>
          r.id === routine.id ? { ...r, isPublished: !r.isPublished } : r
        )
      );
    }
  };

  const filteredRoutines = routines.filter(
    (routine) =>
      routine.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      routine.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const routineTypeLabels: Record<string, string> = {
    morning: '모닝',
    evening: '이브닝',
    weekly: '주간',
    special: '스페셜',
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">파트너 루틴</h1>
          <p className="text-gray-600">스킨케어 루틴 관리 및 공유</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRoutines}
            className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
          >
            <Plus className="w-4 h-4" />
            새 루틴 생성
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="루틴 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
          />
        </div>
      </div>

      {/* Routines List */}
      <div className="space-y-4">
        {filteredRoutines.map((routine) => (
          <div key={routine.id} className="bg-white rounded-lg shadow overflow-hidden">
            <div
              className="p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => setExpandedRoutine(expandedRoutine === routine.id ? null : routine.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg">{routine.title}</h3>
                    <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-800">
                      {routineTypeLabels[routine.routineType]}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        routine.isPublished
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {routine.isPublished ? '공개' : '비공개'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{routine.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>{routine.steps.length}단계</span>
                    <span>조회 {routine.viewCount.toLocaleString()}</span>
                    <span>
                      {routine.skinTypes.join(', ')} | {routine.skinConcerns.join(', ')}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePublishToggle(routine);
                    }}
                    className={`px-3 py-1 text-sm rounded ${
                      routine.isPublished
                        ? 'bg-gray-100 hover:bg-gray-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {routine.isPublished ? '비공개로' : '공개하기'}
                  </button>
                  {expandedRoutine === routine.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            {expandedRoutine === routine.id && (
              <div className="border-t p-4 bg-gray-50">
                <h4 className="font-medium mb-3">루틴 단계</h4>
                <div className="space-y-2">
                  {routine.steps.map((step) => (
                    <div
                      key={step.order}
                      className="flex items-center gap-3 p-3 bg-white rounded-lg"
                    >
                      <span className="w-6 h-6 flex items-center justify-center bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
                        {step.order}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{step.productName}</p>
                        <p className="text-sm text-gray-500">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {filteredRoutines.length === 0 && (
          <div className="p-8 text-center text-gray-500 bg-white rounded-lg shadow">
            {searchTerm ? '검색 결과가 없습니다.' : '등록된 루틴이 없습니다.'}
          </div>
        )}
      </div>

      {/* Create Routine Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">새 루틴 생성</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSearchParams({});
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  루틴 이름
                </label>
                <input
                  type="text"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="예: 피부 보습 집중 루틴"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  설명
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, description: e.target.value })
                  }
                  placeholder="루틴에 대한 간단한 설명"
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  루틴 유형
                </label>
                <select
                  value={createForm.routineType}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      routineType: e.target.value as CreateRoutineForm['routineType'],
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                >
                  <option value="morning">모닝 루틴</option>
                  <option value="evening">이브닝 루틴</option>
                  <option value="weekly">주간 스페셜</option>
                  <option value="special">특별 케어</option>
                </select>
              </div>

              {/* Skin Types */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  피부 타입
                </label>
                <div className="flex flex-wrap gap-2">
                  {skinTypeOptions.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => toggleSkinType(type)}
                      className={`px-3 py-1 text-sm rounded-full border ${
                        createForm.skinTypes.includes(type)
                          ? 'bg-pink-100 border-pink-300 text-pink-700'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Skin Concerns */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  피부 고민
                </label>
                <div className="flex flex-wrap gap-2">
                  {skinConcernOptions.map((concern) => (
                    <button
                      key={concern}
                      type="button"
                      onClick={() => toggleSkinConcern(concern)}
                      className={`px-3 py-1 text-sm rounded-full border ${
                        createForm.skinConcerns.includes(concern)
                          ? 'bg-purple-100 border-purple-300 text-purple-700'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {concern}
                    </button>
                  ))}
                </div>
              </div>

              {/* Steps Builder */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  루틴 단계
                </label>
                <div className="space-y-2">
                  {createForm.steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <span className="w-6 h-6 flex items-center justify-center bg-pink-100 text-pink-700 rounded-full text-sm font-medium">
                        {step.order}
                      </span>
                      <input
                        type="text"
                        value={step.productName}
                        onChange={(e) => handleStepChange(index, 'productName', e.target.value)}
                        placeholder="제품명"
                        className="flex-1 px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                      <input
                        type="text"
                        value={step.description}
                        onChange={(e) => handleStepChange(index, 'description', e.target.value)}
                        placeholder="설명"
                        className="flex-1 px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-pink-500"
                      />
                      {createForm.steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleAddStep}
                  className="mt-2 flex items-center gap-2 px-3 py-2 text-sm text-pink-600 hover:bg-pink-50 rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  단계 추가
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setSearchParams({});
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleCreateRoutine}
                disabled={!createForm.title || createForm.steps.every((s) => !s.productName)}
                className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50"
              >
                생성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CosmeticsPartnerRoutines;
